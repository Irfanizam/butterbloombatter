import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, customersApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../lib/format';
import { PageHeader } from '../../components/admin/PageHeader';
import { CustomerFormModal } from '../../components/admin/CustomerFormModal';
import { CustomerDetailDrawer } from '../../components/admin/CustomerDetailDrawer';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { Customer } from '../../types';

export function Customers() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'joined' | 'name' | 'orders'>('joined');
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersApi.list(search || undefined),
  });

  const joinedTime = (c: Customer) => new Date(c.joinedDate ?? c.createdAt).getTime();
  const sorted = useMemo(() => {
    const list = [...(customers ?? [])];
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'orders') list.sort((a, b) => (b._count?.orders ?? 0) - (a._count?.orders ?? 0));
    else list.sort((a, b) => joinedTime(b) - joinedTime(a)); // joined date, newest first
    return list;
  }, [customers, sort]);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);

  const removeCustomer = useMutation({
    mutationFn: (id: number) => customersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted');
      setDeleting(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete customer')),
  });

  const openEdit = (c: Customer) => {
    setEditing(c);
    setFormOpen(true);
  };

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Customers"
        count={customers?.length}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + Add Customer
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          placeholder="Search by name, email, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded-brand border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded-brand border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="joined">Sort: Joined date</option>
          <option value="name">Sort: Name</option>
          <option value="orders">Sort: Most orders</option>
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
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Orders</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer border-t border-brand-border-soft hover:bg-brand-soft/50"
                  onClick={() => setDetailId(c.id)}
                >
                  <td className="px-4 py-3 font-medium text-brand-dark">
                    {c.name}
                    {c.notes?.startsWith('[Inquiry]') && (
                      <span className="ml-2 rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand-primary">
                        💬 inquiry
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-brand-muted">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-brand-muted">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-brand-muted">{c._count?.orders ?? 0}</td>
                  <td className="px-4 py-3 text-brand-faded">{formatDate(c.joinedDate ?? c.createdAt)}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleting(c)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {customers?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-brand-faded">
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <CustomerFormModal open={formOpen} onClose={() => setFormOpen(false)} customer={editing} />

      <CustomerDetailDrawer
        customerId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={(id) => {
          const c = customers?.find((x) => x.id === id) ?? null;
          setDetailId(null);
          if (c) openEdit(c);
        }}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete customer"
        message={`Delete "${deleting?.name}"? Customers with existing orders cannot be deleted.`}
        loading={removeCustomer.isPending}
        onConfirm={() => deleting && removeCustomer.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
