# Product Requirements Document — Global Guides DMC Platform

**Working title**: Global Guides (NexusDMC-style B2B agent portal)
**Owner**: Bipin / Global Guides
**Status**: Draft v0.1 — derived from competitive teardown of nexusdmc.com
**Discovery refs**: `discovery/01-dashboard-and-nav.md`, `discovery/02-itinerary-builder.md`, `discovery/04-modules.md`, `discovery/05-tech-stack.md`

---

## 1. Problem Statement

B2B travel agents who sell multi-city international holiday packages spend hours assembling each proposal by hand — researching hotels across 1,400+ properties, pricing transfers from each airport, drafting day-by-day itineraries in Word/PDF, applying markup, and chasing client approval. The result is slow turn-around (often 24–48h per quote), inconsistent quality, leaked margin, and lost leads to faster competitors. Existing tools (Nexus, TravelClick, Travelize) are either locked behind expensive licenses or built for inbound DMCs only, leaving the long tail of outbound agents without a single workflow that combines live inventory + AI composition + CRM + billing.

## 2. Goals

| # | Goal | Owner-side metric |
|---|------|------|
| G1 | Cut median time from "lead intake" to "proposal sent" from 24 h to **< 30 min** for a 2-city trip. | Agent activation |
| G2 | Raise proposal → booking conversion by **≥ 25 %** vs. agents' current tooling, by shipping shareable interactive proposals (not static PDFs). | Booking conv rate |
| G3 | Hit **70 % MAU adoption** of the AI itinerary suggester among onboarded agents within 60 days of launch. | AI engagement |
| G4 | Earn **net-positive unit economics on every booking** via configurable markup + wallet float (no per-seat license, take rate on bookings). | Gross margin |
| G5 | Onboard **100 paying agencies in first 6 months**, with retention curve flattening above 60 % at month 3. | Agency growth & retention |

## 3. Non-Goals (v1)

| Non-goal | Rationale |
|---|---|
| **B2C consumer storefront** | Audience is B2B agents (per founder decision). White-label customer-facing site possible in v2. |
| **Owning inventory / contracts** | We aggregate via GDS (Amadeus/Sabre/Galileo for flights, hotel APIs like Hotelbeds, Tour APIs like Viator). We are not a wholesaler. |
| **Air ticketing engine from scratch** | Plug into 3rd-party flight APIs; build a thin selector. Building a GDS is a separate company. |
| **Mobile-native apps** | Web responsive only for v1. Mobile push via Web Push. Native iOS/Android in v2. |
| **Multi-currency wallet** | INR-only ledger v1 (matches Nexus pattern). USD/EUR wallets v2. |
| **GST / e-invoicing automation** | Manual download v1; auto-file in v2 once volume justifies compliance build-out. |
| **Multi-language UI** | English-only v1. |
| **Inventory operations console** (rate loading, supplier onboarding, etc.) | Internal-only screens for v1. Self-serve supplier admin in v2. |

## 4. Personas

| Persona | Description | Primary job |
|---|---|---|
| **Owner-Agent** (e.g. Bipin) | Founder of a small outbound agency. Logs in daily. Sets markup, chases leads, configures team. | Run the agency P&L. |
| **Sales Counsellor** | Front-line agent. Receives inbound lead, builds proposal, follows up. | Convert lead → booking. |
| **Expert / Ops** | Senior who reviews complex itineraries, fixes errors, escalates supplier issues. | Quality + escalation. |
| **Customer (indirect)** | The leisure traveller. Never logs in — receives shareable proposal link, comments, accepts. | Approve & pay. |

## 5. User Stories

### Composition (Itinerary Builder)
1. As a **Sales Counsellor**, I want to type "Paris, Amsterdam, Zurich — 7 nights" and let AI generate a starter itinerary, **so that** I can quote in minutes instead of researching from scratch.
2. As a **Sales Counsellor**, I want to drag-reorder destinations and change nights per city, **so that** I can fit client preferences.
3. As a **Sales Counsellor**, I want to swap any auto-picked hotel/transfer/activity with one click, **so that** I can match the client's budget or taste.
4. As a **Sales Counsellor**, I want morning/afternoon/evening activity slots per day, **so that** I can sell tours alongside the stay.
5. As an **Owner-Agent**, I want the price to recalculate live as components change, **so that** I always know the margin before sending.
6. As a **Customer**, I want the proposal sent to me as a clean shareable link with photos + day-by-day plan + total, **so that** I can decide without reading a PDF.

