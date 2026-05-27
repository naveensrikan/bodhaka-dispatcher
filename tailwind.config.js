/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Segoe UI Variable"', '"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Segoe UI Variable Display"', '"Segoe UI Variable"', 'system-ui', 'sans-serif'],
        mono: ['"Cascadia Code"', '"Consolas"', '"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Bodhaka Forge brand
        brand: {
          DEFAULT: '#1e2a8a',      // logo deep blue
          dark: '#15205e',
          light: '#3a4ab8',
          subtle: '#e8eaf6',
          'subtle-dark': '#1a1f3d',
        },
        gold: {
          DEFAULT: '#f5b800',      // logo gold
          dark: '#c99500',
          light: '#ffd34d',
        },
        bg: {
          base: '#f4f5f9',
          layer: '#ffffff',
          subtle: '#fafbfd',
          hover: '#eef0f6',
          selected: '#e3e7f1',
          dark: '#0e1124',
          'dark-layer': '#181d33',
          'dark-subtle': '#141831',
        },
        border: {
          DEFAULT: '#e3e5ec',
          strong: '#cdd0dc',
          dark: '#2a2f4d',
          'dark-strong': '#3a3f5e',
        },
        text: {
          primary: '#1a1d2e',
          secondary: '#5a5e75',
          tertiary: '#8a8fa6',
          'primary-dark': '#f5f6fa',
          'secondary-dark': '#c0c3d4',
          'tertiary-dark': '#8a8fa6',
        },
        accent: {
          DEFAULT: '#1e2a8a',
          hover: '#15205e',
          pressed: '#0d143f',
          subtle: '#e8eaf6',
          'subtle-dark': '#1a1f3d',
        },
        success: '#107c10',
        warning: '#9d5d00',
        danger:  '#c42b1c',
      },
      boxShadow: {
        'win-card':   '0 2px 6px rgba(30,42,138,0.05), 0 1px 2px rgba(30,42,138,0.07)',
        'win-flyout': '0 8px 24px rgba(30,42,138,0.12), 0 2px 4px rgba(30,42,138,0.08)',
        'brand-glow': '0 0 0 3px rgba(30,42,138,0.15)',
      },
      borderRadius: {
        win: '6px',
      },
    },
  },
  plugins: [],
};
