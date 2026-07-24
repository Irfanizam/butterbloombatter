import { Request, Response } from 'express';
import { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../lib/http';
import { parseId, parseRequiredNumber, strOrNull } from '../lib/parse';
import { CreateOrderBody } from '../types';

type TxClient = Prisma.TransactionClient;

// Completed (DELIVERED) orders are surfaced as income in the finance ledger
// virtually (computed from orders), so there is no mirrored Finance row to keep
// in sync — see finance.controller getLedger + finance-stats.

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

// POST /api/orders — creates the order
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

  // Optional "placed" date — lets admin back-date manually entered past orders.
  let placedDate: Date | null = null;
  if (typeof body.placedDate === 'string' && body.placedDate) {
    placedDate = new Date(body.placedDate);
    if (Number.isNaN(placedDate.getTime())) throw new AppError(400, 'Invalid order date');
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
      // Optional price override — lets admin back-date past orders at the price
      // that applied at the time. Falls back to the product's current price.
      const hasOverride =
        item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== '';
      const unitPrice = hasOverride ? parseRequiredNumber(item.unitPrice, 'Unit price') : product.price;
      if (unitPrice < 0) throw new AppError(400, 'Unit price cannot be negative');
      total += unitPrice * quantity;
      lineItems.push({ productId, quantity, unitPrice });
    }

    const year = (placedDate ?? new Date()).getFullYear();
    const orderNumber = await generateOrderNumber(tx, year);

    const created = await tx.order.create({
      data: {
        orderNumber,
        customerId,
        staffId,
        totalAmount: total,
        notes: strOrNull(body.notes),
        tag: strOrNull(body.tag),
        deliveryDate,
        ...(placedDate ? { createdAt: placedDate } : {}),
        orderItems: { create: lineItems },
      },
      include: { orderItems: { include: { product: true } }, customer: true },
    });

    return created;
  });

  res.status(201).json(order);
});

// PATCH /api/orders/:id/status
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const body = req.body as { status?: unknown };
  const status = typeof body.status === 'string' ? body.status : '';
  if (!isOrderStatus(status)) throw new AppError(400, 'Invalid status');

  const order = await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id }, include: { orderItems: true } });
    if (!existing) throw new AppError(404, 'Order not found');

    // Stamp completion when entering DELIVERED; clear it when leaving.
    const data: Prisma.OrderUpdateInput = { status };
    if (status === OrderStatus.DELIVERED && existing.status !== OrderStatus.DELIVERED) {
      data.completedAt = new Date();
    } else if (status !== OrderStatus.DELIVERED && existing.status === OrderStatus.DELIVERED) {
      data.completedAt = null;
    }

    return tx.order.update({
      where: { id },
      data,
      include: { orderItems: { include: { product: true } }, customer: true },
    });
  });

  res.json(order);
});

// PATCH /api/orders/:id — edit an order (dates, tag, notes, customer, and items)
export const updateOrder = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const body = req.body as CreateOrderBody & Record<string, unknown>;

  const order = await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id }, include: { orderItems: true } });
    if (!existing) throw new AppError(404, 'Order not found');

    const data: Prisma.OrderUpdateInput = {};

    if (body.placedDate !== undefined) {
      const d = new Date(body.placedDate as string);
      if (Number.isNaN(d.getTime())) throw new AppError(400, 'Invalid order date');
      data.createdAt = d;
    }
    if (body.deliveryDate !== undefined) {
      if (!body.deliveryDate) data.deliveryDate = null;
      else {
        const d = new Date(body.deliveryDate as string);
        if (Number.isNaN(d.getTime())) throw new AppError(400, 'Invalid delivery date');
        data.deliveryDate = d;
      }
    }
    if (body.tag !== undefined) data.tag = strOrNull(body.tag);
    if (body.notes !== undefined) data.notes = strOrNull(body.notes);
    if (body.customerId !== undefined) {
      const cid = parseRequiredNumber(body.customerId, 'Customer');
      const customer = await tx.customer.findUnique({ where: { id: cid } });
      if (!customer) throw new AppError(400, 'Customer does not exist');
      data.customer = { connect: { id: cid } };
    }

    // Replace line items if provided: recreate and recompute total.
    if (Array.isArray(body.items)) {
      const items = body.items;
      if (items.length === 0) throw new AppError(400, 'At least one order item is required');
      await tx.orderItem.deleteMany({ where: { orderId: id } });

      let total = 0;
      const lineItems: { productId: number; quantity: number; unitPrice: number }[] = [];
      for (const item of items) {
        const productId = parseRequiredNumber(item.productId, 'Product');
        const quantity = parseRequiredNumber(item.quantity, 'Quantity');
        if (quantity <= 0) throw new AppError(400, 'Quantity must be greater than zero');
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) throw new AppError(400, `Product ${productId} does not exist`);
        const hasOverride =
          item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== '';
        const unitPrice = hasOverride ? parseRequiredNumber(item.unitPrice, 'Unit price') : product.price;
        if (unitPrice < 0) throw new AppError(400, 'Unit price cannot be negative');
        total += unitPrice * quantity;
        lineItems.push({ productId, quantity, unitPrice });
      }
      await tx.orderItem.createMany({ data: lineItems.map((li) => ({ ...li, orderId: id })) });
      data.totalAmount = total;
    }

    return tx.order.update({
      where: { id },
      data,
      include: { orderItems: { include: { product: true } }, customer: true },
    });
  });

  res.json(order);
});

// DELETE /api/orders/:id (ADMIN)
export const deleteOrder = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  await prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Order not found');

    await tx.orderItem.deleteMany({ where: { orderId: id } });
    await tx.order.delete({ where: { id } });
  });

  res.status(204).send();
});
