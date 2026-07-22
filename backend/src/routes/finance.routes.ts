import { Router } from 'express';
import {
  createFinance,
  deleteFinance,
  financeSummary,
  getLedger,
  listFinance,
  updateFinance,
} from '../controllers/finance.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/summary', authenticate, financeSummary); // before any param routes
router.get('/ledger', authenticate, getLedger);
router.get('/', authenticate, listFinance);
router.post('/', authenticate, createFinance);
router.put('/:id', authenticate, updateFinance);
router.delete('/:id', authenticate, deleteFinance);

export default router;
