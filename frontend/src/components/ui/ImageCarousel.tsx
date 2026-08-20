import { useEffect, useRef, useState } from 'react';
import { CookiePlaceholder } from './CookiePlaceholder';

interface Props {
  images: string[];
  /** Height/size classes for the frame, e.g. "h-80" or "h-full w-full". */
  className?: string;
  /** 'contain' shows the whole image (no zoom/crop); 'cover' fills the frame. */
  fit?: 'contain' | 'cover';
  /** Autoplay interval in ms; 0 disables autoplay. */
  intervalMs?: number;
  /** Show arrows + dots (off for compact cards). */
  controls?: boolean;
  alt?: string;
}

export function ImageCarousel({
  images,
  className = 'h-80',
  fit = 'cover',
  intervalMs = 3000,
  controls = true,
  alt = '',
}: Props) {
  const count = images.length;
  const fitCls = fit === 'contain' ? 'object-contain' : 'object-cover';

  // Slides are cloned on both ends ([last, ...images, first]) so the track can
  // slide past the edge and then snap back invisibly — a seamless loop.
  const [pos, setPos] = useState(1); // 1 = first real image
  const [animate, setAnimate] = useState(true);
  // Autoplay runs only while the user is interacting (hovering / holding).
  const [active, setActive] = useState(false);

  const key = images.join('|');
  useEffect(() => {
    setPos(1);
    setAnimate(true);
  }, [key]);

  // Advance only while active (cursor over it on desktop, finger on it on phone).
  const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(() => {
    if (count <= 1 || !intervalMs) return;
    const id = setInterval(() => {
      if (activeRef.current) setPos((p) => p + 1);
    }, intervalMs);
    return () => clearInterval(id);
  }, [count, intervalMs, key]);

  // Re-enable the transition on the frame after a no-animation snap.
  useEffect(() => {
    if (!animate) {
      const id = requestAnimationFrame(() => setAnimate(true));
      return () => cancelAnimationFrame(id);
    }
  }, [animate]);

  if (count === 0) {
    return (
      <div className={`relative overflow-hidden bg-brand-soft ${className}`}>
        <CookiePlaceholder className="h-full w-full" />
      </div>
    );
  }
  if (count === 1) {
    return (
      <div className={`relative overflow-hidden bg-brand-soft ${className}`}>
        <img src={images[0]} alt={alt} className={`h-full w-full ${fitCls}`} />
      </div>
    );
  }

  const slides = [images[count - 1], ...images, images[0]];
  const logical = ((pos - 1) % count + count) % count; // real index, for the dots

  const onDone = () => {
    if (pos === slides.length - 1) {
      setAnimate(false); // reached the trailing clone → snap to the real first
      setPos(1);
    } else if (pos === 0) {
      setAnimate(false); // reached the leading clone → snap to the real last
      setPos(count);
    }
  };

  return (
    <div
      className={`relative overflow-hidden bg-brand-soft ${className}`}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onTouchStart={() => setActive(true)}
      onTouchEnd={() => setActive(false)}
      onTouchCancel={() => setActive(false)}
    >
      <div
        className="flex h-full w-full"
        style={{
          transform: `translateX(-${pos * 100}%)`,
          transition: animate ? 'transform 0.6s ease-in-out' : 'none',
        }}
        onTransitionEnd={onDone}
      >
        {slides.map((src, i) => (
          <img key={i} src={src} alt={alt} className={`h-full w-full shrink-0 ${fitCls}`} />
        ))}
      </div>

      {controls && (
        <>
          <button
            type="button"
            onClick={() => setPos((p) => p - 1)}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 px-3 py-1 text-lg leading-none text-brand-dark shadow-brand-sm hover:bg-white"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setPos((p) => p + 1)}
            aria-label="Next image"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/80 px-3 py-1 text-lg leading-none text-brand-dark shadow-brand-sm hover:bg-white"
          >
            ›
          </button>
          <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPos(i + 1)}
                aria-label={`Go to image ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === logical ? 'w-4 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/90'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
