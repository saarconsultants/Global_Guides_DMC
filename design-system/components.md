# Global Guides DMC — Component Specs

For each component: visual spec, states, sizes, props (Tailwind/shadcn-friendly), and acceptance notes. Built on shadcn/ui where a match exists; new compositions called out.

> Convention: prop names are React-style. All interactive components have visible `focus-visible:ring-2 focus-visible:ring-action-500 focus-visible:ring-offset-2`. Every clickable item gets `cursor-pointer`. Use `transition-colors duration-200 ease-standard` as default.

---

## 1. Button
**Base on**: shadcn `Button`.

| Variant | Style |
|---|---|
| `primary` | `bg-action-500 text-white hover:bg-action-600 active:bg-action-700 shadow-sm` |
| `secondary` | `bg-surface-2 text-navy-900 hover:bg-navy-50 border border-border-default` |
| `outline` | `bg-transparent text-navy-900 border border-navy-900 hover:bg-navy-50` |
| `ghost` | `bg-transparent text-navy-700 hover:bg-navy-50` |
| `destructive` | `bg-danger-500 text-white hover:bg-danger-500/90` |
| `accent` | `bg-gold-500 text-navy-900 hover:bg-gold-700 hover:text-white` (sparingly — KPI / hero CTA only) |
| `brick` | `bg-[#B94025] text-white hover:bg-[#9D3520]` (legacy/Nexus parity for "Click Here / Create New Query") |

Sizes: `sm` 32h px-3 text-sm · `md` 40h px-4 text-sm · `lg` 48h px-6 text-base · `icon` 40×40 square.
Loading: spinner + disabled cursor.
Always render a non-empty accessible label (use `aria-label` for icon-only).

---

## 2. Input
shadcn `Input` + overrides:
- 40px height, `rounded-md`, `border border-border-default bg-surface text-text-primary placeholder:text-text-tertiary`.
- Focus: `border-action-500 ring-2 ring-action-100`.
- Error: `border-danger-500 ring-2 ring-danger-100` + helper text in `text-danger-500`.
- Disabled: `bg-surface-2 text-text-tertiary cursor-not-allowed`.
- Label component: `text-body-sm font-medium text-text-secondary` + optional `*` for required.

Sub-variants:
- **Numeric** (price, nights): right-aligned `font-mono tabular-nums`.
- **With icon**: leading `<Icon className="w-4 h-4 text-text-tertiary" />` with `pl-9`.

---

## 3. Select & Combobox / Autocomplete
- **Select** (closed set, e.g. Star rating, Duration): shadcn `Select` styled per Input.
- **Combobox** (open set with async fetch — City Name, Customer): shadcn `Command` over `Popover`, wired to debounced fetch (250 ms) hitting `/api/cities?q=`.
- Each suggestion: 2-line. Top: city name (body-sm semibold). Bottom: region/country (caption text-text-secondary).
- Keyboard: ArrowUp/Down navigate, Enter selects, Esc closes.

---

## 4. Modal (Dialog)
shadcn `Dialog`. Variants by purpose:

| Variant | Visual |
|---|---|
| `default` | `rounded-xl shadow-xl border bg-surface max-w-lg` |
| `wide` | `max-w-2xl` (Create Your Trip) |
| `full` | `max-w-5xl h-[90vh] overflow-y-auto` (Change Hotel) |
| `glass` | `bg-surface-glass backdrop-blur-xl border border-white/40` (AI Suggester "Where would you like to wander?") |

Backdrop: `bg-navy-900/60 backdrop-blur-sm`. Animation: `data-[state=open]:animate-in fade-in-0 zoom-in-95 duration-200`.
Always include `aria-labelledby` + close button top-right with `aria-label="Close"`.

---

## 5. Card variants
Base card: `rounded-lg bg-surface shadow-sm border border-border-subtle p-6`.

### 5a. HotelCard
Layout (`lg+`): grid `[140px_1fr_auto]` gap-5.
- Left: 140×140 image, `rounded-md object-cover`. Lazy loaded.
- Middle column:
  - Stars row (gold filled).
  - Name (`display-sm`) + inline `[view]` link (`text-action-500 text-caption underline-offset-4 hover:underline`).
  - Address (`body-sm text-text-secondary`).
  - Score badge: pill `bg-action-500 text-white px-2 py-1 rounded-md font-semibold` next to "Very Good · 552 ratings" (`body-sm`).
  - Check-in / Check-out: 2-col mini-grid with `caption` label + `body-sm` value.
  - Inclusions list (✓ icon + text).
  - Refund line (`body-sm text-danger-500`).
  - Meal plan grid (2-col: Room Only / Breakfast with status pill).
- Right column: stacked CTAs `Change Room`, `Change Hotel` (brick variant).
- Footer note: city tax (`body-sm text-text-secondary` in a `bg-surface-2 px-4 py-3 rounded-md`).

### 5b. TransferCard / ActivityCard
Compact row inside Day card:
- 24×24 leading status icon (✓ success / ⚠ warning).
- Title (`body-sm font-medium`) + tag chips below (Private Transfers · 2 Bags · pencil-edit).
- Right cluster: `[N options]` link · × delete icon button.

