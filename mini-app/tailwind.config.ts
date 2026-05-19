import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf8f0',
          100: '#faefd8',
          200: '#f3d9a5',
          300: '#eabc6a',
          400: '#e09d3b',
          500: '#d4831d',
          600: '#b96615',
          700: '#974d14',
          800: '#7b3e17',
          900: '#663416',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
