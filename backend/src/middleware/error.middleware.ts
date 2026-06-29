import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
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

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': // unique constraint
        res.status(409).json({ message: 'A record with this value already exists' });
        return;
      case 'P2003': // foreign key constraint
        res.status(409).json({ message: 'Cannot complete: related records exist' });
        return;
      case 'P2025': // record not found
        res.status(404).json({ message: 'Record not found' });
        return;
    }
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
}
