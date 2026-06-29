import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiErrorMessage, inquiriesApi } from '../../services/api';
import { useToast } from '../../hooks/useToast';
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
        email: email.trim(),
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Please enter your name');
    if (!email.trim()) return toast.error('Please enter your email');
    if (!message.trim()) return toast.error('Please add a message');
    mutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input className={inputCls} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
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
      <Button type="submit" loading={mutation.isPending} className="w-full">
        Send inquiry
      </Button>
    </form>
  );
}
