import { Request, Response } from 'express';
import { FinanceType, OrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/http';
import { getMonthlySalesVsExpenses, orderIncomeDate } from '../lib/finance-stats';

// GET /api/dashboard — aggregate stats for the admin home
export const getDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [todayOrders, deliveredOrders, monthExpenseAgg, recentOrders, statusGroups, monthlyChart] =
    await Promise.all([
      prisma.order.count({
        where: { createdAt: { gte: startOfToday, lt: startOfTomorrow } },
      }),
      // Revenue = DELIVERED orders, booked on their income date (delivery date)
      prisma.order.findMany({
        where: { status: OrderStatus.DELIVERED },
        select: { totalAmount: true, deliveryDate: true, completedAt: true, createdAt: true },
      }),
      // Expenses = Finance OUT entries (manual)
      prisma.finance.aggregate({
        _sum: { amount: true },
        where: { type: FinanceType.OUT, date: { gte: startOfMonth, lt: startOfNextMonth } },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true } } },
      }),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      getMonthlySalesVsExpenses(6),
    ]);

  const inRange = (d: Date, gte: Date, lt: Date) => d >= gte && d < lt;
  const todayRevenue = deliveredOrders
    .filter((o) => inRange(orderIncomeDate(o), startOfToday, startOfTomorrow))
    .reduce((s, o) => s + o.totalAmount, 0);
  const monthRevenue = deliveredOrders
    .filter((o) => inRange(orderIncomeDate(o), startOfMonth, startOfNextMonth))
    .reduce((s, o) => s + o.totalAmount, 0);
  const monthExpenses = monthExpenseAgg._sum.amount ?? 0;

  const ordersByStatus: Record<string, number> = {};
  for (const group of statusGroups) {
    ordersByStatus[group.status] = group._count._all;
  }

  res.json({
    todayOrders,
    todayRevenue,
    monthRevenue,
    monthExpenses,
    monthNet: monthRevenue - monthExpenses,
    lowStockProducts: [],
    recentOrders,
    ordersByStatus,
    monthlyChart,
  });
});
