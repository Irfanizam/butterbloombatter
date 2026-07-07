import { useQuery } from '@tanstack/react-query';
import { customersApi } from '../../services/api';
import { formatDate, formatRM } from '../../lib/format';
import { Drawer } from '../ui/Drawer';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { StatusBadge } from '../ui/Badge';

interface Props {
  customerId: number | null;
  onClose: () => void;
  onEdit: (id: number) => void;
}

export function CustomerDetailDrawer({ customerId, onClose, onEdit }: Props) {
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customersApi.get(customerId as number),
    enabled: customerId !== null,
  });

  return (
    <Drawer
      open={customerId !== null}
      onClose={onClose}
      title="Customer"
      footer={
        customer && (
          <Button variant="secondary" onClick={() => onEdit(customer.id)}>
            Edit
          </Button>
        )
      }
    >
      {isLoading || !customer ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-bold text-brand-dark">{customer.name}</h3>
            {customer.email && <p className="text-sm text-brand-muted">{customer.email}</p>}
            {customer.phone && <p className="text-sm text-brand-muted">{customer.phone}</p>}
            {customer.address && <p className="text-sm text-brand-faded">{customer.address}</p>}
            <p className="mt-1 text-xs text-brand-faded">
              Joined {formatDate(customer.joinedDate ?? customer.createdAt)} · Added {formatDate(customer.createdAt)}
            </p>
            {customer.notes && (
              <p className="mt-2 rounded-brand bg-brand-soft px-3 py-2 text-sm text-brand-muted">
                {customer.notes}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-brand bg-brand-soft p-3 text-center">
              <p className="text-xs text-brand-faded">Total Orders</p>
              <p className="text-xl font-bold text-brand-dark">{customer.orders?.length ?? 0}</p>
            </div>
            <div className="rounded-brand bg-brand-green-light p-3 text-center">
              <p className="text-xs text-brand-green">Total Spent</p>
              <p className="text-xl font-bold text-brand-green">{formatRM(customer.totalSpent ?? 0)}</p>
            </div>
          </div>

          <div>
            <h4 className="mb-2 font-semibold text-brand-dark">Order History</h4>
            {customer.orders && customer.orders.length > 0 ? (
              <ul className="space-y-2">
                {customer.orders.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between rounded-brand border border-brand-border-soft px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-brand-dark">{o.orderNumber}</p>
                      <p className="text-xs text-brand-faded">{formatDate(o.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-brand-muted">{formatRM(o.totalAmount)}</span>
                      <StatusBadge status={o.status} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-brand-faded">No orders yet.</p>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
