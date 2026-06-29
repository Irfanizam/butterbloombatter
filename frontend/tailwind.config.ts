import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#fdf8f0',
          soft: '#f7ede0',
          primary: '#c2692a',
          dark: '#8b3a0f',
          light: '#fde8d5',
          accent: '#d4a017',
          gold: '#b45309',
          green: '#2d7a4f',
          'green-light': '#d1f0e0',
          red: '#b91c1c',
          'red-light': '#fee2e2',
          text: '#1f1008',
          muted: '#6b5040',
          faded: '#a08070',
          border: '#f0d8c0',
          'border-soft': '#f8ece0',
        },
      },
      backgroundImage: {
        hero: 'linear-gradient(135deg, #c2692a 0%, #8b3a0f 100%)',
      },
      boxShadow: {
        'brand-sm': '0 1px 2px rgba(139,58,15,0.07)',
        brand: '0 2px 8px rgba(139,58,15,0.10)',
        'brand-lg': '0 4px 20px rgba(139,58,15,0.13)',
      },
      borderRadius: {
        brand: '12px',
        'brand-lg': '18px',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Helvetica Neue',
          'Roboto',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
