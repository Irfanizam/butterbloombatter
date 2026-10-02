import { productAllergens } from '../../lib/allergens';

interface Props {
  keys: string[] | undefined;
  className?: string;
}

/** Compact row of allergen emoji (with names for hover and screen readers). Renders nothing when empty. */
export function AllergenIcons({ keys, className = '' }: Props) {
  const list = productAllergens(keys);
  if (list.length === 0) return null;
  const names = list.map((a) => a.label).join(', ');
  return (
    <span className={`flex items-center gap-0.5 text-sm leading-none ${className}`} title={`Contains: ${names}`}>
      <span className="sr-only">Contains: {names}</span>
      {list.map((a) => (
        <span key={a.key} aria-hidden="true">
          {a.emoji}
        </span>
      ))}
    </span>
  );
}
