import { formatRM } from '../../lib/format';
import { CookiePlaceholder } from '../ui/CookiePlaceholder';
import type { Product } from '../../types';

interface Props {
  product: Product;
  onAdd?: (product: Product) => void;
}

export function StoreProductCard({ product, onAdd }: Props) {
  return (
    <div className="flex flex-col overflow-hidden rounded-brand-lg border border-brand-border-soft bg-white shadow-brand-sm">
      <div className="h-44 bg-brand-soft">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <CookiePlaceholder className="h-full w-full" />
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
