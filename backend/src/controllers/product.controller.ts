import fs from 'fs';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../lib/http';
import { parseBool, parseId, parseRequiredNumber } from '../lib/parse';
import { deleteImage, uploadImage } from '../services/cloudinary.service';

async function removeTempFile(filePath: string): Promise<void> {
  await fs.promises.unlink(filePath).catch(() => {
    /* best effort */
  });
}

async function ensureCategoryExists(categoryId: number): Promise<void> {
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new AppError(400, 'Category does not exist');
  }
}

// GET /api/products  (public) — only available products
export const listPublicProducts = asyncHandler(async (_req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    where: { isAvailable: true },
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(products);
});

// GET /api/products/admin  (protected) — every product
export const listAdminProducts = asyncHandler(async (_req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    include: { category: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(products);
});

// GET /api/products/:id
export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });
  if (!product) {
    throw new AppError(404, 'Product not found');
  }
  res.json(product);
});

// POST /api/products  (ADMIN, multipart with optional `image`)
export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    if (req.file) await removeTempFile(req.file.path);
    throw new AppError(400, 'Name is required');
  }
  const price = parseRequiredNumber(body.price, 'Price');
  const categoryId = parseRequiredNumber(body.categoryId, 'Category');
  const stock = body.stock !== undefined ? parseRequiredNumber(body.stock, 'Stock') : 0;
  await ensureCategoryExists(categoryId);

  let imageUrl: string | null = null;
  let imagePublicId: string | null = null;
  if (req.file) {
    const uploaded = await uploadImage(req.file.path);
    await removeTempFile(req.file.path);
    imageUrl = uploaded.url;
    imagePublicId = uploaded.publicId;
  }

  const product = await prisma.product.create({
    data: {
      name,
      description: typeof body.description === 'string' ? body.description : null,
      price,
      stock,
      isAvailable: parseBool(body.isAvailable, true),
      isFeatured: parseBool(body.isFeatured, false),
      categoryId,
      imageUrl,
      imagePublicId,
    },
  });
  res.status(201).json(product);
});

// PUT /api/products/:id  (ADMIN, multipart with optional new `image`)
export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    if (req.file) await removeTempFile(req.file.path);
    throw new AppError(404, 'Product not found');
  }

  const body = req.body as Record<string, unknown>;
  const data: Prisma.ProductUpdateInput = {};
  if (typeof body.name === 'string') data.name = body.name.trim();
  if (body.description !== undefined) {
    data.description = typeof body.description === 'string' ? body.description : null;
  }
  if (body.price !== undefined) data.price = parseRequiredNumber(body.price, 'Price');
  if (body.stock !== undefined) data.stock = parseRequiredNumber(body.stock, 'Stock');
  if (body.isAvailable !== undefined) data.isAvailable = parseBool(body.isAvailable, existing.isAvailable);
  if (body.isFeatured !== undefined) data.isFeatured = parseBool(body.isFeatured, existing.isFeatured);
  if (body.categoryId !== undefined) {
    const categoryId = parseRequiredNumber(body.categoryId, 'Category');
    await ensureCategoryExists(categoryId);
    data.category = { connect: { id: categoryId } };
  }

  if (req.file) {
    const uploaded = await uploadImage(req.file.path);
    await removeTempFile(req.file.path);
    if (existing.imagePublicId) {
      await deleteImage(existing.imagePublicId).catch(() => {
        /* don't fail the update if old image cleanup fails */
      });
    }
    data.imageUrl = uploaded.url;
    data.imagePublicId = uploaded.publicId;
  }

  const product = await prisma.product.update({ where: { id }, data });
  res.json(product);
});

// DELETE /api/products/:id  (ADMIN) — also removes Cloudinary image
export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'Product not found');
  }
  const orderItemCount = await prisma.orderItem.count({ where: { productId: id } });
  if (orderItemCount > 0) {
    throw new AppError(409, 'Cannot delete a product that appears in orders');
  }
  if (existing.imagePublicId) {
    await deleteImage(existing.imagePublicId).catch(() => {
      /* best effort */
    });
  }
  await prisma.product.delete({ where: { id } });
  res.status(204).send();
});

// PATCH /api/products/:id/stock  (protected)
export const updateStock = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const stock = parseRequiredNumber((req.body as Record<string, unknown>).stock, 'Stock');
  const product = await prisma.product.update({ where: { id }, data: { stock } });
  res.json(product);
});

// PATCH /api/products/:id/featured  (protected) — toggle
export const toggleFeatured = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError(404, 'Product not found');
  }
  const product = await prisma.product.update({
    where: { id },
    data: { isFeatured: !existing.isFeatured },
  });
  res.json(product);
});
