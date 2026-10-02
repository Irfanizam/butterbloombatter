import { Router } from 'express';
import {
  createReview,
  deleteReview,
  listAdminReviews,
  listPublicReviews,
  reorderReviews,
  updateReview,
} from '../controllers/review.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.get('/', listPublicReviews); // public
router.get('/admin', authenticate, listAdminReviews);
router.post('/', authenticate, requireAdmin, createReview);
router.patch('/reorder', authenticate, requireAdmin, reorderReviews); // before /:id
router.put('/:id', authenticate, requireAdmin, updateReview);
router.delete('/:id', authenticate, requireAdmin, deleteReview);

export default router;
