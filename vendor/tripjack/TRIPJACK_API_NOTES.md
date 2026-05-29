# Tripjack API — Notes extracted from the v2.0 ZIP + public conventions

> **Sources**: `API_Key_Configuration_User_Guide.pdf`, `Tripjack Flights Post Booking Ancillaries API Documentation.pdf`, `corporate_codes_api_contract.pdf`, sample request JSON files, plus Tripjack convention. **Marked `[CONFIRMED]` for what's explicitly in the PDFs, `[INFERRED]` for what's by pattern and must be verified with Tripjack support before going live.**

## Environments
| Env | Base URL |
|---|---|
| UAT (sandbox) | `https://apitest.tripjack.com` [CONFIRMED] |
| Production    | `https://tripjack.com`        [CONFIRMED] |

## Auth
- **Header**: `apikey: <YOUR_KEY>` [INFERRED — confirm exact header name with Tripjack; PDF says "API Key" header but didn't print the literal header name]
- API key generated in agent panel → `Manage User → API Configuration`.
- **IP whitelist required** [CONFIRMED]. Add the static IPs of your servers / Vercel egress IPs.
- **IPv6 NOT supported** [CONFIRMED]. Disable IPv6 on outgoing requests or you get `Access Denied`.

## Path prefixes (by service)
| Prefix | Service |
|---|---|
| `/fms/v1/` | Flight Management (search, price, ancillaries) [CONFIRMED] |
| `/oms/v1/` | Order Management (booking, amendment, refund, void) [CONFIRMED] |
| `/hms/v1/` | Hotel Management Service [INFERRED — matches Tripjack convention] |

## Known endpoints (POST in all cases)

### Flights
| Service | Path | Status |
|---|---|---|
| Flight search | `/fms/v1/air-search-all` | [INFERRED] |
| Repricing / re-validate | `/fms/v1/air-price/{priceId}` | [INFERRED] |
| Temp booking | `/oms/v1/air/temp-booking` | [INFERRED] |
| Confirm booking | `/oms/v1/air/book` | [INFERRED] |
| Booking detail | `/oms/v1/air/booking-detail` | [INFERRED] |
| Cancel | `/oms/v1/air/cancel` | [INFERRED] |
| **Post-booking — fetch SSR** (meals/baggage) | `/fms/v1/ancillaries/fetch/ssr` | [CONFIRMED] |
| **Post-booking — fetch seat map** | `/fms/v1/ancillaries/fetch/seat` | [CONFIRMED] |
| **Post-booking — add SSR** | `/oms/v1/air/amendment/add/ssr` | [CONFIRMED] |
| **Post-booking — amendment details** | `/oms/v1/air/amendment/amendment-details` | [CONFIRMED] |
| Auto void | (see "Auto Void API Documentation.pdf") | [CONFIRMED in PDF, read later] |
| Auto full refund | (see "Auto Full Refund Documentation.pdf") | [CONFIRMED in PDF, read later] |

### Hotels [INFERRED — verify with Tripjack support]
| Service | Path |
|---|---|
| Hotel search | `/hms/v1/hotel-search-all` |
| Hotel info / room rates | `/hms/v1/hotel-info` |
| Block / pre-book | `/oms/v1/hotel/temp-booking` |
| Book | `/oms/v1/hotel/book` |
| Booking details | `/oms/v1/hotel/booking-detail` |
| Cancel | `/oms/v1/hotel/cancel` |

Bipin: **call Tripjack RM after you get UAT creds** and ask for the canonical hotel + flight search endpoints. They will likely send a separate "Hotel API v2" zip — drop it in `vendor/tripjack/` and re-run the notes generator.

## Field-name convention (terse abbreviations)
Tripjack uses very short keys to minimise payload size. Cheat sheet:

| Key | Meaning |
|---|---|
| `sI`  | segmentInfo (list per segment) |
| `fD`  | flightDesignator |
| `al`  | airline (`code` = IATA, `name`, `isLcc`) |
| `fN`  | flight number |
| `eT`  | equipment type (e.g. "737") |
| `da`  | departure airport (`code`, `name`, `cityCode`, `city`, `country`, `countryCode`, `terminal`) |
| `aa`  | arrival airport (same shape) |
| `dt`  | departure time (`YYYY-MM-DDTHH:MM`) |
| `at`  | arrival time |
| `bI`  | bookingInfo |
| `tI`  | travellerInfo (list) |
| `pt`  | paxType (`ADULT` / `CHILD` / `INFANT`) |
| `ti`  | title (`Mr` / `Mrs` / ...) |
| `fN`  | firstName (in pax context) |
| `lN`  | lastName |
| `sbi` / `smi` / `ssi` | selected baggage / meal / seat info (with `code`) |
| `osi` | other SSR info |
| `bookingId` | e.g. `TGS108240068424` (T = Tripjack, GS = booking type, then numeric) |
| `priceId` / `id` (in `sI`) | repricing identifier — used between search → temp-booking |

## Flight search REQUEST body (from corporate codes PDF — minus the corporateCodes block this is the standard shape)

```json
{
  "searchQuery": {
    "cabinClass": "ECONOMY",
    "preferredAirline": [],
    "searchModifiers": {
      "pfts": ["REGULAR"],
      "isDirectFlight": false,
      "isConnectingFlight": false
    },
    "routeInfos": [
      {
        "fromCityOrAirport": { "code": "DEL" },
        "toCityOrAirport":   { "code": "DXB" },
        "travelDate": "2026-04-20"
      }
    ],
    "paxInfo": {
      "ADULT": 1,
      "CHILD": 0,
      "INFANT": 0
    }
  }
}
```

`routeInfos` accepts multiple legs (multi-city). For return trip, send 2 entries.

Optional fare-type values for `pfts` (PNR fare types): `REGULAR`, `STUDENT`, `SENIOR_CITIZEN`, `ARMED_FORCES`, `DOCTOR_AND_NURSES` [INFERRED]. Corporate fares: add `corporateCodes` array as shown in `corporate_codes_api_contract.pdf`.

## Response shape (high level, from SSR PDF)
```jsonc
{
  "tripInfos": [
    {
      "sI": [
        {
          "id": "116266",
          "fD": { "al": {...}, "fN": "8169", "eT": "737" },
          "duration": 135,
          "da": { "code": "DEL", ... },
          "aa": { "code": "BOM", ... },
          "dt": "2023-07-27T20:00",
          "at": "2023-07-27T22:15",
          "bI": { "tI": [ { ssrBaggageInfos:[], ssrMealInfos:[], ssrInfo:{}, ti:"Mr", pt:"ADULT", fN:"TEST", lN:"USER" } ] }
        }
      ]
    }
  ],
  "bookingId": "TGS108240068424",
  "status": {...},
  "conditions": { "st": 840, "sct": "2023-06-20T13:58:43.881" }
}
```

## Error handling
- HTTP 200 with embedded `status.success: false` is the Tripjack pattern (need to confirm) — don't trust HTTP status alone.
- "Access Denied" = IP not whitelisted, or IPv6 leaked out.
- Repricing returns price changes — must show "Price changed from ₹X to ₹Y" prompt to user before continuing to booking.

## Other Tripjack services discovered (from agent panel screenshot)
Tripjack's panel shows: Flights · Hotels · Tripsafe (insurance) · Cabs · Register for Train · Visa · Holidays · Cruise · Quick Links · Dashboard · T2 Rewards.
**Implication**: Tripjack alone can power 70 % of the Global Guides platform (flights, hotels, insurance, transfers/cabs, visa, holiday packages, even train) if their APIs cover those services. Confirm coverage with RM.

## Open questions for Tripjack RM (Bipin: ask these on the first call)
1. Exact header name for the API key. Is it `apikey`, `apiKey`, `X-API-KEY`, or `Authorization: Bearer`?
2. Confirm flight search endpoint path (likely `/fms/v1/air-search-all`).
3. Send full **Hotel API v2** documentation zip + sample request/response.
4. Send **Cabs, Visa, Train, Cruise, Holidays, Tripsafe** API docs if we'll use those.
5. Sandbox credentials + a list of test PNRs / hotel IDs that always return success.
6. Webhook / push notifications for booking status changes? Or polling only?
7. Rate limits (req/sec)?
8. Caching policy — how long is a quoted fare valid (ms)?
9. Markup / commission structure — does Tripjack mark up before us, or do we get net rates?
10. How is payment settled — wallet float on Tripjack side or per-booking?
