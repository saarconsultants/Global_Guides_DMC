# NexusDMC Discovery — 01: Dashboard & Top Nav

**URL**: https://www.nexusdmc.com/trip/dashboard
**Auth**: Logged in as agent "Global Gui..." (Global Guides). No login wall hit; cookie-based session.
**Tech signals**: Server-rendered HTML, jQuery-style XHR. URLs use `__xreq__=true` flag. No `__NEXT_DATA__`, no `window.React`, no `window.Vue`. Likely Java/Spring or PHP backend. Static assets under `/static/img/v1/`.

## Top utility bar (right)
- Contact ▾
- Write to us
- Escalate (orange highlight pill)
- Recharge (₹0) ▾ — agent wallet
- Profile (Global Gui...) ▾

## Main nav
- Home (this page)
- Flights ▾
- Holidays ▾
- Hotels
- Marketing ▾
- My Leads ▾
- Settings
- Account Statement

## Dashboard widgets (top to bottom)
1. **Search Holiday Packages** card — Leaving From (default Pune), Destination autocomplete, Duration dropdown, Departure Month dropdown, Search button. Group Tour toggle button top-right.
2. **Banner carousel** (auto-cycling): Maldives campaign ("STRONGER THAN EVER", 100+ resorts, exclusive rates, etc.) + Instant Wallet Top-up via ICICI Virtual Accounts feature ad.
3. **Inline CTA**: "Would you like to create your own itinerary? **Click Here**" → opens Create Your Trip modal.
4. **Nexus DMC Service Assurance** section + View Details CTA.
5. **Our DMC's** section (below fold).
6. **Stats hero**: 4,200+ Groups per Year · 1,13,000+ Passengers Annually · 100+ Team based in Europe.
7. **Key Strengths** 4 colored cards: 70+ Own Fleet · 42+ Countries with Sales Offices · 7,200+ Active Agents Booking Europe · 1,400+ Direct Contracts with Hotels.
8. **Our Offices** carousel (Paris Region 95190 Goussainvelle France …).
9. **Gallery** (group tour photos, "View All (10)").
10. **Key Partners** logos: Accor, Air India, Disneyland Paris, Eurostar, Jungfrau, Keukenhof, Lufthansa, Marriott, Engelberg-Titlis, NH Hotels, Oman Air, Swarovski.
11. **Trade Memberships**: European Travel Commission, ETOA, USTOA.

## Endpoints captured
- `GET /gen/msc/city-suggest?q=<query>&__xreq__=true&incCStAr=true&flrEC=true&flrHC=false&flrIF=true` → city autocomplete. Flag guesses: `incCStAr` (include City/State/Area), `flrEC` (filter exclude/include EuropeCity?), `flrHC` (hotel chains?), `flrIF` (IATA?). 200 OK.

## Color/style notes (preliminary)
- Header: dark navy (~#1a2230) with white logo + light grey nav links
- Brand orange CTA: "Click Here" red-orange (~#b94025), Escalate pill same family
- Primary blue: deep navy-blue button (~#093975 — Search, Create Proposal)
- Card backgrounds: white on light grey body
- Stat highlights: warm gold (~#caa974)
- Key Strengths cards: pastel peach / mint / lavender / pink

Screenshots: discovery/screenshots/dashboard-*.jpg (in chat).
