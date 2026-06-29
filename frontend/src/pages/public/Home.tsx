import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../services/api';
import { BUSINESS } from '../../lib/business';
import { StoreProductCard } from '../../components/public/StoreProductCard';
import { Spinner } from '../../components/ui/Spinner';

export function Home() {
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', 'public'],
    queryFn: productsApi.listPublic,
  });
  const featured = (products ?? []).filter((p) => p.isFeatured);

  return (
    <div>
      {/* Hero */}
      <section className="bg-hero px-4 py-20 text-center text-white">
        <div className="mx-auto max-w-3xl">
          <div className="text-5xl">🍪</div>
          <h1 className="mt-4 text-4xl font-bold sm:text-5xl">{BUSINESS.name}</h1>
          <p className="mt-3 text-lg text-white/90">{BUSINESS.tagline}</p>
          <Link
            to="/menu"
            className="mt-8 inline-block rounded-brand bg-white px-6 py-3 font-semibold text-brand-dark shadow-brand-lg transition-transform hover:scale-105"
          >
            Order Now
          </Link>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-6 text-center text-2xl font-bold text-brand-dark">Featured Cookies</h2>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-8 w-8" />
          </div>
        ) : featured.length === 0 ? (
          <p className="text-center text-brand-faded">No featured cookies right now — check the full menu!</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <StoreProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
        <div className="mt-8 text-center">
          <Link to="/menu" className="font-semibold text-brand-primary hover:text-brand-dark">
            See the full menu →
          </Link>
        </div>
      </section>

      {/* Our Story */}
      <section className="bg-brand-soft px-4 py-14">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-2xl font-bold text-brand-dark">Our Story</h2>
          <p className="leading-relaxed text-brand-muted">{BUSINESS.story}</p>
        </div>
      </section>
    </div>
  );
}
