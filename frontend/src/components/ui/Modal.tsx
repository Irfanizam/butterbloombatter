import { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

export function Modal({ open, onClose, title, children, footer, maxWidth = 'max-w-lg' }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        className={`relative z-10 flex max-h-[90vh] w-full ${maxWidth} flex-col overflow-hidden rounded-brand-lg bg-white shadow-brand-lg`}
        role="dialog"
        aria-modal="true"
      >
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
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-brand-border-soft px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
