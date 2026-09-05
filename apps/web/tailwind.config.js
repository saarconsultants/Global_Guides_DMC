// Tailwind config in plain JS to avoid TS/ESM edge cases during `next dev`.
// Visual world: BOARDING PASS — white card stock on a cool grey ground, ink
// navy, crimson as the carrier stripe / primary action, amber for the live
// cell. Token NAMES are kept stable so every existing class keeps working;
// only the values changed with the redesign.
const animate = require('tailwindcss-animate');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Platform brand — carrier crimson (pops against white stock)
        crimson: {
          50:  '#FDECEF',
          100: '#F9D3DA',
          200: '#F0A3B0',
          300: '#E36A80',
          500: '#C41E3A',   // brand pop / hover of primary
          700: '#A8172E',   // primary action, carrier stripe
          900: '#7C1024',   // deep: pressed, headings on crimson
        },
        amber: {
          50:  '#FFF7DF',
          100: '#FFEDB8',
          300: '#FFD166',
          500: '#F5B324',   // live cell / accent
          700: '#C98A00',
          900: '#7A5400',
        },
        // Ink scale (cool navy-black) — navy-* kept as the neutral ramp.
        navy:   { 50:'#F2F4F7', 100:'#E4E7EC', 200:'#D0D5DD', 500:'#475467', 700:'#344054', 900:'#101828' },
        gold:   { 300:'#FFD166', 500:'#F5B324', 700:'#C98A00' },
        action: { 100:'#E0F2FE', 500:'#0369A1', 600:'#075985', 700:'#0C4A6E' },
        ink: { DEFAULT: '#101828', soft: '#344054' },
        canvas: '#EEF0F3',       // cool grey ground the passes sit on
        surface: '#FFFFFF',      // card stock
        'surface-2': '#F5F6F8',  // secondary surface / zebra
        success: { 100:'#DCFCE7', 500:'#15803D', 600:'#166534' },
        warning: { 100:'#FEF3C7', 500:'#B45309' },
        danger:  { 100:'#FEE2E2', 500:'#DC2626' },
        info:    { 500:'#2563EB' },
        border: {
          subtle: '#E9ECF0',
          DEFAULT: '#D5DAE1',
          strong: '#98A2B3',
        },
        brick: { DEFAULT: '#A8172E', dark: '#7C1024' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular'],
        // One family: display headings are the same face, heavier.
        display: ['var(--font-sans)', 'ui-sans-serif', 'system-ui'],
      },
      borderRadius: { xs:'4px', sm:'6px', md:'10px', lg:'14px', xl:'18px', '2xl':'24px' },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(16 24 40 / 0.05)',
        sm: '0 1px 2px rgb(16 24 40 / 0.06), 0 1px 3px rgb(16 24 40 / 0.05)',
        md: '0 4px 10px -2px rgb(16 24 40 / 0.08), 0 2px 4px -2px rgb(16 24 40 / 0.05)',
        lg: '0 12px 24px -8px rgb(16 24 40 / 0.14), 0 4px 8px -4px rgb(16 24 40 / 0.06)',
        xl: '0 24px 48px -16px rgb(16 24 40 / 0.28), 0 2px 6px rgb(16 24 40 / 0.06)',
      },
      transitionTimingFunction: { standard: 'cubic-bezier(0.2,0,0,1)' },
    },
  },
  plugins: [animate],
};
