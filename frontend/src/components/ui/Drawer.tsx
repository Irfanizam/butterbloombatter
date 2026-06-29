import { ReactNode } from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Drawer({ open, onClose, title, children, footer }: DrawerProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-brand-lg">
        <div className="flex items-center justify-between border-b border-brand-border-soft px-5 py-4">
          <h2 className="font-bold text-brand-dark">{title}</h2>
          <button
            onClick={onClose}
            className="text-lg text-brand-faded transition-colors hover:text-brand-dark"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-brand-border-soft px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
