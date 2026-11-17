// Live Unifystays hotel booking for a proposal — server-only.
//
// PREPARE (price check): fresh room search for the stay (offer tokens last 15
// minutes, so a saved one is never reused) → the offer matching the quoted room
// and board, or the cheapest → prebook, which rechecks price and terms with the
// supplier. The prebooking is single use and dies with the signed quote.
// CONFIRM: one booking per hotel with an Idempotency-Key, then poll its status.
// Unifystays bookings aren't confirmed on the spot: PROCESSING or AWAITING_REVIEW
// stay pending (never "confirmed", never a voucher) until a later status check.

import { getRoomOffers, prebook, createBooking, bookingByIdempotencyKey, waitForBooking, isLive, type UnifyOffer, type UnifyRequirement, type UnifyStatus } from '@gg/unifystays';
import { BEST_ROOM, UNIFY_PREFIX, boardLabel, roomLabel, unifyRooms } from '@/lib/hotels/unifystays';
import type { Itinerary, Room } from '@/lib/itinerary/types';
import type { HotelQuote, GuestsInput, QuotedPolicy } from './hotelbeds';
import type { LeadContact } from './leamigo';

/** Guest fields we can answer from the booking form. An offer needing more (passport, date of birth) is skipped. */
const ANSWERABLE = new Set(['TITLE', 'FIRST_NAME', 'LAST_NAME', 'EMAIL', 'PHONE']);
const answerable = (o: UnifyOffer) => o.requirements.every((r) => !r.required || ANSWERABLE.has(r.code));

const ymd = (iso: string) => iso.slice(0, 10);
const policies = (o: UnifyOffer): QuotedPolicy[] => o.penalties
  .filter((p) => p.from && p.amountPaise !== null)
  .map((p) => ({ from: p.from, amountPaise: p.amountPaise!, amount: p.amountPaise! / 100, currency: 'INR' }));

function pick(offers: UnifyOffer[], want: { roomName: string; board: string }): { offer: UnifyOffer; same: boolean } | null {
  const usable = offers.filter(answerable);   // already cheapest first
  if (want.roomName === BEST_ROOM) return usable[0] ? { offer: usable[0], same: true } : null;
  const same = usable.find((o) => roomLabel(o) === want.roomName && boardLabel(o) === want.board);
  if (same) return { offer: same, same: true };
  const sameBoard = usable.find((o) => boardLabel(o) === want.board);
  return sameBoard ? { offer: sameBoard, same: false } : usable[0] ? { offer: usable[0], same: false } : null;
}

