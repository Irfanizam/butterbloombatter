import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../services/api';
import { useAuthStore } from '../../store/auth.store';
import { formatDate, formatRM, greeting, monthLabel } from '../../lib/format';
import { Spinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/Badge';
import type { MonthlyTotal } from '../../types';

function StatCard({ label, value, tint = 'text-brand-dark' }: { label: string; value: string; tint?: string }) {
  return (
    <div className="rounded-brand-lg border border-brand-border-soft bg-white p-4 shadow-brand-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-faded">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tint}`}>{value}</p>
    </div>
  );
}

function MonthlyChart({ data }: { data: MonthlyTotal[] }) {
  const max = Math.max(1, ...data.flatMap((m) => [m.in, m.out]));
  return (
    <div className="rounded-brand-lg border border-brand-border-soft bg-white p-5 shadow-brand-sm">
      <h2 className="mb-4 font-bold text-brand-dark">Last 6 months</h2>
      <div className="flex items-end justify-between gap-3" style={{ height: 180 }}>
        {data.map((m) => (
          <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-[140px] w-full items-end justify-center gap-1">
              <div
                className="w-1/2 rounded-t bg-brand-green"
                style={{ height: `${(m.in / max) * 100}%` }}
                title={`In: ${formatRM(m.in)}`}
              />
              <div
                className="w-1/2 rounded-t bg-brand-red"
                style={{ height: `${(m.out / max) * 100}%` }}
                title={`Out: ${formatRM(m.out)}`}
              />
            </div>
            <span className="text-xs text-brand-faded">{monthLabel(m.month)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-4 text-xs text-brand-muted">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-brand-green" /> Income
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-brand-red" /> Expenses
        </span>
      </div>
    </div>
  );
}

export function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
  });

  return (
    <div className="p-4 md:p-6">
      {/* Hero */}
      <div className="rounded-brand-lg bg-hero p-6 text-white shadow-brand-lg">
        <h1 className="text-2xl font-bold">
          {greeting()}, {user?.name ?? 'there'} 🧁
        </h1>
        <p className="mt-1 text-white/80">{formatDate(new Date())}</p>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      )}
      {isError && (
        <p className="mt-6 rounded-brand bg-brand-red-light px-4 py-3 text-brand-red">
          Failed to load dashboard. Is the API running?
        </p>
      )}

      {data && (
        <>
          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Orders Today" value={String(data.todayOrders)} />
            <StatCard label="Revenue Today" value={formatRM(data.todayRevenue)} />
            <StatCard label="Month Revenue" value={formatRM(data.monthRevenue)} tint="text-brand-green" />
            <StatCard
              label="Month Net"
              value={formatRM(data.monthNet)}
              tint={data.monthNet >= 0 ? 'text-brand-green' : 'text-brand-red'}
            />
          </div>

          {/* Overview */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard label="Total Income (month)" value={formatRM(data.monthRevenue)} tint="text-brand-green" />
            <StatCard label="Total Expenses (month)" value={formatRM(data.monthExpenses)} tint="text-brand-red" />
            <StatCard label="Net Profit (month)" value={formatRM(data.monthNet)} tint="text-brand-gold" />
          </div>

          {/* Chart */}
          <div className="mt-4">
            <MonthlyChart data={data.monthlyChart} />
          </div>

          {/* Recent orders + low stock */}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-brand-lg border border-brand-border-soft bg-white p-5 shadow-brand-sm">
              <h2 className="mb-3 font-bold text-brand-dark">Recent Orders</h2>
              {data.recentOrders.length === 0 ? (
                <p className="text-sm text-brand-faded">No orders yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-brand-faded">
                      <th className="pb-2 font-semibold">Order</th>
                      <th className="pb-2 font-semibold">Customer</th>
                      <th className="pb-2 font-semibold">Total</th>
                      <th className="pb-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((o) => (
                      <tr key={o.id} className="border-t border-brand-border-soft">
                        <td className="py-2 font-medium text-brand-dark">{o.orderNumber}</td>
                        <td className="py-2 text-brand-muted">{o.customer?.name ?? '—'}</td>
                        <td className="py-2 text-brand-muted">{formatRM(o.totalAmount)}</td>
                        <td className="py-2">
                          <StatusBadge status={o.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-brand-lg border border-brand-border-soft bg-white p-5 shadow-brand-sm">
              <h2 className="mb-3 font-bold text-brand-dark">Low Stock (&lt; 10)</h2>
              {data.lowStockProducts.length === 0 ? (
                <p className="text-sm text-brand-faded">Everything is well stocked. 🎉</p>
              ) : (
                <ul className="space-y-2">
                  {data.lowStockProducts.map((p) => (
                    <li key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-brand-dark">{p.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.stock === 0
                            ? 'bg-brand-red-light text-brand-red'
                            : 'bg-brand-accent-light text-brand-gold'
                        }`}
                      >
                        {p.stock} left
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
