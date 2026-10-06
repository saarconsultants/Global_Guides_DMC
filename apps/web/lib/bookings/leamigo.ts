// Leamigo booking for a proposal: transfers, hourly rentals and activities.
// Server-only.
//
// Search tokens live minutes; proposals live days. So at booking time:
//   • transfers / rentals are re-searched (same place, date, time, party),
//     matched to the same provider + vehicle, then prebooked (price frozen);
//   • activities get an availability check for the day; the reserve (which
//     needs the guest's contact) happens at confirm, immediately before booking.

import {
  searchTransfers, prebookTransfer, createTransferBooking,
  searchRentals, prebookRental, createRentalBooking,
  activityAvailability, reserveActivity, bookActivity, activityBookingDetails, inrRatesFor,
  type LeamigoTransfer, type LeamigoRental,
} from '@gg/leamigo';
import type { Itinerary, Transfer, Activity } from '@/lib/itinerary/types';

export type LeamigoProduct = 'transfer' | 'rental' | 'activity';
type Rules = Array<{ hoursBefore: number; chargePct: number }>;

export interface TransferQuote {
  product: LeamigoProduct;
  key: string;                 // transfer/rental `${dayNo}:${inclusionIndex}`, activity `${dayNo}:${slot}`
  dayNo: number;
  kind: Transfer['kind'] | 'activity';
  fromName: string;            // activity: its title
  toName: string;              // activity: option name
  pickupDate: string;          // activity: visit date
  pickupTime: string;          // activity: '' (date-only products)
  passengers: number;
  vehicleName: string;         // activity: `${quantity} × ticket`
  provider: string;
  prebookingId: string;        // activity: '' until reserved at confirm
  prebookExpiresAt: string;    // activity: '' (no hold yet)
  netPaise: number;
  quotedPaise: number;
  priceChangePct: number;
  sameVehicle: boolean;
  freeCancellation: boolean;
  cancellationRules: Rules;
  cancellationText: string;
  activity?: { activityId: number; optionId: number; ticketId: string; quantity: number; openDated: boolean };
}

export interface SupplierTransferBooking {
  supplier: 'LEAMIGO';
  product?: LeamigoProduct;    // absent on bookings made before rentals/activities = 'transfer'
  status: 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  key: string;
  fromName: string;
  toName: string;
  pickupDate: string;
  pickupTime: string;
  vehicleName: string;
  provider: string;
  netPaise: number;
  platformFeePaise?: number;   // activities: Leamigo fee, known only after booking
  reference?: string;
  bookingId?: string;
  voucherUrl?: string;
  supplierContact?: { email?: string; emergency?: string; contact247?: string };
  cancellationRules?: Rules;
  error?: string;
  cancellation?: { at: string; feePaise: number; refundPaise: number };
}

export interface LeadContact { salutation: 'Mr' | 'Mrs' | 'Ms' | 'Miss' | 'Dr'; firstName: string; lastName: string; email: string; phone: string; flightNumber?: string }

export const productOf = (b: { product?: LeamigoProduct }): LeamigoProduct => b.product ?? 'transfer';

type Item =
  | { product: 'transfer' | 'rental'; key: string; dayNo: number; t: Transfer }
  | { product: 'activity'; key: string; dayNo: number; date: string; a: Activity };

/** Every live Leamigo item saved in the itinerary, with its position. */
export function leamigoLegs(it: Itinerary): Item[] {
  const out: Item[] = [];
  for (const d of it.days ?? []) {
    (d.inclusions ?? []).forEach((inc, i) => {
      if (inc.kind !== 'transfer') return;
      if (inc.transfer.id.startsWith('LM-')) out.push({ product: 'transfer', key: `${d.dayNo}:${i}`, dayNo: d.dayNo, t: inc.transfer });
      else if (inc.transfer.id.startsWith('LMR-')) out.push({ product: 'rental', key: `${d.dayNo}:${i}`, dayNo: d.dayNo, t: inc.transfer });
    });
    for (const slot of ['morning', 'afternoon', 'evening'] as const) {
      const a = d[slot];
      if (a?.id.startsWith('LMA-')) out.push({ product: 'activity', key: `${d.dayNo}:${slot}`, dayNo: d.dayNo, date: d.date, a });
    }
  }
  return out;
}

