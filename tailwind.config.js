/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Segoe UI Variable"', '"Segoe UI"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Cascadia Code"', '"Consolas"', '"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Windows 11 Fluent 2 inspired palette
        bg: {
          base: '#f3f3f3',         // Mica light
          layer: '#ffffff',        // Card surface
          subtle: '#fafafa',
          hover: '#f5f5f5',
          selected: '#ebebeb',
          dark: '#202020',         // Mica dark
          'dark-layer': '#2b2b2b',
          'dark-subtle': '#272727',
        },
        border: {
          DEFAULT: '#e5e5e5',
          strong: '#d1d1d1',
          dark: '#3a3a3a',
          'dark-strong': '#4a4a4a',
        },
        text: {
          primary: '#1a1a1a',
          secondary: '#5a5a5a',
          tertiary: '#8a8a8a',
          'primary-dark': '#ffffff',
          'secondary-dark': '#c8c8c8',
          'tertiary-dark': '#8a8a8a',
        },
        accent: {
          DEFAULT: '#0078d4',       // Windows 11 blue
          hover: '#106ebe',
          pressed: '#005a9e',
          subtle: '#deecf9',
          'subtle-dark': '#1a3a5c',
        },
        success: '#107c10',
        warning: '#9d5d00',
        danger:  '#c42b1c',
      },
      boxShadow: {
        'win-card':   '0 2px 6px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'win-flyout': '0 8px 24px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)',
      },
      borderRadius: {
        win: '6px',
      },
    },
  },
  plugins: [],
};
