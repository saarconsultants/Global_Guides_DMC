---
name: Global Guides DMC
description: A B2B travel desk where every trip object is a boarding pass — white card stock on cool grey, crimson carrier stripe, cockpit mono for codes.
colors:
  crimson-700: "#A8172E"
  crimson-900: "#7C1024"
  crimson-500: "#C41E3A"
  crimson-50: "#FDECEF"
  amber-500: "#F5B324"
  amber-100: "#FFEDB8"
  amber-900: "#7A5400"
  ink: "#101828"
  ink-soft: "#344054"
  navy-500: "#475467"
  navy-100: "#E4E7EC"
  navy-50: "#F2F4F7"
  canvas: "#EEF0F3"
  surface: "#FFFFFF"
  surface-2: "#F5F6F8"
  border-subtle: "#E9ECF0"
  border: "#D5DAE1"
  border-strong: "#98A2B3"
  success-500: "#15803D"
  danger-500: "#DC2626"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui"
    fontSize: "42px"
    fontWeight: 800
    lineHeight: 1.02
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui"
    fontSize: "10.5px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.14em"
  code:
    fontFamily: "B612 Mono, ui-monospace, SFMono-Regular"
    fontSize: "34px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  money:
    fontFamily: "Archivo, ui-sans-serif, system-ui"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontFeature: "tnum"
rounded:
  xs: "4px"
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "18px"
  2xl: "24px"
  pill: "9999px"
spacing:
  cell: "4px"
  tight: "8px"
  gutter: "16px"
  card: "20px"
  section: "24px"
  band: "48px"
components:
  button-primary:
    backgroundColor: "{colors.crimson-700}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "0 20px"
    height: "44px"
    typography: "{typography.title}"
  button-primary-hover:
    backgroundColor: "{colors.crimson-900}"
  button-accent:
    backgroundColor: "{colors.amber-500}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.navy-500}"
    rounded: "{rounded.md}"
    height: "44px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "44px"
  pill-status:
    backgroundColor: "{colors.navy-100}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.sm}"
    padding: "3px 8px"
    typography: "{typography.label}"
  pill-live:
    backgroundColor: "{colors.amber-500}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  pass-stub-crimson:
    backgroundColor: "{colors.crimson-700}"
    textColor: "{colors.surface}"
    padding: "20px"
    width: "220px"
  hero-band:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    padding: "48px 24px 92px"
---

# Design System: Global Guides DMC

## Overview

**Creative North Star: "The Boarding Pass"**

Every object an agent handles — a package, a proposal, a lead, a hotel result — is printed as a pass: a white sheet of card stock split by a dashed perforation into a MAIN panel that carries a strict grid of caps-labelled facts and a STUB that carries the price and the single action. The passes sit on a cool grey ground the way real tickets sit on a desk. Nothing floats, nothing glows; the depth in this world is the depth of paper on a counter.

The register is operational, not promotional. Density is high and deliberate: labels are 10.5px caps at 0.14em tracking, values are bold and truncating, numbers are tabular everywhere so columns line up down a list. Crimson is the carrier's colour — it appears as the stub of the search pass, the primary button, the active nav underline, and almost nowhere else. Amber is reserved for the one live cell on a screen (a live rate, an unattended count, an impersonation band). Ink navy carries hero bands and photo fallbacks.

The world refuses the travel-portal defaults it was built against: no card-and-table sprawl, no grey placeholder rectangles where a photo failed, no centred icon-and-sentence empty state, no entrance animation on a surface whose job is to be read. A task screen loads visible and finished.

**Key Characteristics:**
- Passes, not cards: main panel + perforation + stub, vertical on desktop, horizontal when stacked
- Caps letterspaced label over a bold value — the only fact-presentation pattern
- One accent voice (crimson) plus one alert voice (amber) on white and cool grey
- Archivo for every UI voice; B612 Mono strictly for codes, PNRs, dates, times
- Motion is state-only: hover lift, 150–250ms colour transitions, nothing on load

## Colors

A near-monochrome desk — white stock on cool grey with ink-navy text — punctuated by exactly one carrier crimson and one live amber.

### Primary
- **Carrier Crimson** (`{colors.crimson-700}`): the stub colour. Primary buttons, the search pass's SEARCH stub, the active top-nav underline, required-field asterisks, inline "see all" links, focused input borders. Pressed and hover states deepen to **Crimson Deep** (`{colors.crimson-900}`); **Crimson Bright** (`{colors.crimson-500}`) exists only as the focus ring. **Crimson Wash** (`{colors.crimson-50}`) tints selected chips and hovered icon buttons.

