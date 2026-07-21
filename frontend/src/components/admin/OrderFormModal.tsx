import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, customersApi, ordersApi, productsApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { formatRM } from '../../lib/format';
import { ORDER_TAGS } from '../../lib/order-tags';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface LineItem {
  productId: number | '';
  quantity: number;
  unitPrice: number | '';
}

const inputCls =
  'w-full rounded-brand border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary';

export function OrderFormModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', ''],
    queryFn: () => customersApi.list(),
    enabled: open,
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products', 'admin'],
    queryFn: productsApi.listAdmin,
    enabled: open,
  });

  const [customerId, setCustomerId] = useState<number | ''>('');
  const [newCustomer, setNewCustomer] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ productId: '', quantity: 1, unitPrice: '' }]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [placedDate, setPlacedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [tag, setTag] = useState('');

  useEffect(() => {
    if (!open) return;
    setCustomerId('');
    setNewCustomer(false);
    setNewName('');
    setNewEmail('');
    setItems([{ productId: '', quantity: 1, unitPrice: '' }]);
    setDeliveryDate('');
    setPlacedDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setTag('');
  }, [open]);

  const priceOf = (id: number | '') => products.find((p) => p.id === id)?.price ?? 0;
  const unitPriceOf = (it: LineItem) => (it.unitPrice === '' ? priceOf(it.productId) : it.unitPrice);
  const total = items.reduce((sum, it) => sum + unitPriceOf(it) * it.quantity, 0);

  const updateItem = (idx: number, patch: Partial<LineItem>) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addItem = () => setItems((prev) => [...prev, { productId: '', quantity: 1, unitPrice: '' }]);
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const mutation = useMutation({
    mutationFn: async () => {
      let resolvedCustomerId = customerId;
      if (newCustomer) {
        const created = await customersApi.create({
          name: newName.trim(),
          email: newEmail.trim() || null,
        });
        resolvedCustomerId = created.id;
      }
      const lineItems = items
        .filter((it) => it.productId !== '' && it.quantity > 0)
        .map((it) => ({
          productId: it.productId as number,
          quantity: it.quantity,
          unitPrice: it.unitPrice === '' ? undefined : it.unitPrice,
        }));
      return ordersApi.create({
        customerId: resolvedCustomerId as number,
        items: lineItems,
        notes: notes || undefined,
        tag: tag || undefined,
        deliveryDate: deliveryDate || undefined,
        placedDate: placedDate || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Order created');
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not create order')),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newCustomer) {
      if (!newName.trim()) return toast.error('New customer needs a name');
    } else if (customerId === '') {
      return toast.error('Select a customer');
    }
    if (!items.some((it) => it.productId !== '' && it.quantity > 0)) {
      return toast.error('Add at least one product');
    }
    mutation.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Order"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="order-form" loading={mutation.isPending}>
            Create order · {formatRM(total)}
          </Button>
        </>
      }
    >
      <form id="order-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Customer */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-semibold text-brand-dark">Customer *</span>
            <button
              type="button"
              onClick={() => setNewCustomer((v) => !v)}
              className="text-xs font-semibold text-brand-primary"
            >
              {newCustomer ? 'Pick existing' : '+ New customer'}
            </button>
          </div>
          {newCustomer ? (
            <div className="grid grid-cols-2 gap-2">
              <input className={inputCls} placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <input className={inputCls} placeholder="Email (optional)" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
          ) : (
            <select
              className={inputCls}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Select a customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.email ? ` (${c.email})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Line items */}
        <div>
          <span className="mb-1 block text-sm font-semibold text-brand-dark">Items *</span>
          <p className="mb-2 text-xs text-brand-faded">
            Price defaults to the product's current price — edit it for back-dated orders placed at an older price.
          </p>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <select
                  className={`${inputCls} sm:w-auto sm:flex-1`}
                  value={it.productId}
                  onChange={(e) => {
                    const pid = e.target.value ? Number(e.target.value) : '';
                    updateItem(idx, { productId: pid, unitPrice: pid === '' ? '' : priceOf(pid) });
                  }}
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} disabled={!p.isAvailable}>
                      {p.name} — {formatRM(p.price)}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, { quantity: Math.max(1, Number(e.target.value)) })}
                  className="w-16 rounded-brand border border-brand-border px-2 py-2 text-sm outline-none focus:border-brand-primary"
                  aria-label="Quantity"
                />
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={it.unitPrice}
                  onChange={(e) =>
                    updateItem(idx, { unitPrice: e.target.value === '' ? '' : Math.max(0, Number(e.target.value)) })
                  }
                  className="w-24 rounded-brand border border-brand-border px-2 py-2 text-sm outline-none focus:border-brand-primary"
                  placeholder="Price"
                  aria-label="Unit price (RM)"
                />
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(idx)} className="text-brand-red" aria-label="Remove">
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addItem} className="mt-2 text-xs font-semibold text-brand-primary">
            + Add item
          </button>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-brand-dark">Order date (placed)</span>
          <input type="date" className={inputCls} value={placedDate} onChange={(e) => setPlacedDate(e.target.value)} />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-brand-dark">Delivery date</span>
            <input type="date" className={inputCls} value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-brand-dark">Tag</span>
            <select className={inputCls} value={tag} onChange={(e) => setTag(e.target.value)}>
              <option value="">No tag</option>
              {ORDER_TAGS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-brand-dark">Notes</span>
          <input className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <div className="flex items-center justify-between rounded-brand bg-brand-soft px-3 py-2">
          <span className="text-sm font-semibold text-brand-dark">Running total</span>
          <span className="text-lg font-bold text-brand-primary">{formatRM(total)}</span>
        </div>
      </form>
    </Modal>
  );
}
