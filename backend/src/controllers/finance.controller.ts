import { Request, Response } from 'express';
import { FinanceType, OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../lib/http';
import { getMonthlyTotals, orderIncomeDate } from '../lib/finance-stats';
import { parseId, parseRequiredNumber, strOrNull } from '../lib/parse';

/** Converts a "YYYY-MM" string to a [gte, lt) date range, or null if malformed. */
function monthRange(month: string): { gte: Date; lt: Date } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const mon = Number(match[2]);
  if (mon < 1 || mon > 12) return null;
  return { gte: new Date(year, mon - 1, 1), lt: new Date(year, mon, 1) };
}

function sortToOrderBy(sort: string): Prisma.FinanceOrderByWithRelationInput[] {
  // Newest/oldest follow the time the entry was created (createdAt), so the ledger
  // reads in the exact order entries were added — the first created sits at the bottom.
  switch (sort) {
    case 'oldest':
      return [{ createdAt: 'asc' }, { id: 'asc' }];
    case 'highest':
      return [{ amount: 'desc' }, { createdAt: 'desc' }];
    case 'lowest':
      return [{ amount: 'asc' }, { createdAt: 'asc' }];
    case 'newest':
    default:
      return [{ createdAt: 'desc' }, { id: 'desc' }];
  }
}

function parseType(value: unknown): FinanceType {
  const type = typeof value === 'string' ? value.toUpperCase() : '';
  if (type !== 'IN' && type !== 'OUT') {
    throw new AppError(400, 'type must be IN or OUT');
  }
  return type as FinanceType;
}

/** Optional customer id link; null clears it. */
function parseCustomerId(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'Invalid customer');
  return id;
}

// GET /api/finance/ledger?month=&type=&sort= — merged ledger:
// manual finance entries + DELIVERED orders surfaced as income (virtual rows).
export const getLedger = asyncHandler(async (req: Request, res: Response) => {
  const monthParam = typeof req.query.month === 'string' ? req.query.month : '';
  const typeParam = typeof req.query.type === 'string' ? req.query.type.toUpperCase() : '';
  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'newest';

  const [finance, orders] = await Promise.all([
    prisma.finance.findMany({ include: { customer: { select: { name: true } } } }),
    prisma.order.findMany({
      where: { status: OrderStatus.DELIVERED },
      include: {
        customer: { select: { name: true } },
        orderItems: { include: { product: { select: { name: true } } } },
      },
    }),
  ]);

  const rows = [
    ...finance.map((f) => ({
      key: `f${f.id}`,
      source: 'finance' as const,
      financeId: f.id,
      type: f.type as 'IN' | 'OUT',
      date: f.date.toISOString(),
      createdAt: f.createdAt.toISOString(),
      category: f.category,
      desc: f.desc,
      subtitle: null as string | null,
      note: f.note,
      amount: f.amount,
      customerId: f.customerId,
      customerName: f.customer?.name ?? null,
    })),
    ...orders.map((o) => ({
      key: `o${o.id}`,
      source: 'order' as const,
      orderId: o.id,
      type: 'IN' as const,
      // Booked on the placed date so it slots into the ledger where the order
      // was created (see orderIncomeDate) — appearing only once delivered.
      date: orderIncomeDate(o).toISOString(),
      createdAt: o.createdAt.toISOString(),
      category: o.tag || 'Cookie Sales',
      desc: `Order ${o.orderNumber}`,
      subtitle: o.orderItems
        .map((it) => `${it.quantity}× ${it.product?.name ?? 'item'}`)
        .join(', ') || null,
      note: null as string | null,
      amount: o.totalAmount,
      customerId: o.customerId,
      customerName: o.customer?.name ?? null,
    })),
  ];

  let filtered = rows;
  if (monthParam) {
    const r = monthRange(monthParam);
    if (!r) throw new AppError(400, 'month must be in YYYY-MM format');
    filtered = filtered.filter((x) => {
      const d = new Date(x.date);
      return d >= r.gte && d < r.lt;
    });
  }
  if (typeParam === 'IN' || typeParam === 'OUT') {
    filtered = filtered.filter((x) => x.type === typeParam);
  }
  // Journal order: primary by transaction date, tie-broken by when the row was
  // created — so same-day entries read newest-created on top, and an order sits
  // by its placed date (its createdAt) regardless of when it was delivered.
  const cmp = (x: string, y: string) => (x < y ? -1 : x > y ? 1 : 0);
  filtered.sort((a, b) => {
    if (sort === 'highest') return b.amount - a.amount || cmp(b.createdAt, a.createdAt);
    if (sort === 'lowest') return a.amount - b.amount || cmp(a.createdAt, b.createdAt);
    if (sort === 'oldest') return cmp(a.date, b.date) || cmp(a.createdAt, b.createdAt);
    return cmp(b.date, a.date) || cmp(b.createdAt, a.createdAt); // newest
  });

  res.json(filtered);
});

