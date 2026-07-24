import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, ordersApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { useAuthStore } from '../../store/auth.store';
import { formatDate, formatRM } from '../../lib/format';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { StatusBadge } from '../ui/Badge';
import { ORDER_STATUS_LABEL } from '../../lib/order-status';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ReceiptModal } from './ReceiptModal';
import type { Order, OrderStatus } from '../../types';

const STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'BAKING',
  'PACKED',
  'DELIVERED',
  'CANCELLED',
];

interface Props {
  orderId: number | null;
  onClose: () => void;
  onEdit?: (order: Order) => void;
}

export function OrderDetailDrawer({ orderId, onClose, onEdit }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.get(orderId as number),
    enabled: orderId !== null,
  });

  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const [status, setStatus] = useState<OrderStatus>('PENDING');
  const [placedDate, setPlacedDate] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  useEffect(() => {
    if (order) {
      setStatus(order.status);
      setPlacedDate(order.createdAt.slice(0, 10));
    }
  }, [order]);

  const updateDate = useMutation({
    mutationFn: () => ordersApi.update(orderId as number, { placedDate }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Order date updated');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update date')),
  });

  const updateStatus = useMutation({
    mutationFn: () => ordersApi.setStatus(orderId as number, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Status updated');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update status')),
  });

  const deleteOrder = useMutation({
    mutationFn: () => ordersApi.remove(orderId as number),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Order deleted');
      setConfirmDelete(false);
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete order')),
  });

  return (
    <Drawer open={orderId !== null} onClose={onClose} title="Order Detail">
      {isLoading || !order ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-brand-dark">{order.orderNumber}</h3>
              <p className="text-sm text-brand-faded">Placed {formatDate(order.createdAt)}</p>
              {order.tag && (
                <span className="mt-1 inline-block rounded-full bg-brand-light px-2 py-0.5 text-xs font-semibold text-brand-dark">
                  {order.tag}
                </span>
              )}
            </div>
            <StatusBadge status={order.status} />
          </div>

          <div className="rounded-brand bg-brand-soft p-3 text-sm">
            <p className="font-semibold text-brand-dark">{order.customer?.name}</p>
            {order.customer?.email && <p className="text-brand-muted">{order.customer.email}</p>}
            {order.customer?.phone && <p className="text-brand-muted">{order.customer.phone}</p>}
            {order.deliveryDate && (
              <p className="mt-1 text-brand-faded">Delivery: {formatDate(order.deliveryDate)}</p>
            )}
            {order.notes && <p className="mt-1 italic text-brand-faded">“{order.notes}”</p>}
          </div>

          <div>
            <h4 className="mb-2 font-semibold text-brand-dark">Items</h4>
            <ul className="space-y-1 text-sm">
              {order.orderItems?.map((item) => (
                <li key={item.id} className="flex justify-between border-b border-brand-border-soft py-1">
                  <span className="text-brand-dark">
                    {item.quantity}× {item.product?.name ?? `Product #${item.productId}`}
                  </span>
                  <span className="text-brand-muted">{formatRM(item.unitPrice * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between font-bold text-brand-dark">
              <span>Total</span>
              <span>{formatRM(order.totalAmount)}</span>
            </div>
          </div>

          <div>
            <h4 className="mb-2 font-semibold text-brand-dark">Update status</h4>
            <div className="flex gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="flex-1 rounded-brand border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <Button
                onClick={() => updateStatus.mutate()}
                loading={updateStatus.isPending}
                disabled={status === order.status}
              >
                Confirm
              </Button>
            </div>
            <p className="mt-2 text-xs text-brand-faded">
              Last updated {formatDate(order.updatedAt)}.
            </p>
          </div>

          <div>
            <h4 className="mb-2 font-semibold text-brand-dark">Order date (placed)</h4>
            <div className="flex gap-2">
              <input
                type="date"
                value={placedDate}
                onChange={(e) => setPlacedDate(e.target.value)}
                className="flex-1 rounded-brand border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-primary"
              />
              <Button
                onClick={() => updateDate.mutate()}
                loading={updateDate.isPending}
                disabled={placedDate === order.createdAt.slice(0, 10)}
              >
                Save
              </Button>
            </div>
            <p className="mt-1 text-xs text-brand-faded">
              Back-date manually entered orders so they land in the right month.
            </p>
          </div>

          {onEdit && (
            <Button variant="secondary" className="w-full" onClick={() => onEdit(order)}>
              ✏️ Edit order
            </Button>
          )}

          <Button variant="secondary" className="w-full" onClick={() => setShowReceipt(true)}>
            🧾 Receipt (WhatsApp / print)
          </Button>

          {isAdmin && (
            <div className="border-t border-brand-border-soft pt-4">
              <Button variant="danger" className="w-full" onClick={() => setConfirmDelete(true)}>
                Delete order
              </Button>
              <p className="mt-2 text-xs text-brand-faded">
                Permanently removes this order.
              </p>
            </div>
          )}
        </div>
      )}

      <ReceiptModal order={showReceipt ? (order ?? null) : null} onClose={() => setShowReceipt(false)} />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete order"
        message={`Delete order ${order?.orderNumber}? This cannot be undone.`}
        loading={deleteOrder.isPending}
        onConfirm={() => deleteOrder.mutate()}
        onCancel={() => setConfirmDelete(false)}
      />
    </Drawer>
  );
}
