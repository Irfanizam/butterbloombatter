import fs from 'fs';
import path from 'path';
import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from '../lib/http';

const uploadDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, or WEBP images are allowed'));
    }
  },
});

function toAppError(err: unknown): AppError {
  if (err instanceof multer.MulterError) {
    return new AppError(400, err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5MB or smaller' : err.message);
  }
  if (err instanceof Error) return new AppError(400, err.message);
  return new AppError(400, 'Image upload failed');
}

/**
 * Parses an optional single `image` field from multipart/form-data,
 * converting Multer/validation errors into AppError(400).
 */
export function uploadSingleImage(req: Request, res: Response, next: NextFunction): void {
  upload.single('image')(req, res, (err: unknown) => {
    if (err) return next(toAppError(err));
    next();
  });
}

const MAX_GALLERY_FILES = 8;

/** Parses up to 8 files from the `images` field for gallery uploads. */
export function uploadGalleryImages(req: Request, res: Response, next: NextFunction): void {
  upload.array('images', MAX_GALLERY_FILES)(req, res, (err: unknown) => {
    if (err) return next(toAppError(err));
    next();
  });
}