### Secondary
- **Live Amber** (`{colors.amber-500}`): the live cell. Live-rate pills, the unattended-count badge, active hero tabs, the impersonation band, star ratings on ink plates. **Amber Wash** (`{colors.amber-100}`) with **Amber Deep** (`{colors.amber-900}`) text forms the warning chip.

### Neutral
- **Ink** (`{colors.ink}`): all primary text; also a full-bleed plate colour for hero bands, route codes, and photo fallbacks. **Ink Soft** (`{colors.ink-soft}`) and **Slate** (`{colors.navy-500}`) carry secondary and tertiary copy respectively.
- **Card Stock** (`{colors.surface}`): every pass, card, dialog, nav bar and toast.
- **Cool Ground** (`{colors.canvas}`): the page behind the passes — and, critically, the fill colour of the perforation notches, which are circles of the ground punched into the sheet's edge.
- **Zebra Grey** (`{colors.surface-2}`): stub panels in paper tone, table zebra and header rows, hover rows, disabled inputs.
- **Hairline** (`{colors.border-subtle}`) for card edges and inner dividers; **Rule** (`{colors.border}`) for input strokes and the dashed tear line; **Rule Strong** (`{colors.border-strong}`) for hover strokes and the scrollbar thumb.

### Named Rules
**The One Stripe Rule.** Crimson is the carrier stripe, not a palette. One crimson mass per screen (the stub or the primary action) plus small crimson text links. If a second crimson block appears, one of them is wrong.

**The Live Cell Rule.** Amber marks exactly what is live or waiting right now. It is never decoration and never a brand colour; a screen with nothing urgent has no amber on it.

**The Punched Notch Rule.** Every perforation notch is filled with the page ground (`{colors.canvas}`), never white. A pass laid on a non-canvas ground must have its notch fill changed to match, or the tear line is drawn without notches.

## Typography

**Display / Body Font:** Archivo (with ui-sans-serif, system-ui) — one family for every UI voice, differentiated by weight (400/500/600/700/800).
**Label/Mono Font:** B612 Mono (with ui-monospace, SFMono-Regular) — the Airbus cockpit face.

**Character:** Archivo is a grotesque with tight apertures that holds up at 10.5px caps and at 42px extrabold without changing personality, so the whole interface speaks in one voice at different volumes. B612 Mono enters only where a ticket would be machine-printed: airport codes, PNRs, dates, times, route chips, supplier captions.

### Hierarchy
- **Display** (800, 34px mobile / 42px desktop, 1.02, -0.02em): hero band headline over the photo, balanced text-wrap, max 3xl width.
- **Headline** (800, 28px, 1.1, -0.02em): page titles via PageHeader. **Empty-state title** is 22px/800; **dialog title** 18px/800.
- **Title** (700, 17px, -0.01em): card titles, section heads, hero submit label (uppercase, +0.02em).
- **Body** (400–500, 14.5px, relaxed): descriptions and prose, capped at max-w-2xl. Secondary sub-lines run 12–13px in `{colors.navy-500}`.
- **Label** (700, 10.5px, 0.14em, uppercase, `{colors.border-strong}` tone): the pass vocabulary — FROM / TO / DEPART / TRAVELLERS, stat labels, table headers. Never sentence case.
- **Code** (B612 Mono 700, tabular): 34px for the FROM/TO city code, 32px in the dashboard search cell, 19px for a hero date, 11.5px for a route chip, 11px for a stub caption.
- **Money** (Archivo 700, tabular, -0.01em, 26–30px at the stub): the `.money` treatment.

### Named Rules
**The Money-Is-Not-Mono Rule.** Prices use Archivo bold tabular (`.money`), never B612 Mono. The mono comma is too wide for Indian lakh grouping (₹ 12,45,000) and breaks the number's shape. Mono is for codes, PNRs, dates and times only.

**The Printed Date Rule.** A date renders as mono display text (`02 MAR 2026`, uppercased) with a real, fully transparent `<input type="date">` stretched over it. The wrapper — not the input — carries the `focus-within` ring, because the control itself is invisible.

**The No Kicker Rule.** Headings carry their own weight. There is no eyebrow, kicker, or all-caps mini-heading above a page title; the caps-label treatment belongs to data cells only.

## Layout

Content sits in a centred `max-w-7xl` column with a 24px gutter; the top nav uses a wider `max-w-[1400px]` at 16–24px. Vertical rhythm on a dashboard page is 40–48px of page padding with 48px between sections and 16–20px between siblings inside a section. Cards space at 20px; label-grid cells at 12px column gap and 10px row gap.

