import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi, productsApi } from '../../services/api';
import { StoreProductCard } from '../../components/public/StoreProductCard';
import { ProductDetailModal } from '../../components/public/ProductDetailModal';
import { InquiryForm } from '../../components/public/InquiryForm';
import { Spinner } from '../../components/ui/Spinner';
import type { Product } from '../../types';

export function Menu() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', 'public'],
    queryFn: productsApi.listPublic,
  });
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });

  const [activeCat, setActiveCat] = useState<number | 'all'>('all');
  const [message, setMessage] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const list = products ?? [];
    return activeCat === 'all' ? list : list.filter((p) => p.categoryId === activeCat);
  }, [products, activeCat]);

  const addToInquiry = (p: Product) => {
    setMessage((m) => (m ? `${m}\n` : '') + `- ${p.name}`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold text-brand-dark">Our Menu</h1>
      <p className="mb-6 text-brand-muted">
        Baked fresh in small batches, from the oven to your hands.
      </p>

      {/* Category tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCat('all')}
          className={`rounded-brand px-3 py-1.5 text-sm font-semibold transition-colors ${
            activeCat === 'all' ? 'bg-hero text-white' : 'bg-white text-brand-muted hover:bg-brand-soft'
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCat(c.id)}
            className={`rounded-brand px-3 py-1.5 text-sm font-semibold transition-colors ${
              activeCat === c.id ? 'bg-hero text-white' : 'bg-white text-brand-muted hover:bg-brand-soft'
            }`}
          >
            {c.emoji} {c.name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-brand-faded">No cookies in this category yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <StoreProductCard
              key={p.id}
              product={p}
              onAdd={addToInquiry}
              onOpen={(prod) => setDetailId(prod.id)}
            />
          ))}
        </div>
      )}

      {/* Order via WhatsApp */}
      <section className="mx-auto mt-14 max-w-2xl rounded-brand-lg border border-brand-border-soft bg-white p-6 shadow-brand">
        <h2 className="mb-1 text-xl font-bold text-brand-dark">Order on WhatsApp</h2>
        <p className="mb-4 text-sm text-brand-muted">
          Use “Add to Inquiry” on any cookie above to build your list, then send it to us on WhatsApp.
        </p>
        <InquiryForm
          message={message}
          onMessageChange={setMessage}
          messageLabel="What would you like to order?"
        />
      </section>

      <ProductDetailModal
        productId={detailId}
        onClose={() => setDetailId(null)}
        onAddToInquiry={addToInquiry}
      />
    </div>
  );
}
