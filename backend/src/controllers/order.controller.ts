import { Request, Response } from 'express';
import { FinanceType, OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError, asyncHandler } from '../lib/http';
import { parseId, parseRequiredNumber, strOrNull } from '../lib/parse';
import { CreateOrderBody } from '../types';

type TxClient = Prisma.TransactionClient;

// Orders are mirrored into the finance ledger as income, matched back to the
// order by its unique number so cancel/delete can clean the ledger entry up.
const ORDER_SALES_CATEGORY = 'Cookie Sales';
const orderLedgerDesc = (orderNumber: string) => `Order ${orderNumber}`;

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
      // Pre-order business: orders are never blocked by stock. Stock still
      // decrements (may go negative) as a bake-to-order backlog indicator.
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

    for (const item of lineItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    // Mirror the sale into the ledger as income. createdAt defaults to now(),
    // so it interleaves with manual entries by creation time.
    await tx.finance.create({
      data: {
        type: FinanceType.IN,
        amount: total,
        desc: orderLedgerDesc(orderNumber),
        category: ORDER_SALES_CATEGORY,
        date: placedDate ?? new Date(),
        staffId,
        customerId,
      },
    });

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
      // Sale reversed → remove its ledger income
      await tx.finance.deleteMany({
        where: { desc: orderLedgerDesc(existing.orderNumber), category: ORDER_SALES_CATEGORY },
      });
    } else if (status !== OrderStatus.CANCELLED && existing.status === OrderStatus.CANCELLED) {
      // Re-activating a cancelled order → restore its ledger income
      await tx.finance.create({
        data: {
          type: FinanceType.IN,
          amount: existing.totalAmount,
          desc: orderLedgerDesc(existing.orderNumber),
          category: ORDER_SALES_CATEGORY,
          date: existing.createdAt,
          staffId: existing.staffId,
          customerId: existing.customerId,
        },
      });
    }

    return tx.order.update({
      where: { id },
      data: { status },
      include: { orderItems: { include: { product: true } }, customer: true },
    });
  });

  res.json(order);
});

// PATCH /api/orders/:id — edit placed date, delivery date, or tag
export const updateOrder = asyncHandler(async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const body = req.body as Record<string, unknown>;
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

  const order = await prisma.order.update({
    where: { id },
    data,
    include: { orderItems: { include: { product: true } }, customer: true },
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

    // Drop the mirrored ledger income for this order (no-op if already cancelled)
    await tx.finance.deleteMany({
      where: { desc: orderLedgerDesc(existing.orderNumber), category: ORDER_SALES_CATEGORY },
    });
    await tx.orderItem.deleteMany({ where: { orderId: id } });
    await tx.order.delete({ where: { id } });
  });

  res.status(204).send();
});