The signature composition is band-then-pass: a full-bleed ink or photo band with 48px top padding and 92px bottom padding, then the search pass pulled up 60px so it overlaps the band's lower edge. Below it, a package row and a desk list share a four-track grid (`1fr 1fr 1fr 320px`) that collapses to three columns, then one.

Breakpoints follow Tailwind defaults; the meaningful one is `lg` (1024px), where a Pass switches from a stacked column with a horizontal tear line to a row with a vertical tear line, the stub takes a fixed 220px (232px on the hero), and hero cells gain right-hand dividers. Tables become the primary dense view at desktop; below `lg` they yield to stacked passes.

## Elevation & Depth

Paper, not glass. Depth comes from a hairline border plus a very low ambient shadow at rest, and lifts only on interaction. Backdrop blur appears in exactly two places: the dialog scrim and hero tab pills over a photo. The `.ambient` page-glow utility shipped as a transparent no-op — this world has no atmospheric background.

### Shadow Vocabulary
- **Stock** (`box-shadow: 0 1px 2px rgb(16 24 40 / 0.06), 0 1px 3px rgb(16 24 40 / 0.05)`): the resting state of every pass, card and toast.
- **Lift** (`transform: translateY(-2px)` + `0 1px 2px rgb(16 24 40 / 0.04), 0 16px 32px -14px rgb(16 24 40 / 0.22)`, 220ms `cubic-bezier(0.2,0,0,1)`): the `.lift` hover on an interactive pass.
- **Elevate** (`0 1px 2px rgb(16 24 40 / 0.05), 0 8px 24px -14px rgb(16 24 40 / 0.14)`): standing panels that need separation without hover.
- **Overlap** (`shadow-xl`: `0 24px 48px -16px rgb(16 24 40 / 0.28), 0 2px 6px rgb(16 24 40 / 0.06)`): reserved for the hero search pass sitting on the band, and dialogs.

### Named Rules
**The Flat-At-Rest Rule.** Surfaces sit on the ground with a hairline and a 1–3px shadow. Anything heavier is a response to state (hover, overlap, modal) or it is wrong.

**The Loads-Visible Rule.** No entrance animation. `.stagger` ships as a no-op because a task surface must be readable the instant it paints. Motion is state-only and runs 150–250ms on the standard curve (`cubic-bezier(0.2,0,0,1)`); the only exceptions are the 180ms dialog/backdrop entrance and the skeleton pulse.

## Shapes

Corners are firm, not soft: 10px on controls and buttons, 14px on passes, cards, dialogs and hero bars, 5–6px on status pills and route chips, full-round only on hero tab pills and the swap button. Nothing is a squircle and nothing is sharp.

The recurring silhouette is the pass: a rounded rectangle with an internal dashed 2px tear line and two 20px circular notches punched at the line's ends, filled with the page ground. `.perf-y` runs the line vertically between main and stub at `lg`; `.perf-x` runs it horizontally when stacked. Borders are single hairlines; there are no double rules, no bezels, and no inset panels.

Decorative machine-printing appears as `.barcode`, a pure-CSS repeating gradient in `currentColor` used at the crimson stub, on ghost passes, and nowhere that carries meaning.

## Components

### Buttons
- **Shape:** firm rounded rectangle (10px), bold label, tight tracking (-0.005em). Heights 36 / 44 / 48px; icon 40×40.
- **Primary:** crimson on white text with the stock shadow; hover deepens to crimson-900.
- **Accent:** amber with ink text — used only where the action is the live one.
- **Hover / Focus:** 150ms colour transition on the standard curve; `active:scale-[0.98]` press; focus-visible draws a 2px crimson-500 ring offset 2px against the canvas.
- **Secondary / Outline / Ghost:** white with a hairline that strengthens on hover; crimson outline on transparent; transparent with slate text on a navy-50 hover wash.

### Chips
- **Status pill:** the pass's BOARDING/GATE cell — 10.5px caps at 0.1em tracking, 5px radius, 3×8px padding, fixed-width feel. Tonal pairs: neutral navy, success, danger, info, warning amber-wash, `live` solid amber on ink, `ink` solid ink on white.
- **Filter chip (HeroChip):** 36px tall, 10px radius, hairline; selected state swaps to crimson border, crimson text, crimson-50 fill.
- **Hero tab:** full-round 36px pill; active is solid amber on ink, inactive is a translucent white glass pill over the photo.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** card stock white; secondary stub panels in zebra grey; ink for plates.
- **Shadow Strategy:** stock shadow at rest; `.lift` only when the whole card is a link.
- **Border:** 1px hairline (`{colors.border-subtle}`).
- **Internal Padding:** 20px (16px at mobile); header 20px top / 8px bottom, content 20px.

