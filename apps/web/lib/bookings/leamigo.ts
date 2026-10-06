// Leamigo transfer booking for a proposal. Server-only.
//
// Search tokens live minutes; proposals live days. So at booking time each
// saved Leamigo leg is re-searched (same coordinates, date, time, passengers),
// matched to the same provider + vehicle class, then prebooked. The prebooking
// freezes price and policy; /bookings then confirms it.

import { searchTransfers, prebookTransfer, createTransferBooking, type LeamigoTransfer } from '@gg/leamigo';
import type { Itinerary, Transfer } from '@/lib/itinerary/types';

export interface TransferQuote {
  key: string;                 // `${dayNo}:${inclusionIndex}` — where it sits in the itinerary
  dayNo: number;
  kind: Transfer['kind'];
  fromName: string;
  toName: string;
  pickupDate: string;
  pickupTime: string;
  passengers: number;
  vehicleName: string;
  provider: string;
  prebookingId: string;
  prebookExpiresAt: string;
  netPaise: number;            // supplier + Leamigo platform fee, INR
  quotedPaise: number;
  priceChangePct: number;
  sameVehicle: boolean;
  freeCancellation: boolean;
  cancellationRules: Array<{ hoursBefore: number; chargePct: number }>;
  cancellationText: string;
}

export interface SupplierTransferBooking {
  supplier: 'LEAMIGO';
  status: 'CONFIRMED' | 'FAILED' | 'CANCELLED';
  key: string;
  fromName: string;
  toName: string;
  pickupDate: string;
  pickupTime: string;
  vehicleName: string;
  provider: string;
  netPaise: number;
  reference?: string;
  bookingId?: string;
  supplierContact?: { email?: string; emergency?: string; contact247?: string };
  cancellationRules?: Array<{ hoursBefore: number; chargePct: number }>;
  error?: string;
  cancellation?: { at: string; feePaise: number; refundPaise: number };
}

export interface LeadContact { salutation: 'Mr' | 'Mrs' | 'Ms' | 'Miss' | 'Dr'; firstName: string; lastName: string; email: string; phone: string; flightNumber?: string }

/** Every Leamigo transfer saved in the itinerary, with its position. */
export function leamigoLegs(it: Itinerary): Array<{ key: string; dayNo: number; t: Transfer }> {
  const out: Array<{ key: string; dayNo: number; t: Transfer }> = [];
  for (const d of it.days ?? []) (d.inclusions ?? []).forEach((inc, i) => {
    if (inc.kind === 'transfer' && inc.transfer.id.startsWith('LM-')) out.push({ key: `${d.dayNo}:${i}`, dayNo: d.dayNo, t: inc.transfer });
  });
  return out;
}

function pickMatch(options: LeamigoTransfer[], want: NonNullable<Transfer['leamigo']>): { ride: LeamigoTransfer; same: boolean } | null {
  const cheapest = (xs: LeamigoTransfer[]) => [...xs].sort((a, b) => a.pricePaise - b.pricePaise)[0];
  const same = cheapest(options.filter((o) => o.providerId === want.providerId && o.vehicleName === want.vehicleName));
  if (same) return { ride: same, same: true };
  const sameClass = cheapest(options.filter((o) => o.shared === want.shared && o.luxury === want.luxury && o.maxPax >= want.passengers));
  return sameClass ? { ride: sameClass, same: false } : null;
}

const pct = (now: number, was: number) => (was > 0 ? Math.round(((now - was) / was) * 1000) / 10 : 0);

