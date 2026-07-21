import { Request, Response } from 'express';
import { FinanceType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../lib/http';
import { getMonthlyTotals } from '../lib/finance-stats';
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
  // Secondary `id` keeps same-date entries in the order they were created,
  // so the ledger follows the real business timeline instead of an arbitrary tie order.
  switch (sort) {
    case 'oldest':
      return [{ date: 'asc' }, { id: 'asc' }];
    case 'highest':
      return [{ amount: 'desc' }, { id: 'desc' }];
    case 'lowest':
      return [{ amount: 'asc' }, { id: 'asc' }];
    case 'newest':
    default:
      return [{ date: 'desc' }, { id: 'desc' }];
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