### 5c. KPI Tile (dashboard)
Single-stat tile in a Bento grid.
- `rounded-xl bg-surface p-5 shadow-sm border border-border-subtle hover:shadow-md transition-shadow`.
- Top row: caption label + optional trend chevron.
- Big number: `display-lg font-bold text-navy-900 font-display` (Fraunces for editorial weight; Plus Jakarta if mono numerics desired) — pick **one** and stay consistent.
- Sub-label: `body-sm text-text-secondary`.
- Optional sparkline below.

---

## 6. Tabs
shadcn `Tabs` underline variant:
- Container: `border-b border-border-subtle`.
- Each `TabsTrigger`: `px-4 py-3 text-body-sm font-medium text-text-secondary hover:text-text-primary data-[state=active]:text-action-500 data-[state=active]:border-b-2 data-[state=active]:border-action-500`.
- Use for My Bookings tab strip (My Bookings · Create Quote · Learn · Share · My Packages).

---

## 7. DataTable with per-col filter
Composition: `@tanstack/react-table` + shadcn `Table` shell.

- Header cell: `body-sm font-semibold text-text-secondary` + sort chevron icon on hover, persistent when active.
- Quick-filter row directly under header: each cell renders the matching mini-`Input` (32h, `text-body-sm`, placeholder = column name) — matches Nexus DataTables pattern.
- Row hover: `bg-surface-2`. Selected: `bg-action-100`.
- Empty state: see §16.
- Pagination footer: rows-per-page select + page nav.
- Density toggle: `compact` (40h rows) vs `comfortable` (52h).
- Sticky first column on horizontal scroll for wide tables (Proposals, Account Statement).

---

## 8. Stepper (3-step header)
For Customize Your Trip page.
- Horizontal strip, 3 nodes connected by 2px line.
- Node: 28×28 circle. States:
  - completed: `bg-success-500 text-white check icon`
  - current: `bg-action-500 text-white index number`
  - upcoming: `bg-surface-2 text-text-tertiary border border-border-default`
- Label below node: `caption` weight 500. Current label gets `text-text-primary`, others `text-text-secondary`.
- Click to jump only to completed/current.
- Sticky: ride along with page header at `top-0` after scroll.

---

## 9. Sticky side rail (quick nav)
Fixed left rail on Customize Your Trip page.
- Container: `fixed left-4 top-1/2 -translate-y-1/2 z-rail`.
- Inner: `flex flex-col gap-2 p-2 rounded-2xl bg-surface-glass backdrop-blur-xl border border-white/40 shadow-md`.
- Each item: 40×40 circular icon button. Active state ring `ring-2 ring-action-500`. Hover ring `ring-1 ring-action-100`.
- Tooltip on right edge on hover.

---

## 10. Sticky right rail summary
- Container: `sticky top-24 w-[360px] space-y-6`.
- Top card: **Price Summary** — `bg-surface rounded-xl shadow-sm border p-6`.
  - "Trip Summary" link (`text-action-500 underline-offset-4 hover:underline`).
  - Two rows: Price per adult + Total Price (mono, right-aligned tabular-nums).
  - Primary CTA full-width: `Save As Proposal`.
- Bottom card: **Trip Summary** — bullet list, sectioned by city. Bullets use `list-disc list-outside ml-5 marker:text-text-tertiary`.

Collapses to a bottom sticky bar on `md`-and-down with a "Show details" expand.

---

## 11. Date picker
shadcn `Calendar` over `Popover`. Input shows `dd MMM yyyy` format. Min-date = today. Disable invalid checkout (< check-in).
- 2-pane month for ranges (check-in/out).
- Keyboard: arrows + PageUp/Down for months.

---

## 12. Travelers picker
Custom popover. Trigger = combobox-like field showing `1 room, 2 adults` (humanized).
- Body: list of rooms. Each row:
  - Room N label.
  - Adults `[− N +]` stepper (min 1).
  - Children `[− N +]` stepper (min 0, max 4).
  - If children > 0: chip row of child age `<Select>` (0..17).
- Footer: `+ Add Room` link (max 9 rooms; if >9, swap to "click here" overflow text linking to a long-form form).
- Apply button (primary) + Cancel (ghost).

---

## 13. Star rating filter
Toggleable chip group: `Any · 3★ · 4★ · 5★`. Single-select. Each chip uses Pill chip spec (§17). Selected state = `bg-navy-900 text-white`.

---

## 14. Day card (per-day itinerary)
Wide card for arrival/stay/departure.
- Header: Day index pill + `Day N: Fri, 12 Mar 2027` (display-sm) on left. Right: warning pill if "N Points to Note".
- Subhead: "Arrival in Paris" (heading).
- Status banner (if missing data): `bg-danger-100 text-danger-500 rounded-md p-3 flex justify-between` with right-side action button `Update Arrival Details`.
- Narrative paragraph (`body-sm text-text-secondary`) with truncate + "more" expand.
- **Activity slots strip**: 3-column grid (`Morning | Afternoon | Evening`) on a `bg-surface-2 rounded-md py-3 px-4`. Each slot: label (caption uppercase) + `Add Activity` button (success-tinted ghost).
- Included rows: TransferCard / ActivityCard.
- Overnight chip: `🛏 + text` pill in `bg-surface-2`.
- Footer CTAs (variable per day type): `Change Day` (primary) · `Add Activity in <City>` (brick) · `Change Departure from <City>` (brick).

