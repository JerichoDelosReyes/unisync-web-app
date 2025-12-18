/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './Web/index.html',
    './Web/src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)'
        },
        brand: {
          DEFAULT: 'var(--color-brand)',
          hover: 'var(--color-brand-hover)',
          active: 'var(--color-brand-active)'
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          hover: 'var(--color-accent-hover)',
          active: 'var(--color-accent-active)'
        },
        bg: 'var(--color-bg)',
        text: 'var(--color-text)'
      },
      borderRadius: {
        card: '12px',
        button: '8px'
      },
      boxShadow: {
        card: '0 8px 24px rgba(0,0,0,0.08)'
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
