/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'hover:bg-coral-pale',
    'hover:text-coral',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        display: ['var(--font-display)', 'serif'],
      },
      colors: {
        // ── Text / foreground ──────────────────────────────────
        'ink':          '#0c1e27',
        'ink-soft':     '#173b4f',
        'ink-muted':    '#4a4a4a',
        'ink-faint':    '#767676',

        // ── Backgrounds ────────────────────────────────────────
        'paper':        '#ffffff',
        'paper-warm':   '#f5f5f5',
        'paper-mid':    '#e8e8e8',
        'paper-border': '#d1d1d1',

        // ── AI features ────────────────────────────────────────
        'teal':         '#089bf7',
        'teal-dark':    '#067cc6',
        'teal-light':   '#39aff9',
        'teal-pale':    '#e6f5fe',

        // ── Warnings ───────────────────────────────────────────
        'amber-signal': '#f4c90b',
        'amber-pale':   '#fefae7',

        // ── Danger / serious ───────────────────────────────────
        'coral':        '#f04b0f',
        'coral-dark':   '#c03c0c',
        'coral-pale':   '#fdede7',

        // ── Destructive ────────────────────────────────────────
        'lobster':      '#c93638',
        'lobster-dark': '#a12b2d',
        'lobster-pale': '#faebeb',
      },
      borderRadius: {
        'sm':    '4px',
        DEFAULT: '8px',
        'md':    '10px',
        'lg':    '14px',
        'xl':    '20px',
      },
      boxShadow: {
        'card':   '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'lifted': '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
        'float':  '0 8px 24px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
      },
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.25s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%':   { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}