### CRM (Leads → Proposals → Bookings)
7. As a **Sales Counsellor**, I want every lead (incoming form, AI prompt, manual create) auto-saved with status, **so that** nothing falls through cracks.
8. As a **Sales Counsellor**, I want to see all proposals I've sent with filter by date/destination/status, **so that** I can prioritize follow-ups.
9. As a **Sales Counsellor**, I want to be notified when a customer opens or interacts with my proposal, **so that** I call them at the right moment.
10. As an **Owner-Agent**, I want a "Pending Followups" queue that surfaces stale proposals, **so that** my team doesn't drop the ball.
11. As an **Owner-Agent**, I want to convert an accepted proposal into a booking with a single click and record the payment method, **so that** the handoff to ops is clean.

### Inventory & Search
12. As a **Sales Counsellor**, I want to search hotels by city/name with check-in/out/rooms/nationality, **so that** I can quote stand-alone hotels (non-package).
13. As a **Sales Counsellor**, I want flight search inside the builder, **so that** I can include or exclude flights per proposal.
14. As a **Sales Counsellor**, I want to add Visa Assistance and Travel Insurance line items, **so that** the proposal is complete.

### Finance
15. As an **Owner-Agent**, I want to set a default markup % and over-ride per proposal, **so that** every quote stays profitable.
16. As an **Owner-Agent**, I want a wallet I top up by IMPS/NEFT/RTGS that funds confirmations, **so that** booking is instant.
17. As an **Owner-Agent**, I want a downloadable Account Statement filtered by date with PNR + booking ref + amount, **so that** I can reconcile with my accountant.

### Marketing
18. As an **Owner-Agent**, I want a "Generate Leads" embeddable widget for my partner sites/Insta, **so that** new leads land in my CRM automatically.
19. As an **Owner-Agent**, I want to download branded flyers for the destinations I sell, **so that** I can market on WhatsApp.

### Settings & Identity
20. As an **Owner-Agent**, I want a unique Agency ID and customizable profile, **so that** my brand shows on every customer proposal.
21. As an **Owner-Agent**, I want to invite team members with role-based access (Owner / Counsellor / Ops), **so that** sensitive settings stay locked.

---

## 6. Requirements

### P0 — Must Have (MVP, ship in Phase 1)

#### P0-1 Itinerary Builder (the moat)
- Three-layer flow: (a) intake modal `Create Your Trip`, (b) AI-suggest modal `Where would you like to wander?`, (c) full `Customize Your Trip` page.
- Intake: destinations list (sortable, per-city nights, +Add/×remove, city autocomplete) + Leaving From + Nationality + Date + Travelers (rooms[] of {adults, children, child_ages}) + Star rating + Add Transfers toggle.
- AI suggest: free-text destinations + total nights → calls LLM with prompt template + cached city/hotel index → returns ordered city list with night allocation, ready to load into builder.
- Customize Your Trip page: per-day cards (arrival / stay / transit / departure) with Morning/Afternoon/Evening activity slots; sticky right-rail Price Summary + Trip Summary; sticky left-rail quick nav (Flights · Price · Transfers · Insurance); inline change-hotel / change-room / change-transfer / add-activity / add-flight modals.
- Live price recalc on every change.
- Save As Proposal → persists to DB + generates shareable customer link (signed URL).
- **Acceptance**:
  - Given a 2-city destination list + travel date + 2 adults, when I click Create Proposal, then a fully-priced itinerary with hotels + arrival/departure transfers + day-by-day plan loads in < 5 s.
  - Given any inclusion has "N options" link, when I click it and pick another, then the price summary updates within 1 s and the trip summary text re-narrates.
  - Given a proposal is saved, then the customer link renders the proposal read-only with Accept / Counter buttons.

#### P0-2 Inventory adapters
- Hotel adapter (Hotelbeds or similar) with: city/name search, room/rate/refund-policy/meal-plan fetch, availability check.
- Transfer adapter (Hotelbeds Transfers / Mozio) with: airport→hotel & hotel→airport pricing, private/shared/premium tiers.
- Tour adapter (Viator API or GetYourGuide partner) with: time-slot search by city + category.
- Flight adapter (Duffel or Amadeus Self-Service) with: O&D + dates + cabin search, price + book.
- Visa & Insurance: static catalogue with fixed pricing v1 (no live API).
- **Acceptance**: Each adapter returns standardized JSON shape; failure of one adapter degrades gracefully (shows "Add manually" fallback).

