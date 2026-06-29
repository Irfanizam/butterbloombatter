import type { OrderStatus } from '../../types';

const statusStyles: Record<OrderStatus, string> = {
  PENDING: 'bg-brand-accent-light text-brand-gold',
  CONFIRMED: 'bg-brand-light text-brand-dark',
  BAKING: 'bg-brand-accent-light text-brand-gold',
  READY: 'bg-brand-green-light text-brand-green',
  DELIVERED: 'bg-brand-green-light text-brand-green',
  CANCELLED: 'bg-brand-red-light text-brand-red',
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

export function Badge({
  children,
  className = 'bg-brand-light text-brand-dark',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}
