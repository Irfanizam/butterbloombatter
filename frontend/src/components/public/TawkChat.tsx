import { useEffect } from 'react';

/**
 * Optional free live-chat widget (tawk.to).
 * Loads only when VITE_TAWK_SRC is set (your tawk.to embed URL, e.g.
 * https://embed.tawk.to/<propertyId>/<widgetId>). When unset, nothing renders
 * and the floating WhatsApp button remains the contact channel.
 */
export function TawkChat() {
  useEffect(() => {
    const src = import.meta.env.VITE_TAWK_SRC as string | undefined;
    if (!src || document.getElementById('tawk-script')) return;
    const s = document.createElement('script');
    s.id = 'tawk-script';
    s.async = true;
    s.src = src;
    s.charset = 'UTF-8';
    s.setAttribute('crossorigin', '*');
    document.body.appendChild(s);
  }, []);
  return null;
}
