import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, reviewsApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { PageHeader } from '../../components/admin/PageHeader';
import { ReviewFormModal } from '../../components/admin/ReviewFormModal';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { StarRating } from '../../components/ui/StarRating';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { Review } from '../../types';

export function Reviews() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews', 'admin'],
    queryFn: reviewsApi.listAdmin,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Review | null>(null);
  const [deleting, setDeleting] = useState<Review | null>(null);

  const togglePublish = useMutation({
    mutationFn: (r: Review) => reviewsApi.update(r.id, { isPublished: !r.isPublished }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reviews'] }),
    onError: (err) => toast.error(apiErrorMessage(err)),
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {(reviews ?? []).map((r) => (
            <div
              key={r.id}
              className="flex flex-col rounded-brand-lg border border-brand-border-soft bg-white p-4 shadow-brand-sm"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-brand-dark">{r.author}</span>
                <StarRating rating={r.rating} />
              </div>
              <p className="mt-2 flex-1 text-sm text-brand-muted">“{r.message}”</p>
              <div className="mt-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-brand-muted">
                  <input
                    type="checkbox"
                    checked={r.isPublished}
                    onChange={() => togglePublish.mutate(r)}
                  />
                  {r.isPublished ? 'Published' : 'Hidden'}
                </label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditing(r);
                      setFormOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setDeleting(r)}>
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
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