const cheapest = <T extends { pricePaise: number }>(xs: T[]) => [...xs].sort((a, b) => a.pricePaise - b.pricePaise)[0];

function pickRide(options: LeamigoTransfer[], want: NonNullable<Transfer['leamigo']>) {
  const same = cheapest(options.filter((o) => o.providerId === want.providerId && o.vehicleName === want.vehicleName));
  if (same) return { ride: same, same: true };
  const sameClass = cheapest(options.filter((o) => o.shared === want.shared && o.luxury === want.luxury && o.maxPax >= want.passengers));
  return sameClass ? { ride: sameClass, same: false } : null;
}

function pickRental(options: LeamigoRental[], want: NonNullable<Transfer['leamigoRental']>) {
  const same = cheapest(options.filter((o) => o.providerId === want.providerId && o.vehicleName === want.vehicleName));
  if (same) return { r: same, same: true };
  const any = cheapest(options.filter((o) => !o.maxPax || o.maxPax >= want.passengers));
  return any ? { r: any, same: false } : null;
}

const pct = (now: number, was: number) => (was > 0 ? Math.round(((now - was) / was) * 1000) / 10 : 0);

export async function prepareTransfers(it: Itinerary): Promise<{ transfers: TransferQuote[]; problems: Array<{ label: string; reason: string }> }> {
  const transfers: TransferQuote[] = [], problems: Array<{ label: string; reason: string }> = [];
  await Promise.all(leamigoLegs(it).map(async (item) => {
    const label = item.product === 'activity' ? item.a.name : item.product === 'rental' ? `Car with driver · ${item.t.fromName}` : `${item.t.fromName} → ${item.t.toName}`;
    try {
      const q = item.product === 'activity' ? await quoteActivity(item.a, item.key, item.dayNo, item.date)
        : item.product === 'rental' ? await quoteRental(item.t, item.key, item.dayNo)
        : await quoteTransfer(item.t, item.key, item.dayNo);
      if (typeof q === 'string') problems.push({ label, reason: q }); else transfers.push(q);
    } catch (e: any) {
      problems.push({ label, reason: e?.message ?? 'Leamigo price check failed.' });
    }
  }));
  transfers.sort((a, b) => a.dayNo - b.dayNo || a.key.localeCompare(b.key));
  return { transfers, problems };
}

async function quoteTransfer(t: Transfer, key: string, dayNo: number): Promise<TransferQuote | string> {
  const leg = t.leamigo;
  if (!leg) return 'Saved before live booking was available. Re-pick this transfer in the builder.';
  const res = await searchTransfers({ pickup: leg.from, destination: leg.to, passengers: leg.passengers, pickupDate: leg.pickupDate, pickupTime: leg.pickupTime });
  const m = pickRide(res.transfers, leg);
  if (!m) return 'No longer available for this date and time. Change the transfer in the builder.';
  const pre = await prebookTransfer(m.ride.searchId, m.ride.bookingToken);
  if (!pre.rideAvailable) return 'The supplier could not hold this ride. Try again or change the transfer.';
  const net = pre.pricePaise ?? m.ride.pricePaise;
  const rules = m.ride.cancellation.rules;
  return {
    product: 'transfer', key, dayNo, kind: t.kind, fromName: t.fromName, toName: t.toName,
    pickupDate: pre.pickupDate || leg.pickupDate, pickupTime: (pre.pickupTime || leg.pickupTime).slice(0, 5), passengers: leg.passengers,
    vehicleName: m.ride.vehicleName, provider: m.ride.provider,
    prebookingId: pre.prebookingId, prebookExpiresAt: pre.expiresAt,
    netPaise: net, quotedPaise: t.pricePaise, priceChangePct: pct(net, t.pricePaise), sameVehicle: m.same,
    freeCancellation: m.ride.flags.freeCancellation, cancellationRules: rules,
    cancellationText: rules.length ? describeRules(rules) : (m.ride.cancellation.description || 'Non-refundable.'),
  };
}

