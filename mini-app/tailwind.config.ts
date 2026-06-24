import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        offwhite: '#FAF6F0',
        sand: {
          DEFAULT: '#E8DCC8',
          light:   '#F3ECD8',
          dark:    '#D4C5A3',
          deep:    '#C4AD8A',
        },
        terra: {
          DEFAULT: '#C56B4A',
          deep:    '#8A4B33',
          light:   '#D4896B',
          faint:   '#F5EDE9',
        },
        clay: '#8A4B33',
        charcoal: {
          DEFAULT: '#2B2420',
          mid:     '#6B5750',
          light:   '#9E8880',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        terra:  '0 4px 24px rgba(197, 107, 74, 0.22)',
        card:   '0 2px 16px rgba(43, 36, 32, 0.08)',
        'card-lg': '0 8px 32px rgba(43, 36, 32, 0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config