export async function prepareUnifyStays(it: Itinerary): Promise<{ hotels: HotelQuote[]; problems: Array<{ cityName: string; hotelName: string; reason: string }> }> {
  const out = { hotels: [] as HotelQuote[], problems: [] as Array<{ cityName: string; hotelName: string; reason: string }> };
  if (!isLive()) return out;
  await Promise.all(it.destinations.map(async (d) => {
    const h = d.stay?.hotel;
    if (!h || !h.id.startsWith(UNIFY_PREFIX)) return;
    const hotelId = h.id.slice(UNIFY_PREFIX.length);
    const checkIn = ymd(d.stay!.checkIn), checkOut = ymd(d.stay!.checkOut);
    const problem = (reason: string) => out.problems.push({ cityName: d.cityName, hotelName: h.name, reason });
    try {
      const { offers } = await getRoomOffers(hotelId, { checkIn, checkOut, rooms: unifyRooms(it.intake.rooms) });
      const chosen = pick(offers, { roomName: h.room.name, board: h.mealPlan });
      if (!chosen) return problem(offers.length ? 'Every room needs guest details we don’t collect yet (passport or date of birth). Choose another hotel.' : 'No rooms left for these dates. Choose the hotel again with Change hotel.');
      const pb = await prebook(hotelId, chosen.offer.bookingToken);
      if (pb.decision === 'NOT_BOOKABLE' || !pb.prebookingId || !pb.offer) return problem('This room just sold out. Choose the room or hotel again.');
      const o = pb.offer;
      if (!answerable(o)) return problem('This room now needs guest details we don’t collect yet (passport or date of birth). Choose another room.');
      const quoted = h.pricePerNightPaise * d.nights;
      const comments = [
        o.policyText,
        o.atPropertyPaise > 0 ? `Pay at the hotel: ₹${(o.atPropertyPaise / 100).toLocaleString('en-IN')} (taxes or fees collected by the property).` : '',
        ...o.notices,
        ...pb.changes,
      ].filter(Boolean).join('\n');
      out.hotels.push({
        supplier: 'UNIFYSTAYS',
        cityCode: d.cityCode, cityName: d.cityName, hotelId: h.id, hotelCode: 0, hotelName: h.name, address: h.address,
        checkIn, checkOut,
        rates: [{
          rateKey: o.offerId, rateType: 'BOOKABLE', roomName: roomLabel(o), board: boardLabel(o),
          rooms: o.rooms.length, adults: o.rooms.reduce((s, r) => s + r.adults, 0), childAges: o.rooms.flatMap((r) => r.childAges),
          roomIndexes: o.rooms.map((_, i) => i), netAmount: o.payablePaise / 100, currency: 'INR', netPaise: o.payablePaise,
          cancellationPolicies: policies(o), rateComments: comments || undefined, promotions: o.promotions,
        }],
        netPaise: o.payablePaise, quotedPaise: quoted,
        priceChangePct: quoted > 0 ? Math.round(((o.payablePaise - quoted) / quoted) * 1000) / 10 : 0,
        sameRoomAndBoard: chosen.same && pb.decision === 'READY_TO_BOOK',
        unify: {
          hotelId, prebookingId: pb.prebookingId, offerId: o.offerId, expiresAt: o.expiresAt,
          rooms: o.rooms.map((r) => ({ allocationId: r.allocationId, adults: r.adults, childAges: r.childAges })),
          requirements: o.requirements, provider: o.provider,
        },
      });
    } catch (e: any) {
      problem(`${e?.message ?? 'Unifystays could not price this hotel.'} Try the price check again, or choose another hotel.`);
    }
  }));
  const order = it.destinations.map((d) => d.cityCode);
  out.hotels.sort((a, b) => order.indexOf(a.cityCode) - order.indexOf(b.cityCode));
  return out;
}

// ── Confirm ──────────────────────────────────────────────────────────────────

export interface SupplierUnifyBooking {
  supplier: 'UNIFYSTAYS';
  /** PENDING: sent, the supplier hasn't confirmed yet (or it awaits approval in the Unifystays portal). */
  status: 'CONFIRMED' | 'PENDING' | 'FAILED' | 'CANCELLED';
  cityName: string; hotelId: string; hotelName: string; address: string; checkIn: string; checkOut: string;
  netPaise: number;
  reference?: string;              // Unifystays booking_id (ubk_…): the key for status and cancellation
  idempotencyKey: string;
  unifyStatus?: string;
  providerReference?: string;
  hotelConfirmationNumber?: string;
  hotelPhone?: string;
  roomName: string; board: string;
  guests: string[];
  leadGuest: string;
  conditions?: string;
  error?: string;
  cancellation?: { at: string; feePaise: number; refundPaise: number };
}

