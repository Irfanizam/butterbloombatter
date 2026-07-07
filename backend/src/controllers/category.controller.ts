import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../lib/http';
import { parseId } from '../lib/parse';

// GET /api/categories  (public) — manual order (sortOrder), includes product count
export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  res.json(categories);
});

// POST /api/categories  (ADMIN) — new category appended to the end
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { name?: unknown; emoji?: unknown };
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    throw new AppError(400, 'Name is required');
  }
  const emoji = typeof body.emoji === 'string' && body.emoji.trim() ? body.emoji.trim() : undefined;
  const last = await prisma.category.findFirst({ orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
  const sortOrder = (last?.sortOrder ?? -1) + 1;
  const category = await prisma.category.create({
    data: { name, sortOrder, ...(emoji ? { emoji } : {}) },
  });
  res.status(201).json(category);
});

// PUT /api/categories/:id  (ADMIN)
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const body = req.body as { name?: unknown; emoji?: unknown; sortOrder?: unknown };
  const data: Prisma.CategoryUpdateInput = {};
  if (typeof body.name === 'string') data.name = body.name.trim();
  if (typeof body.emoji === 'string') data.emoji = body.emoji.trim();
  if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder;
  const category = await prisma.category.update({ where: { id }, data });
  res.json(category);
});

// PATCH /api/categories/reorder  (ADMIN) — sets sortOrder from the given id order
export const reorderCategories = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { ids?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0) throw new AppError(400, 'ids array is required');
  await prisma.$transaction(
    ids.map((rawId, index) =>
      prisma.category.update({ where: { id: Number(rawId) }, data: { sortOrder: index } })
    )
  );
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  res.json(categories);
});

// DELETE /api/categories/:id  (ADMIN) — blocked if products exist
export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    throw new AppError(409, 'Cannot delete a category that has products');
  }
  await prisma.category.delete({ where: { id } });
  res.status(204).send();
});
