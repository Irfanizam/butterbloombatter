import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, customersApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import type { Customer } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  customer: Customer | null; // null = create
}

const inputCls =
  'w-full rounded-brand border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary';

export function CustomerFormModal({ open, onClose, customer }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    joinedDate: '',
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      name: customer?.name ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
      address: customer?.address ?? '',
      notes: customer?.notes ?? '',
      joinedDate: customer?.joinedDate ? customer.joinedDate.slice(0, 10) : '',
    });
  }, [open, customer]);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
        joinedDate: form.joinedDate ? new Date(form.joinedDate).toISOString() : null,
      };
      return customer ? customersApi.update(customer.id, payload) : customersApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      if (customer) queryClient.invalidateQueries({ queryKey: ['customer', customer.id] });
      toast.success(customer ? 'Customer updated' : 'Customer created');
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save customer')),
  });

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    mutation.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? 'Edit Customer' : 'Add Customer'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="customer-form" loading={mutation.isPending}>
            {customer ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={handleSubmit} className="space-y-3">
        <input className={inputCls} placeholder="Name *" value={form.name} onChange={set('name')} required />
        <input className={inputCls} type="email" placeholder="Email (optional)" value={form.email} onChange={set('email')} />
        <input className={inputCls} placeholder="Phone" value={form.phone} onChange={set('phone')} />
        <input className={inputCls} placeholder="Address" value={form.address} onChange={set('address')} />
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-brand-dark">Joined date</span>
          <input className={inputCls} type="date" value={form.joinedDate} onChange={set('joinedDate')} />
        </label>
        <textarea className={inputCls} rows={2} placeholder="Notes" value={form.notes} onChange={set('notes')} />
      </form>
    </Modal>
  );
}
