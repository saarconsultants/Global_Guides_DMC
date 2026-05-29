# Global Guides DMC — Design Tokens

**Aesthetic**: Modern minimalism + bento grid. Subtle glassmorphism on hero modules. Dashboard-density-aware (compact tables, KPI tiles) without sacrificing whitespace. Built around Global Guides DMC's actual brand: **deep crimson + vibrant amber + white**, with cool slate neutrals for body text + admin chrome.

## Platform brand
| Role | Hex |
|---|---|
| Brand primary  | **#630909** (crimson.900 — deep) |
| Brand accent   | **#FFBA06** (amber.500 — vibrant gold) |
| Brand contrast | **#FFFFFF** (white text on crimson) |
| Logo           | `/brand/ggdmc-logo.svg` (red on transparent) · `/brand/ggdmc-logo-white.svg` · `/brand/ggdmc-logo-amber.svg` |

Use these for the **platform chrome** (top nav, admin sidebar, login brand panel, dashboard AI hero, wallet card). Each **agency** picks their own colors via Settings → Branding and they show on the customer share page (`/p/<token>`).

**Stack target**: Tailwind v3.4+, shadcn/ui, Next.js 15. Use Tailwind plugin `@tailwindcss/typography` + `tailwindcss-animate` (already in shadcn).

---

## 1. Color

Primary palette is **deep navy + warm gold + cool slate neutrals**. Semantic colors are flat (no gradients in base set; gradients reserved for hero / KPI flourish).

### Brand
| Token | Light | Dark | Usage |
|---|---|---|---|
| `brand.navy.50`  | `#EEF2F7` | `#0B1220` | Subtle card tinted bg |
| `brand.navy.100` | `#D7DEEA` | `#111A2D` | Tinted bg, hover surface |
| `brand.navy.200` | `#AAB6CD` | `#1A2540` | Inactive nav, divider on navy |
| `brand.navy.500` | `#1E3A66` | `#5878B2` | Secondary brand |
| `brand.navy.700` | `#102747` | `#8DA8D6` | Heading on light bg |
| `brand.navy.900` | `#081428` | `#E6EDF8` | Primary brand · top nav bar bg |
| `brand.gold.300` | `#E9CC8A` | `#A8862C` | Soft gold tag bg |
| `brand.gold.500` | `#C9A24A` | `#D9B868` | Accent — KPI numbers, hero highlight |
| `brand.gold.700` | `#8E6E1F` | `#F0D58F` | Pressed state of gold |

### CTA / Action (interactive blue, distinct from navy)
| Token | Light | Dark | Usage |
|---|---|---|---|
| `action.500` | `#0369A1` | `#38BDF8` | Primary button bg |
| `action.600` | `#075985` | `#0EA5E9` | Hover |
| `action.700` | `#0C4A6E` | `#0284C7` | Active |
| `action.100` | `#E0F2FE` | `#0C2540` | Focus ring tint, info banner |

### Neutrals (slate)
| Token | Light | Dark | Usage |
|---|---|---|---|
| `bg.canvas`        | `#F7F9FC` | `#070B14` | App bg |
| `bg.surface`       | `#FFFFFF` | `#0E1322` | Cards |
| `bg.surface-2`     | `#F1F4F9` | `#141A2C` | Nested cards, table stripe |
| `bg.surface-glass` | `rgba(255,255,255,0.62) backdrop-blur-xl` | `rgba(14,19,34,0.55) backdrop-blur-xl` | Hero modules, summary rails |
| `border.subtle`    | `#E5E9F0` | `#1F2740` | Hairlines |
| `border.default`   | `#D0D6E1` | `#2A3350` | Inputs, cards |
| `border.strong`    | `#94A3B8` | `#475569` | Focus ring outer, segmented control |
| `text.primary`     | `#0F172A` | `#E6EDF8` | Body |
| `text.secondary`   | `#475569` | `#94A3B8` | Captions, helper |
| `text.tertiary`    | `#64748B` | `#64748B` | Disabled |
| `text.inverse`     | `#FFFFFF` | `#0F172A` | Text on navy/cta |

### Semantic
| Token | Light | Dark | Usage |
|---|---|---|---|
| `success.500` | `#16A34A` | `#22C55E` | Confirmed booking, refundable badge |
| `success.100` | `#DCFCE7` | `#0F2417` | Success banner |
| `warning.500` | `#D97706` | `#F59E0B` | "Information missing" banners |
| `warning.100` | `#FEF3C7` | `#3A2A0B` | Warning banner bg |
| `danger.500`  | `#DC2626` | `#F87171` | Errors, delete |
| `danger.100`  | `#FEE2E2` | `#3A1414` | Error banner bg |
| `info.500`    | `#2563EB` | `#60A5FA` | Info, links |

### Data viz (8-color sequential & categorical — for charts later)
`#0369A1, #C9A24A, #16A34A, #DC2626, #7C3AED, #DB2777, #0891B2, #65A30D`

---

## 2. Typography

