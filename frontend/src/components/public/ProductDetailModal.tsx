import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../services/api';
import { formatRM } from '../../lib/format';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { CookiePlaceholder } from '../ui/CookiePlaceholder';
import type { Product } from '../../types';

interface Props {
  productId: number | null;
  onClose: () => void;
  onAddToInquiry?: (product: Product) => void;
}

export function ProductDetailModal({ productId, onClose, onAddToInquiry }: Props) {
  const { data: product, isLoading } = useQuery({
    queryKey: ['product-detail', productId],
    queryFn: () => productsApi.get(productId as number),
    enabled: productId !== null,
  });

  const gallery = [
    ...(product?.imageUrl ? [product.imageUrl] : []),
    ...(product?.images?.map((i) => i.url) ?? []),
  ];

  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [productId]);
  const safeIndex = gallery.length ? index % gallery.length : 0;

  return (
    <Modal
      open={productId !== null}
      onClose={onClose}
      title={product?.name ?? 'Product'}
      maxWidth="max-w-xl"
      footer={
        product &&
        onAddToInquiry && (
          <Button
            onClick={() => {
              onAddToInquiry(product);
              onClose();
            }}
          >
            Add to Inquiry
          </Button>
        )
      }
    >
      {isLoading || !product ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <div>
          {/* Carousel */}
          <div className="relative flex h-80 items-center justify-center overflow-hidden rounded-brand-lg bg-brand-soft">
            {gallery.length > 0 ? (
              <img src={gallery[safeIndex]} alt={product.name} className="h-full w-full object-contain" />
            ) : (
              <CookiePlaceholder className="h-full w-full" />
            )}
            {gallery.length > 1 && (
              <>
                <button
                  onClick={() => setIndex((i) => (i - 1 + gallery.length) % gallery.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-1 text-brand-dark shadow-brand-sm hover:bg-white"
                  aria-label="Previous"
                >
                  ‹
                </button>
                <button
                  onClick={() => setIndex((i) => (i + 1) % gallery.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-1 text-brand-dark shadow-brand-sm hover:bg-white"
                  aria-label="Next"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {gallery.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {gallery.map((url, i) => (
                <button
                  key={url + i}
                  onClick={() => setIndex(i)}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-brand border-2 ${
                    i === safeIndex ? 'border-brand-primary' : 'border-transparent'
                  }`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Details */}
          <div className="mt-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xl font-bold text-brand-dark">{product.name}</h3>
              <span className="text-lg font-bold text-brand-primary">{formatRM(product.price)}</span>
            </div>
            {product.category && (
              <span className="mt-1 inline-block rounded-full bg-brand-light px-2.5 py-0.5 text-xs font-semibold text-brand-dark">
                {product.category.emoji} {product.category.name}
              </span>
            )}
            {product.description && (
              <p className="mt-3 leading-relaxed text-brand-muted">{product.description}</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
