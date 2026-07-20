import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../../services/api';
import { formatDate, formatRM } from '../../lib/format';
import { PageHeader } from '../../components/admin/PageHeader';
import { OrderFormModal } from '../../components/admin/OrderFormModal';
import { OrderDetailDrawer } from '../../components/admin/OrderDetailDrawer';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/Badge';
import type { OrderStatus } from '../../types';

const TABS: ('ALL' | OrderStatus)[] = [
  'ALL',
  'PENDING',
  'CONFIRMED',
  'BAKING',
  'PACKED',
  'DELIVERED',
  'CANCELLED',
];

export function Orders() {
  // Fetch a generous page and tab/count client-side (order volume is small).
  const { data, isLoading } = useQuery({
    queryKey: ['orders', 'all'],
    queryFn: () => ordersApi.list({ limit: 100 }),
  });
  const orders = data?.orders ?? [];

  const [tab, setTab] = useState<'ALL' | OrderStatus>('ALL');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'total-desc' | 'total-asc'>('newest');
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const list = (tab === 'ALL' ? orders : orders.filter((o) => o.status === tab)).slice();
    if (sort === 'oldest') list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (sort === 'total-desc') list.sort((a, b) => b.totalAmount - a.totalAmount);
    else if (sort === 'total-asc') list.sort((a, b) => a.totalAmount - b.totalAmount);
    else list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [orders, tab, sort]);

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Orders"
        count={orders.length}
        actions={<Button onClick={() => setCreateOpen(true)}>+ Create Order</Button>}
      />

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-brand px-3 py-1.5 text-sm font-semibold transition-colors ${
              tab === t ? 'bg-hero text-white' : 'bg-white text-brand-muted hover:bg-brand-soft'
            }`}
          >
            {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
            <span className="ml-1.5 text-xs opacity-80">{counts[t] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="mb-4">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded-brand border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="newest">Sort: Newest</option>
          <option value="oldest">Sort: Oldest</option>
          <option value="total-desc">Sort: Total ↓</option>
          <option value="total-asc">Sort: Total ↑</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-brand-lg border border-brand-border-soft bg-white shadow-brand-sm">
          <table className="w-full text-sm">
            <thead className="bg-brand-soft text-left text-brand-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Order #</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  className="cursor-pointer border-t border-brand-border-soft hover:bg-brand-soft/50"
                  onClick={() => setDetailId(o.id)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-brand-dark">{o.orderNumber}</div>
                    {o.tag && <div className="text-xs text-brand-faded">{o.tag}</div>}
                  </td>
                  <td className="px-4 py-3 text-brand-muted">{o.customer?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-brand-faded">{formatDate(o.createdAt)}</td>
                  <td className="px-4 py-3 text-brand-muted">{o._count?.orderItems ?? 0}</td>
                  <td className="px-4 py-3 text-brand-muted">{formatRM(o.totalAmount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-brand-faded">
                    No orders in this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <OrderFormModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <OrderDetailDrawer orderId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
