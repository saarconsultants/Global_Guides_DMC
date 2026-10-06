// Live Hotelbeds hotel booking for a proposal — server-only.
//
// Workflow per hotel (matches Hotelbeds certification §2):
//   1. PREPARE — ONE availability call for that hotel code, stay dates and
//      every room of the booking (children with ages). The proposal may be days
//      old, so its original rateKeys are stale; this is a fresh search session,
//      not a repeat. Pick the same room + board the agent quoted.
//      CheckRate only for rateType=RECHECK (one call for all of them).
//      Rate comments + cancellation policies returned for the agent to review.
//   2. CONFIRM — one /bookings call per hotel with the rateKeys from step 1.
//      No availability or CheckRate in between.
//
// The quote travels to the browser and back HMAC-signed, so the confirm step
// books exactly what was reviewed — a tampered or expired quote is refused.

import type { TransferQuote } from './leamigo';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  searchHotels, checkRates, getRateComments, createBooking, buildOccupancies, childAgesFor,
  isLive, type HotelbedsBooking, type HotelbedsRoomOption,
} from '@gg/hotelbeds';
import type { Itinerary, Room } from '@/lib/itinerary/types';

/** Largest supplier price rise we accept silently vs the quoted proposal. */
export const PRICE_TOLERANCE_PCT = 2;
const QUOTE_TTL_MS = 20 * 60_000;

export interface QuotedPolicy { from: string; amountPaise: number; amount: number; currency: string }

export interface QuotedRate {
  rateKey: string;
  rateType: 'BOOKABLE' | 'RECHECK';
  roomName: string;
  board: string;
  rooms: number;
  adults: number;
  childAges: number[];
  roomIndexes: number[];       // which intake rooms this rate covers (0-based)
  netAmount: number;
  currency: string;
  netPaise: number;
  cancellationPolicies: QuotedPolicy[];
  rateComments?: string;
}

export interface HotelQuote {
  cityCode: string;
  cityName: string;
  hotelId: string;             // HB-12345
  hotelCode: number;
  hotelName: string;
  address: string;
  checkIn: string;             // YYYY-MM-DD
  checkOut: string;
  rates: QuotedRate[];
  netPaise: number;
  quotedPaise: number;         // what the proposal priced this stay at
  priceChangePct: number;
  sameRoomAndBoard: boolean;
}

export interface PrepareResult {
  hotels: HotelQuote[];
  /** Stays we can't book through Hotelbeds (non-live hotel) — handled by ops. */
  manual: Array<{ cityName: string; hotelName: string; reason: string }>;
  problems: Array<{ cityName: string; hotelName: string; reason: string }>;
  token?: string;
  expiresAt?: string;
}

// ── Signing ──────────────────────────────────────────────────────────────────

function secret(): string {
  return process.env.SESSION_PASSWORD ?? 'dev-only-please-change-min-32-chars-long-secret';
}
function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}
export function signQuote(proposalId: string, hotels: HotelQuote[], transfers: TransferQuote[] = []): { token: string; expiresAt: string } {
  // A Leamigo prebooking can expire before our 20 minutes — the quote dies with it.
  const ends = [Date.now() + QUOTE_TTL_MS, ...transfers.map((t) => Date.parse(t.prebookExpiresAt)).filter(Number.isFinite)];
  const expiresAt = new Date(Math.min(...ends)).toISOString();
  const payload = Buffer.from(JSON.stringify({ proposalId, expiresAt, hotels, transfers })).toString('base64url');
  return { token: `${payload}.${sign(payload)}`, expiresAt };
}
export function verifyQuote(token: string, proposalId: string): { ok: true; hotels: HotelQuote[]; transfers: TransferQuote[] } | { ok: false; error: string } {
  const [payload, mac] = String(token ?? '').split('.');
  if (!payload || !mac) return { ok: false, error: 'Missing price check. Run "Check live price" again.' };
  const expected = sign(payload);
  const a = Buffer.from(mac), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, error: 'This price check was altered. Run it again.' };
  let data: { proposalId: string; expiresAt: string; hotels: HotelQuote[]; transfers?: TransferQuote[] };
  try { data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')); } catch { return { ok: false, error: 'Unreadable price check.' }; }
  if (data.proposalId !== proposalId) return { ok: false, error: 'Price check belongs to another proposal.' };
  if (Date.parse(data.expiresAt) < Date.now()) return { ok: false, error: 'The live price has expired. Check the price again before booking.' };
  return { ok: true, hotels: data.hotels, transfers: data.transfers ?? [] };
}

// ── Prepare ──────────────────────────────────────────────────────────────────

const ymd = (iso: string) => iso.slice(0, 10);

