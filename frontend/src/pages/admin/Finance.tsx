import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, dashboardApi, financeApi, type FinanceListParams } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { useAuthStore } from '../../store/auth.store';
import { formatDate, formatRM, greeting, monthLabel } from '../../lib/format';
import { PageHeader } from '../../components/admin/PageHeader';
import { FinanceFormModal } from '../../components/admin/FinanceFormModal';
import { MonthlyBars } from '../../components/ui/MonthlyBars';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { Finance as FinanceEntry } from '../../types';

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

  const { data: summary = [] } = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: financeApi.summary,
  });

  const params: FinanceListParams = {
    sort,
    ...(month !== 'all' ? { month } : {}),
    ...(type !== 'all' ? { type } : {}),
  };
  const { data: entries, isLoading } = useQuery({
    queryKey: ['finance', params],
    queryFn: () => financeApi.list(params),
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [deleting, setDeleting] = useState<FinanceEntry | null>(null);

  const totals = useMemo(() => {
    const list = entries ?? [];
    const income = list.filter((e) => e.type === 'IN').reduce((s, e) => s + e.amount, 0);
    const expense = list.filter((e) => e.type === 'OUT').reduce((s, e) => s + e.amount, 0);
    return { income, expense, net: income - expense };
  }, [entries]);

  const removeEntry = useMutation({
    mutationFn: (id: number) => financeApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Entry deleted');
      setDeleting(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete entry')),
  });

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
          {summary.map((m) => (
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
      </div>

      {/* Entries */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-brand-lg border border-brand-border-soft bg-white shadow-brand-sm">
          <table className="w-full text-sm">
            <thead className="bg-brand-soft text-left text-brand-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 text-right font-semibold">Amount</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(entries ?? []).map((e) => (
                <tr key={e.id} className="border-t border-brand-border-soft">
                  <td className="px-4 py-3 text-brand-faded">{formatDate(e.date)}</td>
                  <td className="px-4 py-3 text-brand-dark">
                    {e.desc}
                    {e.note && <span className="block text-xs text-brand-faded">{e.note}</span>}
                    {e.customer && <span className="block text-xs text-brand-primary">👤 {e.customer.name}</span>}
                  </td>
                  <td className="px-4 py-3 text-brand-muted">{e.category}</td>
                  <td
                    className={`px-4 py-3 text-right font-semibold ${
                      e.type === 'IN' ? 'text-brand-green' : 'text-brand-red'
                    }`}
                  >
                    {e.type === 'IN' ? '+' : '−'}
                    {formatRM(e.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditing(e);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleting(e)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {entries?.length === 0 && (
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