#### P0-3 CRM core (Leads, Proposals, Bookings)
- **Leads** list: date range + email/phone/destination filter + KPI tiles (Total Leads, Converted, Conv Rate, Last Txn). Manual `Create New Query` form. Table cols per discovery.
- **Proposals** list: date range + customer + destination + Market filter; cols (Proposal# · Customer · Created · Expected Booking Date · Name · From · Travel Date · Price Quoted · status · actions). Per-col quick-filter inputs.
- **Bookings** list: tab set (My Bookings · Create Quote · Learn · Share · My Packages) — Phase 1 ships only My Bookings + Create Quote.
- One-click convert: Proposal → Booking with payment-mode capture.
- **Acceptance**: Lead created via Save As Proposal appears in My Leads with status "Quoted". Proposal opened by customer (link click) updates `last_viewed_at`. Counsellor receives email + Web Push.

#### P0-4 Finance (Markup, Wallet, Account Statement)
- Sales Settings: global default markup % + per-supplier override + per-product-type override.
- Per-proposal markup prompt (toggleable in Profile).
- Wallet: INR-only, balance shown in header, recharge via virtual account (mock provider v1; ICICI VA integration P1).
- Account Statement page: date range, downloadable CSV/PDF, columns per discovery.
- **Acceptance**: Markup correctly applied on every quote. Wallet balance debited atomically on booking confirm. Statement export matches DB ledger.

#### P0-5 Auth, Multi-tenant, Roles
- Email + password + magic-link login.
- Agency = tenant. Users belong to one agency.
- Roles: Owner / Counsellor / Ops (Owner = all, Counsellor = own leads + proposals, Ops = view all + booking ops).
- Unique Agency ID auto-issued (pattern `GGN######`).
- **Acceptance**: Counsellor cannot see another Counsellor's leads. Owner can re-assign.

#### P0-6 Customer-facing proposal page
- Public signed-URL page, no login.
- Hero photo carousel of destinations.
- Day-by-day plan with hotel cards, transfer notes, activity cards.
- Sticky total + Accept / Counter / Decline buttons.
- Mobile responsive.
- **Acceptance**: PageSpeed mobile score ≥ 80. Accept routes to a confirmation screen + notifies agent.

### P1 — Nice-to-Have (Phase 2, post-MVP)

- **AI Suggest Itinerary** prompt tuning, multi-shot examples, per-agency taste profile.
- **Generate Leads embeddable widget** (iframe + JS snippet for partner sites).
- **Download Flyers**: templated marketing PDF/PNG generator (destination, agency logo, agent contact, dates).
- **My BOGO Cards**: promotional 2-for-1 cards an agent can attach to a proposal.
- **Expert Dashboard**: senior view across all counsellors' pipelines.
- **Pending Followups**: queue of proposals untouched >N days; assignable.
- **PWA install + Web Push notifications** (already a Nexus parity feature).
- **Group Tours catalogue**: fixed-departure inventory with seat allocation.
- **Adhoc Group** flow: agent requests a custom group quote → Ops responds.
- **Special Flights** + Flight Group Request workflows.
- **ICICI Virtual Account** real integration for wallet.

### P2 — Future (Phase 3+, design for, don't build)

- Native iOS/Android apps (data layer must be API-only so apps share backend).
- Multi-currency wallets + multi-currency proposal pricing.
- White-label B2C storefront per agency (subdomain + theme).
- Supplier self-serve onboarding (rate-loading, contract upload).
- GST e-invoicing & TCS automation.
- LLM-driven customer chat embedded in customer proposal page ("Ask about this trip").
- Visa workflow with document collection + status tracking.
- Loyalty / agent leaderboards / commission tiers.

---

## 7. Phasing & Timeline

| Phase | Scope | Duration estimate | Exit criteria |
|---|---|---|---|
| **0 — Foundations** | Stack decision, repo bootstrap, design system kit, hosting + CI/CD, schema for Agencies/Users/Roles, auth, dashboard shell + nav | 3 weeks | Empty agent can log in, see empty dashboard, set up profile. |
| **1 — MVP** | P0-1 through P0-6. AI suggester powered by Claude API. Hotel + Transfer adapter live (1 supplier each). Manual flight + visa + insurance line items (no adapter yet). Customer-facing proposal page. | 10 weeks | 5 pilot agencies use it end-to-end on real client trips. |
| **2 — Polish + Inventory depth** | P1 features. Add 2nd hotel supplier, real Tour adapter (Viator). Flight adapter (Duffel). ICICI VA. PWA install + push. Expert/Pending Followups screens. | 8 weeks | 100 agencies onboarded; 1,000 proposals/mo sent. |
| **3 — Scale + Adjacencies** | P2 selectives based on data. Likely: white-label storefront for top customers, mobile apps, multi-currency. | Ongoing | TBD |

---

## 8. Success Metrics

### Leading (weekly)
- **Activation**: % new agencies that send their first proposal within 7 days (target ≥ 60 %).
- **Time-to-Proposal**: median seconds from "Create Your Trip" intake → Save As Proposal (target ≤ 1800 s = 30 min by Phase 1 exit; ≤ 600 s by Phase 2).
- **AI Suggest engagement**: % proposals where AI suggester was used at least once (target ≥ 70 % at Phase 2 exit).
- **Proposal open rate** (customer clicks shareable link): target ≥ 80 %.
- **Inclusion swap rate**: avg # of hotel/transfer/tour swaps per proposal (signal of perceived AI quality; want trending **down** over time as suggestions improve).

### Lagging (monthly / quarterly)
- **Proposal → Booking conv rate**: target ≥ 18 % by month 3 (vs. industry ~10–12 %).
- **MAU retention curve**: month-3 retention ≥ 60 %.
- **Gross take rate** per booking: target avg 4 % (agent markup + platform fee combined).
- **Net revenue per agency / month**: target ≥ ₹15,000 by month 6.
- **NPS** from agents: target ≥ 40 by quarter 2.
- **Support tickets per active agency / week**: target ≤ 0.5.

### Measurement
- Event pipeline: Segment-style typed event SDK → Postgres `events` table → daily rollups.
- Dashboards in Metabase / native admin.
- Weekly review with engineering + agent-success.

---

## 9. Open Questions

| # | Question | Owner | Blocking? |
|---|---|---|---|
| Q1 | Which **hotel inventory partner** (Hotelbeds vs. RateHawk vs. WebBeds) — pricing tiers and contract minimums? | Founder + Eng | **Blocking P0-2** |
| Q2 | Which **flight API** (Duffel vs. Amadeus Self-Service vs. local NDC) — what's the cost per look + book fee? | Founder + Eng | Blocking flight feature in P1 |
| Q3 | Which **LLM provider** for AI Suggester — Claude Sonnet 4.6 vs. GPT-4.1 vs. self-hosted? Cost per proposal? | Eng | Blocking P0-1 AI quality bar |
| Q4 | **Hosting region** — India (data residency for agents) vs. AWS Mumbai vs. multi-region? | Eng | Non-blocking (decide pre-Phase 1) |
| Q5 | **Pricing model** for the SaaS — per-seat license, take rate on bookings, or hybrid? | Founder | Non-blocking but needed for marketing site |
| Q6 | Do we need **GST invoice number** on every customer proposal at v1, or only at booking confirm? | Founder + Finance counsel | Non-blocking |
| Q7 | **PII compliance** — DPDP Act (India) & GDPR if EU customers. What's the data residency/consent UX? | Legal | Blocking P0-6 customer page |
| Q8 | Do we **cache hotel rates** (faster, risk stale price) or **always live** (slower, accurate)? Hybrid? | Eng | Blocking P0-1 perf |
| Q9 | Does the **wallet** need a real-money-handling licence (PA/PG) or is it a pre-paid voucher? | Legal + Founder | Blocking P0-4 wallet |
| Q10 | **Customer "Accept"** on the shareable link — does it lock the price (we hold) or is it a soft accept that re-quotes at booking time? | Founder | Blocking P0-6 |

---

## 10. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Inventory partner contract takes 6–12 weeks to sign | High | Blocks P0-2 | Sign LOI now; design adapters provider-agnostic; bootstrap with sandbox creds. |
| AI hallucinated hotels / pricing | Medium | Trust loss with agents | LLM is suggestion-only; every component validated against live inventory before display. |
| Wallet float regulatory risk | Medium | Could need PPI licence | Start with "prepaid credits, no withdrawal" structure; legal review pre-launch. |
| Competing with Nexus head-to-head | Medium | Lower ARPU than projected | Differentiate on AI quality + speed; offer no-license pricing model. |
| 12-module surface too much for MVP team | High | Slipped timeline | Phasing is explicit; cut to 6 modules in Phase 1 (Itinerary, Hotels, Leads, Proposals, Settings, Account Statement). |

---

## 11. Dependencies

- **External**: Hotel/Transfer/Tour/Flight API contracts. LLM API. Email + SMS + WhatsApp provider. Payment gateway. PWA push key.
- **Internal**: Brand assets (logo, palette). Legal sign-off on customer T&Cs + wallet structure. First 5 pilot agencies recruited.
- **Cross-team**: Design system (see `/Users/bipin/Global Guides/nexus-clone/design-system/` — to be created by `ui-ux-pro-max`). Stack proposal (post-spec).

---

## 12. Out of scope clarifications

This PRD covers **product surface and behavior**. It does **not** cover:
- Detailed engineering architecture (separate `ARCHITECTURE.md`)
- Detailed visual design tokens & components (separate `DESIGN_SYSTEM.md` via ui-ux-pro-max)
- Go-to-market plan, pricing, sales playbook
- Hiring plan

---

## 13. Approvals

| Role | Name | Status |
|---|---|---|
| Product / Founder | Bipin | Pending |
| Engineering Lead | TBD | Pending |
| Design Lead | TBD | Pending |
| Legal | TBD | Pending |
