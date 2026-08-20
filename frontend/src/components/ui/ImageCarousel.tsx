import { useEffect, useRef, useState } from 'react';
import { CookiePlaceholder } from './CookiePlaceholder';

interface Props {
  images: string[];
  /** Height/aspect classes for the frame, e.g. "h-80" or "aspect-[4/3]". */
  className?: string;
  /** 'contain' shows the whole image (no zoom/crop); 'cover' fills the frame. */
  fit?: 'contain' | 'cover';
  /** Autoplay interval in ms; 0 disables autoplay. */
  intervalMs?: number;
  alt?: string;
}

export function ImageCarousel({
  images,
  className = 'h-80',
  fit = 'cover',
  intervalMs = 4000,
  alt = '',
}: Props) {
  const count = images.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const safe = count ? ((index % count) + count) % count : 0;

  // Reset when the set of images changes (content-based, not identity).
  const key = images.join('|');
  useEffect(() => setIndex(0), [key]);

  // Autoplay (paused on hover / touch).
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  useEffect(() => {
    if (count <= 1 || !intervalMs) return;
    const id = setInterval(() => {
      if (!pausedRef.current) setIndex((i) => i + 1);
    }, intervalMs);
    return () => clearInterval(id);
  }, [count, intervalMs, key]);

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-brand-lg bg-brand-soft ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      {count > 0 ? (
        <img
          key={safe}
          src={images[safe]}
          alt={alt}
          className={`h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} animate-[fadein_0.5s_ease]`}
        />
      ) : (
        <CookiePlaceholder className="h-full w-full" />
      )}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => setIndex((i) => i - 1)}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-1 text-lg leading-none text-brand-dark shadow-brand-sm hover:bg-white"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => i + 1)}
            aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-1 text-lg leading-none text-brand-dark shadow-brand-sm hover:bg-white"
          >
            ›
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to image ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === safe ? 'w-4 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/90'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
