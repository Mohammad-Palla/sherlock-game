import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b0b0f',
        charcoal: '#15151b',
        brass: '#c0a56b',
        burgundy: '#5a1d2b',
        fog: '#9aa0a6',
        parchment: '#e5dccb',
      },
      boxShadow: {
        glow: '0 0 30px rgba(192,165,107,0.35)',
        vignette: 'inset 0 0 120px rgba(0,0,0,0.85)',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '0.75' },
          '40%': { opacity: '0.35' },
          '70%': { opacity: '0.9' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        flicker: 'flicker 3.5s infinite',
        float: 'float 6s ease-in-out infinite',
      },
      fontFamily: {
        serif: [
          'Iowan Old Style',
          'Palatino Linotype',
          'Book Antiqua',
          'Palatino',
          'Times New Roman',
          'serif',
        ],
        sans: ['"Source Sans 3"', 'Avenir Next', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