### Inputs / Fields
- **Style:** 44px tall, 10px radius, white with a 1px rule, 15px medium ink text, tabular numerals, tertiary-grey placeholder at normal weight.
- **Focus:** border shifts to crimson-700 with a 2px crimson-700/15 halo — a stroke change, not a glow.
- **Disabled:** zebra-grey fill, no hover, not-allowed cursor.
- **Borderless variant (`heroControl`):** inside a hero cell the control loses its box entirely and becomes 17px bold ink type on transparent; the cell's own divider is the only structure.
- **Constraint:** a component composing `.control` cannot override its padding (same `@layer`); a field that needs an icon inset writes its own utility string instead.

### Navigation
- Sticky 64px white bar with a hairline bottom edge, logo left, 14px semibold links; active link is crimson with a 3px crimson underline pinned to the bar's bottom. Grouped items open a click-dismissed dropdown. Below `lg` the links collapse behind a menu button. The bar is suppressed entirely on `/p/`, `/login`, `/signup` and `/admin`.

### Dialogs / Toasts / Skeletons
- Dialog: navy-900/60 scrim with backdrop blur, 14px white sheet, sticky header with an 18px extrabold title and a 36px close button; 180ms entrance on the standard curve.
- Toast: white sheet with a hairline, a 28px rounded tonal icon plate carrying the state colour, 14px semibold title over a 12px secondary line, top-right stack.
- Skeleton: navy-100/70 pulsing bars at 10px radius; card and table-row shapes match the real thing's geometry.

### The Pass (signature)
`Pass` / `PassMain` / `Perforation` / `PassStub` compose the world's core object. `Field` renders one grid cell (caps label, bold 15px value or 26px `big` value, optional 12.5px sub-line, mono+tabular when the value is a code). `CityCode` renders the 34px mono FROM/TO cell with the city name beneath. `RouteCode` renders `DEL → CDG → AMS` as an 11.5px mono chip on ink (or white-on-ink inverted on dark grounds). The stub takes one of three tones — paper (zebra), crimson (the action stub), or ink.

### Empty & Fallback States (signature)
- **Ghost pass:** an empty list draws a 260px dashed-outline pass with the real geometry of a filled one — icon plate, two label bars, a three-cell grid, tear line, barcode stub — above the title and actions. The dense variant falls back to a small icon plate.
- **Ink plate:** a missing photo renders an ink-filled plate carrying the item's own facts (amber star band + mono city code for stays and hotels; amber ticket glyph + "Tour" for activities), never a grey rectangle.

### Data Table
`.gg-table`: caps 10.5px/0.14em grey headers on zebra-grey with a rule beneath, 12px cells on hairline rows, zebra hover, tabular numerals throughout. Used for statements, bookings and any list dense enough that passes would waste the screen.

## Do's and Don'ts

### Do:
- **Do** present every fact as a caps label over a bold value; that pairing is the system's atomic unit.
- **Do** put price and the single action on the stub, separated from the facts by a perforation.
- **Do** set money in `.money` (Archivo 700 tabular) and codes, PNRs, dates and times in B612 Mono.
- **Do** keep numerals tabular everywhere — the body sets `font-feature-settings: 'tnum'` and lists must line up.
- **Do** fill perforation notches with the page ground colour so the tear reads as punched, not drawn.
- **Do** declare interactive overlay components (CodeCell, HeroDate, the travellers cell) at module scope, never inside another component's body, so they don't remount and drop focus mid-typing.
- **Do** draw fallbacks as ink plates carrying the item's own facts, and empty states as ghost passes.
- **Do** keep motion to state changes at 150–250ms on `cubic-bezier(0.2,0,0,1)`.

### Don't:
- **Don't** set prices in mono — the wide comma breaks Indian lakh grouping.
- **Don't** add entrance, scroll-reveal, or staggered-list animation; a task surface loads finished.
- **Don't** put an eyebrow or kicker above a heading; `PageHeader` accepts the prop and deliberately ignores it.
- **Don't** use grey placeholder boxes for missing imagery, or a centred icon-and-sentence block for an empty list.
- **Don't** let a second crimson mass onto a screen, or use amber for anything that isn't live or waiting.
- **Don't** override `.control`'s padding from a consuming component (same `@layer` — it won't win); write the field's own utility string.
- **Don't** use glyph or emoji icons; icons are drawn with lucide. The one exception the build carries is the literal star character inside native `<option>` labels, where markup cannot hold an SVG.
- **Don't** reach for `.ambient` or `.stagger`; both ship as no-ops and exist only so legacy markup stays harmless.
