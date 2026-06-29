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

// POST /api/customers  (protected)
export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (!name) throw new AppError(400, 'Name is required');
  if (!email) throw new AppError(400, 'Email is required');
  const customer = await prisma.customer.create({
    data: {
      name,
      email,
      phone: strOrNull(body.phone),
      address: strOrNull(body.address),
      notes: strOrNull(body.notes),
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
  if (typeof body.email === 'string') data.email = body.email.trim();
  if (body.phone !== undefined) data.phone = strOrNull(body.phone);
  if (body.address !== undefined) data.address = strOrNull(body.address);
  if (body.notes !== undefined) data.notes = strOrNull(body.notes);
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
