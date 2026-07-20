import { useState } from 'react';
import { useToast } from '../../hooks/useToast';
import { BUSINESS, whatsappLink } from '../../lib/business';

interface Props {
  message: string;
  onMessageChange: (value: string) => void;
  messageLabel?: string;
}

const inputCls =
  'w-full rounded-brand border border-brand-border px-3 py-2.5 text-sm outline-none focus:border-brand-primary';

/** WhatsApp-only order helper — builds a prefilled chat message. No DB record. */
export function InquiryForm({
  message,
  onMessageChange,
  messageLabel = 'What would you like to order?',
}: Props) {
  const toast = useToast();
  const [name, setName] = useState('');

  const openWhatsApp = () => {
    if (!message.trim()) return toast.error('Tell us what you would like first 🙂');
    const who = name.trim() ? `I'm ${name.trim()}. ` : '';
    const text = `Hi ${BUSINESS.name}! ${who}${message.trim()}`;
    window.open(whatsappLink(text), '_blank', 'noopener');
  };

  return (
    <div className="space-y-3">
      <input
        className={inputCls}
        placeholder="Your name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        className={inputCls}
        rows={4}
        placeholder={messageLabel}
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
      />
      <button
        type="button"
        onClick={openWhatsApp}
        className="flex w-full items-center justify-center gap-2 rounded-brand bg-[#25D366] px-4 py-3 font-semibold text-white transition-transform hover:scale-[1.01]"
      >
        <span className="text-lg">💬</span> Chat &amp; order on WhatsApp
      </button>
      <p className="text-center text-xs text-brand-faded">
        Orders are confirmed over WhatsApp — quickest way to reach us.
      </p>
    </div>
  );
}
