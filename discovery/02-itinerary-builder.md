# NexusDMC Discovery — 02: Itinerary Builder (core feature)

The itinerary builder is the heart of the platform. Three layers: (1) Create Trip modal, (2) AI Suggest modal, (3) full Customize Your Trip page (the workhorse).

## Entry points
- Dashboard "Click Here" CTA → opens "Create Your Trip" modal.

## Layer 1 — "Create Your Trip" modal (intake)
Two columns inside one modal.
- **Destinations** (ordered list)
  - Drag-handle (sortable) | City Name input (autocomplete) | Nights dropdown (default `1 night`) | × remove
  - `+ Add Another City` link
  - `+ Suggest Itinerary` red-orange button (top-right of section)
- **Trip Details**
  - Leaving From (text, default last-used "Pune")
  - Nationality * (select, default "India")
  - Leaving on * (date picker, calendar icon)
  - Number of Travelers * (custom dropdown, default "1 room, 2 adults"; "For more than 5 rooms click here" overflow link → after submit text changes to "more than 9 rooms")
  - Star rating (select: 5 Star / 4 Star / 3 Star)
  - ☑ Add Transfers (checkbox, default ON)
- CTA: **Create Proposal** (deep blue)

## Layer 2 — "Where would you like to wander?" modal (AI Suggest)
- DESTINATION NAME — multi-destination free-text input ("e.g. (Singapore, Malaysia), (Paris, Amsterdam, London)")
- Total nights selector (default `3 nights`)
- CTA: **Load Suggestions** (deep blue) → AI-generates a multi-city itinerary
- API param flag observed: `itnAISuggestionReq=true` on the resulting `get-price-req` call

## Layer 3 — Customize Your Trip (full page)
URL: `/package/get-price-req?itn=<id>~<ver>&...`. Page title: `Trip to <City> Package`.

### Layout
- **Header strip**: step indicator "2 Customize Your Trip" + meta (date · nights · rooms · adults) + total price center
- **Left rail (sticky icons, quick-jump)**: ✈ Flights · ₽ Price · 🚗 Transfers · 🛡 Insurance
- **Main column**: stacked sections (Flights → per-day cards → Visa → Insurance)
- **Right rail (sticky)**: Price Summary (Price per adult, Total Price, [Save As Proposal] CTA) + Trip Summary bullet list (auto-narrated itinerary)

### Sections

**A. Flights** (collapsed by default if none)
- "Add flights to my trip - <Origin> to <Dest>"
- "No Flight Included" + [Add flights to my trip] CTA → flights search inside builder

**B. Stay in <City> <N nights>** (one card per destination)
- Hotel thumbnail
- Stars (★ row) + Hotel name [view link] + address
- Score badge (e.g. "8.4 Very Good 552 ratings")
- Check-in / Check-out times
- ✓ Selected Room: "1 x Family Standard Room With 1 Double Bed And Bunk Be..."
- ✓ Room Only (meal plan)
- Refund flag: "Fully refundable before 11 Mar" (red)
- Selected Meals at Hotel grid: Room Only Included / Breakfast Not Available
- CTAs: [Change Room] [Change Hotel]
- Tax disclosure: "A tax is imposed by the city: EUR 8.45 per person, per night..."
- Optional tooltip: "What to know about this hotel"

**C. Day cards** (one per calendar day — Day 1, Day 2, …)
- Heading: `Day N: <weekday>, <DD MMM, YYYY>`
- Sub-heading: `Arrival in <City>` / `Stay in <City>` / `Departure from <City>` / `Transfer from <A> to <B>`
- Status banner (if data missing): red "Arrival/Departure information is missing" + [Update Arrival Details] CTA. Right-side red pill "N Points to Note"
- Narrative description (auto-generated paragraph) with "...more" expand
- **Activity slots** strip: `Morning | Afternoon | Evening` each with green [Add Activity] btn
- Included service rows (transfers, transfers between cities, tours, etc.) — each row: ✓ icon, title, "view" link, "N options" alternative count, × remove, tag chips (Private Transfers, Bags icon+count, pencil edit)
- 🛏 Overnight stay summary chip
- Footer CTAs: [Change Day] [Add Activity in <City>] [Change Departure from <City>]

**D. Visa** (full-width section)
- 🛂 icon + section title "Visa"
- One row per country/visa option: e.g. "France - Tourist Visa Assistance Only - Visa Fees Directly Payable - Tourist / Single Entry / Sticker Visa" with status "Not Included" + [CHANGE] button

