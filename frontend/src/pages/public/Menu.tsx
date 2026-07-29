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

      {/* Allergen info — cute recipe-note sticker */}
      <div className="relative mb-8 mt-3">
        {/* peeking sticker badge */}
        <div className="absolute -top-3 left-6 z-10 -rotate-6 rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-dark shadow-brand-sm ring-2 ring-brand-accent-light">
          🍪 good to know!
        </div>
        <div className="relative overflow-hidden rounded-brand-lg border-2 border-dashed border-brand-primary/30 bg-gradient-to-br from-brand-accent-light/60 via-brand-soft to-white p-5 pt-8 shadow-brand-sm">
          {/* playful background bake */}
          <span className="pointer-events-none absolute -right-2 top-4 select-none text-6xl opacity-10">🧁</span>
          <p className="relative mb-3 max-w-lg text-sm text-brand-muted">
            Everything’s baked with love in a little home kitchen — so our cookies might hold hands with a
            few of these:
          </p>
          <div className="relative flex flex-wrap gap-3">
            {[
              { emoji: '🌾', label: 'Wheat / Gluten', tint: 'bg-brand-accent-light' },
              { emoji: '🧈', label: 'Butter / Dairy', tint: 'bg-brand-light' },
              { emoji: '🥚', label: 'Egg', tint: 'bg-brand-soft' },
              { emoji: '🥜', label: 'Nuts', tint: 'bg-brand-green-light' },
            ].map((a) => (
              <span
                key={a.label}
                className="group flex items-center gap-2 rounded-full border border-brand-border-soft bg-white/90 py-1.5 pl-1.5 pr-3.5 text-xs font-semibold text-brand-dark shadow-brand-sm transition-transform hover:-translate-y-0.5 hover:-rotate-2"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm transition-transform group-hover:scale-110 ${a.tint}`}
                >
                  {a.emoji}
                </span>
                {a.label}
              </span>
            ))}
          </div>
          <p className="relative mt-4 flex items-center gap-1.5 text-xs text-brand-faded">
            <span className="text-sm">💛</span> Got an allergy? Pop it in your order note and we’ll take extra
            care of you.
          </p>
        </div>
      </div>

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
