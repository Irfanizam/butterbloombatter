import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../lib/http';
import { strOrNull } from '../lib/parse';

// POST /api/inquiries  (PUBLIC) — captures a storefront enquiry as a customer lead.
// Public visitors can't create orders/customers directly (those are auth-guarded),
// so an enquiry upserts a Customer by email and stores the message in notes.
export const createInquiry = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!name) throw new AppError(400, 'Name is required');
  if (!email) throw new AppError(400, 'Email is required');
  if (!message) throw new AppError(400, 'Message is required');

  const phone = strOrNull(body.phone);
  const note = `[Inquiry] ${message}`;

  const customer = await prisma.customer.upsert({
    where: { email },
    update: { notes: note, ...(phone ? { phone } : {}) },
    create: { name, email, phone, notes: note },
  });

  res.status(201).json({ ok: true, customerId: customer.id });
});
