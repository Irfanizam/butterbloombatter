interface PlaceholderProps {
  title: string;
  note?: string;
}

/** Temporary page for routes built in later phases. */
export function Placeholder({ title, note = 'Coming in a later phase.' }: PlaceholderProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <div className="text-4xl">🧁</div>
      <h1 className="mt-3 text-xl font-bold text-brand-dark">{title}</h1>
      <p className="mt-1 text-brand-muted">{note}</p>
    </div>
  );
}
