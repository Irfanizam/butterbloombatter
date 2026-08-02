import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, dashboardApi, financeApi, ordersApi, type FinanceListParams } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { useAuthStore } from '../../store/auth.store';
import { formatDate, formatRM, greeting, monthLabel } from '../../lib/format';
import { PageHeader } from '../../components/admin/PageHeader';
import { FinanceFormModal } from '../../components/admin/FinanceFormModal';
import { OrderFormModal } from '../../components/admin/OrderFormModal';
import { MonthlyBars } from '../../components/ui/MonthlyBars';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { Finance as FinanceEntry, LedgerRow } from '../../types';

function StatCard({ label, value, tint = 'text-brand-dark' }: { label: string; value: string; tint?: string }) {
  return (
    <div className="rounded-brand-lg border border-brand-border-soft bg-white p-4 shadow-brand-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-faded">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tint}`}>{value}</p>
    </div>
  );
}

type SortOption = NonNullable<FinanceListParams['sort']>;

export function Finance() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [month, setMonth] = useState<string>('all');
  const [type, setType] = useState<'all' | 'IN' | 'OUT'>('all');
  const [sort, setSort] = useState<SortOption>('newest');

  const user = useAuthStore((s) => s.user);
  const { data: dash } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get });

  const params: FinanceListParams = {
    sort,
    ...(month !== 'all' ? { month } : {}),
    ...(type !== 'all' ? { type } : {}),
  };
  const { data: rows, isLoading } = useQuery({
    queryKey: ['ledger', params],
    queryFn: () => financeApi.ledger(params),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [deleting, setDeleting] = useState<{ id: number; desc: string } | null>(null);

  // Editing an order income row opens the full order editor (the row *is* the order).
  const [editOrderId, setEditOrderId] = useState<number | null>(null);
  const { data: editOrder } = useQuery({
    queryKey: ['order', editOrderId],
    queryFn: () => ordersApi.get(editOrderId as number),
    enabled: editOrderId != null,
  });

  const totals = useMemo(() => {
    const list = rows ?? [];
    const income = list.filter((r) => r.type === 'IN').reduce((s, r) => s + r.amount, 0);
    const expense = list.filter((r) => r.type === 'OUT').reduce((s, r) => s + r.amount, 0);
    return { income, expense, net: income - expense };
  }, [rows]);

  /** Reconstruct a Finance entry from a ledger row so the modal can edit it. */
  const editFinanceRow = (row: LedgerRow) => {
    if (row.source !== 'finance' || row.financeId == null) return;
    setEditing({
      id: row.financeId,
      type: row.type,
      amount: row.amount,
      desc: row.desc,
      category: row.category,
      note: row.note,
      date: row.date,
      staffId: 0,
      customerId: row.customerId ?? null,
      customer: row.customerName ? { id: row.customerId ?? 0, name: row.customerName } : null,
      createdAt: row.date,
    });
    setFormOpen(true);
  };

  const removeEntry = useMutation({
    mutationFn: (id: number) => financeApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Entry deleted');
      setDeleting(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete entry')),
  });

  // Manual reorder (up/down) — only meaningful in the default "Newest" view.
  const [reorder, setReorder] = useState(false);
  const rowId = (r: LedgerRow) => ({ source: r.source, id: (r.financeId ?? r.orderId) as number });
  const swap = useMutation({
    mutationFn: ({ a, b }: { a: LedgerRow; b: LedgerRow }) => financeApi.swapLedger(rowId(a), rowId(b)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ledger'] }),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not move row')),
  });
  const move = (index: number, dir: -1 | 1) => {
    const list = rows ?? [];
    const other = list[index + dir];
    if (!other || swap.isPending) return;
    swap.mutate({ a: list[index], b: other });
  };
  const canReorder = reorder && sort === 'newest' && month === 'all' && type === 'all';

  const selectCls =
    'rounded-brand border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary';

  return (
    <div className="p-4 md:p-6">
      {/* Greeting hero */}
      <div className="mb-4 rounded-brand-lg bg-hero p-6 text-white shadow-brand-lg">
        <h1 className="text-2xl font-bold">
          {greeting()}, {user?.name ?? 'there'} 🌻
        </h1>
        <p className="mt-1 text-white/80">{formatDate(new Date())}</p>
      </div>

      {/* Today / month snapshot */}
      {dash && (
        <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Orders Today" value={String(dash.todayOrders)} />
          <StatCard label="Revenue Today" value={formatRM(dash.todayRevenue)} />
          <StatCard label="Month Revenue" value={formatRM(dash.monthRevenue)} tint="text-brand-green" />
          <StatCard
            label="Month Net"
            value={formatRM(dash.monthNet)}
            tint={dash.monthNet >= 0 ? 'text-brand-green' : 'text-brand-red'}
          />
        </div>
      )}

      <PageHeader
        title="Finance"
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + Add Entry
          </Button>
        }
      />

      {/* Ledger overview (recorded finance entries — respects the filters below) */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-brand-lg border border-brand-border-soft bg-white p-4 shadow-brand-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-faded">Recorded income</p>
          <p className="mt-1 text-2xl font-bold text-brand-green">{formatRM(totals.income)}</p>
        </div>
        <div className="rounded-brand-lg border border-brand-border-soft bg-white p-4 shadow-brand-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-faded">Recorded expenses</p>
          <p className="mt-1 text-2xl font-bold text-brand-red">{formatRM(totals.expense)}</p>
        </div>
        <div className="rounded-brand-lg border border-brand-border-soft bg-white p-4 shadow-brand-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-faded">Recorded net</p>
          <p className={`mt-1 text-2xl font-bold ${totals.net >= 0 ? 'text-brand-gold' : 'text-brand-red'}`}>
            {formatRM(totals.net)}
          </p>
        </div>
      </div>

      {/* Chart — sales (orders) vs expenses (finance out) */}
      <div className="mb-4 rounded-brand-lg border border-brand-border-soft bg-white p-5 shadow-brand-sm">
        <h2 className="mb-4 font-bold text-brand-dark">Sales vs expenses · last 6 months</h2>
        <MonthlyBars data={dash?.monthlyChart ?? []} />
      </div>

      {/* Recent orders */}
      {dash && (
        <div className="mb-4 rounded-brand-lg border border-brand-border-soft bg-white p-5 shadow-brand-sm">
          <h2 className="mb-3 font-bold text-brand-dark">Recent Orders</h2>
          {dash.recentOrders.length === 0 ? (
            <p className="text-sm text-brand-faded">No orders yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {dash.recentOrders.map((o) => (
                  <tr key={o.id} className="border-t border-brand-border-soft first:border-0">
                    <td className="py-2 font-medium text-brand-dark">{o.orderNumber}</td>
                    <td className="py-2 text-brand-muted">{o.customer?.name ?? '—'}</td>
                    <td className="py-2 text-brand-muted">{formatRM(o.totalAmount)}</td>
                    <td className="py-2 text-right">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Ledger — recorded finance entries (expenses + manual income) */}
      <h2 className="mb-2 mt-6 font-bold text-brand-dark">Ledger entries</h2>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap gap-2">
        <select className={selectCls} value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="all">All months</option>
          {(dash?.monthlyChart ?? []).map((m) => (
            <option key={m.month} value={m.month}>
              {monthLabel(m.month)} {m.month.slice(0, 4)}
            </option>
          ))}
        </select>
        <select className={selectCls} value={type} onChange={(e) => setType(e.target.value as 'all' | 'IN' | 'OUT')}>
          <option value="all">All types</option>
          <option value="IN">Income</option>
          <option value="OUT">Expense</option>
        </select>
        <select className={selectCls} value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="highest">Highest</option>
          <option value="lowest">Lowest</option>
        </select>
        <button
          type="button"
          onClick={() => setReorder((v) => !v)}
          className={`rounded-brand border px-3 py-2 text-sm font-semibold transition-colors ${
            reorder
              ? 'border-brand-primary bg-brand-primary text-white'
              : 'border-brand-border text-brand-muted hover:bg-brand-soft'
          }`}
        >
          {reorder ? '✓ Reordering' : '↕ Reorder'}
        </button>
      </div>
      {reorder && sort === 'newest' && (month !== 'all' || type !== 'all') && (
        <p className="mb-2 text-xs text-brand-faded">
          Set month and type to “All” to rearrange rows.
        </p>
      )}
      {reorder && sort !== 'newest' && (
        <p className="mb-2 text-xs text-brand-faded">Switch sort to “Newest” to rearrange rows.</p>
      )}

      {/* Entries */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="max-h-[65vh] overflow-auto overscroll-contain rounded-brand-lg border border-brand-border-soft bg-white shadow-brand-sm">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="sticky top-0 z-10 bg-brand-soft text-left text-brand-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r, i) => (
                <tr key={r.key} className="border-t border-brand-border-soft">
                  <td className="px-4 py-3 text-brand-faded">
                    {canReorder && (
                      <span className="mr-2 inline-flex flex-col align-middle">
                        <button
                          type="button"
                          aria-label="Move up"
                          disabled={i === 0 || swap.isPending}
                          onClick={() => move(i, -1)}
                          className="leading-none text-brand-muted hover:text-brand-primary disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          aria-label="Move down"
                          disabled={i === (rows?.length ?? 0) - 1 || swap.isPending}
                          onClick={() => move(i, 1)}
                          className="leading-none text-brand-muted hover:text-brand-primary disabled:opacity-30"
                        >
                          ▼
                        </button>
                      </span>
                    )}
                    {formatDate(r.date)}
                  </td>
                  <td className="px-4 py-3 text-brand-dark">
                    {r.desc}
                    {r.source === 'order' && (
                      <span className="ml-2 rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand-primary">
                        order
                      </span>
                    )}
                    {r.subtitle && <span className="block text-xs text-brand-faded">{r.subtitle}</span>}
                    {r.note && <span className="block text-xs text-brand-faded">{r.note}</span>}
                    {r.customerName && (
                      <span className="block text-xs text-brand-primary">👤 {r.customerName}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-brand-muted">{r.category}</td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      r.type === 'IN' ? 'text-brand-green' : 'text-brand-red'
                    }`}
                  >
                    {r.type === 'IN' ? '+' : '−'}
                    {formatRM(r.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {r.source === 'finance' ? (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => editFinanceRow(r)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setDeleting({ id: r.financeId as number, desc: r.desc })}
                          >
                            Delete
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => setEditOrderId(r.orderId as number)}>
                          Edit
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-brand-faded">
                    No entries for this view.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <FinanceFormModal open={formOpen} onClose={() => setFormOpen(false)} entry={editing} />

      <OrderFormModal
        open={editOrderId != null && editOrder != null}
        order={editOrder ?? null}
        onClose={() => setEditOrderId(null)}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete entry"
        message={`Delete "${deleting?.desc}"?`}
        loading={removeEntry.isPending}
        onConfirm={() => deleting && removeEntry.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
