import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../services/api';
import { BUSINESS } from '../../lib/business';
import { StoreProductCard } from '../../components/public/StoreProductCard';
import { Spinner } from '../../components/ui/Spinner';

const HIGHLIGHTS = [
  {
    icon: '🧈',
    title: 'Pure butter & quality ingredients',
    text: 'Made with carefully selected ingredients for the best flavour.',
  },
  {
    icon: '🎀',
    title: 'Custom orders',
    text: 'Personalised packaging for any occasion.',
  },
  {
    icon: '🍪',
    title: 'Baked fresh',
    text: 'Homemade cookies, fresh from the oven to your hands — no same-day delivery.',
  },
];

export function Home() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', 'public'],
    queryFn: productsApi.listPublic,
  });
  const featured = (products ?? []).filter((p) => p.isFeatured);

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
            🌻 {BUSINESS.badge}
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
            <Link
              to="/contact"
              className="rounded-brand border border-white/60 px-7 py-3 font-semibold text-white transition-colors hover:bg-white/10"
            >
              How to Order
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/70">Pure butter · Small batches · Baked fresh</p>
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

      {/* How to order (PS) */}
      <section className="mx-auto max-w-4xl px-4 pb-4">
        <div className="rounded-brand-lg border border-brand-border bg-brand-light p-6 text-center">
          <h2 className="text-xl font-bold text-brand-dark">Can I order? 🌻</h2>
          <p className="mx-auto mt-2 max-w-xl text-brand-muted">
            Yes! We bake to order. Browse the menu, then message us on the{' '}
            <Link to="/contact" className="font-semibold text-brand-primary hover:text-brand-dark">
              Contact
            </Link>{' '}
            page (or WhatsApp) with what you'd like — we'll bake it fresh and arrange delivery or pickup.
            Please note there's no same-day delivery, as everything is made from scratch.
          </p>
        </div>
      </section>

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
    </div>
  );
}