export async function prepareTransfers(it: Itinerary): Promise<{
  transfers: TransferQuote[];
  problems: Array<{ label: string; reason: string }>;
}> {
  const transfers: TransferQuote[] = [], problems: Array<{ label: string; reason: string }> = [];
  await Promise.all(leamigoLegs(it).map(async ({ key, dayNo, t }) => {
    const label = `${t.fromName} → ${t.toName}`;
    const leg = t.leamigo;
    if (!leg) { problems.push({ label, reason: 'Saved before live booking was available. Re-pick this transfer in the builder.' }); return; }
    try {
      const res = await searchTransfers({ pickup: leg.from, destination: leg.to, passengers: leg.passengers, pickupDate: leg.pickupDate, pickupTime: leg.pickupTime });
      const m = pickMatch(res.transfers, leg);
      if (!m) { problems.push({ label, reason: 'No longer available for this date and time. Change the transfer in the builder.' }); return; }
      const pre = await prebookTransfer(m.ride.searchId, m.ride.bookingToken);
      if (!pre.rideAvailable) { problems.push({ label, reason: 'The supplier could not hold this ride. Try again or change the transfer.' }); return; }
      const net = pre.pricePaise ?? m.ride.pricePaise;
      const rules = m.ride.cancellation.rules;
      transfers.push({
        key, dayNo, kind: t.kind, fromName: t.fromName, toName: t.toName,
        pickupDate: pre.pickupDate || leg.pickupDate, pickupTime: (pre.pickupTime || leg.pickupTime).slice(0, 5), passengers: leg.passengers,
        vehicleName: m.ride.vehicleName, provider: m.ride.provider,
        prebookingId: pre.prebookingId, prebookExpiresAt: pre.expiresAt,
        netPaise: net, quotedPaise: t.pricePaise, priceChangePct: pct(net, t.pricePaise), sameVehicle: m.same,
        freeCancellation: m.ride.flags.freeCancellation, cancellationRules: rules,
        cancellationText: rules.length ? describeRules(rules) : (m.ride.cancellation.description || 'Non-refundable.'),
      });
    } catch (e: any) {
      problems.push({ label, reason: e?.message ?? 'Leamigo price check failed.' });
    }
  }));
  transfers.sort((a, b) => a.dayNo - b.dayNo || a.key.localeCompare(b.key));
  return { transfers, problems };
}

export function describeRules(rules: Array<{ hoursBefore: number; chargePct: number }>): string {
  if (!rules.length) return 'Non-refundable.';
  return [...rules].sort((a, b) => b.hoursBefore - a.hoursBefore)
    .map((r) => r.hoursBefore > 0 ? `${r.chargePct}% charge if cancelled ${r.hoursBefore}h+ before pickup` : `${r.chargePct}% charge inside that`)
    .join('; ') + '.';
}

/** E.164-ish: + then 8–15 digits. */
export function validateContact(c: LeadContact | undefined): string | null {
  if (!c) return 'Enter the lead passenger contact for transfers.';
  if (!c.firstName?.trim() || !c.lastName?.trim()) return 'Transfers need the lead passenger first and last name.';
  if (!/^\S+@\S+\.\S+$/.test(c.email ?? '')) return 'Enter a valid email for the transfer driver to contact.';
  if (!/^\+\d{8,15}$/.test((c.phone ?? '').replace(/[\s-]/g, ''))) return 'Enter the mobile number with country code, e.g. +919876543210.';
  return null;
}

export async function bookTransfers(args: { transfers: TransferQuote[]; contact: LeadContact; clientReference: string }): Promise<SupplierTransferBooking[]> {
  const c = args.contact;
  return Promise.all(args.transfers.map(async (q): Promise<SupplierTransferBooking> => {
    const base = {
      supplier: 'LEAMIGO' as const, key: q.key, fromName: q.fromName, toName: q.toName,
      pickupDate: q.pickupDate, pickupTime: q.pickupTime, vehicleName: q.vehicleName, provider: q.provider,
      netPaise: q.netPaise, cancellationRules: q.cancellationRules,
    };
    try {
      const b = await createTransferBooking({
        prebookingId: q.prebookingId, salutation: c.salutation,
        firstName: c.firstName.trim(), lastName: c.lastName.trim(), email: c.email.trim(), phone: c.phone.replace(/[\s-]/g, ''),
        flightNumber: q.kind === 'arrival' || q.kind === 'departure' ? c.flightNumber?.trim() || undefined : undefined,
        agentRef: `${args.clientReference}-${q.key}`,
      });
      return { ...base, status: 'CONFIRMED', reference: b.reference, bookingId: b.bookingId, supplierContact: b.supplierContact };
    } catch (e: any) {
      return { ...base, status: 'FAILED', error: e?.message ?? 'Transfer booking failed.' };
    }
  }));
}
