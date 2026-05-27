/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Geist"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f6f5f0',
          100: '#e8e5d8',
          200: '#cfc9b3',
          300: '#a8a07a',
          400: '#736b48',
          500: '#3d3825',
          600: '#2a2618',
          700: '#1c1910',
          800: '#13110a',
          900: '#0a0905',
        },
        accent: {
          DEFAULT: '#d97757',
          dark: '#b85e3f',
        },
      },
    },
  },
  plugins: [],
};
