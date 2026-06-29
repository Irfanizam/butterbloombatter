import { NextFunction, Request, Response } from 'express';
import { AppError } from '../lib/http';
import { verifyAccessToken } from '../lib/jwt';

/** Verifies the Bearer access token and attaches the user to the request. */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError(401, 'Authentication required');
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }

  next();
}
