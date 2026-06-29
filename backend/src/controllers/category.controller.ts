import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../lib/http';
import { parseId } from '../lib/parse';

// GET /api/categories  (public) — includes product count
export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(categories);
});

// POST /api/categories  (ADMIN)
export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { name?: unknown; emoji?: unknown };
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    throw new AppError(400, 'Name is required');
  }
  const emoji = typeof body.emoji === 'string' && body.emoji.trim() ? body.emoji.trim() : undefined;
  const category = await prisma.category.create({
    data: { name, ...(emoji ? { emoji } : {}) },
  });
  res.status(201).json(category);
});

// PUT /api/categories/:id  (ADMIN)
export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const body = req.body as { name?: unknown; emoji?: unknown };
  const data: Prisma.CategoryUpdateInput = {};
  if (typeof body.name === 'string') data.name = body.name.trim();
  if (typeof body.emoji === 'string') data.emoji = body.emoji.trim();
  const category = await prisma.category.update({ where: { id }, data });
  res.json(category);
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
