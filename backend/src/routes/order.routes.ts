import { Router } from 'express';
import {
  createOrder,
  deleteOrder,
  getOrder,
  listOrders,
  updateOrderStatus,
} from '../controllers/order.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.get('/', authenticate, listOrders);
router.get('/:id', authenticate, getOrder);
router.post('/', authenticate, createOrder);
router.patch('/:id/status', authenticate, updateOrderStatus);
router.delete('/:id', authenticate, requireAdmin, deleteOrder);

export default router;
