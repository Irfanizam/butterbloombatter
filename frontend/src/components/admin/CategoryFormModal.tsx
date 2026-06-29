import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, categoriesApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Category } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  category: Category | null; // null = create
}

export function CategoryFormModal({ open, onClose, category }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setEmoji(category?.emoji ?? '🍪');
  }, [open, category]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { name: name.trim(), emoji: emoji.trim() || undefined };
      return category ? categoriesApi.update(category.id, payload) : categoriesApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(category ? 'Category updated' : 'Category created');
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save category')),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Name is required');
    mutation.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? 'Edit Category' : 'Add Category'}
      maxWidth="max-w-sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" loading={mutation.isPending}>
            {category ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-brand-dark">Emoji</span>
          <input
            className="w-20 rounded-brand border border-brand-border px-3 py-2 text-center text-xl outline-none focus:border-brand-primary"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={4}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-brand-dark">Name *</span>
          <input
            className="w-full rounded-brand border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
      </form>
    </Modal>
  );
}