---

## 15. Drag handle reorder list
For destinations list in intake modal.
- Library: `@dnd-kit/sortable` or `react-beautiful-dnd`.
- Each row: `grid-cols-[24px_1fr_120px_24px] items-center gap-2`. Left col = drag handle icon (`Grip` from Lucide), cursor: `grab` / `grabbing` while dragging. Middle = combobox. Right = nights select. Far right = remove × button.
- Drop indicator: 2px gold-500 line.
- Keyboard reorder: Space to grab, arrows to move, Space to drop.

---

## 16. Empty state
Centered block inside content area.
- Illustration: 96×96 minimal line SVG.
- Title: `display-sm`.
- Body: `body-sm text-text-secondary max-w-md`.
- Primary CTA below.
- Variant: ghost dashed border container `border border-dashed border-border-default rounded-xl p-12`.

---

## 17. Pill chip / tag
- Default: `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-caption font-medium`.
- Color variants:
  - `neutral`: `bg-navy-50 text-navy-700`
  - `success`: `bg-success-100 text-success-500`
  - `warning`: `bg-warning-100 text-warning-500`
  - `danger`:  `bg-danger-100 text-danger-500`
  - `info`:    `bg-action-100 text-action-500`
  - `gold`:    `bg-gold-300 text-gold-700`
- Optional leading icon (12×12) or trailing × for removable chips.

---

## 18. Avatar
shadcn `Avatar`. Sizes 24 / 32 / 40 / 48. Border `ring-2 ring-surface`. Fallback initials in `navy-500` bg, white text. Status dot (online/away/busy) bottom-right 8×8 with surface ring.

---

## 19. Status badge (CRM)
Rectangular small-radius badge: `rounded-md px-2 py-0.5 text-caption font-semibold uppercase tracking-wider`. Mapping:
- `New` → info
- `Quoted` → neutral
- `Followup` → warning
- `Booked` → success
- `Lost` → danger

---

## 20. Toast
shadcn `Sonner`-style. Top-right on `lg+`, top-center on mobile. 4 variants (success/error/info/warning) using semantic colors. Auto-dismiss 4s; persistent for destructive confirmations. Action link on right (`Undo`).

---

## 21. Top nav (app)
- Bar: `bg-navy-900 text-navy-100 h-14 flex items-center gap-6 px-6 shadow-md`.
- Logo left. Center nav (Home · Flights ▾ · Holidays ▾ · Hotels · Marketing ▾ · My Leads ▾ · Settings · Account Statement). Right utility cluster.
- Dropdowns use shadcn `NavigationMenu` with `bg-navy-900/95 backdrop-blur-xl`.
- Active item: `text-white` + 2px gold-500 underline. Hover: `text-white`.

---

## 22. Utility cluster (top-right)
Inline icons + text: Contact ▾ · Write to us · **Escalate** (gold-500 pill) · Recharge (₹ X) ▾ · Profile ▾.
The Escalate pill is the only persistently warm-colored thing on the dark bar — visual anchor.

---

## Accessibility checklist (per component)
- Hit area ≥ 44×44 px (use `min-h-11 min-w-11` for icon buttons).
- Color contrast ≥ 4.5:1 (verified — see tokens).
- Focus ring visible (never `outline-none` without replacement).
- ARIA labels on icon-only buttons; `aria-live` on toast region; `aria-current="step"` on stepper.
- Reduced motion: every transition wrapped in motion-safe variant or disabled via `prefers-reduced-motion`.

## Density profile for app
- Default density = **compact**. Buttons 40px, inputs 40px, table rows 40px.
- Toggle to comfortable (52px) on Settings / Profile pages where forms are sparse.

## Composition examples (where to start when building screens)
| Screen | Compose from |
|---|---|
| Agent dashboard | TopNav · Bento grid of KPI tiles · HotelCard mini · Marketing carousel · Service Assurance Card |
| Create Your Trip modal | Modal (wide) · DragHandleReorderList · TravelersPicker · DatePicker · StarRatingFilter · Button (brick + primary) |
| AI Suggest modal | Modal (glass) · Multi-destination Input · Select (nights) · Button (primary "Load Suggestions") |
| Customize Your Trip page | Stepper · LeftSideRail · TripSummary right rail · FlightsCard · HotelCard · DayCard ×N · Visa row · Insurance row |
| My Leads | TopNav · Filter bar · KPI tiles ×4 · DataTable |
| My Proposals | TopNav · Filter bar · DataTable (per-col filter) |
| Customer-facing proposal | Hero (display-xl) · Bento day cards · TripSummary · CTA bar |
