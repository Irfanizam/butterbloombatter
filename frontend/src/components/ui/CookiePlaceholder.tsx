/** Default warm placeholder shown for products without an image. */
export function CookiePlaceholder({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-brand-light text-3xl ${className}`}
      aria-label="No image"
    >
      🍪
    </div>
  );
}
