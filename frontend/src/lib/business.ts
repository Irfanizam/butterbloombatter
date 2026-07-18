export const BUSINESS = {
  name: 'ButterBloomBatter',
  tagline: 'Where slow bakes quietly bloom 🌻',
  badge: 'Homemade · Baked fresh',
  story:
    'Inspired by the comforting taste of butter, the gentle bloom of sunflowers, and the ' +
    'art of slow baking that starts with batter — each cookie is baked fresh in small ' +
    'batches and packed with extra care, from the oven to your hands.',
  phone: '+60 18-296 4039',
  whatsapp: '60182964039', // wa.me format: country code + number, no + or spaces
  whatsappDisplay: '+60 18-296 4039',
  address: 'Kuala Lumpur, Malaysia',
  hours: 'Mon – Sun',
};

/** Builds a wa.me link with an optional prefilled message. */
export function whatsappLink(message?: string): string {
  const base = `https://wa.me/${BUSINESS.whatsapp}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