Single typeface family minimises licensing + load: **Plus Jakarta Sans** for UI (300–800). Mono via **JetBrains Mono**. Optional editorial display via **Fraunces** (only on customer-facing proposal hero — not in app).

```css
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Fraunces:opsz,wght@9..144,400;9..144,600&display=swap');
```

### Type ramp (rem · line-height · letter-spacing · weight)
| Token | Size | Line | Tracking | Weight | Use |
|---|---|---|---|---|---|
| `display-2xl` | 3.75 (60px) | 1.05 | -0.025em | 700 | Marketing hero |
| `display-xl`  | 3.0 (48px)  | 1.10 | -0.022em | 700 | Customer proposal hero (Fraunces if editorial) |
| `display-lg`  | 2.25 (36px) | 1.15 | -0.02em  | 700 | App page-titles |
| `display-md`  | 1.875 (30px)| 1.2  | -0.015em | 600 | Section titles |
| `display-sm`  | 1.5 (24px)  | 1.3  | -0.01em  | 600 | Card titles, day headings |
| `heading`     | 1.25 (20px) | 1.35 | -0.005em | 600 | Subsection |
| `subhead`     | 1.125 (18px)| 1.4  | 0        | 600 | Form section labels |
| `body-lg`     | 1.0625 (17px)| 1.55| 0       | 400 | Long-form body |
| `body`        | 1.0 (16px)  | 1.55 | 0        | 400 | Default body |
| `body-sm`     | 0.875 (14px)| 1.5  | 0        | 400 | Table cells, helper |
| `caption`     | 0.75 (12px) | 1.4  | 0.02em   | 500 | Tags, eyebrows |
| `overline`    | 0.6875 (11px)| 1.4 | 0.12em   | 700 | Section eyebrows ("DESTINATIONS") |
| `mono`        | 0.875 (14px)| 1.5  | 0        | 500 | Prices, IDs, code |

Minimum 16px body on mobile (✓). Line-length cap: 75ch on long-form, 60ch in modal copy.

---

## 3. Spacing scale (4pt grid)

| Token | px | Note |
|---|---|---|
| `0`   | 0   | |
| `0.5` | 2   | Hairline only |
| `1`   | 4   | Icon-to-text |
| `1.5` | 6   | Pill chip padding |
| `2`   | 8   | Compact gap |
| `3`   | 12  | Tight stack |
| `4`   | 16  | Default gap |
| `5`   | 20  | |
| `6`   | 24  | Card padding |
| `8`   | 32  | Section gap |
| `10`  | 40  | |
| `12`  | 48  | Page section gap |
| `16`  | 64  | Hero block |
| `20`  | 80  | Marketing hero |
| `24`  | 96  | |

Container widths: `max-w-7xl` (1280) for app, `max-w-6xl` (1152) for marketing, `max-w-3xl` (768) for forms.

---

## 4. Radii

| Token | px | Use |
|---|---|---|
| `radius.xs` | 4  | Pill chip, tag |
| `radius.sm` | 6  | Inputs |
| `radius.md` | 10 | Buttons, table rows |
| `radius.lg` | 14 | Cards |
| `radius.xl` | 18 | Hero cards, modals |
| `radius.2xl`| 24 | Bento tiles |
| `radius.full` | 9999 | Avatars, badges |

---

## 5. Shadows / elevation

Layered, low-blur, slightly tinted with navy (warmer than pure neutral) — matches glass aesthetic.

```css
--shadow-xs: 0 1px 2px 0 rgb(16 39 71 / 0.04);
--shadow-sm: 0 2px 6px -1px rgb(16 39 71 / 0.06), 0 1px 3px -1px rgb(16 39 71 / 0.04);
--shadow-md: 0 6px 14px -3px rgb(16 39 71 / 0.08), 0 3px 6px -2px rgb(16 39 71 / 0.05);
--shadow-lg: 0 12px 28px -6px rgb(16 39 71 / 0.12), 0 6px 12px -4px rgb(16 39 71 / 0.06);
--shadow-xl: 0 24px 48px -12px rgb(16 39 71 / 0.18);
--shadow-glow-action: 0 0 0 4px rgb(3 105 161 / 0.18);   /* focus ring */
--shadow-glow-gold: 0 0 0 4px rgb(201 162 74 / 0.22);
--shadow-inset: inset 0 0 0 1px rgb(16 39 71 / 0.06);
```

Glass surface uses `backdrop-filter: blur(20px) saturate(180%)` + 1px inner highlight border (`inset 0 1px 0 rgba(255,255,255,0.6)`).

---

## 6. Motion

Reduced-motion friendly: every animation has a `@media (prefers-reduced-motion: reduce)` opt-out to opacity-only.

| Token | Duration | Easing | Use |
|---|---|---|---|
| `motion.instant`   | 0ms    | linear | State toggle |
| `motion.snappy`    | 120ms  | cubic-bezier(0.32, 0, 0.67, 0) | Hover, focus |
| `motion.standard`  | 200ms  | cubic-bezier(0.2, 0, 0, 1) | Default UI |
| `motion.emphasis`  | 320ms  | cubic-bezier(0.2, 0, 0, 1) | Modal enter, page transition |
| `motion.slow`      | 480ms  | cubic-bezier(0.4, 0, 0.2, 1) | Stagger reveal |

