export function StarRating({ rating, className = '' }: { rating: number; className?: string }) {
  return (
    <span className={`text-brand-accent ${className}`} aria-label={`${rating} out of 5`}>
      {'★'.repeat(rating)}
      <span className="text-brand-border">{'★'.repeat(Math.max(0, 5 - rating))}</span>
    </span>
  );
}
