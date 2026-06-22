// Tailwind config in plain JS to avoid TS/ESM edge cases during `next dev`.
// Tokens mirror design-system/tokens.md.
const animate = require('tailwindcss-animate');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Platform brand — Global Guides DMC
        crimson: {
          50:  '#FCEBEB',
          100: '#F6CECE',
          200: '#E89797',
          300: '#D86161',
          500: '#8C1816',   // logo internal
          700: '#760F0F',
          900: '#630909',   // platform primary
        },
        amber: {
          50:  '#FFF8DD',
          100: '#FFEFB0',
          300: '#FFD24D',
          500: '#FFBA06',   // platform accent
          700: '#D69900',
          900: '#8F6700',
        },

        // Neutrals + structural (kept for body text, cards, admin)
        navy:   { 50:'#EEF2F7', 100:'#D7DEEA', 200:'#AAB6CD', 500:'#1E3A66', 700:'#102747', 900:'#081428' },
        // Legacy gold kept as alias (older components reference gold-*) — same as amber now.
        gold:   { 300:'#FFD24D', 500:'#FFBA06', 700:'#D69900' },
        action: { 100:'#E0F2FE', 500:'#0369A1', 600:'#075985', 700:'#0C4A6E' },
        ink: { DEFAULT: '#211C17', soft: '#3A332B' }, // warm near-black for display headings
        canvas: '#FAF6F0',      // warm ivory page background (was cold #F7F9FC)
        surface: '#FFFFFF',
        'surface-2': '#F4EFE7',  // warm secondary surface / zebra (was cold #F1F4F9)
        success: { 100:'#DCFCE7', 500:'#16A34A' },
        warning: { 100:'#FEF3C7', 500:'#D97706' },
        danger:  { 100:'#FEE2E2', 500:'#DC2626' },
        info:    { 500:'#2563EB' },
        border: {
          subtle: '#ECE5DB',   // warm hairline (was cold #E5E9F0)
          DEFAULT: '#DDD4C7',
          strong: '#B3A795',
        },
        brick: { DEFAULT: '#B94025', dark: '#9D3520' },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-jbm)', 'ui-monospace', 'SFMono-Regular'],
        display: ['var(--font-fraunces)', 'ui-serif', 'Georgia'],
      },
      borderRadius: { xs:'4px', sm:'6px', md:'10px', lg:'14px', xl:'18px', '2xl':'24px' },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(99 9 9 / 0.04)',
        sm: '0 2px 6px -1px rgb(99 9 9 / 0.06), 0 1px 3px -1px rgb(99 9 9 / 0.04)',
        md: '0 6px 14px -3px rgb(99 9 9 / 0.08), 0 3px 6px -2px rgb(99 9 9 / 0.05)',
        lg: '0 12px 28px -6px rgb(99 9 9 / 0.10), 0 6px 12px -4px rgb(99 9 9 / 0.06)',
        xl: '0 24px 48px -12px rgb(99 9 9 / 0.16)',
      },
      transitionTimingFunction: { standard: 'cubic-bezier(0.2,0,0,1)' },
    },
  },
  plugins: [animate],
};
