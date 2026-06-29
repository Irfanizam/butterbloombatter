interface SpinnerProps {
  className?: string;
}

export function Spinner({ className = 'h-6 w-6' }: SpinnerProps) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-brand-primary border-t-transparent ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-bg">
      <div className="text-center">
        <Spinner className="h-10 w-10" />
        <p className="mt-3 text-brand-muted">Loading…</p>
      </div>
    </div>
  );
}
