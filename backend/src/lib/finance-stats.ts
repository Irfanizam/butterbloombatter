import { FinanceType } from '@prisma/client';
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
