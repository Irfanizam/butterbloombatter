import { FinanceType, OrderStatus } from '@prisma/client';
import { prisma } from './prisma';

export interface MonthlyTotal {
  month: string; // YYYY-MM
  in: number;
  out: number;
  net: number;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Finance IN categories that are NOT counted as sales revenue — owner capital
 * injections (savings / i-fund). Every other IN entry (custom fees, delivery
 * charges, "Other Income") counts toward revenue alongside delivered orders.
 */
export const NON_REVENUE_IN_CATEGORIES = ['Capital / Top-up'];

/**
 * The date a delivered order is booked as income: its delivery date (when
 * payment is made), else completion, else placed date. Unlike manual entries
 * (which sort by when they were recorded), an order sits in the ledger by its
 * delivery date — that's the day the money actually came in.
 */
export function orderIncomeDate(o: {
  deliveryDate: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}): Date {
  return o.deliveryDate ?? o.completedAt ?? o.createdAt;
}

/** Returns IN/OUT/NET totals for each of the last `months` calendar months (oldest first). */
export async function getMonthlyTotals(months: number): Promise<MonthlyTotal[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const entries = await prisma.finance.findMany({
    where: { date: { gte: start } },
    select: { type: true, amount: true, date: true },
  });

  const buckets = new Map<string, { in: number; out: number }>();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    buckets.set(monthKey(d), { in: 0, out: 0 });
  }

  for (const entry of entries) {
    const bucket = buckets.get(monthKey(entry.date));
    if (!bucket) continue;
    if (entry.type === FinanceType.IN) bucket.in += entry.amount;
    else bucket.out += entry.amount;
  }

  return Array.from(buckets.entries()).map(([month, v]) => ({
    month,
    in: v.in,
    out: v.out,
    net: v.in - v.out,
  }));
}

/**
 * Monthly Sales vs Expenses for the last `months` months:
 * in = revenue from DELIVERED orders (booked on their income date),
 * out = Finance OUT entries.
 */
export async function getMonthlySalesVsExpenses(months: number): Promise<MonthlyTotal[]> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const [orders, expenses, manualIncome] = await Promise.all([
    prisma.order.findMany({
      where: { status: OrderStatus.DELIVERED },
      select: { totalAmount: true, deliveryDate: true, completedAt: true, createdAt: true },
    }),
    prisma.finance.findMany({
      where: { type: FinanceType.OUT, date: { gte: start } },
      select: { amount: true, date: true },
    }),
    // Manual income (custom fees, delivery charges, etc.) counts as revenue too,
    // excluding owner capital injections.
    prisma.finance.findMany({
      where: {
        type: FinanceType.IN,
        date: { gte: start },
        NOT: { category: { in: NON_REVENUE_IN_CATEGORIES } },
      },
      select: { amount: true, date: true },
    }),
  ]);

  const buckets = new Map<string, { in: number; out: number }>();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    buckets.set(monthKey(d), { in: 0, out: 0 });
  }
  for (const o of orders) {
    const b = buckets.get(monthKey(orderIncomeDate(o)));
    if (b) b.in += o.totalAmount;
  }
  for (const m of manualIncome) {
    const b = buckets.get(monthKey(m.date));
    if (b) b.in += m.amount;
  }
  for (const e of expenses) {
    const b = buckets.get(monthKey(e.date));
    if (b) b.out += e.amount;
  }
  return Array.from(buckets.entries()).map(([month, v]) => ({
    month,
    in: v.in,
    out: v.out,
    net: v.in - v.out,
  }));
}
