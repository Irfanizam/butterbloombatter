import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi, reviewsApi } from '../../services/api';
import { BUSINESS } from '../../lib/business';
import { StoreProductCard } from '../../components/public/StoreProductCard';
import { Spinner } from '../../components/ui/Spinner';
import { StarRating } from '../../components/ui/StarRating';
import { Modal } from '../../components/ui/Modal';
import { ImageCarousel } from '../../components/ui/ImageCarousel';

const HIGHLIGHTS = [
  {
    icon: '🧈',
    title: 'Quality ingredients',
    text: 'Made with pure butter for the best flavour',
  },
  {
    icon: '🍪',
    title: 'Homemade cookies',
    text: 'Baked fresh in small batches and packed with extra care',
  },
  {
    icon: '🎀',
    title: 'Custom orders',
    text: 'Personalised packaging for any occasion',
  },
];

export function Home() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', 'public'],
    queryFn: productsApi.listPublic,
  });
  const featured = (products ?? []).filter((p) => p.isFeatured);
  // Every product photo (main + gallery) for the homepage carousel.
  const galleryImages = (products ?? []).flatMap((p) => [
    ...(p.imageUrl ? [p.imageUrl] : []),
    ...(p.images?.map((i) => i.url) ?? []),
  ]);
  const { data: reviews = [] } = useQuery({ queryKey: ['reviews'], queryFn: reviewsApi.listPublic });
  const [faqOpen, setFaqOpen] = useState(false);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero px-4 pb-24 pt-20 text-center text-white">
        <div className="pointer-events-none absolute inset-0 opacity-90 [background:radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_45%)]" />
        <span className="pointer-events-none absolute left-[8%] top-16 select-none text-6xl opacity-20">🍪</span>
        <span className="pointer-events-none absolute right-[10%] top-28 select-none text-5xl opacity-20">🌻</span>
        <span className="pointer-events-none absolute bottom-16 left-[18%] select-none text-5xl opacity-20">🍫</span>
        <span className="pointer-events-none absolute bottom-24 right-[16%] select-none text-6xl opacity-20">🧈</span>

        <div className="relative mx-auto max-w-3xl">
          <span className="inline-block rounded-full bg-white/15 px-4 py-1 text-sm font-semibold backdrop-blur">
            {BUSINESS.badge}
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight drop-shadow-sm sm:text-6xl">
            {BUSINESS.name}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">{BUSINESS.tagline}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/menu"
              className="rounded-brand bg-white px-7 py-3 font-semibold text-brand-dark shadow-brand-lg transition-transform hover:scale-105"
            >
              Browse Menu
            </Link>
            <button
              type="button"
              onClick={() => setFaqOpen(true)}
              className="rounded-brand border border-white/60 px-7 py-3 font-semibold text-white transition-colors hover:bg-white/10"
            >
              How to pre-order 💌
            </button>
          </div>
          <p className="mt-6 text-sm lowercase text-white/70">pure butter · small batches · cookie favors</p>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-10 rounded-t-[50%] bg-brand-bg" />
      </section>

      {/* Highlights */}
      <section className="mx-auto -mt-6 max-w-5xl px-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {HIGHLIGHTS.map((h) => (
            <div
              key={h.title}
              className="rounded-brand-lg border border-brand-border-soft bg-white p-5 text-center shadow-brand-sm"
            >
              <div className="text-3xl">{h.icon}</div>
              <h3 className="mt-2 font-bold text-brand-dark">{h.title}</h3>
              <p className="mt-1 text-sm text-brand-muted">{h.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery carousel */}
      {galleryImages.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pt-14">
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-brand-dark">Fresh from the oven</h2>
            <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-brand-primary" />
          </div>
          <ImageCarousel
            images={galleryImages}
            fit="cover"
            intervalMs={4000}
            className="h-64 shadow-brand sm:h-80 lg:h-[26rem]"
            alt="Our cookies"
          />
        </section>
      )}

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-brand-dark">Featured Cookies</h2>
          <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-brand-primary" />
        </div>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-8 w-8" />
          </div>
        ) : featured.length === 0 ? (
          <p className="text-center text-brand-faded">No featured cookies right now — check the full menu!</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <StoreProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
        <div className="mt-10 text-center">
          <Link
            to="/menu"
            className="inline-block rounded-brand bg-brand-primary px-6 py-3 font-semibold text-white shadow-brand-sm transition-colors hover:bg-brand-dark"
          >
            See the full menu →
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      {reviews.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-4 pt-4">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-brand-dark">What our customers say</h2>
            <div className="mx-auto mt-2 h-1 w-16 rounded-full bg-brand-primary" />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="rounded-brand-lg border border-brand-border-soft bg-white p-5 shadow-brand-sm"
              >
                <StarRating rating={r.rating} />
                <p className="mt-2 text-brand-muted">“{r.message}”</p>
                <p className="mt-3 text-sm font-semibold text-brand-dark">— {r.author}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Our Story */}
      <section className="bg-brand-soft px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-4xl">🌻</div>
          <h2 className="mb-4 mt-3 text-3xl font-bold text-brand-dark">Our Story</h2>
          <p className="leading-relaxed text-brand-muted">{BUSINESS.story}</p>
          <Link
            to="/contact"
            className="mt-8 inline-block rounded-brand border border-brand-primary px-6 py-3 font-semibold text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
          >
            Get in touch
          </Link>
        </div>
      </section>

      {/* How to pre-order — FAQ popup */}
      <Modal open={faqOpen} onClose={() => setFaqOpen(false)} title="How to pre-order 💌" maxWidth="max-w-lg">
        <ol className="space-y-3 text-sm text-brand-muted">
          <li>
            <span className="font-semibold text-brand-dark">Browse the menu</span> — choose the cookies you'd like to order.
          </li>
          <li>
            <span className="font-semibold text-brand-dark">Place your order</span> — send us your order via{' '}
            <Link to="/contact" onClick={() => setFaqOpen(false)} className="font-semibold text-brand-primary">
              Contact
            </Link>{' '}
            or WhatsApp.
          </li>
          <li>
            <span className="font-semibold text-brand-dark">Baked fresh for you</span> — each batch is baked
            after your order is placed, we kindly ask you to order in advance. (please note: same-day delivery
            isn't available)
          </li>
          <li>
            <span className="font-semibold text-brand-dark">Delivery or pick-up</span> — the details will be
            arranged with you over chat.
          </li>
        </ol>
      </Modal>
    </div>
  );
}
