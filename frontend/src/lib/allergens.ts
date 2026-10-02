// Allergens a product can contain. `key` is what the API stores on Product.allergens;
// keep in sync with backend/src/lib/allergens.ts.
export interface Allergen {
  key: string;
  emoji: string;
  label: string;
  tint: string; // icon bubble background on the Menu note
}

export const ALLERGENS: Allergen[] = [
  { key: 'milk', emoji: '🧈', label: 'Butter (milk)', tint: 'bg-brand-light' },
  { key: 'egg', emoji: '🥚', label: 'Egg', tint: 'bg-brand-soft' },
  { key: 'wheat', emoji: '🌾', label: 'Wheat (gluten)', tint: 'bg-brand-accent-light' },
  { key: 'tree_nuts', emoji: '🥜', label: 'Tree nuts', tint: 'bg-brand-green-light' },
  { key: 'soy', emoji: '🫛', label: 'Soy lecithin', tint: 'bg-brand-soft' },
];

/** The product's allergens, in the canonical order above (unknown keys are ignored). */
export function productAllergens(keys: string[] | undefined): Allergen[] {
  const set = new Set(keys ?? []);
  return ALLERGENS.filter((a) => set.has(a.key));
}