Use `transform` + `opacity` only (GPU). No `width/height` animations.

---

## 7. Z-index scale

| Layer | z |
|---|---|
| base | 0 |
| header | 30 |
| sticky-rail | 35 |
| dropdown | 40 |
| toast | 50 |
| modal-backdrop | 60 |
| modal | 70 |
| popover | 80 |
| tooltip | 90 |

---

## 8. Breakpoints

Tailwind defaults: `sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. App requires `lg+` for full layout (sticky rails); on `md` and below, rails collapse to bottom sheets / inline blocks.

---

## 9. Tailwind config snippet

```ts
// tailwind.config.ts
import type { Config } from 'tailwindcss';
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // brand
        navy: { 50:'#EEF2F7',100:'#D7DEEA',200:'#AAB6CD',500:'#1E3A66',700:'#102747',900:'#081428' },
        gold: { 300:'#E9CC8A',500:'#C9A24A',700:'#8E6E1F' },
        action: { 100:'#E0F2FE',500:'#0369A1',600:'#075985',700:'#0C4A6E' },
        canvas: '#F7F9FC',
        surface: '#FFFFFF',
        'surface-2': '#F1F4F9',
        // semantic
        success: { 100:'#DCFCE7',500:'#16A34A' },
        warning: { 100:'#FEF3C7',500:'#D97706' },
        danger:  { 100:'#FEE2E2',500:'#DC2626' },
        info:    { 500:'#2563EB' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"','ui-sans-serif','system-ui'],
        mono: ['"JetBrains Mono"','ui-monospace','SFMono-Regular'],
        display: ['Fraunces','ui-serif','Georgia'],
      },
      borderRadius: { xs:'4px', sm:'6px', md:'10px', lg:'14px', xl:'18px', '2xl':'24px' },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(16 39 71 / 0.04)',
        sm: '0 2px 6px -1px rgb(16 39 71 / 0.06),0 1px 3px -1px rgb(16 39 71 / 0.04)',
        md: '0 6px 14px -3px rgb(16 39 71 / 0.08),0 3px 6px -2px rgb(16 39 71 / 0.05)',
        lg: '0 12px 28px -6px rgb(16 39 71 / 0.12),0 6px 12px -4px rgb(16 39 71 / 0.06)',
        xl: '0 24px 48px -12px rgb(16 39 71 / 0.18)',
      },
      transitionTimingFunction: { standard: 'cubic-bezier(0.2,0,0,1)' },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
};
export default config;
```

---

## 10. shadcn/ui CSS variables (paste into `globals.css`)

```css
@layer base {
  :root {
    --background: 218 33% 98%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 47% 11%;
    --primary: 199 100% 32%;            /* action.500 */
    --primary-foreground: 0 0% 100%;
    --secondary: 220 16% 96%;
    --secondary-foreground: 222 47% 11%;
    --muted: 220 16% 96%;
    --muted-foreground: 215 16% 47%;
    --accent: 39 50% 54%;               /* gold.500 */
    --accent-foreground: 217 60% 11%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --border: 218 20% 90%;
    --input: 218 20% 90%;
    --ring: 199 100% 32%;
    --radius: 10px;
  }
  .dark {
    --background: 222 47% 6%;
    --foreground: 218 33% 96%;
    --card: 222 38% 11%;
    --card-foreground: 218 33% 96%;
    --popover: 222 38% 11%;
    --popover-foreground: 218 33% 96%;
    --primary: 199 89% 60%;
    --primary-foreground: 222 47% 11%;
    --secondary: 218 28% 18%;
    --secondary-foreground: 218 33% 96%;
    --muted: 218 28% 14%;
    --muted-foreground: 217 15% 65%;
    --accent: 39 50% 60%;
    --accent-foreground: 217 60% 11%;
    --destructive: 0 70% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 218 28% 22%;
    --input: 218 28% 22%;
    --ring: 199 89% 60%;
  }
}
```

---

## 11. Iconography
- **Library**: Lucide (consistent stroke, 1.5px, 24x24 viewBox; via `lucide-react`).
- Never use emojis as UI icons.
- Default size: `w-4 h-4` inline; `w-5 h-5` in buttons; `w-6 h-6` in rail nav.

## 12. Anti-patterns to avoid
- No `bg-white/10` glass in light mode (too faint). Use `bg-white/62` + blur instead.
- No layout-shifting hover transforms (`scale-105` on a row). Use color + shadow only.
- No dark mode by default on the agent app — agents work in offices; light default is correct. Dark mode opt-in.
- No emoji icons. No mixed icon sets.
- No more than 3 type weights per page.
- No `transition: all` — name the property.
- Don't put critical actions inside glassmorphic surfaces only — provide an explicit shadow + border so they're discoverable.
