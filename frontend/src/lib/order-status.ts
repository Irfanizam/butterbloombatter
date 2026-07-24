import type { OrderStatus } from '../types';

/** Display labels for order statuses (enum values stay unchanged in the DB). */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  BAKING: 'Baking',
  PACKED: 'Packing',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};
