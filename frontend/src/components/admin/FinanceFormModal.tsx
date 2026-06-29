import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, financeApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { FINANCE_CATEGORIES } from '../../lib/finance-categories';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Finance, FinanceType } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  entry: Finance | null; // null = create
}

const inputCls =
  'w-full rounded-brand border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary';

function toDateInput(value: string | undefined): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  return new Date(value).toISOString().slice(0, 10);
}

export function FinanceFormModal({ open, onClose, entry }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [type, setType] = useState<FinanceType>('IN');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<string>(FINANCE_CATEGORIES[0]);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(toDateInput(undefined));

  useEffect(() => {
    if (!open) return;
    setType(entry?.type ?? 'IN');
    setAmount(entry ? String(entry.amount) : '');
    setDesc(entry?.desc ?? '');
    setCategory(entry?.category ?? FINANCE_CATEGORIES[0]);
    setNote(entry?.note ?? '');
    setDate(toDateInput(entry?.date));
  }, [open, entry]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        type,
        amount: Number(amount),
        desc: desc.trim(),
        category,
        note: note.trim() || undefined,
        date: new Date(date).toISOString(),
      };
      return entry ? financeApi.update(entry.id, payload) : financeApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(entry ? 'Entry updated' : 'Entry added');
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save entry')),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return toast.error('Amount must be greater than zero');
    if (!desc.trim()) return toast.error('Description is required');
    mutation.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={entry ? 'Edit Entry' : 'Add Entry'}
      maxWidth="max-w-md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="finance-form" loading={mutation.isPending}>
            {entry ? 'Save' : 'Add'}
          </Button>
        </>
      }
    >
      <form id="finance-form" onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setType('IN')}
            className={`rounded-brand py-2 text-sm font-semibold transition-colors ${
              type === 'IN' ? 'bg-brand-green text-white' : 'bg-brand-soft text-brand-muted'
            }`}
          >
            Income (IN)
          </button>
          <button
            type="button"
            onClick={() => setType('OUT')}
            className={`rounded-brand py-2 text-sm font-semibold transition-colors ${
              type === 'OUT' ? 'bg-brand-red text-white' : 'bg-brand-soft text-brand-muted'
            }`}
          >
            Expense (OUT)
          </button>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-brand-dark">Amount (RM) *</span>
          <input className={inputCls} type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-brand-dark">Description *</span>
          <input className={inputCls} value={desc} onChange={(e) => setDesc(e.target.value)} required />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-brand-dark">Category</span>
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)}>
            {FINANCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-brand-dark">Date</span>
            <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-brand-dark">Note</span>
            <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
      </form>
    </Modal>
  );
}
