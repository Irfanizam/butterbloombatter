import { useToastStore, type ToastType } from '../../store/toast.store';

const styles: Record<ToastType, string> = {
  success: 'bg-brand-green-light text-brand-green border-brand-green/30',
  error: 'bg-brand-red-light text-brand-red border-brand-red/30',
  info: 'bg-brand-light text-brand-dark border-brand-border',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="fixed right-4 top-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`rounded-brand border px-4 py-3 text-left text-sm font-medium shadow-brand transition ${styles[t.type]}`}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
