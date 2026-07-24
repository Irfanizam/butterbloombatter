import { Router } from 'express';
import {
  addProductImages,
  createProduct,
  deleteProduct,
  deleteProductImage,
  getProduct,
  listAdminProducts,
  listPublicProducts,
  toggleFeatured,
  updateProduct,
} from '../controllers/product.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { uploadGalleryImages, uploadSingleImage } from '../middleware/upload.middleware';

const router = Router();

router.get('/', listPublicProducts); // public storefront
router.get('/admin', authenticate, listAdminProducts); // before /:id so "admin" isn't treated as an id
router.get('/:id', getProduct);

router.post('/', authenticate, requireAdmin, uploadSingleImage, createProduct);
router.put('/:id', authenticate, requireAdmin, uploadSingleImage, updateProduct);
router.delete('/:id', authenticate, requireAdmin, deleteProduct);

router.patch('/:id/featured', authenticate, toggleFeatured);

// Gallery images
router.post('/:id/images', authenticate, requireAdmin, uploadGalleryImages, addProductImages);
router.delete('/:id/images/:imageId', authenticate, requireAdmin, deleteProductImage);

export default router;
