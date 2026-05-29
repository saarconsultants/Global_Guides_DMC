# Global Guides — Setup & Runbook (no-code friendly)

This is a step-by-step guide written for **Bipin (designer, not developer)**. You don't need to write any code. You just need to copy commands into Terminal, paste API keys when prompted, and click a few buttons in browsers.

> If anything breaks: open Claude Code in the project folder and paste the error. Claude can fix almost anything in this repo.

---

## What you're about to run

A working B2B travel agent web app (Next.js + Tailwind + shadcn-style UI) that:

- Shows the agent dashboard at `http://localhost:3000/dashboard`
- Has a working **flight search** at `http://localhost:3000/flights` (uses mock data until you add your Tripjack API key — then it's live)
- Has stubs for Hotels, Holidays, Marketing, Leads, Proposals, Settings, Account Statement, and a "Create your trip" intake form
- Has the full design system applied (navy + gold + Plus Jakarta Sans)

The full product roadmap is in [`PRD.md`](./PRD.md). The architecture choices are in [`ARCHITECTURE.md`](./ARCHITECTURE.md). The design system is in [`design-system/`](./design-system/).

---

## Part 1 — One-time setup (≈ 15 minutes)

### 1.1 Install Node.js (only if you don't have it)

Open **Terminal** (Cmd-Space, type "terminal", Enter). Type:

```bash
node --version
```

- If you see `v20.x.x` or higher, you're good. Skip to 1.2.
- If you see "command not found", install Node via Homebrew:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install node
```

Then re-check `node --version` (should print v20 or higher).

### 1.2 Install the project's dependencies

In Terminal:

```bash
cd "/Users/bipin/Global Guides/nexus-clone"
npm install
```

This downloads everything the app needs (~125 packages, ~40 sec).

You should see something like:
```
added 124 packages in 40s
```

### 1.3 Run the app locally

Still in Terminal, type:

```bash
npm run dev
```

Wait ~5 seconds, then open your browser to **<http://localhost:3000>**.

You should see the Global Guides dashboard. Click "Flights" in the top nav — try a search like DEL → CDG.

Press **Ctrl-C** in Terminal when you want to stop the server.

---

## Part 2 — Connect Tripjack (turn mock data into live data)

The app currently shows **mock flight data**. To get real flights, you need a Tripjack API key.

### 2.1 Get the Tripjack credentials

Your Tripjack **staging** account:

- Panel URL: <https://apitest.tripjack.com/>
- User ID: `113003`
- Agency: GLOBALGUIDES DMC LLP
- Login email: `travel@globalguidesdmc.com`
- Mobile: `8378073375`
- (Password rotated — stored in your password manager. Tripjack required a change on first login.)

Inside the agent panel:

1. Log in at <https://apitest.tripjack.com/>.
2. Left side menu → **Manage User** → **API Configuration**.
3. Enter the IPs that should be allowed to call the API (this is required):
   - For **local development**: get your home IP by typing `curl ifconfig.me` in Terminal. Paste that.
   - For **production on Vercel**: ask Vercel support for their egress IP range (or just whitelist `0.0.0.0/0` temporarily for testing — **not** for real customer data).
4. Click **SAVE**. When asked "Do you wish to generate a new API Key?" → **YES**.
5. **Copy the API Key immediately** (it'll be masked next time you visit the page).
6. **Disable IPv6** on your network/host (Tripjack doesn't support IPv6 — you'll get "Access Denied" otherwise).

### 2.2 Tell the app about your key

In Terminal:

```bash
cd "/Users/bipin/Global Guides/nexus-clone/apps/web"
cp .env.example .env.local
```

Open `.env.local` in any text editor (TextEdit, VS Code, Cursor). Paste your key:

```env
TRIPJACK_BASE_URL=https://apitest.tripjack.com
TRIPJACK_API_KEY=paste_your_real_key_here
```

Save the file. Restart the dev server (`Ctrl-C` then `npm run dev` again).

Now visit `/flights` again. If the orange pill at the top right says **LIVE** (not MOCK), you're connected.

### 2.3 Tripjack quirks to remember

- **IPv4 only.** Disable IPv6 system-wide. On Mac: System Settings → Network → click your connection → Details → TCP/IP → "Configure IPv6" → **Link-local only**.
- **Whitelist your IP** every time it changes (home WiFi can rotate).
- **Sandbox vs production**: keep `apitest.tripjack.com` until you've test-booked at least 5 PNRs. Then change to `tripjack.com` in `.env.local` for real.

### 2.4 Things to ask your Tripjack RM (account manager) on the first call

Open `vendor/tripjack/TRIPJACK_API_NOTES.md` — there's a list at the bottom titled **"Open questions for Tripjack RM"**. Email or call your Tripjack contact and ask them all 10. Most important:

- Exact header name for the API key (the docs are ambiguous).
- Confirm the flight-search endpoint URL (we've inferred it).
- Send the Hotel API v2 docs zip.
- Send Cabs / Visa / Train / Cruise / Holidays / Tripsafe (insurance) docs if you'll use any.

When the zip arrives, drop it in `vendor/tripjack/` and paste this into Claude Code:

> *"I dropped Tripjack's Hotel API zip in `vendor/tripjack/`. Please extract it, update `TRIPJACK_API_NOTES.md` and the hotel adapter in `packages/adapters/tripjack/src/hotels.ts` so the hotels page works against real data."*

---

## Part 3 — Deploy to the internet (≈ 10 minutes)

### 3.1 Create a GitHub repo (one time)

If you don't have one:

```bash
cd "/Users/bipin/Global Guides/nexus-clone"
git init
git add .
git commit -m "Initial commit"
```

Go to <https://github.com/new>, create a private repo called `global-guides`. Then:

```bash
git remote add origin git@github.com:YOUR_USERNAME/global-guides.git
git branch -M main
git push -u origin main
```

(You'll need to be logged into `gh` CLI — or use GitHub Desktop if you prefer clicking.)

### 3.2 Deploy on Vercel

1. Go to <https://vercel.com/new>, sign in with GitHub.
2. Click **Import** next to `global-guides`.
3. **Root directory**: change to `apps/web`.
4. **Framework**: Next.js (auto-detected).
5. **Environment variables**: paste these from your `.env.local`:
   - `TRIPJACK_BASE_URL`
   - `TRIPJACK_API_KEY`
6. Click **Deploy**. Wait ~2 min.

You'll get a URL like `https://global-guides-xyz.vercel.app`. That's your live site.

### 3.3 Get Vercel's egress IPs and whitelist them on Tripjack

In Vercel dashboard → Project → Settings → **Functions** → check "Static IPs" (a paid Vercel add-on, ~$10/month for predictable outbound IPs). Whitelist those IPs in Tripjack's API Configuration page (Part 2.1, step 3).

Alternative: use a proxy with a fixed IP (e.g. Fly.io machine) and route Tripjack calls through it. Ask Claude Code to set this up if needed.

### 3.4 Map your custom domain

Vercel → Project → Settings → Domains → add `app.globalguides.com` (or whatever you've bought). Follow the DNS instructions.

---

## Part 4 — Extending the app (you don't write code; Claude does)

The whole point: when you need a new feature, **open Claude Code in this folder** and describe what you want in plain English. Claude reads `PRD.md`, `ARCHITECTURE.md`, the design system, and the existing files, and writes the code.

### Good prompts to copy-paste

For each, open Claude Code in `/Users/bipin/Global Guides/nexus-clone/` and paste:

**A. Build the hotel search results UI**
> *"The hotel search at `/hotels` is just a stub. Build the hotel results list using the design system. Look at `packages/adapters/tripjack/fixtures/hotel-search.json` for the shape. Wire it the same way I did flights at `/flights`. Use the HotelCard pattern from `design-system/components.md` §5a."*

**B. Build the full itinerary builder (Customize-Your-Trip page)**
> *"Build the full Customize-Your-Trip page at `/itinerary/[id]/customize` per `discovery/02-itinerary-builder.md` Layer 3 and `design-system/components.md`. Use shadcn-style components. Mock data for now — store the itinerary in Zustand local state."*

**C. Add Postgres + save proposals to a DB**
> *"Add Prisma + a Neon Postgres connection. Schema from `ARCHITECTURE.md` §'Data model sketch'. Wire the 'Save As Proposal' button to write to the DB. Add a simple email-magic-link login with Auth.js."*

**D. Add the AI Suggester (calls Claude API)**
> *"Wire the 'Suggest Itinerary' button on `/itinerary/new` to call Claude Sonnet via the Anthropic SDK. Prompt: take free-text destinations + total nights, return JSON `{cities: [{city, nights}]}`. Use structured-output mode. Add `ANTHROPIC_API_KEY` to `.env.example`."*

**E. Generate shareable customer-facing proposal pages**
> *"Build the public `/p/[shareToken]` page (no auth required, signed URL). Render the proposal as a beautiful read-only timeline with Accept/Counter/Decline buttons. Match `design-system/components.md` §'customer-facing proposal'."*

### How to think about cost & complexity when you ask Claude for things

| Ask                                  | Effort | What Claude needs from you |
|---|---|---|
| Style tweak / copy change             | minutes | "Change X to Y on page Z" |
| Wire a Tripjack endpoint we have docs for | <30 min | The endpoint + sample response |
| New page using existing components    | <1 hour | Sketch / Figma / wireframe |
| New module with DB + API + UI         | 2–4 hours | A short spec; Claude will write the PRD section first |
| AI features (LLM, structured output)  | 1–3 hours | A clear prompt + example output |

### When to bring in a developer

- **Performance issues** at >1000 concurrent users.
- **Production payments** (Razorpay): get a developer to write the webhook handlers and reconcile flows. Money bugs are expensive.
- **Tax / GST / e-invoicing** integration when you scale past ~50 bookings/month.

Until then, Claude Code is enough.

---

## Part 5 — Troubleshooting

### "command not found: node"
You skipped 1.1. Install Node via Homebrew.

### "Error: TRIPJACK_API_KEY not set — adapter is in mock-only mode"
Open `apps/web/.env.local` and paste your key (Part 2.2). Restart `npm run dev`.

### Flight search returns "Tripjack HTTP 403: Access Denied"
Your IP isn't whitelisted, OR IPv6 leaked. Re-check Tripjack panel → API Configuration. On Mac, disable IPv6 (Part 2.3).

### Flight search returns "Tripjack HTTP 404"
The endpoint path is wrong. We **inferred** `/fms/v1/air-search-all`. Confirm with your Tripjack RM and update `packages/adapters/tripjack/src/flights.ts` line `SEARCH_PATH`.

### "npm install" fails with EACCES or permission errors
Run `sudo chown -R $(whoami) ~/.npm` once, then retry.

### Build fails after I edit code
Open Claude Code, paste the error, ask to fix.

---

## Project map (where lives what)

```
nexus-clone/
├── PRD.md                          ← Product spec (read this first)
├── ARCHITECTURE.md                 ← Stack + data model
├── SETUP.md                        ← This file
├── design-system/
│   ├── tokens.md                   ← Colors, type, spacing
│   ├── components.md               ← 22 component specs
│   └── preview.html                ← Open in browser to see the design system
├── discovery/                      ← NexusDMC teardown notes
├── vendor/tripjack/
│   └── TRIPJACK_API_NOTES.md       ← Tripjack endpoints + auth + open Qs
├── apps/web/                       ← The Next.js app you run
│   ├── app/                        ← Pages (URLs)
│   │   ├── dashboard/page.tsx
│   │   ├── flights/page.tsx
│   │   ├── hotels/page.tsx
│   │   ├── leads/page.tsx
│   │   ├── itinerary/new/page.tsx
│   │   ├── settings/page.tsx
│   │   └── api/flights/search/route.ts   ← API endpoint
│   ├── components/                  ← Reusable UI
│   ├── lib/                         ← Helpers
│   ├── tailwind.config.ts           ← Design tokens, all colors
│   └── .env.local                   ← YOUR SECRET KEYS (gitignored)
└── packages/adapters/tripjack/      ← Tripjack adapter (the only place that talks to Tripjack)
    ├── src/client.ts                ← HTTP layer
    ├── src/flights.ts               ← Flight search
    ├── src/hotels.ts                ← Hotel search (stub)
    ├── src/types.ts                 ← Public types the app uses
    └── fixtures/                    ← Mock data when no API key
```

---

## What's done already

- [x] Discovery teardown of nexusdmc.com (8 documents in `discovery/`)
- [x] Full Product Requirements (`PRD.md`)
- [x] Stack + architecture decisions (`ARCHITECTURE.md`)
- [x] Complete design system: tokens, 22 components, HTML preview
- [x] Working Next.js + Tailwind + TypeScript app that builds & runs
- [x] Top nav matching the design system
- [x] Dashboard with KPI bento + AI suggester promo + quick-action cards
- [x] **Flight search end-to-end** — UI form + API route + Tripjack adapter + mock fallback
- [x] Tripjack adapter with typed contracts, mock-aware, ready for live API key
- [x] Stub pages for every nav route (no more 404s)
- [x] All open questions for Tripjack RM listed in `vendor/tripjack/TRIPJACK_API_NOTES.md`

## What's next (priority order)

1. **Call Tripjack RM** — confirm endpoint paths, get hotel docs.
2. **Decide hosting & domain** — Vercel + your domain.
3. **Ask Claude to build hotel search** (Prompt A above) once you have hotel docs.
4. **Ask Claude to build the full itinerary builder** (Prompt B).
5. **Add DB + auth** (Prompt C) — needed before you onboard the first real agent.
6. **Wire AI Suggester** (Prompt D).
7. **Public customer-facing proposal page** (Prompt E) — the killer differentiator.

Each of those takes Claude Code 30 min – 4 hours of working time. **You don't write a single line.**

---

## Part 5.5 — Turn on the AI Suggester (≈ 3 minutes)

The "Suggest itinerary" button uses Claude to plan multi-city trips. Add a key:

1. Go to <https://console.anthropic.com/settings/keys>, sign in (your Anthropic account works).
2. **Create Key** → name it "global-guides-dev" → copy the long key (starts with `sk-ant-…`).
3. In Terminal:
   ```bash
   open -e "/Users/bipin/Global Guides/nexus-clone/apps/web/.env.local"
   ```
4. Add this line (paste your real key):
   ```
   ANTHROPIC_API_KEY=sk-ant-paste-your-key-here
   ```
   Save (Cmd-S), close.
5. Restart `npm run dev`.

Now click **Suggest itinerary** on `/itinerary/new` → enter "Paris, Amsterdam, Zurich" + 7 nights → **Load suggestions** — Claude returns an ordered plan with rationale + warnings.

Cost: ~ ₹0.50 per suggestion (≈ $0.006). For 1,000 suggestions/month that's about $6. Set a monthly cap in the Anthropic dashboard if you want safety.

If you ever see "ANTHROPIC_API_KEY not set" — your `.env.local` didn't reload. Quit `npm run dev` (Ctrl-C) and run it again.

---

## Part 6 — Database (already set up — context for later)

The app uses **SQLite** for development (a single file `apps/web/prisma/dev.db`, no install needed). When you deploy, swap `DATABASE_URL` in Vercel for a Postgres URL (Neon free tier works fine).

### Useful Prisma commands

```bash
cd "/Users/bipin/Global Guides/nexus-clone/apps/web"

# Inspect your data in a friendly UI (opens at http://localhost:5555):
npx prisma studio

# After editing prisma/schema.prisma, re-sync the dev DB (no migration files):
npx prisma db push

# Or, for proper migrations (recommended once you have real data):
npx prisma migrate dev --name <change_name>
```

### Reset the local DB if you mess it up

```bash
cd "/Users/bipin/Global Guides/nexus-clone/apps/web"
rm prisma/dev.db
npx prisma db push
```

The default Global Guides agency auto-creates on first save — no seed step needed.

---

## Part 7 — Multi-tenant login (new in this iteration)

The platform is now a real multi-tenant SaaS. Three personas:

- **SUPER_ADMIN** — you, as platform owner. Sees every agency. Manages templates + commission rules. URL: `/admin`.
- **AGENCY_OWNER / COUNSELLOR / OPS** — the agency-side staff. Sees only their agency's data. URL: `/dashboard`.
- **End customer** — opens `/p/<shareToken>`, no login. Sees the agency's brand, not yours.

### Seed test users (run after every DB reset)

```bash
cd "/Users/bipin/Global Guides/nexus-clone/apps/web"
npm run db:seed
```

This creates:

| Role | Email | Password |
|---|---|---|
| **Super-Admin** | `admin@globalguides.com` | `admin123` |
| **Agency Owner** (Global Guides) | `travel@globalguidesdmc.com` | `agent123` |
| **Demo Agency Owner** (Wandermark Travels) | `demo@wandermark.in` | `agent123` |

Plus seeds: **3 starter templates** + **6 platform commission rules** (3% flight, 8% hotel, 10% transfer, 12% activity, 5% visa, 20% insurance).

### Useful DB commands

```bash
cd "/Users/bipin/Global Guides/nexus-clone/apps/web"
npm run db:studio     # Inspect data in a UI
npm run db:reset      # Wipe local DB + re-push schema + re-seed (destructive)
npm run db:push       # Apply schema changes without resetting data
```

### Sign in for the first time

1. `npm run dev`
2. <http://localhost:3000> → redirects to `/login`
3. Sign in as `admin@globalguides.com / admin123` → lands on `/admin` (platform overview)
4. From admin → click **"Switch to agency view"** in the bottom-left → see your own agency's `/dashboard`
5. Or sign in as `travel@globalguidesdmc.com / agent123` to go directly to the agency view

### Where to do what

| Job | Where |
|---|---|
| Create platform templates (showed as Suggested to all agencies) | `/admin/templates` |
| Tune commission rules (platform default OR per-agency override) | `/admin/commissions` |
| See your revenue across all agencies | `/admin/revenue` |
| Manage agencies (status, view their proposals) | `/admin/agencies` |
| Brand your agency (logo, colors, customer-facing footer) | `/settings` |
| Browse + clone templates as an agent | `/suggested` |
| Build a one-off proposal | `/itinerary/new` |
| See your sent proposals + customer responses | `/proposals` |
| Customer-facing page (white-labelled per agency) | `/p/<shareToken>` |

### What happens on each saved proposal

1. Agent clicks **Save As Proposal** → enters customer info → saves
2. DB writes a `Lead` + `Proposal` row (agency-scoped) + share token
3. **Commission engine runs** — `lib/db/commissions.ts` computes platform commission per product (FLIGHT/HOTEL/TRANSFER/ACTIVITY/VISA/INSURANCE/INVOICE_TOTAL) using the cascading rules (agency-specific > platform default), and writes `CommissionEntry` rows
4. Those entries are visible to you at `/admin/revenue` — that's your money

---

## You're done with setup

```bash
cd "/Users/bipin/Global Guides/nexus-clone"
npm run dev
```

Open <http://localhost:3000>. Welcome to Global Guides.
