# NexusDMC Discovery — 05: Tech Stack & API Patterns

## Frontend bundles (loaded on proposal builder page)
- `jquery-yui-min-v1.8.32.6.81.0.1.js` → **jQuery + YUI** core
- `tf_en-v1.3.3.js` → locale (tf = TravelFlows? Templates?)
- `utils-v2.0.9.js` → custom utility lib
- `gmap/tf_map-v1.3.5.js` → Google Maps wrapper
- `utils/sortable-v1.0.js` → drag-drop reorder (for itinerary day reorder)
- `utils/hotel_selector-v2.0.9.js` → hotel picker widget
- `utils/car_selector-v1.1.5.js` → transfer/car picker widget
- `utils/tour_selector-v1.1.3.js` → activity/tour picker widget
- `pwa/nexuspwa-v10.js` → PWA support (offline / install)
- CSS: `travel_styles-v20250615.css`, `themes/stylist/css/style-v4.25.css`, `ai/ai_styles.css?v=1.1.5`
- Icon font: `fonts/v2/icomoon.ttf`
- `manifest.json` (PWA)

## Backend signals
- URLs use Java-style paths: `/gen/msc/...`, `/package/...`, `/partner/...`, `/trip/...`
- XHR flag: `__xreq__=true` (jQuery custom AJAX header convention)
- Hash-style IDs: `itn=4237~1` (itinerary 4237, version/leg 1)
- Internal entity IDs as ints: `dCityExId=4378` (destination city extended id), `nationality=2597`
- POST endpoints exist (`/partner/reconfigure-package`)
- Probably **Java + Spring MVC** (URL style, asset versioning pattern, jQuery+YUI vintage). Could also be JSP/Struts. Not Django, not Rails, not Next.

## Captured endpoints so far
| Method | Path | Purpose |
|---|---|---|
| GET | `/gen/msc/city-suggest?q=&incCStAr=&flrEC=&flrHC=&flrIF=` | City autocomplete (filters: include City/State/Area, exclude/include hotel/IATA flags) |
| GET | `/package/get-price-req?itn=&aprc=&crttrp=&sgstdItn=&autoCfg=&itnAISuggestionReq=&dCityExId=&nationality=&travelDate=&roomspax=` | Load package + recalc price. `autoCfg` JSON `{addTours, addTxfrs, landOnly}`. `roomspax` JSON `{rooms:[{ad, ch}]}` |
| POST | `/partner/reconfigure-package` | Server-side reconfigure on input change |
| GET | `/trip/dashboard` | Agent home |

## Inferred data model nouns
- **Trip** / **Itinerary** (id, version, agent, lead?, traveler config, dates)
- **City** / **Destination** (extended id, country, region)
- **Package** (assembled from itinerary)
- **Room/Pax** (rooms[] of {adults, children})
- **Hotel**, **Transfer (car)**, **Tour/Activity** — picker modules → separate inventory entities
- **Partner** (the agency) — endpoint namespace
- **Nationality** (lookup table, IDs)

## Build implication
The platform is a classic CRUD + composition engine: lookup inventories (hotels/transfers/tours) → assemble per-day plan → price → save as proposal → convert to booking. The "AI" layer sits on top, suggesting compositions given destinations+nights.
