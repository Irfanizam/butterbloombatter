import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  listCategories,
  reorderCategories,
  updateCategory,
} from '../controllers/category.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.get('/', listCategories); // public
router.post('/', authenticate, requireAdmin, createCategory);
router.patch('/reorder', authenticate, requireAdmin, reorderCategories); // before /:id
router.put('/:id', authenticate, requireAdmin, updateCategory);
router.delete('/:id', authenticate, requireAdmin, deleteCategory);

export default router;