async function quoteRental(t: Transfer, key: string, dayNo: number): Promise<TransferQuote | string> {
  const leg = t.leamigoRental;
  if (!leg) return 'Missing rental details. Re-add the car with driver in the builder.';
  const res = await searchRentals({ pickup: leg.pickup, pickupDate: leg.pickupDate, pickupTime: leg.pickupTime, hours: leg.hours, passengers: leg.passengers });
  const m = pickRental(res.rentals, leg);
  if (!m) return 'No car with driver available for this time any more. Change it in the builder.';
  const pre = await prebookRental(m.r.searchId, m.r.bookingToken);
  const net = pre.pricePaise ?? m.r.pricePaise;
  const rules = m.r.cancellation.rules;
  return {
    product: 'rental', key, dayNo, kind: 'rental', fromName: t.fromName, toName: `${m.r.hours} hours at disposal`,
    pickupDate: leg.pickupDate, pickupTime: leg.pickupTime, passengers: leg.passengers,
    vehicleName: m.r.vehicleName, provider: m.r.provider,
    prebookingId: pre.prebookingId, prebookExpiresAt: pre.expiresAt,
    netPaise: net, quotedPaise: t.pricePaise, priceChangePct: pct(net, t.pricePaise), sameVehicle: m.same,
    freeCancellation: m.r.freeCancellation, cancellationRules: rules,
    cancellationText: rules.length ? describeRules(rules) : (m.r.cancellation.description || 'Non-refundable.'),
  };
}

async function quoteActivity(a: Activity, key: string, dayNo: number, date: string): Promise<TransferQuote | string> {
  const lm = a.leamigo;
  if (!lm) return 'Missing activity details. Re-add it in the builder.';
  if (!lm.openDated) {
    const av = await activityAvailability(lm.activityId, lm.optionId, date);
    if (!av.available) return `Sold out on ${date}. Pick another day or activity.`;
    if (av.capacity !== null && av.capacity < lm.quantity) return `Only ${av.capacity} places left on ${date}.`;
    const perGuest = av.requiredFields.filter((f) => f.required && f.level === 'ALL_CUSTOMER' && !['NAME', 'FULL_NAME'].includes(f.id.toUpperCase()));
    if (perGuest.length) return `The supplier needs per-guest details (${perGuest.map((f) => f.id).join(', ')}). Our team will book this one.`;
  }
  return {
    product: 'activity', key, dayNo, kind: 'activity', fromName: a.name, toName: a.description?.split(' · ')[0] ?? '',
    pickupDate: date, pickupTime: '', passengers: lm.quantity,
    vehicleName: `${lm.quantity} ticket${lm.quantity !== 1 ? 's' : ''}`, provider: 'Leamigo',
    prebookingId: '', prebookExpiresAt: '',
    // The exact supplier total is restated when the place is reserved at confirm.
    netPaise: a.pricePaise, quotedPaise: a.pricePaise, priceChangePct: 0, sameVehicle: true,
    freeCancellation: lm.freeCancellation, cancellationRules: lm.cancellationRules,
    cancellationText: lm.cancellationRules.length ? describeRules(lm.cancellationRules, 'the activity') : 'Non-refundable.',
    activity: { activityId: lm.activityId, optionId: lm.optionId, ticketId: lm.ticketId, quantity: lm.quantity, openDated: lm.openDated },
  };
}

export function describeRules(rules: Rules, what = 'pickup'): string {
  if (!rules.length || rules.every((r) => r.chargePct >= 100)) return 'Non-refundable.';
  return [...rules].sort((a, b) => b.hoursBefore - a.hoursBefore)
    .map((r) => r.hoursBefore > 0 ? `${r.chargePct}% charge if cancelled ${r.hoursBefore}h+ before ${what}` : `${r.chargePct}% charge inside that`)
    .join('; ') + '.';
}

/** E.164-ish: + then 8–15 digits. */
export function validateContact(c: LeadContact | undefined): string | null {
  if (!c) return 'Enter the lead passenger contact.';
  if (!c.firstName?.trim() || !c.lastName?.trim()) return 'Enter the lead passenger first and last name.';
  if (!/^\S+@\S+\.\S+$/.test(c.email ?? '')) return 'Enter a valid email for the supplier to contact.';
  if (!/^\+\d{8,15}$/.test((c.phone ?? '').replace(/[\s-]/g, ''))) return 'Enter the mobile number with country code, e.g. +919876543210.';
  return null;
}

