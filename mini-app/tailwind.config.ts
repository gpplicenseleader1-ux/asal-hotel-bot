import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#8B6914',
          light:   '#C9A84C',
          pale:    '#E8D5A3',
          faint:   '#F3ECD8',
        },
        beige: {
          DEFAULT: '#F5F0E8',
          dark:    '#EDE5D3',
          deep:    '#D4C5A9',
        },
        brown: {
          DEFAULT: '#3D2B1F',
          mid:     '#7A5C47',
          light:   '#A68B73',
        },
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        gold: '0 4px 24px rgba(139, 105, 20, 0.20)',
        card: '0 2px 16px rgba(61, 43, 31, 0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config
