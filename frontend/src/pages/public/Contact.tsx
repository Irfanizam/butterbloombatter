import { useState } from 'react';
import { BUSINESS } from '../../lib/business';
import { InquiryForm } from '../../components/public/InquiryForm';

export function Contact() {
  const [message, setMessage] = useState('');

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-bold text-brand-dark">Get in Touch</h1>
      <p className="mb-8 text-brand-muted">Questions, custom orders, or just to say hi — we'd love to hear from you.</p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Business info */}
        <div className="rounded-brand-lg border border-brand-border-soft bg-white p-6 shadow-brand-sm">
          <h2 className="mb-4 text-lg font-bold text-brand-dark">{BUSINESS.name}</h2>
          <ul className="space-y-3 text-sm text-brand-muted">
            <li>📧 {BUSINESS.email}</li>
            <li>📞 {BUSINESS.phone}</li>
            <li>📍 {BUSINESS.address}</li>
            <li>🕒 {BUSINESS.hours}</li>
          </ul>
          <div className="mt-6 rounded-brand bg-hero p-4 text-white">
            <p className="text-sm">{BUSINESS.tagline}</p>
          </div>
        </div>

        {/* Contact form */}
        <div className="rounded-brand-lg border border-brand-border-soft bg-white p-6 shadow-brand-sm">
          <h2 className="mb-4 text-lg font-bold text-brand-dark">Send a Message</h2>
          <InquiryForm message={message} onMessageChange={setMessage} messageLabel="Your message" />
        </div>
      </div>
    </div>
  );
}