/** Which intake rooms fall into each Hotelbeds occupancy group (same order as buildOccupancies). */
function groupRooms(rooms: Room[]): Array<{ adults: number; childAges: number[]; roomIndexes: number[] }> {
  const groups = new Map<string, { adults: number; childAges: number[]; roomIndexes: number[] }>();
  rooms.forEach((r, i) => {
    const ages = childAgesFor(r);
    const key = `${r.adults}|${ages.join(',')}`;
    const g = groups.get(key);
    if (g) g.roomIndexes.push(i); else groups.set(key, { adults: r.adults, childAges: ages, roomIndexes: [i] });
  });
  return [...groups.values()];
}

function pickRate(options: HotelbedsRoomOption[], group: { adults: number; childAges: number[]; roomIndexes: number[] }, want: { roomName: string; board: string }) {
  const fits = options.filter((o) =>
    !!o.rateKey &&
    (o.adults === undefined || o.adults === group.adults) &&
    (o.children === undefined || o.children === group.childAges.length) &&
    (o.rooms === undefined || o.rooms === group.roomIndexes.length));
  const byPrice = (xs: HotelbedsRoomOption[]) => [...xs].sort((a, b) => a.totalPaise - b.totalPaise)[0];
  const same = byPrice(fits.filter((o) => o.roomName === want.roomName && o.board === want.board));
  if (same) return { option: same, same: true };
  const sameBoard = byPrice(fits.filter((o) => o.board === want.board));
  if (sameBoard) return { option: sameBoard, same: false };
  const any = byPrice(fits);
  return any ? { option: any, same: false } : null;
}

export async function prepareHotelBookings(it: Itinerary): Promise<Omit<PrepareResult, 'token' | 'expiresAt'>> {
  const out: Omit<PrepareResult, 'token' | 'expiresAt'> = { hotels: [], manual: [], problems: [] };
  const rooms = it.intake.rooms;
  const groups = groupRooms(rooms);

  await Promise.all(it.destinations.map(async (d) => {
    const stay = d.stay;
    if (!stay) return;
    const h = stay.hotel;
    if (!h.id.startsWith('HB-')) {
      out.manual.push({ cityName: d.cityName, hotelName: h.name, reason: 'Not a live Hotelbeds rate — booked by operations.' });
      return;
    }
    if (!isLive('hotels')) {
      out.manual.push({ cityName: d.cityName, hotelName: h.name, reason: 'Hotelbeds keys not set — booked by operations.' });
      return;
    }
    const hotelCode = parseInt(h.id.slice(3), 10);
    const checkIn = ymd(stay.checkIn), checkOut = ymd(stay.checkOut);
    try {
      const res = await searchHotels({ cityCode: d.cityCode, checkIn, checkOut, rooms, hotelCodes: [hotelCode] });
      const hotel = res.hotels.find((x) => x.id === h.id) ?? res.hotels[0];
      const options = hotel?.roomOptions ?? [];
      if (!hotel || options.length === 0) {
        out.problems.push({ cityName: d.cityName, hotelName: h.name, reason: 'No longer available for these dates and rooms. Change the hotel in the builder.' });
        return;
      }

      const picked: Array<{ group: (typeof groups)[number]; option: HotelbedsRoomOption; same: boolean }> = [];
      for (const g of groups) {
        const p = pickRate(options, g, { roomName: h.room.name, board: h.mealPlan });
        if (!p) { out.problems.push({ cityName: d.cityName, hotelName: h.name, reason: `No room available for ${g.adults} adult${g.adults !== 1 ? 's' : ''}${g.childAges.length ? ` + ${g.childAges.length} child` : ''}.` }); return; }
        picked.push({ group: g, ...p });
      }

      // CheckRate — only RECHECK rates, one call for all of them.
      const recheck = picked.filter((p) => p.option.rateType === 'RECHECK').map((p) => p.option.rateKey!);
      const checked = recheck.length ? await checkRates(recheck) : [];

      const rates: QuotedRate[] = [];
      for (const p of picked) {
        const o = p.option;
        let rateKey = o.rateKey!, netAmount = o.netAmount ?? 0, netPaise = o.totalPaise, currency = o.currency ?? 'EUR';
        let policies: QuotedPolicy[] = (o.cancellationPolicies ?? []).map((c) => ({ ...c }));
        let rateComments: string | undefined;
        if (o.rateType === 'RECHECK') {
          const c = checked.find((x) => x.rateKey === o.rateKey) ?? checked[recheck.indexOf(o.rateKey!)];
          if (!c) throw new Error('Hotelbeds did not re-confirm the rate.');
          rateKey = c.rateKey; netAmount = c.netAmount; netPaise = c.netPaise; currency = c.currency;
          policies = c.cancellationPolicies; rateComments = c.rateComments;
        } else if (o.rateCommentsId) {
          rateComments = await getRateComments(o.rateCommentsId, checkIn).catch(() => undefined);
        }
        rates.push({
          rateKey, rateType: o.rateType ?? 'BOOKABLE', roomName: o.roomName, board: o.board,
          rooms: p.group.roomIndexes.length, adults: p.group.adults, childAges: p.group.childAges, roomIndexes: p.group.roomIndexes,
          netAmount, currency, netPaise, cancellationPolicies: policies, rateComments,
        });
      }

      const netTotal = rates.reduce((s, r) => s + r.netPaise, 0);
      const quoted = h.pricePerNightPaise * d.nights;
      out.hotels.push({
        cityCode: d.cityCode, cityName: d.cityName, hotelId: h.id, hotelCode, hotelName: hotel.name, address: h.address,
        checkIn, checkOut, rates, netPaise: netTotal, quotedPaise: quoted,
        priceChangePct: quoted > 0 ? Math.round(((netTotal - quoted) / quoted) * 1000) / 10 : 0,
        sameRoomAndBoard: picked.every((p) => p.same),
      });
    } catch (e: any) {
      out.problems.push({ cityName: d.cityName, hotelName: h.name, reason: e?.userMessage ?? e?.message ?? 'Hotelbeds price check failed.' });
    }
  }));

  // Keep trip order.
  const order = it.destinations.map((d) => d.cityCode);
  out.hotels.sort((a, b) => order.indexOf(a.cityCode) - order.indexOf(b.cityCode));
  return out;
}

