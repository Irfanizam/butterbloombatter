import { AppError } from './http';

// Keep in sync with frontend/src/lib/allergens.ts.
export const ALLERGEN_KEYS = ['milk', 'egg', 'wheat', 'tree_nuts', 'soy'] as const;

/**
 * Parses `allergens` from a multipart field: a JSON array string (what the admin form sends),
 * a comma list, or repeated fields. Returns unique keys in canonical order.
 */
export function parseAllergens(value: unknown): string[] {
  let raw: unknown[] = [];
  if (Array.isArray(value)) raw = value;
  else if (typeof value === 'string' && value.trim()) {
    const text = value.trim();
    if (text.startsWith('[')) {
      try {
        const parsed: unknown = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error();
        raw = parsed;
      } catch {
        throw new AppError(400, 'Allergens must be a list');
      }
    } else raw = text.split(',');
  }
  const keys = new Set(raw.map((v) => String(v).trim()).filter(Boolean));
  const unknown = [...keys].filter((k) => !(ALLERGEN_KEYS as readonly string[]).includes(k));
  if (unknown.length) throw new AppError(400, `Unknown allergen: ${unknown.join(', ')}`);
  return ALLERGEN_KEYS.filter((k) => keys.has(k));
}
