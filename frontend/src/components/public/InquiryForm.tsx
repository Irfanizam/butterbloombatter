import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiErrorMessage, inquiriesApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
import { BUSINESS, whatsappLink } from '../../lib/business';
import { Button } from '../ui/Button';

interface Props {
  message: string;
  onMessageChange: (value: string) => void;
  showPhone?: boolean;
  messageLabel?: string;
}

const inputCls =
  'w-full rounded-brand border border-brand-border px-3 py-2.5 text-sm outline-none focus:border-brand-primary';

export function InquiryForm({
  message,
  onMessageChange,
  showPhone = false,
  messageLabel = 'Message',
}: Props) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      inquiriesApi.create({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: showPhone ? phone.trim() || undefined : undefined,
        message: message.trim(),
      }),
    onSuccess: () => {
      toast.success("Thanks! We've received your inquiry and will be in touch. 🧁");
      setName('');
      setEmail('');
      setPhone('');
      onMessageChange('');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not send inquiry')),
  });

  const openWhatsApp = () => {
    if (!message.trim()) return toast.error('Add a message first');
    const who = name.trim() ? `I'm ${name.trim()}. ` : '';
    const text = `Hi ${BUSINESS.name}! ${who}${message.trim()}`;
    window.open(whatsappLink(text), '_blank', 'noopener');
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Please enter your name');
    if (!message.trim()) return toast.error('Please add a message');
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input className={inputCls} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputCls} type="email" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {showPhone && (
        <input className={inputCls} placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
      )}
      <textarea
        className={inputCls}
        rows={4}
        placeholder={messageLabel}
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
      />

      {/* WhatsApp first — orders are confirmed over chat */}
      <button
        type="button"
        onClick={openWhatsApp}
        className="flex w-full items-center justify-center gap-2 rounded-brand bg-[#25D366] px-4 py-3 font-semibold text-white transition-transform hover:scale-[1.01]"
      >
        <span className="text-lg">💬</span> Chat &amp; order on WhatsApp
      </button>
      <p className="text-center text-xs text-brand-faded">
        We confirm every order over WhatsApp — quickest way to reach us.
      </p>

      <Button type="submit" variant="secondary" loading={mutation.isPending} className="w-full">
        Or leave an inquiry
      </Button>
    </form>
  );
}
