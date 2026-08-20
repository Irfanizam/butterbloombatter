import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../services/api';
import { formatRM } from '../../lib/format';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { ImageCarousel } from '../ui/ImageCarousel';
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
          {/* Carousel — frame matches the photos' 27:16 ratio, so the whole image
              shows with no zoom/crop and no letterbox gaps. */}
          <ImageCarousel images={gallery} fit="contain" className="aspect-[27/16] rounded-brand-lg" alt={product.name} />

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
