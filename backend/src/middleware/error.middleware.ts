import { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/http';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: 'Not found' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express needs the 4-arg signature
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ message: err.message });
    return;
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
}