// ── Confirm ──────────────────────────────────────────────────────────────────

export interface GuestName { name: string; surname: string }
export interface RoomGuests { adults: GuestName[]; children: GuestName[] }
export interface GuestsInput { rooms: RoomGuests[] }

export interface SupplierHotelBooking {
  supplier: 'HOTELBEDS';
  status: 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  cityName: string;
  hotelId: string;
  hotelName: string;
  address: string;
  checkIn: string;
  checkOut: string;
  netPaise: number;            // what we paid Hotelbeds, INR at booking time
  reference?: string;          // Hotelbeds booking reference
  booking?: HotelbedsBooking;  // full confirmation (voucher source)
  error?: string;
  cancellation?: { at: string; feePaise: number; refundPaise: number; reference?: string };
}

const clean = (s: string) => s.replace(/[^\p{L}\p{M}' .-]/gu, '').replace(/\s+/g, ' ').trim();

/** Validate names: every adult and child needs a first and last name, letters only. */
export function validateGuests(g: GuestsInput, rooms: Room[]): string | null {
  if (!g?.rooms || g.rooms.length !== rooms.length) return 'Enter guest names for every room.';
  for (let i = 0; i < rooms.length; i++) {
    const r = g.rooms[i]!, want = rooms[i]!;
    if ((r.adults?.length ?? 0) !== want.adults || (r.children?.length ?? 0) !== (want.children ?? 0)) return `Room ${i + 1}: guest count doesn't match the trip.`;
    for (const p of [...r.adults, ...r.children]) if (!clean(p.name ?? '') || !clean(p.surname ?? '')) return `Room ${i + 1}: every guest needs a first and last name.`;
  }
  return null;
}

export async function bookHotels(args: { hotels: HotelQuote[]; guests: GuestsInput; rooms: Room[]; clientReference: string }): Promise<SupplierHotelBooking[]> {
  const lead = args.guests.rooms[0]!.adults[0]!;
  const holder = { name: clean(lead.name), surname: clean(lead.surname) };

  return Promise.all(args.hotels.map(async (hq): Promise<SupplierHotelBooking> => {
    const base = { supplier: 'HOTELBEDS' as const, cityName: hq.cityName, hotelId: hq.hotelId, hotelName: hq.hotelName, address: hq.address, checkIn: hq.checkIn, checkOut: hq.checkOut, netPaise: hq.netPaise };
    try {
      const booking = await createBooking({
        holder,
        clientReference: args.clientReference,
        rooms: hq.rates.map((rate) => ({
          rateKey: rate.rateKey,
          paxes: rate.roomIndexes.flatMap((roomIdx, n) => {
            const g = args.guests.rooms[roomIdx]!;
            const ages = childAgesFor(args.rooms[roomIdx]!);
            return [
              ...g.adults.map((p) => ({ roomId: n + 1, type: 'AD' as const, name: clean(p.name), surname: clean(p.surname) })),
              ...g.children.map((p, c) => ({ roomId: n + 1, type: 'CH' as const, name: clean(p.name), surname: clean(p.surname), age: ages[c]! })),
            ];
          }),
        })),
      });
      return { ...base, status: 'CONFIRMED', reference: booking.reference, booking };
    } catch (e: any) {
      return { ...base, status: 'FAILED', error: e?.message ?? 'Booking failed.' };
    }
  }));
}

export { buildOccupancies };