// ITU zones: +1 and +7 are one digit; these are two; every other code is three.
const TWO_DIGIT = new Set('20 27 30 31 32 33 34 36 39 40 41 43 44 45 46 47 48 49 51 52 53 54 55 56 57 58 60 61 62 63 64 65 66 81 82 84 86 90 91 92 93 94 95 98'.split(' '));
export function splitPhone(e164: string): { prefix: string; number: string } {
  const d = e164.replace(/[^\d]/g, '');
  const n = d[0] === '1' || d[0] === '7' ? 1 : TWO_DIGIT.has(d.slice(0, 2)) ? 2 : 3;
  return { prefix: `+${d.slice(0, n)}`, number: d.slice(n) };
}

export async function bookTransfers(args: { transfers: TransferQuote[]; contact: LeadContact; clientReference: string; guestNames?: string[] }): Promise<SupplierTransferBooking[]> {
  const c = args.contact;
  const phone = c.phone.replace(/[\s-]/g, '');
  const person = { salutation: c.salutation, firstName: c.firstName.trim(), lastName: c.lastName.trim(), email: c.email.trim(), phone };
  return Promise.all(args.transfers.map(async (q): Promise<SupplierTransferBooking> => {
    const base = {
      supplier: 'LEAMIGO' as const, product: q.product, key: q.key, fromName: q.fromName, toName: q.toName,
      pickupDate: q.pickupDate, pickupTime: q.pickupTime, vehicleName: q.vehicleName, provider: q.provider,
      netPaise: q.netPaise, cancellationRules: q.cancellationRules,
    };
    const agentRef = `${args.clientReference}-${q.key}`;
    try {
      if (q.product === 'rental') {
        const b = await createRentalBooking({ prebookingId: q.prebookingId, ...person, agentRef });
        return { ...base, status: 'CONFIRMED', reference: b.reference, bookingId: b.bookingId };
      }
      if (q.product === 'activity') return await bookOneActivity(q, base, c, phone, agentRef, args.guestNames ?? []);
      const b = await createTransferBooking({
        prebookingId: q.prebookingId, ...person,
        flightNumber: q.kind === 'arrival' || q.kind === 'departure' ? c.flightNumber?.trim() || undefined : undefined,
        agentRef,
      });
      return { ...base, status: 'CONFIRMED', reference: b.reference, bookingId: b.bookingId, supplierContact: b.supplierContact };
    } catch (e: any) {
      return { ...base, status: 'FAILED', error: e?.message ?? 'Leamigo booking failed.' };
    }
  }));
}

const ACTIVITY_PRICE_TOLERANCE_PCT = 2;

async function bookOneActivity(q: TransferQuote, base: Omit<SupplierTransferBooking, 'status'>, c: LeadContact, phone: string, agentRef: string, guestNames: string[]): Promise<SupplierTransferBooking> {
  const a = q.activity!;
  const lead = `${c.firstName.trim()} ${c.lastName.trim()}`;
  const names = Array.from({ length: a.quantity }, (_, i) => (i === 0 ? lead : guestNames[i] || lead));
  const { prefix, number } = splitPhone(phone);
  const hold = await reserveActivity({
    activityId: a.activityId, optionId: a.optionId, ticketId: a.ticketId, quantity: a.quantity,
    visitDate: a.openDated ? undefined : q.pickupDate,
    leadName: lead, email: c.email.trim(), phonePrefix: prefix, phoneNumber: number,
    guestNames: names, partnerReference: agentRef,
  });
  // The reserve restates the supplier total. A rise beyond tolerance is not
  // booked (the hold simply lapses) — the agent re-quotes instead.
  const fx = await inrRatesFor();
  const nowPaise = fx(hold.totalMinor, hold.currency);
  if (nowPaise !== null && pct(nowPaise, q.netPaise) > ACTIVITY_PRICE_TOLERANCE_PCT) {
    return { ...base, status: 'FAILED', error: `Supplier price rose ${pct(nowPaise, q.netPaise)}% at booking time — not booked. Re-quote this activity.` };
  }
  const b = await bookActivity(hold.prebookingId);
  const det = await activityBookingDetails(b.reference).catch(() => null);
  const feePaise = det ? fx(det.platformFeeMinor, det.platformCurrency) ?? undefined : undefined;
  return {
    ...base, status: 'CONFIRMED', reference: b.reference, bookingId: b.bookingId,
    netPaise: nowPaise ?? q.netPaise, platformFeePaise: feePaise, voucherUrl: det?.voucherUrl,
  };
}
