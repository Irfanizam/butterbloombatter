import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, reviewsApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Toggle } from '../ui/Toggle';
import type { Review } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  review: Review | null; // null = create
}

const inputCls =
  'w-full rounded-brand border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary';

export function ReviewFormModal({ open, onClose, review }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  useEffect(() => {
    if (!open) return;
    setAuthor(review?.author ?? '');
    setRating(review?.rating ?? 5);
    setMessage(review?.message ?? '');
    setIsPublished(review?.isPublished ?? true);
  }, [open, review]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { author: author.trim(), rating, message: message.trim(), isPublished };
      return review ? reviewsApi.update(review.id, payload) : reviewsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success(review ? 'Review updated' : 'Review added');
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save review')),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!author.trim()) return toast.error('Author is required');
    if (!message.trim()) return toast.error('Message is required');
    mutation.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={review ? 'Edit Review' : 'Add Review'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="review-form" loading={mutation.isPending}>
            {review ? 'Save' : 'Add'}
          </Button>
        </>
      }
    >
      <form id="review-form" onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-brand-dark">Customer name *</span>
          <input className={inputCls} value={author} onChange={(e) => setAuthor(e.target.value)} required />
        </label>
        <div>
          <span className="mb-1 block text-sm font-semibold text-brand-dark">Rating</span>
          <div className="flex gap-1 text-2xl">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={n <= rating ? 'text-brand-accent' : 'text-brand-border'}
                aria-label={`${n} star`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-brand-dark">Review *</span>
          <textarea className={inputCls} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} required />
        </label>
        <div className="flex items-center justify-between rounded-brand bg-brand-soft px-3 py-2">
          <span className="text-sm font-medium text-brand-dark">Published (shown on storefront)</span>
          <Toggle checked={isPublished} onChange={setIsPublished} />
        </div>
      </form>
    </Modal>
  );
}
