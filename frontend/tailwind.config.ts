import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Warm "butter & bloom" palette (from the brand reference)
        brand: {
          bg: '#fff6e6', // cream
          soft: '#fcebc4', // butter
          primary: '#b07a52', // cookie
          dark: '#6b4226', // cocoa
          light: '#f8d5d0', // blush
          accent: '#d4a574', // gold
          'accent-light': '#fcebc4',
          gold: '#a9743a',
          green: '#5a8a4a',
          'green-light': '#d6e8c5',
          red: '#c47373',
          'red-light': '#f6ddd8',
          text: '#3e2415', // choc
          muted: '#8a6a4f',
          faded: '#b09075',
          border: '#f0ddc4',
          'border-soft': '#f7ece0',
        },
      },
      backgroundImage: {
        hero: 'linear-gradient(135deg, #b07a52 0%, #6b4226 100%)',
      },
      boxShadow: {
        'brand-sm': '0 3px 10px rgba(107,66,38,0.06)',
        brand: '0 4px 14px rgba(107,66,38,0.10)',
        'brand-lg': '0 10px 30px rgba(107,66,38,0.13)',
      },
      borderRadius: {
        brand: '14px',
        'brand-lg': '22px',
      },
      fontFamily: {
        sans: ['Quicksand', '-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
