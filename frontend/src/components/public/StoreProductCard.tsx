import { formatRM } from '../../lib/format';
import { ImageCarousel } from '../ui/ImageCarousel';
import type { Product } from '../../types';

interface Props {
  product: Product;
  onAdd?: (product: Product) => void;
  onOpen?: (product: Product) => void;
}

export function StoreProductCard({ product, onAdd, onOpen }: Props) {
  const cardImages = [
    ...(product.imageUrl ? [product.imageUrl] : []),
    ...(product.images?.map((i) => i.url) ?? []),
  ];
  return (
    <div className="group flex flex-col overflow-hidden rounded-brand-lg border border-brand-border-soft bg-white shadow-brand-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-brand-lg">
      <button
        type="button"
        onClick={() => onOpen?.(product)}
        className="relative block h-44 w-full overflow-hidden bg-brand-soft text-left"
      >
        {/* Auto-sliding photos (no controls — the whole card opens the detail view) */}
        <ImageCarousel
          images={cardImages}
          fit="cover"
          controls={false}
          intervalMs={3000}
          className="h-full w-full"
          alt={product.name}
        />
        {product.isFeatured && (
          <span className="absolute left-3 top-3 rounded-full bg-brand-accent-light px-2.5 py-0.5 text-xs font-bold text-brand-gold shadow-brand-sm">
            ⭐ Featured
          </span>
        )}
        {product.pieces != null && (
          <span className="absolute bottom-2 left-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-brand-dark shadow-brand-sm">
            🍪 {product.pieces} pcs
          </span>
        )}
        {onOpen && (product.images?.length ?? 0) > 0 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
            📷 more
          </span>
        )}
      </button>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <button type="button" onClick={() => onOpen?.(product)} className="text-left">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-brand-dark hover:text-brand-primary">{product.name}</h3>
            <span className="whitespace-nowrap font-bold text-brand-primary">{formatRM(product.price)}</span>
          </div>
        </button>
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
