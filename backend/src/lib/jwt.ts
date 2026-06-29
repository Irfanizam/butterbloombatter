import jwt, { SignOptions } from 'jsonwebtoken';
import { Role } from '@prisma/client';

export interface AccessTokenPayload {
  sub: number;
  email: string;
  name: string;
  role: Role;
}

export interface RefreshTokenPayload {
  sub: number;
}

const accessSecret: string = process.env.JWT_SECRET ?? 'dev-access-secret';
const refreshSecret: string = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret';

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, accessSecret, options);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  const options: SignOptions = {
    expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN ?? '7d') as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, refreshSecret, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, accessSecret) as unknown as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, refreshSecret) as unknown as RefreshTokenPayload;
}
