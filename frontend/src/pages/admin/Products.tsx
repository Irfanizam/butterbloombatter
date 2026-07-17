import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, categoriesApi, productsApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { formatRM } from '../../lib/format';
import { PageHeader } from '../../components/admin/PageHeader';
import { ProductFormModal } from '../../components/admin/ProductFormModal';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Toggle } from '../../components/ui/Toggle';
import { Badge } from '../../components/ui/Badge';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CookiePlaceholder } from '../../components/ui/CookiePlaceholder';
import type { Product } from '../../types';

type AvailabilityFilter = 'all' | 'available' | 'unavailable';

export function Products() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', 'admin'],
    queryFn: productsApi.listAdmin,
  });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [availability, setAvailability] = useState<AvailabilityFilter>('all');
  const [sort, setSort] = useState<'newest' | 'name' | 'price-asc' | 'price-desc' | 'stock-asc'>('newest');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const toggleAvailable = useMutation({
    mutationFn: (p: Product) => {
      const fd = new FormData();
      fd.append('isAvailable', String(!p.isAvailable));
      return productsApi.update(p.id, fd);
    },
    onSuccess: invalidate,
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const toggleFeatured = useMutation({
    mutationFn: (p: Product) => productsApi.toggleFeatured(p.id),
    onSuccess: invalidate,
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const removeProduct = useMutation({
    mutationFn: (id: number) => productsApi.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success('Product deleted');
      setDeleting(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete product')),
  });

  const filtered = useMemo(() => {
    const list = (products ?? []).filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (categoryFilter !== 'all' && p.categoryId !== categoryFilter) return false;
      if (availability === 'available' && !p.isAvailable) return false;
      if (availability === 'unavailable' && p.isAvailable) return false;
      return true;
    });
    if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
    else if (sort === 'stock-asc') list.sort((a, b) => a.stock - b.stock);
    else list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [products, search, categoryFilter, availability, sort]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setFormOpen(true);
  };

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Products"
        count={products?.length}
        actions={<Button onClick={openCreate}>+ Add Product</Button>}
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded-brand border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="rounded-brand border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
        <select
          value={availability}
          onChange={(e) => setAvailability(e.target.value as AvailabilityFilter)}
          className="rounded-brand border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="all">All</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="rounded-brand border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="newest">Sort: Newest</option>
          <option value="name">Sort: Name</option>
          <option value="price-asc">Sort: Price ↑</option>
          <option value="price-desc">Sort: Price ↓</option>
          <option value="stock-asc">Sort: Stock ↑</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-brand-faded">No products match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="flex flex-col overflow-hidden rounded-brand-lg border border-brand-border-soft bg-white shadow-brand-sm"
            >
              <div className="relative h-40 bg-brand-soft">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <CookiePlaceholder className="h-full w-full" />
                )}
                <button
                  onClick={() => toggleFeatured.mutate(p)}
                  title="Toggle featured"
                  className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-sm shadow-brand-sm"
                >
                  {p.isFeatured ? '⭐' : '☆'}
                </button>
              </div>

              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-brand-dark">{p.name}</h3>
                  <span className="whitespace-nowrap font-bold text-brand-primary">{formatRM(p.price)}</span>
                </div>
                {p.category && (
                  <Badge className="w-fit bg-brand-light text-brand-dark">
                    {p.category.emoji} {p.category.name}
                  </Badge>
                )}
                <div className="flex items-center justify-between text-sm text-brand-muted">
                  <span>
                    Stock:{' '}
                    <span className={p.stock < 10 ? 'font-semibold text-brand-red' : ''}>{p.stock}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    Sale
                    <Toggle
                      checked={p.isAvailable}
                      onChange={() => toggleAvailable.mutate(p)}
                      disabled={toggleAvailable.isPending}
                    />
                  </span>
                </div>
                <div className="mt-auto flex gap-2 pt-2">
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => openEdit(p)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleting(p)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editing}
        categories={categories}
      />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete product"
        message={`Delete "${deleting?.name}"? This also removes its image. Products that appear in orders cannot be deleted.`}
        loading={removeProduct.isPending}
        onConfirm={() => deleting && removeProduct.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
