import { Request, Response } from 'express';
import { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../lib/http';
import { parseId, parseRequiredNumber, strOrNull } from '../lib/parse';
import { CreateOrderBody } from '../types';

type TxClient = Prisma.TransactionClient;

function isOrderStatus(value: string): value is OrderStatus {
  return (Object.values(OrderStatus) as string[]).includes(value);
}

/** Generates the next BBB-YYYY-XXXX number within a transaction. */
async function generateOrderNumber(tx: TxClient, year: number): Promise<string> {
  const prefix = `BBB-${year}-`;
  const last = await tx.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true },
  });
  let next = 1;
  if (last) {
    const parsed = Number(last.orderNumber.slice(prefix.length));
    if (!Number.isNaN(parsed)) next = parsed + 1;
  }
  return `${prefix}${String(next).padStart(4, '0')}`;
}

// GET /api/orders?status=&customerId=&page=&limit=
export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  const where: Prisma.OrderWhereInput = {};
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  if (status) {
    if (!isOrderStatus(status)) throw new AppError(400, 'Invalid status filter');
    where.status = status;
  }
  const customerId = typeof req.query.customerId === 'string' ? Number(req.query.customerId) : NaN;
  if (Number.isInteger(customerId) && customerId > 0) {
    where.customerId = customerId;
  }

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        _count: { select: { orderItems: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  res.json({ orders, total, page, limit });
});

// GET /api/orders/:id
export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      orderItems: { include: { product: true } },
      customer: true,
      staff: { select: { id: true, name: true, email: true } },
    },
  });
  if (!order) throw new AppError(404, 'Order not found');
  res.json(order);
});

// POST /api/orders — creates the order and deducts stock atomically
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new AppError(401, 'Authentication required');
  const staffId = req.user.id;
  const body = req.body as CreateOrderBody;

  const customerId = parseRequiredNumber(body.customerId, 'Customer');
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) throw new AppError(400, 'At least one order item is required');

  let deliveryDate: Date | null = null;
  if (typeof body.deliveryDate === 'string' && body.deliveryDate) {
    deliveryDate = new Date(body.deliveryDate);
    if (Number.isNaN(deliveryDate.getTime())) throw new AppError(400, 'Invalid delivery date');
  }

  const order = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new AppError(400, 'Customer does not exist');

    let total = 0;
    const lineItems: { productId: number; quantity: number; unitPrice: number }[] = [];
    for (const item of items) {
      const productId = parseRequiredNumber(item.productId, 'Product');
      const quantity = parseRequiredNumber(item.quantity, 'Quantity');
      if (quantity <= 0) throw new AppError(400, 'Quantity must be greater than zero');

      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new AppError(400, `Product ${productId} does not exist`);
      if (product.stock < quantity) {
        throw new AppError(409, `Insufficient stock for ${product.name}`);
      }
      total += product.price * quantity;
      lineItems.push({ productId, quantity, unitPrice: product.price });
    }

    const orderNumber = await generateOrderNumber(tx, new Date().getFullYear());

    const created = await tx.order.create({
      data: {
        orderNumber,
        customerId,
        staffId,
        totalAmount: total,
        notes: strOrNull(body.notes),
        deliveryDate,
        orderItems: { create: lineItems },
      },
      include: { orderItems: { include: { product: true } }, customer: true },
    });

    for (const item of lineItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return created;
  });

  res.status(201).json(order);
});

// PATCH /api/orders/:id/status — restores stock when cancelling
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const body = req.body as { status?: unknown };
  const status = typeof body.status === 'string' ? body.status : '';
  if (!isOrderStatus(status)) throw new AppError(400, 'Invalid status');

  const order = await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id }, include: { orderItems: true } });
    if (!existing) throw new AppError(404, 'Order not found');

    if (status === OrderStatus.CANCELLED && existing.status !== OrderStatus.CANCELLED) {
      for (const item of existing.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    return tx.order.update({
      where: { id },
      data: { status },
      include: { orderItems: { include: { product: true } }, customer: true },
    });
  });

  res.json(order);
});

// DELETE /api/orders/:id (ADMIN) — restores stock unless already cancelled
export const deleteOrder = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id }, include: { orderItems: true } });
    if (!existing) throw new AppError(404, 'Order not found');

    if (existing.status !== OrderStatus.CANCELLED) {
      for (const item of existing.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    await tx.orderItem.deleteMany({ where: { orderId: id } });
    await tx.order.delete({ where: { id } });
  });

  res.status(204).send();
});
