import { AppError } from './http';

/** Parses a positive integer route param, throwing 400 on anything else. */
export function parseId(value: unknown): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'Invalid id');
  }
  return id;
}

/** Parses a required numeric field (multipart fields arrive as strings). */
export function parseRequiredNumber(value: unknown, field: string): number {
  if (value === undefined || value === null || value === '') {
    throw new AppError(400, `${field} is required`);
  }
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new AppError(400, `${field} must be a number`);
  }
  return n;
}

/** Coerces a multipart/JSON boolean-ish value, falling back when absent. */
export function parseBool(value: unknown, fallback: boolean): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || value === 'true' || value === 'on' || value === '1';
}

/** Trims a string, returning null for empty/non-string input. */
export function strOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
