import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage, ordersApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { formatDate, formatRM } from '../../lib/format';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { StatusBadge } from '../ui/Badge';
import type { OrderStatus } from '../../types';

const STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'BAKING',
  'READY',
  'DELIVERED',
  'CANCELLED',
];

interface Props {
  orderId: number | null;
  onClose: () => void;
}

export function OrderDetailDrawer({ orderId, onClose }: Props) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.get(orderId as number),
    enabled: orderId !== null,
  });

  const [status, setStatus] = useState<OrderStatus>('PENDING');
  useEffect(() => {
    if (order) setStatus(order.status);
  }, [order]);

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
                    {s}
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
              Cancelling restores stock. Last updated {formatDate(order.updatedAt)}.
            </p>
          </div>
        </div>
      )}
    </Drawer>
  );
}
