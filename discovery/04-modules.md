# NexusDMC Discovery — 04: All Modules

## Nav map (top bar)
- **Home** `/trip/dashboard` — search packages + create itinerary CTA + marketing tiles
- **Flights ▾**
  - Special Flights
  - Flight Group Request
- **Holidays ▾**
  - FIT Packages (search-driven; falls back to dashboard search)
  - Group Tours
  - Adhoc Group
- **Hotels** `/hotels` — Book Hotels (Going to · Check-in · Check-out · Rooms · Nationality · Search)
- **Marketing ▾**
  - Generate Leads (web widget / lead-gen forms)
  - Download Flyers (printable / shareable marketing)
- **My Leads ▾** (CRM)
  - My Leads `/trip/trip-queries`
  - My Proposals `/partner/product-quotes`
  - My Bookings `/partner/my-bookings` (tabbed: My Bookings · Create Quote · Learn · Share · My Packages)
  - My Bogo Cards (BOGO offer cards)
  - Expert Dashboard
  - Pending Followups
- **Settings** `/accounts/service?action1=PRO` — Profile + Markup + Notifications + Sales Settings sub-page
- **Account Statement** `/payments/account-statement` — wallet ledger
- **Recharge ▾** — agent wallet top-up (ICICI Virtual Accounts, IMPS/NEFT/RTGS)
- **Contact ▾ · Write to us · Escalate · Profile ▾** — support utilities

## My Leads (CRM list)
- Title: "My Leads" + [I NEED HELP] + [CREATE NEW QUERY]
- Filters: from/to date range · Customer Email/Phone · Destination · [Show Leads]
- KPI tiles: Total Leads · Converted · Conv Rate · Last Txn On
- Table cols: Customer Name | Phone | Creation Time | Destinations | From | Travel Date | Nights | Status | Latest Quotes

## My Proposals (`/partner/product-quotes`, "Package Quotes Sent")
- Title: Proposals
- Filters: from/to date · Customer Name/Email · Destination · Market dropdown · [Show Proposals]
- Table cols (sortable): Proposal # | Customer | Created At | Expected Booking Date | Proposal Name | From | Travel Date | Price Quoted | (Action col 1) | (Action col 2)
- Per-column quick-filter row (DataTables pattern)

## My Bookings (`/partner/my-bookings`, "My Trips")
- Tabs: **My Bookings** · Create Quote · Learn · Share · My Packages
- Empty state: "You haven't got any pending bookings."

## Settings → Profile (`/accounts/service?action1=PRO`)
- [CHANGE PASSWORD]
- Markup Settings: ☑ "Ask me to specify markup every time I save a proposal" → links out to **Sales Settings** for global markup %
- Other Settings: ☑ Email on proposal click; doesn't affect mobile app push
- Account Details: Your Name (Global Guides DMC) · Agency ID (e.g. AORN6362175) · Contact Number · About Myself textarea
- [SAVE PROFILE]
- **Implies**: mobile app (push), markup engine (per-proposal + global default), agency ID issuance scheme `AORN######`

## Account Statement (`/payments/account-statement`)
- Title + date range + [Show] + ⬇ export
- Wallet balance tile (₹0 currently)
- Table cols: Transaction Time | Booking Reference | Booked by | Client | Booking Detail | PNR | # Pax | Booking Date | Travel Date | Mode | Type | Currency | Amount

## Hotels (`/hotels`, "Hotels Search") — direct hotel booking (separate from itinerary)
- Going to (city or hotel name autocomplete)
- Check-in / Check-out dates
- Number of rooms (1 room, 2 adults default; rooms[] of {adults, children, child_ages})
- Nationality select (default India)
- [Search Hotels]
- Hero banner "Book Worldwide At Super Exclusive Rates"

## Inferred but not yet explored
- **Sales Settings** (markup % default, per-supplier markups, customer-facing site control)
- **Flights search results** (cabin class, multi-city, special fares)
- **Group Tours** catalog (departure dates, seat allocation)
- **Generate Leads** (embeddable widget for partner sites)
- **Download Flyers** (templated marketing PDF/image generator)
- **My Bogo Cards** (buy-one-get-one promo cards)
- **Expert Dashboard** (specialist console — maybe team lead view)
- **Pending Followups** (lead reminder queue)
- **Recharge wallet flow** (ICICI Virtual Account)
- **Customer-facing proposal share page** (Save As Proposal → presumably public URL + PDF)
- **Hotel Change modal + Room Change modal + Activity Picker modal** (inside builder; powered by hotel_selector / tour_selector / car_selector JS modules)

## Surface area summary
~12 first-class modules. The platform is essentially: **(A) Inventory & Search** (Flights, Hotels, Tours, Transfers, Visa, Insurance) + **(B) Composition** (Itinerary Builder with AI suggest) + **(C) CRM** (Leads → Proposals → Bookings) + **(D) Finance** (Markup, Wallet, Account Statement) + **(E) Marketing** (Lead Gen, Flyers, BOGO).