const clean = (s: string) => s.replace(/[^\p{L}\p{M}' .-]/gu, '').replace(/\s+/g, ' ').trim();
const TITLE: Record<LeadContact['salutation'], string> = { Mr: 'MR', Mrs: 'MRS', Ms: 'MS', Miss: 'MISS', Dr: 'DR' };

/** Answers for one guest, from the requirements that apply to them. */
function answersFor(reqs: UnifyRequirement[], g: { lead: boolean; type: 'ADULT' | 'CHILD' | 'INFANT'; first: string; last: string; allocationId: string }, contact: LeadContact) {
  const applies = (r: UnifyRequirement) => (!r.roomAllocationIds.length || r.roomAllocationIds.includes(g.allocationId)) && (
    r.scope === 'ALL_GUESTS' || (r.scope === 'LEAD_GUEST' && g.lead) || r.scope === g.type);
  return reqs.filter(applies).flatMap((r) => {
    const value =
      r.code === 'FIRST_NAME' ? g.first :
      r.code === 'LAST_NAME' ? g.last :
      r.code === 'EMAIL' ? contact.email.trim() :
      r.code === 'PHONE' ? contact.phone.replace(/[\s-]/g, '') :
      r.code === 'TITLE' ? (() => {
        // The lead's title comes from the form; for others we don't know it, so use the neutral option when offered.
        const want = g.lead ? TITLE[contact.salutation] : 'OTHER';
        return r.allowedValues.includes(want) ? want : r.allowedValues.includes('OTHER') ? 'OTHER' : r.allowedValues[0] ?? want;
      })() : '';
    return value ? [{ requirementId: r.requirementId, value }] : [];
  });
}

export async function bookUnifyStays(args: { hotels: HotelQuote[]; guests: GuestsInput; contact: LeadContact; rooms: Room[]; clientReference: string; endUserIp?: string }): Promise<SupplierUnifyBooking[]> {
  return Promise.all(args.hotels.map(async (hq): Promise<SupplierUnifyBooking> => {
    const u = hq.unify!;
    // Deterministic, so a retry of the same confirm reuses it instead of booking twice.
    const idempotencyKey = `${args.clientReference}-${u.hotelId}-${u.offerId}`.slice(0, 128);
    const people = u.rooms.map((room, ri) => {
      const g = args.guests.rooms[ri]!;
      return [
        ...g.adults.map((p, i) => ({ type: 'ADULT' as const, lead: ri === 0 && i === 0, first: clean(p.name), last: clean(p.surname) })),
        ...g.children.map((p, i) => ({ type: (room.childAges[i] ?? 8) <= 1 ? 'INFANT' as const : 'CHILD' as const, lead: false, first: clean(p.name), last: clean(p.surname) })),
      ].map((x) => ({ ...x, allocationId: room.allocationId }));
    });
    const base = {
      supplier: 'UNIFYSTAYS' as const, cityName: hq.cityName, hotelId: hq.hotelId, hotelName: hq.hotelName, address: hq.address,
      checkIn: hq.checkIn, checkOut: hq.checkOut, netPaise: hq.netPaise, idempotencyKey,
      roomName: hq.rates[0]?.roomName ?? '', board: hq.rates[0]?.board ?? '',
      guests: people.flat().map((p) => `${p.first} ${p.last}`), leadGuest: `${people[0]?.[0]?.first ?? ''} ${people[0]?.[0]?.last ?? ''}`.trim(),
      conditions: hq.rates[0]?.rateComments,
    };
    try {
      let s: UnifyStatus | null;
      try {
        s = await createBooking({
          idempotencyKey, prebookingId: u.prebookingId, offerId: u.offerId, endUserIp: args.endUserIp,
          rooms: people.map((ps, ri) => ({ allocationId: u.rooms[ri]!.allocationId, guests: ps.map((p) => ({ type: p.type, lead: p.lead, answers: answersFor(u.requirements, p, args.contact) })) })),
        });
      } catch (e: any) {
        // The answer was lost (timeout, network): the booking may exist. Look it up by key, never book again.
        if (e?.code !== 'NETWORK') throw e;
        s = await bookingByIdempotencyKey(idempotencyKey);
        if (!s) throw e;
      }
      if (!s.isTerminal && s.status === 'PROCESSING') s = await waitForBooking(s.bookingId, Date.now() + 40_000).catch(() => s);
      return {
        ...base, ...statusFields(s!),
        error: s!.status === 'FAILED' ? s!.message ?? 'The supplier did not confirm the booking.' : s!.status === 'AWAITING_REVIEW' ? 'Waiting for approval in the Unifystays portal. The room and price are not reserved yet.' : undefined,
      };
    } catch (e: any) {
      return { ...base, status: 'FAILED', error: e?.message ?? 'Booking failed.' };
    }
  }));
}

/** Our status from theirs. Only CONFIRMED is confirmed; anything still moving is pending. */
export function statusFields(s: UnifyStatus): Pick<SupplierUnifyBooking, 'status' | 'reference' | 'unifyStatus' | 'providerReference' | 'hotelConfirmationNumber' | 'hotelPhone'> {
  return {
    status: s.status === 'CONFIRMED' ? 'CONFIRMED' : s.status === 'FAILED' ? 'FAILED' : s.status === 'CANCELLED' ? 'CANCELLED' : 'PENDING',
    reference: s.bookingId || undefined, unifyStatus: s.status,
    providerReference: s.providerReference ?? undefined, hotelConfirmationNumber: s.hotelConfirmationNumber ?? undefined, hotelPhone: s.hotelPhone ?? undefined,
  };
}