// GET /api/finance?month=YYYY-MM&type=IN&sort=newest
export const listFinance = asyncHandler(async (req: Request, res: Response) => {
  const where: Prisma.FinanceWhereInput = {};

  const month = typeof req.query.month === 'string' ? req.query.month : '';
  if (month) {
    const range = monthRange(month);
    if (!range) throw new AppError(400, 'month must be in YYYY-MM format');
    where.date = { gte: range.gte, lt: range.lt };
  }

  if (typeof req.query.type === 'string' && req.query.type) {
    where.type = parseType(req.query.type);
  }

  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'newest';
  const entries = await prisma.finance.findMany({
    where,
    orderBy: sortToOrderBy(sort),
    include: { customer: { select: { id: true, name: true } } },
  });
  res.json(entries);
});

// GET /api/finance/summary — last 6 months IN/OUT/NET
export const financeSummary = asyncHandler(async (_req: Request, res: Response) => {
  const months = await getMonthlyTotals(6);
  res.json(months);
});

// POST /api/finance
export const createFinance = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Authentication required');
  const body = req.body as Record<string, unknown>;

  const type = parseType(body.type);
  const amount = parseRequiredNumber(body.amount, 'Amount');
  if (amount <= 0) throw new AppError(400, 'Amount must be greater than zero');
  const desc = typeof body.desc === 'string' ? body.desc.trim() : '';
  if (!desc) throw new AppError(400, 'Description is required');
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  if (!category) throw new AppError(400, 'Category is required');

  let date = new Date();
  if (body.date !== undefined && body.date !== null && body.date !== '') {
    date = new Date(body.date as string);
    if (Number.isNaN(date.getTime())) throw new AppError(400, 'Invalid date');
  }

  const entry = await prisma.finance.create({
    data: {
      type,
      amount,
      desc,
      category,
      note: strOrNull(body.note),
      date,
      staffId: req.user.id,
      customerId: parseCustomerId(body.customerId),
    },
  });
  res.status(201).json(entry);
});

// PUT /api/finance/:id
export const updateFinance = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const body = req.body as Record<string, unknown>;
  const data: Prisma.FinanceUpdateInput = {};

  if (body.type !== undefined) data.type = parseType(body.type);
  if (body.amount !== undefined) {
    const amount = parseRequiredNumber(body.amount, 'Amount');
    if (amount <= 0) throw new AppError(400, 'Amount must be greater than zero');
    data.amount = amount;
  }
  if (typeof body.desc === 'string') data.desc = body.desc.trim();
  if (typeof body.category === 'string') data.category = body.category.trim();
  if (body.note !== undefined) data.note = strOrNull(body.note);
  if (body.date !== undefined) {
    const date = new Date(body.date as string);
    if (Number.isNaN(date.getTime())) throw new AppError(400, 'Invalid date');
    data.date = date;
  }
  if (body.customerId !== undefined) {
    const customerId = parseCustomerId(body.customerId);
    data.customer = customerId ? { connect: { id: customerId } } : { disconnect: true };
  }

  const entry = await prisma.finance.update({ where: { id }, data });
  res.json(entry);
});

// DELETE /api/finance/:id
export const deleteFinance = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  await prisma.finance.delete({ where: { id } });
  res.status(204).send();
});