**E. Travel Insurance** (full-width section)
- 🛡 icon + section title
- "Travel Insurance with min $50,000 coverage - Only for Age Below 60 Yrs" — Not Included — [+ ADD] button

### Trip Summary (right rail bullet list)
Auto-generated per destination:
- City heading
  - N nights in City
  - Stay at <Hotel> (N star) → Room plan (sub-bullet)
  - One-way Transfer from <Airport> to Hotel — type
  - Airport Departure Transfer: Hotel → <Airport> — type

### Inferred composable components (build blocks)
| Block | Notes |
|---|---|
| `<DestinationsList>` | drag-reorder, per-row nights |
| `<TravelersPicker>` | rooms[] of {adults, children, child_ages[]} |
| `<NationalityPicker>` | lookup |
| `<DatePicker>` | departure date |
| `<StarRatingFilter>` | hotel star filter |
| `<DaySchedule>` | morning/afternoon/evening slots |
| `<ActivityPicker>` (modal) | tour selector — `tour_selector-v1.1.3.js` |
| `<HotelPicker>` (modal) | hotel selector — `hotel_selector-v2.0.9.js` |
| `<RoomPicker>` (modal) | room selection per hotel |
| `<TransferPicker>` (modal) | car selector — `car_selector-v1.1.5.js` |
| `<FlightPicker>` | flight search & select |
| `<VisaPicker>` | visa option select |
| `<InsurancePicker>` | insurance plan select |
| `<PriceSummary>` (sticky) | price-per-adult, total, Save As Proposal |
| `<TripSummary>` (sticky) | bullet narrative |
| `<QuickNavRail>` (sticky) | jump to Flights/Price/Transfers/Insurance |

### State / data shape (inferred)
```ts
type Itinerary = {
  id: number;             // 4237
  version: number;        // 1
  agentId: number;
  leadId?: number;
  travelDate: string;     // MM/DD/YYYY
  originCity: string;     // "Pune"
  nationalityId: number;  // 2597
  starRating?: 3|4|5;
  addTransfers: boolean;
  destinations: Destination[];
  days: Day[];
  visa?: VisaOption;
  insurance?: InsuranceOption;
  flights?: FlightSelection[];
  priceSummary: { perAdult: number; total: number; currency: 'INR' };
};
type Destination = { cityId: number; cityName: string; nights: number; hotel?: Hotel; room?: Room; mealPlan?: string };
type Day = { dayNo: number; date: string; type: 'arrival'|'stay'|'transit'|'departure'; cityId: number;
  morning?: Activity; afternoon?: Activity; evening?: Activity;
  inclusions: (Transfer|Tour|Note)[]; overnightAt?: HotelRef; pointsToNote: number; };
type RoomPax = { rooms: { ad: number; ch: number; chAges?: number[] }[] };
```

### Endpoints related to the builder
| Method | Path | Notes |
|---|---|---|
| GET | `/package/get-price-req` | Build/load proposal with full query (itn, dCityExId, nationality, travelDate, roomspax JSON, autoCfg JSON, itnAISuggestionReq) |
| POST | `/partner/reconfigure-package` | Reconfigure on edit |
| GET | `/gen/msc/city-suggest?q=...` | City autocomplete |
| ?? | (TBD) `/hotel/search-by-city` | Powering `hotel_selector` |
| ?? | (TBD) `/tour/search-by-city` | Powering `tour_selector` |
| ?? | (TBD) `/transfer/search` | Powering `car_selector` |

## Key behaviors
- Auto-composition: minimal input (Paris + date + 2 adults) → builder pre-selects a 4★ hotel with refundable rate + arrival & departure private transfers, prices in INR.
- Missing-data warnings: red banners until arrival/departure flight info is entered.
- "N options" link on each inclusion → swap-out picker.
- Per-day narrative copy (auto-generated, possibly templated per inclusion type).
- Sticky price + summary persists across the whole edit session.
- AI flow: free-text destinations → multi-city itinerary auto-built.

## Open questions
- How does it persist between sessions? (Save As Proposal → presumably writes to a Proposals collection, retrievable from My Leads.)
- Does Save As Proposal generate a shareable customer-facing link / PDF?
- Is the AI a template engine (rule-based) or true LLM? `ai_styles.css` suggests UI affordance, not necessarily LLM.
- Multi-room pricing? Child age handling?
- Markup rules (agent margin) — likely Settings module.
