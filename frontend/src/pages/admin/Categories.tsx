import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, categoriesApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { PageHeader } from '../../components/admin/PageHeader';
import { CategoryFormModal } from '../../components/admin/CategoryFormModal';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { Category } from '../../types';

export function Categories() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const removeCategory = useMutation({
    mutationFn: (id: number) => categoriesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted');
      setDeleting(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete category')),
  });

  const reorder = useMutation({
    mutationFn: (ids: number[]) => categoriesApi.reorder(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not reorder')),
  });

  const move = (index: number, direction: -1 | 1) => {
    const list = categories ?? [];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const ids = list.map((c) => c.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorder.mutate(ids);
  };

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Categories"
        count={categories?.length}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + Add Category
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-brand-lg border border-brand-border-soft bg-white shadow-brand-sm">
          <table className="w-full text-sm">
            <thead className="bg-brand-soft text-left text-brand-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Emoji</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Products</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(categories ?? []).map((c, index) => (
                <tr key={c.id} className="border-t border-brand-border-soft">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => move(index, -1)}
                        disabled={index === 0 || reorder.isPending}
                        className="rounded px-1.5 text-brand-muted hover:bg-brand-soft disabled:opacity-30"
                        aria-label="Move up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => move(index, 1)}
                        disabled={index === (categories?.length ?? 0) - 1 || reorder.isPending}
                        className="rounded px-1.5 text-brand-muted hover:bg-brand-soft disabled:opacity-30"
                        aria-label="Move down"
                      >
                        ▼
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xl">{c.emoji}</td>
                  <td className="px-4 py-3 font-medium text-brand-dark">{c.name}</td>
                  <td className="px-4 py-3 text-brand-muted">{c._count?.products ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditing(c);
                          setFormOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleting(c)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-brand-faded">
                    No categories yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <CategoryFormModal open={formOpen} onClose={() => setFormOpen(false)} category={editing} />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete category"
        message={
          deleting && deleting._count && deleting._count.products > 0
            ? `"${deleting.name}" has ${deleting._count.products} product(s). Move or delete those first — the server will block this.`
            : `Delete category "${deleting?.name}"?`
        }
        loading={removeCategory.isPending}
        onConfirm={() => deleting && removeCategory.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
