import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../lib/http';
import { parseId } from '../lib/parse';

function parseRating(value: unknown): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 5) throw new AppError(400, 'Rating must be 1–5');
  return n;
}

// GET /api/reviews  (public) — published only
export const listPublicReviews = asyncHandler(async (_req: Request, res: Response) => {
  const reviews = await prisma.review.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
  res.json(reviews);
});

// GET /api/reviews/admin  (protected) — all reviews
export const listAdminReviews = asyncHandler(async (_req: Request, res: Response) => {
  const reviews = await prisma.review.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
  res.json(reviews);
});

// POST /api/reviews  (ADMIN)
export const createReview = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const author = typeof body.author === 'string' ? body.author.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!author) throw new AppError(400, 'Author is required');
  if (!message) throw new AppError(400, 'Message is required');
  const review = await prisma.review.create({
    data: {
      author,
      message,
      rating: body.rating !== undefined ? parseRating(body.rating) : 5,
      isPublished: body.isPublished === undefined ? true : Boolean(body.isPublished),
    },
  });
  res.status(201).json(review);
});

// PUT /api/reviews/:id  (ADMIN)
export const updateReview = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const body = req.body as Record<string, unknown>;
  const data: Prisma.ReviewUpdateInput = {};
  if (typeof body.author === 'string') data.author = body.author.trim();
  if (typeof body.message === 'string') data.message = body.message.trim();
  if (body.rating !== undefined) data.rating = parseRating(body.rating);
  if (body.isPublished !== undefined) data.isPublished = Boolean(body.isPublished);
  const review = await prisma.review.update({ where: { id }, data });
  res.json(review);
});

// DELETE /api/reviews/:id  (ADMIN)
export const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  await prisma.review.delete({ where: { id } });
  res.status(204).send();
});
