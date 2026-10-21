import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

const ADMIN_KEY = ['products', 'admin'];

type AvailabilityFilter = 'all' | 'available' | 'unavailable';
type SortMode = 'menu' | 'newest' | 'name' | 'price-asc' | 'price-desc';

interface CardProps {
  product: Product;
  sortable: boolean; // drag handle only while viewing the menu order
  togglingAvailable: boolean;
  onToggleAvailable: (p: Product) => void;
  onToggleFeatured: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
}

function SortableProductCard({
  product: p,
  sortable,
  togglingAvailable,
  onToggleAvailable,
  onToggleFeatured,
  onEdit,
  onDelete,
}: CardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: p.id, disabled: !sortable });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-col overflow-hidden rounded-brand-lg border bg-white shadow-brand-sm ${
        isDragging ? 'relative z-10 border-brand-primary shadow-brand-lg' : 'border-brand-border-soft'
      }`}
    >
      <div className="relative h-40 bg-brand-soft">
        {p.imageUrl ? (
          <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
        ) : (
          <CookiePlaceholder className="h-full w-full" />
        )}
        {sortable && (
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder ${p.name}`}
            title="Drag to reorder"
            className="absolute left-2 top-2 cursor-grab touch-none rounded-full bg-white/90 px-2 py-0.5 text-sm leading-none text-brand-faded shadow-brand-sm hover:text-brand-dark active:cursor-grabbing"
          >
            ⠿
          </button>
        )}
        <button
          onClick={() => onToggleFeatured(p)}
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
        <div className="flex items-center justify-end text-sm text-brand-muted">
          <span className="flex items-center gap-2">
            Sale
            <Toggle checked={p.isAvailable} onChange={() => onToggleAvailable(p)} disabled={togglingAvailable} />
          </span>
        </div>
        <div className="mt-auto flex gap-2 pt-2">
          <Button size="sm" variant="secondary" className="flex-1" onClick={() => onEdit(p)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => onDelete(p)}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Products() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: products, isLoading } = useQuery({
    queryKey: ADMIN_KEY,
    queryFn: productsApi.listAdmin,
  });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [availability, setAvailability] = useState<AvailabilityFilter>('all');
  const [sort, setSort] = useState<SortMode>('menu');
  const canReorder = sort === 'menu';

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const reorder = useMutation({
    mutationFn: (ids: number[]) => productsApi.reorder(ids),
    onSuccess: (saved) => {
      queryClient.setQueryData(ADMIN_KEY, saved);
      queryClient.invalidateQueries({ queryKey: ['products', 'public'] }); // storefront menu
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, 'Could not reorder'));
      queryClient.invalidateQueries({ queryKey: ADMIN_KEY });
    },
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
    else if (sort === 'newest') list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    // 'menu' keeps the server order (sortOrder), which is what the storefront shows.
    return list;
  }, [products, search, categoryFilter, availability, sort]);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!products || !over || active.id === over.id) return;
    // Move within the full list so the saved order also holds for cards a filter is hiding.
    const from = products.findIndex((p) => p.id === active.id);
    const to = products.findIndex((p) => p.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(products, from, to);
    queryClient.setQueryData(ADMIN_KEY, next); // move instantly, then save
    reorder.mutate(next.map((p) => p.id));
  };

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
          onChange={(e) => setSort(e.target.value as SortMode)}
          className="rounded-brand border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary"
        >
          <option value="menu">Sort: Menu order</option>
          <option value="newest">Sort: Newest</option>
          <option value="name">Sort: Name</option>
          <option value="price-asc">Sort: Price ↑</option>
          <option value="price-desc">Sort: Price ↓</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-brand-faded">No products match your filters.</p>
      ) : (
        <>
          <p className="mb-3 text-xs text-brand-faded">
            {canReorder
              ? 'Drag the ⠿ handle to change the order cookies appear in on the menu.'
              : 'Switch the sort back to Menu order to drag cookies into place.'}
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={filtered.map((p) => p.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((p) => (
                  <SortableProductCard
                    key={p.id}
                    product={p}
                    sortable={canReorder}
                    togglingAvailable={toggleAvailable.isPending}
                    onToggleAvailable={(prod) => toggleAvailable.mutate(prod)}
                    onToggleFeatured={(prod) => toggleFeatured.mutate(prod)}
                    onEdit={openEdit}
                    onDelete={setDeleting}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editing}
        categories={categories}
        onCreated={(p) => setEditing(p)}
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
