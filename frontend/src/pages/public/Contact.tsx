import { BUSINESS, whatsappLink } from '../../lib/business';

export function Contact() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-center text-3xl font-bold text-brand-dark">Get in Touch</h1>
      <p className="mb-8 text-center text-brand-muted">
        Questions, custom orders, or just to say hi — message us on WhatsApp and we'll help you out.
      </p>

      <div className="rounded-brand-lg border border-brand-border-soft bg-white p-6 text-center shadow-brand-sm">
        <ul className="space-y-3 text-sm text-brand-muted">
          <li>📞 {BUSINESS.phone}</li>
          <li>📍 {BUSINESS.address}</li>
          <li>🕒 {BUSINESS.hours}</li>
        </ul>
        <a
          href={whatsappLink(`Hi ${BUSINESS.name}! I'd like to order some cookies.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center justify-center gap-2 rounded-brand bg-[#25D366] px-4 py-3 font-semibold text-white transition-transform hover:scale-[1.01]"
        >
          <span className="text-lg">💬</span> Message us on WhatsApp
        </a>
      </div>
    </div>
  );
}
