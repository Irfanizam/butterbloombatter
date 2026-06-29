import { Request, Response } from 'express';
import { FinanceType, OrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../lib/http';
import { getMonthlyTotals } from '../lib/finance-stats';

// GET /api/dashboard — aggregate stats for the admin home
export const getDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [todayOrders, todayAgg, monthFinance, lowStockProducts, recentOrders, statusGroups, monthlyChart] =
    await Promise.all([
      prisma.order.count({
        where: { createdAt: { gte: startOfToday, lt: startOfTomorrow } },
      }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: {
          createdAt: { gte: startOfToday, lt: startOfTomorrow },
          status: { not: OrderStatus.CANCELLED },
        },
      }),
      prisma.finance.findMany({
        where: { date: { gte: startOfMonth, lt: startOfNextMonth } },
        select: { type: true, amount: true },
      }),
      prisma.product.findMany({
        where: { stock: { lt: 10 } },
        orderBy: { stock: 'asc' },
        include: { category: true },
      }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true } } },
      }),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      getMonthlyTotals(6),
    ]);

  const monthRevenue = monthFinance
    .filter((f) => f.type === FinanceType.IN)
    .reduce((sum, f) => sum + f.amount, 0);
  const monthExpenses = monthFinance
    .filter((f) => f.type === FinanceType.OUT)
    .reduce((sum, f) => sum + f.amount, 0);

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
    lowStockProducts,
    recentOrders,
    ordersByStatus,
    monthlyChart,
  });
});
