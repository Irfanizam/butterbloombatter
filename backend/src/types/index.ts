import { Role } from '@prisma/client';

export interface LoginRequestBody {
  email?: string;
  password?: string;
}

export interface PublicUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
}
