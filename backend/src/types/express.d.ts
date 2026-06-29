import { Role } from '@prisma/client';

// Augment Express Request with the authenticated user set by auth.middleware.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        name: string;
        role: Role;
      };
    }
  }
}

export {};
