# Hotelbeds certification — Global Guides DMC

Send to apitude@hotelbeds.com when requesting certification. Fill in the
bracketed items first.

## Workflow

Global Guides DMC is a B2B platform: travel agents (our customers) build
multi-city trip proposals, send them to their end customers, and book once
the customer accepts. There is one distribution channel (the agent web app).

1. **Search — Availability (`POST /hotels`).** One call per city, by
   destination code, with every room of the booking in `occupancies`
   (identical rooms grouped; children sent as `CH` paxes with ages).
   Results are cached for 90 seconds.
2. **Booking time — Availability (`POST /hotels`), once per hotel.** A
   proposal can be accepted days after it was built, so its rateKeys are
   stale. When the agent clicks "Check live price & terms" we make ONE
   availability call for that hotel code (`hotels.hotel`), the stay dates
   and all rooms, and pick the same room and board the agent quoted.
3. **CheckRate (`POST /checkrates`)** — only for rates with
   `rateType = RECHECK`, one call covering all of that hotel's rateKeys.
4. **Review.** The agent sees the price, the cancellation fee schedule (with
   dates in hotel local time) and the rate comments, and must confirm they
   shared them with the customer. Rate comments come from CheckRate for
   RECHECK rates and from the Content API `ratecommentdetails` for BOOKABLE
   rates.
5. **Booking (`POST /bookings`)** — one call per hotel, with holder, every
   pax per room (children with ages) and our proposal code as
   `clientReference`. The response timeout is 60 seconds; bookings are
   never retried.
6. **Cancellation (`DELETE /bookings/{ref}`)** — `SIMULATION` first to show
   the fee, then `CANCELLATION` when the agent confirms.

No Availability or CheckRate call is repeated between steps 2 and 5.

## Commercial decisions

- We sell **3–5 star hotels only**. 1–2 star properties and non-star
  categories (keys, apartments) are excluded from results rather than
  relabelled.
- **Opaque rates** (`packaging = true`) are excluded.
- Rates with **`hotelMandatory = true`** are excluded. We sell net plus the
  agency's markup.
- **Source market** is not used.
- **Cancellation policies**: used and shown to the agent before booking, on
  the booking review screen, and as a free-cancellation deadline in search
  results.

## Voucher

Generated for every confirmed booking (Bookings → Voucher). It contains:

- hotel name, category, address and destination
- the Hotelbeds reference and our agency reference
- check-in and check-out dates
- lead guest, and the names in each room
- children's ages
- room type and board
- rate comments
- the "Payable through {supplier}, acting as agent for the service operating
  company… VAT: {vatNumber} Reference: {reference}" line

Prices are not shown on the voucher.

## Content

We use Hotelbeds content for images (Content API, cached 24h) and hotel
detail pages. Hotel content is our only source.

## Other suppliers

The platform also uses Tripjack (flights) and Leamigo (transfers). Hotel
product comes only from Hotelbeds. In the trip builder, live Hotelbeds hotels
have ids starting `HB-`.

## Access for the certification team

- URL: [https://… deployment URL]
- Test agent login: [create a dedicated agency user — don't send the owner account]
- Wallet: pre-credited on the test agency, so no payment step is needed.
