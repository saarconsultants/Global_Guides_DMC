# Global Guides DMC — Stack & Architecture

**Status**: Draft v0.1
**Source**: PRD.md (Phases 0–3) + discovery + design-system

## TL;DR — Recommended stack

| Layer | Choice | Why |
|---|---|---|
| **Frontend app** | **Next.js 15 (App Router) + React 19 + TypeScript** | Server components keep dashboard fast; one codebase serves agent SPA + public proposal pages (SEO matters there); easy auth + API routes; large hiring pool. Beats Vue/Svelte on ecosystem; beats raw React on routing/SSR; beats Django/HTMX on rich modal/state needs of the itinerary builder. |
| **UI** | **Tailwind v3.4 + shadcn/ui + Lucide icons** | Matches design system tokens. shadcn gives accessible primitives we own (no library lock-in). |
| **State / data** | **TanStack Query** (server cache) + **Zustand** (modal/builder local state) + **react-hook-form + zod** (forms) | Builder needs optimistic UI; TanStack Query is the right tool. Zustand for cross-modal builder state. |
| **Drag-drop** | `@dnd-kit/sortable` | Best a11y for destination reordering. |
| **Tables** | `@tanstack/react-table` | Headless; integrates with shadcn `Table`. |
| **Backend** | **Node.js (TypeScript) + Fastify + tRPC** (or Hono if leaning serverless) | Type-safe end-to-end (Next ↔ API ↔ DB). Fast. Reuses TS skills. tRPC eliminates an OpenAPI layer in v1. If/when we add native mobile (Phase 3) we add an OpenAPI gateway. |
| **DB** | **Postgres 16** (Neon or Supabase managed) + **Prisma 5** (or **Drizzle** if perf demands) | Relational fit is perfect (Agencies, Users, Leads, Proposals, Bookings, Inventory cache). Postgres JSONB for the itinerary tree. |
| **Search / autocomplete** | **Postgres `pg_trgm` + `tsvector`** v1; upgrade to **Typesense** when city/hotel volumes blow up | Cheap, no extra infra in v1. |
| **Queues / background** | **BullMQ on Redis** | Price recalcs, email/WhatsApp dispatch, supplier rate polling. |
| **Cache** | **Redis (Upstash)** | Hotel rate cache (5-min TTL), session, BullMQ. |
| **Auth** | **Auth.js (NextAuth)** + email magic-link + password | Multi-tenant: `agencyId` in JWT. |
| **AI / LLM** | **Claude Sonnet 4.6 via Anthropic API** for "Suggest Itinerary" | Long-context for multi-city composition, JSON-mode tool use to return structured itinerary objects. Cheap retry with Haiku for re-narrate. |
| **Email** | **Resend** | Best DX; cheap; React-Email templates ship with Next. |
| **WhatsApp / SMS** | **Meta WhatsApp Business Cloud API** (direct) for v1; **MSG91** as fallback for India SMS | WhatsApp is non-negotiable for Indian B2B travel ops. |
| **Payments / Wallet** | **Razorpay** (UPI, NB, IMPS); virtual-account product for instant wallet credit (replaces Nexus' ICICI VA reference) | Cheaper and faster onboarding than ICICI direct. |
| **File storage** | **Cloudflare R2** | S3-compatible, zero egress fees, perfect for hotel photo cache + PDF exports. |
| **PDF/flyer generation** | **`@react-pdf/renderer`** (in Node worker) | Same React/TS skillset; templated proposals + flyers. |
| **Inventory adapters** (Phase 1) | **Tripjack** for Flights + Hotels (creds confirmed available). Tripjack also covers Cabs/Transfers, Visa, Insurance (Tripsafe), Holidays, Cruise, Train — likely the single backbone for most inventory. Tours: **Viator Partner API** (Tripjack doesn't cover activities). Visa/Insurance: Tripjack first, static catalogue fallback. | One supplier, one contract, one wallet — faster path. See `vendor/tripjack/TRIPJACK_API_NOTES.md`. |
| **Hosting** | **Vercel** (frontend + API routes) + **Neon** (Postgres) + **Upstash** (Redis) + **Cloudflare R2** + **Fly.io** (background workers if Vercel limits hurt) | Indian users + Vercel's IAD/CDG nodes are acceptable; move to Mumbai once Vercel offers BLR/BOM points-of-presence (already partial). All services have free tiers fitting Phase 0–1. |
| **Observability** | **Sentry** (errors) + **PostHog** (analytics + session replay) + **Grafana Cloud** (infra) | PostHog doubles as product analytics for the metrics in PRD. |
| **CI/CD** | **GitHub Actions** → Vercel; Prisma migrations gated. | |
| **Repo layout** | **Turborepo monorepo**: `apps/web`, `apps/customer`, `packages/ui`, `packages/db`, `packages/adapters`, `apps/worker`, `packages/config`. | Lets the public customer-facing proposal page be a separate Next app sharing UI + tokens. |

## Why not the alternatives

- **Django + HTMX**: matches Nexus's server-rendered feel but the itinerary builder has too much client state (drag-drop, sticky rails, live recalc) to be HTMX-comfortable. Forces us to bolt on Alpine/Stimulus anyway.
- **Laravel + Inertia**: strong for invoicing/finance modules, but team skills + ecosystem favour TS.
- **Plain React + Vite**: cheaper bundle, but we lose SSR for the customer-facing proposal pages (critical for sharing on WhatsApp where the preview card needs SSR'd OG tags).

## High-level architecture

```
                                  ┌──────────────────────────┐
                                  │      LLM (Claude)        │
                                  └─────────────▲────────────┘
                                                │ structured-output
┌──────────────────────────┐                    │
│   Customer (no login)    │      ┌─────────────┴────────────┐
│  apps/customer (Next)    │◀────▶│      apps/web (Next)     │  ← Agent SPA
│  Signed link → SSR'd     │      │  - App Router pages      │
│  proposal page           │      │  - Server actions        │
└──────────────────────────┘      │  - tRPC routers          │
                                  │  - Auth.js               │
                                  └────────────┬─────────────┘
                                               │
                       ┌───────────────────────┼────────────────────────┐
                       │                       │                        │
                       ▼                       ▼                        ▼
                ┌────────────┐           ┌──────────┐           ┌──────────────┐
                │  Postgres  │           │  Redis   │           │  BullMQ      │
                │  (Neon)    │           │ (Upstash)│           │  worker      │
                │  Prisma    │           │  cache + │           │  (Fly.io)    │
                └────────────┘           │  queues  │           └──────┬───────┘
                                         └──────────┘                  │
                                                                       ▼
                                                          ┌────────────────────────┐
                                                          │  Inventory adapters    │
                                                          │  hotelbeds · viator ·  │
                                                          │  duffel · razorpay ·   │
                                                          │  whatsapp · resend     │
                                                          └────────────────────────┘
```

## Data model sketch (Prisma-flavoured)

```prisma
model Agency {
  id          String   @id @default(cuid())
  code        String   @unique           // GGN######
  name        String
  contact     String
  markupPct   Decimal  @default(15)      // global default
  walletPaise BigInt   @default(0)       // INR balance in paise
  users       User[]
  leads       Lead[]
  proposals   Proposal[]
  bookings    Booking[]
  createdAt   DateTime @default(now())
}

model User {
  id        String @id @default(cuid())
  email     String @unique
  agencyId  String
  agency    Agency @relation(fields: [agencyId], references: [id])
  role      Role   // OWNER | COUNSELLOR | OPS
  name      String
}

model Lead {
  id           String @id @default(cuid())
  agencyId     String
  ownerId      String?
  customerName String
  customerEmail String?
  customerPhone String?
  destinations String[]                  // ["Paris","Amsterdam"]
  from         String?
  travelDate   DateTime?
  nights       Int?
  status       LeadStatus                // NEW | QUOTED | FOLLOWUP | BOOKED | LOST
  source       String                    // manual | widget | ai-suggest
  createdAt    DateTime @default(now())
  proposals    Proposal[]
}

model Proposal {
  id            String @id @default(cuid())
  code          String @unique           // GG-04237
  leadId        String
  agencyId      String
  name          String
  travelDate    DateTime
  nationality   String                   // ISO
  travelers     Json                      // {rooms:[{ad,ch,chAges?}]}
  destinations  Json                      // ordered Destination[]
  days          Json                      // Day[] (the heart)
  flights       Json?
  visa          Json?
  insurance     Json?
  pricePaise    BigInt
  markupPaise   BigInt
  currency      String   @default("INR")
  shareToken    String   @unique
  lastViewedAt  DateTime?
  acceptedAt    DateTime?
  status        ProposalStatus
  createdAt     DateTime @default(now())
}

model Booking {
  id          String  @id @default(cuid())
  proposalId  String
  pnrs        Json                       // {flight:[], hotel:[]}
  paidPaise   BigInt
  status      BookingStatus              // PENDING | CONFIRMED | CANCELLED
  bookedAt    DateTime @default(now())
}

model WalletTxn {
  id        String @id @default(cuid())
  agencyId  String
  type      WalletTxnType               // CREDIT | DEBIT | REFUND
  amountPaise BigInt
  ref       String?                      // bookingId or rzpPaymentId
  createdAt DateTime @default(now())
}

model InventoryCache {
  key       String   @id                 // hotel:hbId:checkin:checkout:rooms
  payload   Json
  expiresAt DateTime
}
```

The full **Day** + **Destination** JSON shape is in `discovery/02-itinerary-builder.md` §State.

## Endpoint shape (tRPC routers)

- `trip.intake.create` — input modal data → returns `proposalId`
- `trip.suggest` — AI suggester → returns `Day[]` + destination plan
- `trip.proposal.get(id)` / `update(id, patch)` / `recalc(id)`
- `trip.proposal.save(id)` → emits share token
- `inventory.cities.search(q)`
- `inventory.hotels.search({ cityId, checkin, checkout, rooms })`
- `inventory.hotels.rooms({ hotelId, ... })`
- `inventory.transfers.search({ from, to, date, pax })`
- `inventory.tours.search({ cityId, date })`
- `lead.list({ filter })` · `lead.create` · `lead.assign`
- `proposal.list({ filter })` · `proposal.statusChange`
- `booking.convert(proposalId, paymentMethod)`
- `wallet.balance` · `wallet.recharge({ amountPaise })`
- `wallet.statement({ from, to })`
- `settings.profile.get/update` · `settings.markup.get/update`
- Public: `public.proposal.get(shareToken)` · `public.proposal.respond({ shareToken, action })`

## Tripjack adapter layer (`packages/adapters/tripjack`)

All Tripjack calls live behind a typed module. UI never knows about `sI`, `fD`, `da` etc — they get normalised to readable shapes (`segments`, `flight`, `departureAirport`).

```ts
// packages/adapters/tripjack/src/client.ts
const BASE = process.env.TRIPJACK_BASE_URL ?? 'https://apitest.tripjack.com';
const KEY  = process.env.TRIPJACK_API_KEY!;

export async function tjPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': KEY },
    body: JSON.stringify(body),
    // IPv4 only — Vercel function uses fetch's IPv4 by default; for self-hosted Node,
    // use a custom Agent with family: 4 or set NODE_OPTIONS=--dns-result-order=ipv4first.
  });
  if (!res.ok) throw new TripjackHttpError(res.status, await res.text());
  const json = await res.json();
  if (json.status && json.status.success === false) throw new TripjackBizError(json.status);
  return json as T;
}
```

```ts
// packages/adapters/tripjack/src/flights.ts
export async function searchFlights(input: FlightSearchInput): Promise<FlightSearchResult> {
  const body = {
    searchQuery: {
      cabinClass: input.cabin,
      preferredAirline: input.preferredAirlines ?? [],
      searchModifiers: { pfts: ['REGULAR'], isDirectFlight: input.directOnly ?? false, isConnectingFlight: false },
      routeInfos: input.legs.map(l => ({
        fromCityOrAirport: { code: l.fromIATA },
        toCityOrAirport:   { code: l.toIATA },
        travelDate: l.date,
      })),
      paxInfo: { ADULT: input.adults, CHILD: input.children, INFANT: input.infants },
    },
  };
  const raw = await tjPost('/fms/v1/air-search-all', body);
  return normaliseFlightSearch(raw);   // strips abbreviations → readable
}
```

```ts
// packages/adapters/tripjack/src/hotels.ts
export async function searchHotels(input: HotelSearchInput): Promise<HotelSearchResult> {
  const body = {
    searchQuery: {
      checkinDate: input.checkin,
      checkoutDate: input.checkout,
      roomInfo: input.rooms.map(r => ({ numberOfAdults: r.adults, childAge: r.childAges ?? [] })),
      searchCriteria: {
        city: input.cityCode ? { code: input.cityCode } : undefined,
        nationality: input.nationality ?? 'IN',
        currency: 'INR',
      },
    },
  };
  const raw = await tjPost('/hms/v1/hotel-search-all', body);
  return normaliseHotelSearch(raw);
}
```

Adapter is **mock-aware**: if `TRIPJACK_API_KEY` is unset, returns fixtures from `packages/adapters/tripjack/fixtures/`. This lets us develop the UI before Tripjack creds land.

## Background jobs (BullMQ queues)

- `price-recalc` — debounced 300 ms after a proposal edit; runs server-side recalculation w/ live adapter fetch
- `inventory-warm-cache` — nightly pre-warm of top 50 city × top 20 hotels each
- `proposal-followup` — emit reminder if proposal `last_viewed_at` > 48h, no accept
- `email-send` / `whatsapp-send` / `pdf-render`
- `wallet-virtual-account-poll` — reconciles Razorpay VA credits → WalletTxn

## Security / multi-tenancy

- Row-level: every query through `db` package is wrapped with `where: { agencyId: ctx.agencyId }`.
- Customer-facing pages: signed share token (HMAC of `proposalId+expiry`) — no auth needed.
- PII: customer name/email/phone encrypted at rest using Postgres pgcrypto for fields that DPDP classifies sensitive.
- Wallet: any debit goes through a Postgres advisory lock + transaction; idempotency key required on every Razorpay call.

## Deployment topology

- **Preview** per PR (Vercel preview + Neon branch DB).
- **Staging** auto-deploy from `main`. Synthetic-traffic smoke tests.
- **Production** tag-gated. Migrations via Prisma `prisma migrate deploy` in a release job (locked behind manual approval after first failed schema).

## Phasing (mirrors PRD)

| Phase | Stack pieces live |
|---|---|
| 0 | Repo + design system + auth + DB schema + dashboard shell. No real adapters. |
| 1 | Itinerary builder (manual hotel/transfer entry first, then Hotelbeds + Viator adapters), Leads + Proposals + Bookings, Settings + Wallet (mock), Customer share page, AI suggester (Claude). |
| 2 | Duffel flights, Razorpay live, WhatsApp, PWA push, advanced CRM (Expert / Pending followups), Generate Leads widget, Flyer PDF. |
| 3 | Mobile app (React Native, sharing tRPC types), multi-currency, white-label storefront. |

## Hiring (minimum viable team)

- 1× Tech lead / fullstack (you or first hire) — Next + Prisma fluency.
- 1× Fullstack mid — adapters + queues.
- 1× Designer — owns the design system + customer-facing.
- 1× Agent-success (part-time at start) — pilots + feedback loop.
- Fractional: legal, finance, SEO.

## Estimated runway cost (Phase 1, monthly @ 100 agencies, 1000 proposals/mo)

| Item | Cost |
|---|---|
| Vercel Pro | $20 |
| Neon Pro | $69 |
| Upstash Redis | $10 |
| Cloudflare R2 + Workers | $10 |
| Fly.io worker | $20 |
| Sentry team | $26 |
| PostHog free → growth tier @ scale | $0 → $50 |
| Resend | $20 |
| Anthropic API (Claude Sonnet) @ ~10k tokens/proposal × 1k proposals = 10M tokens | ~$30 |
| Hotelbeds API (revenue share, not flat) | — |
| Razorpay (per-txn) | — |
| **Total fixed** | **~$200–250/mo** |

Comfortably under any reasonable revenue floor by Phase 1 exit.
