import { useState } from 'react';
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
import { apiErrorMessage, reviewsApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { PageHeader } from '../../components/admin/PageHeader';
import { ReviewFormModal } from '../../components/admin/ReviewFormModal';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { StarRating } from '../../components/ui/StarRating';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { Review } from '../../types';

const ADMIN_KEY = ['reviews', 'admin'];

interface CardProps {
  review: Review;
  onTogglePublish: (r: Review) => void;
  onEdit: (r: Review) => void;
  onDelete: (r: Review) => void;
}

function SortableReviewCard({ review: r, onTogglePublish, onEdit, onDelete }: CardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: r.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex flex-col rounded-brand-lg border bg-white p-4 shadow-brand-sm ${
        isDragging ? 'relative z-10 border-brand-primary shadow-brand-lg' : 'border-brand-border-soft'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder the review by ${r.author}`}
            title="Drag to reorder"
            className="cursor-grab touch-none rounded px-1 text-lg leading-none text-brand-faded hover:text-brand-dark active:cursor-grabbing"
          >
            ⠿
          </button>
          <span className="font-bold text-brand-dark">{r.author}</span>
        </div>
        <StarRating rating={r.rating} />
      </div>
      <p className="mt-2 flex-1 text-sm text-brand-muted">“{r.message}”</p>
      <div className="mt-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-brand-muted">
          <input type="checkbox" checked={r.isPublished} onChange={() => onTogglePublish(r)} />
          {r.isPublished ? 'Published' : 'Hidden'}
        </label>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => onEdit(r)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => onDelete(r)}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Reviews() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ADMIN_KEY,
    queryFn: reviewsApi.listAdmin,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState<Review | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const togglePublish = useMutation({
    mutationFn: (r: Review) => reviewsApi.update(r.id, { isPublished: !r.isPublished }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const reorder = useMutation({
    mutationFn: (ids: number[]) => reviewsApi.reorder(ids),
    onSuccess: (saved) => {
      queryClient.setQueryData(ADMIN_KEY, saved);
      queryClient.invalidateQueries({ queryKey: ['reviews'], exact: true }); // storefront list
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, 'Could not reorder'));
      queryClient.invalidateQueries({ queryKey: ADMIN_KEY });
    },
  });

  const removeReview = useMutation({
    mutationFn: (id: number) => reviewsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Review deleted');
      setDeleting(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete review')),
  });

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!reviews || !over || active.id === over.id) return;
    const from = reviews.findIndex((r) => r.id === active.id);
    const to = reviews.findIndex((r) => r.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(reviews, from, to);
    queryClient.setQueryData(ADMIN_KEY, next); // move instantly, then save
    reorder.mutate(next.map((r) => r.id));
  };

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Reviews"
        count={reviews?.length}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + Add Review
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : reviews?.length === 0 ? (
        <p className="py-16 text-center text-brand-faded">
          No reviews yet. Add testimonials to show on the storefront.
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs text-brand-faded">
            Drag the ⠿ handle to change the order reviews appear in on the storefront.
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={(reviews ?? []).map((r) => r.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {(reviews ?? []).map((r) => (
                  <SortableReviewCard
                    key={r.id}
                    review={r}
                    onTogglePublish={(rev) => togglePublish.mutate(rev)}
                    onEdit={(rev) => {
                      setEditing(rev);
                      setFormOpen(true);
                    }}
                    onDelete={setDeleting}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      <ReviewFormModal open={formOpen} onClose={() => setFormOpen(false)} review={editing} />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete review"
        message={`Delete the review by ${deleting?.author}?`}
        loading={removeReview.isPending}
        onConfirm={() => deleting && removeReview.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
