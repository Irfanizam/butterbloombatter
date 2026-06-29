import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../controllers/category.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.get('/', listCategories); // public
router.post('/', authenticate, requireAdmin, createCategory);
router.put('/:id', authenticate, requireAdmin, updateCategory);
router.delete('/:id', authenticate, requireAdmin, deleteCategory);

export default router;
