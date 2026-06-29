import { formatRM } from '../../lib/format';
import { CookiePlaceholder } from '../ui/CookiePlaceholder';
import type { Product } from '../../types';

interface Props {
  product: Product;
  onAdd?: (product: Product) => void;
}

export function StoreProductCard({ product, onAdd }: Props) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-brand-lg border border-brand-border-soft bg-white shadow-brand-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-brand-lg">
      <div className="relative h-44 overflow-hidden bg-brand-soft">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <CookiePlaceholder className="h-full w-full" />
        )}
        {product.isFeatured && (
          <span className="absolute left-3 top-3 rounded-full bg-brand-accent-light px-2.5 py-0.5 text-xs font-bold text-brand-gold shadow-brand-sm">
            ⭐ Featured
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-brand-dark">{product.name}</h3>
          <span className="whitespace-nowrap font-bold text-brand-primary">{formatRM(product.price)}</span>
        </div>
        {product.description && (
          <p className="line-clamp-2 text-sm text-brand-muted">{product.description}</p>
        )}
        {onAdd && (
          <button
            onClick={() => onAdd(product)}
            className="mt-3 rounded-brand bg-brand-light px-3 py-2 text-sm font-semibold text-brand-dark transition-colors hover:bg-brand-primary hover:text-white"
          >
            Add to Inquiry
          </button>
        )}
      </div>
    </div>
  );
}
