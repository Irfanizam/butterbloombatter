import { Request, Response } from 'express';
import { FinanceType, OrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/http';
import { getMonthlySalesVsExpenses } from '../lib/finance-stats';

// GET /api/dashboard — aggregate stats for the admin home
export const getDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const notCancelled = { status: { not: OrderStatus.CANCELLED } } as const;

  const [todayOrders, todayAgg, monthOrdersAgg, monthExpenseAgg, recentOrders, statusGroups, monthlyChart] =
    await Promise.all([
      prisma.order.count({
        where: { createdAt: { gte: startOfToday, lt: startOfTomorrow } },
      }),
      // Revenue = orders (sales), not finance entries
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { createdAt: { gte: startOfToday, lt: startOfTomorrow }, ...notCancelled },
      }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { createdAt: { gte: startOfMonth, lt: startOfNextMonth }, ...notCancelled },
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

  const monthRevenue = monthOrdersAgg._sum.totalAmount ?? 0;
  const monthExpenses = monthExpenseAgg._sum.amount ?? 0;

  const ordersByStatus: Record<string, number> = {};
  for (const group of statusGroups) {
    ordersByStatus[group.status] = group._count._all;
  }

  res.json({
    todayOrders,
    todayRevenue: todayAgg._sum.totalAmount ?? 0,
    monthRevenue,
    monthExpenses,
    monthNet: monthRevenue - monthExpenses,
    lowStockProducts: [],
    recentOrders,
    ordersByStatus,
    monthlyChart,
  });
});
