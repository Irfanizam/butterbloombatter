import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../lib/http';
import { parseId, strOrNull } from '../lib/parse';

// GET /api/customers?q=  (protected) — searchable by name/email/phone, includes order count
export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const where: Prisma.CustomerWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};
  const customers = await prisma.customer.findMany({
    where,
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(customers);
});

// GET /api/customers/:id  (protected) — full order history + total spend
export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { orders: { orderBy: { createdAt: 'desc' } } },
  });
  if (!customer) {
    throw new AppError(404, 'Customer not found');
  }
  const totalSpent = customer.orders.reduce((sum, order) => sum + order.totalAmount, 0);
  res.json({ ...customer, totalSpent });
});

function parseOptionalDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new AppError(400, 'Invalid joined date');
  return d;
}

// POST /api/customers  (protected) — email is optional (admin-created orders)
export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) throw new AppError(400, 'Name is required');
  const customer = await prisma.customer.create({
    data: {
      name,
      email: strOrNull(body.email),
      phone: strOrNull(body.phone),
      address: strOrNull(body.address),
      notes: strOrNull(body.notes),
      joinedDate: parseOptionalDate(body.joinedDate),
    },
  });
  res.status(201).json(customer);
});

// PUT /api/customers/:id  (protected)
export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const body = req.body as Record<string, unknown>;
  const data: Prisma.CustomerUpdateInput = {};
  if (typeof body.name === 'string') data.name = body.name.trim();
  if (body.email !== undefined) data.email = strOrNull(body.email);
  if (body.phone !== undefined) data.phone = strOrNull(body.phone);
  if (body.address !== undefined) data.address = strOrNull(body.address);
  if (body.notes !== undefined) data.notes = strOrNull(body.notes);
  if (body.joinedDate !== undefined) data.joinedDate = parseOptionalDate(body.joinedDate);
  const customer = await prisma.customer.update({ where: { id }, data });
  res.json(customer);
});

// DELETE /api/customers/:id  (ADMIN) — blocked if orders exist
export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const orderCount = await prisma.order.count({ where: { customerId: id } });
  if (orderCount > 0) {
    throw new AppError(409, 'Cannot delete a customer with existing orders');
  }
  await prisma.customer.delete({ where: { id } });
  res.status(204).send();
});
