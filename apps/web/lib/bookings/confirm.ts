// Confirm a proposal as a booking, including live Hotelbeds hotel bookings.
// Server-only; called from /api/bookings/confirm (60s+ budget, see route).
//
// Order matters for money safety:
//   1. Atomically claim the proposal + debit the wallet + create a PENDING
//      booking. Two concurrent clicks can't both reach Hotelbeds.
//   2. Book each hotel with Hotelbeds (never retried).
//   3. All confirmed → CONFIRMED. All failed → full rollback + refund.
//      Partial → stays PENDING with the confirmed references, flagged for ops.

import { db } from '@/lib/db/client';
import { emitNotification } from '@/lib/db/notifications';
import { proposalToItinerary } from '@/lib/db/proposals';
import { isLive } from '@gg/hotelbeds';
import { sampleItems } from '@/lib/bookings/sample';
import { verifyQuote, validateGuests, bookHotels, PRICE_TOLERANCE_PCT, type GuestsInput, type SupplierHotelBooking, type HotelQuote } from './hotelbeds';
import { leamigoLegs, validateContact, bookTransfers, type TransferQuote, type SupplierTransferBooking, type LeadContact } from './leamigo';
import { isLive as leamigoLive } from '@gg/leamigo';
import { isLive as unifyLive } from '@gg/unifystays';
import { bookUnifyStays, type SupplierUnifyBooking } from './unifystays';

export type SupplierItem = SupplierHotelBooking | SupplierUnifyBooking | SupplierTransferBooking;

export type ConfirmResult =
  | { ok: true; bookingId: string; code: string; status: 'CONFIRMED' | 'PENDING'; hotels: SupplierItem[] }
  | { ok: false; error: string; code?: 'not_found' | 'already_booked' | 'bad_status' | 'insufficient_funds' | 'quote' | 'guests' | 'price_change' | 'supplier_failed'; hotels?: SupplierItem[] };

export async function confirmProposalBooking(args: {
  agencyId: string; userId: string; proposalId: string;
  quoteToken?: string; guests?: GuestsInput; contact?: LeadContact; acceptPriceChange?: boolean;
  /** The agent's public IP: some Unifystays suppliers require it. */
  endUserIp?: string;
}): Promise<ConfirmResult> {
  const { agencyId, userId, proposalId } = args;
  const proposal = await db.proposal.findFirst({ where: { id: proposalId, agencyId }, include: { lead: true } });
  if (!proposal) return { ok: false, code: 'not_found', error: 'Proposal not found.' };
  if (proposal.status === 'BOOKED') return { ok: false, code: 'already_booked', error: 'Already booked.' };
  if (proposal.status === 'SUPERSEDED' || proposal.status === 'DECLINED') return { ok: false, code: 'bad_status', error: 'This proposal cannot be booked in its current state.' };
  if (await db.booking.findFirst({ where: { proposalId, agencyId } })) return { ok: false, code: 'already_booked', error: 'Already booked.' };

  const it = proposalToItinerary(proposal as any);
  if (!it) return { ok: false, code: 'bad_status', error: 'Proposal data is unreadable.' };

  // Never take payment on a made-up price, however this was reached.
  const samples = sampleItems(it);
  if (samples.length) return { ok: false, code: 'bad_status', error: `Can't book sample prices: ${samples.map((x) => x.hotelName).join(', ')}.` };

  // Which stays must go through Hotelbeds?
  const hbStays = isLive('hotels') ? it.destinations.filter((d) => d.stay?.hotel.id.startsWith('HB-')) : [];
  const usStays = unifyLive() ? it.destinations.filter((d) => d.stay?.hotel.id.startsWith('US-')) : [];
  const liveStays = [...hbStays, ...usStays];
  const liveLegs = leamigoLive() ? leamigoLegs(it) : [];
  const liveCount = liveStays.length + liveLegs.length;
  let quoteHotels: HotelQuote[] = [];
  let quoteTransfers: TransferQuote[] = [];
  if (liveCount) {
    const v = verifyQuote(args.quoteToken ?? '', proposalId);
    if (!v.ok) return { ok: false, code: 'quote', error: v.error };
    quoteHotels = v.hotels; quoteTransfers = v.transfers;
    if (quoteHotels.length !== liveStays.length || quoteTransfers.length !== liveLegs.length) return { ok: false, code: 'quote', error: 'Not every hotel and transfer passed the live price check. Resolve the listed problems first.' };
    if (liveStays.length) {
      const bad = validateGuests(args.guests as GuestsInput, it.intake.rooms);
      if (bad) return { ok: false, code: 'guests', error: bad };
    }
    if (liveLegs.length || usStays.length) {
      const bad = validateContact(args.contact);
      if (bad) return { ok: false, code: 'guests', error: bad };
    }
    const rises = [...quoteHotels.map((h) => ({ n: h.hotelName, p: h.priceChangePct })), ...quoteTransfers.map((t) => ({ n: `${t.fromName} → ${t.toName}`, p: t.priceChangePct }))].filter((x) => x.p > PRICE_TOLERANCE_PCT);
    if (rises.length && !args.acceptPriceChange) return { ok: false, code: 'price_change', error: `Supplier price went up for ${rises.map((x) => x.n).join(', ')}. Accept the new price to continue.` };
  }

  // Wallet debit: the proposal's net cost, plus any supplier increase the agent accepted.
  const increase = [...quoteHotels, ...quoteTransfers].reduce((s, h) => s + Math.max(0, h.netPaise - h.quotedPaise), 0);
  const net = proposal.netCostPaise + BigInt(increase);
  const priorStatus = proposal.status;

  let bookingId: string;
  try {
    bookingId = (await db.$transaction(async (tx) => {
      const claimed = await tx.proposal.updateMany({
        where: { id: proposalId, agencyId, status: { notIn: ['BOOKED', 'SUPERSEDED', 'DECLINED'] } },
        data: { status: 'BOOKED' },
      });
      if (claimed.count === 0) throw new Error('ALREADY_BOOKED');
      const debited = await tx.agency.updateMany({ where: { id: agencyId, walletPaise: { gte: net } }, data: { walletPaise: { decrement: net } } });
      if (debited.count === 0) throw new Error('INSUFFICIENT_FUNDS');
      const b = await tx.booking.create({ data: { agencyId, proposalId, paidPaise: net, status: liveCount ? 'PENDING' : 'CONFIRMED' } });
      await tx.walletTxn.create({ data: { agencyId, type: 'DEBIT', amountPaise: net, ref: proposal.code, note: `Booking · ${proposal.name}` } });
      return b;
    })).id;
  } catch (e: any) {
    if (e?.message === 'ALREADY_BOOKED') return { ok: false, code: 'already_booked', error: 'Already booked.' };
    if (e?.message === 'INSUFFICIENT_FUNDS') return { ok: false, code: 'insufficient_funds', error: 'Not enough wallet balance for this booking.' };
    throw e;
  }

  const [hotelResults, unifyResults, transferResults] = await Promise.all([
    hbStays.length ? bookHotels({ hotels: quoteHotels.filter((h) => h.supplier !== 'UNIFYSTAYS'), guests: args.guests!, rooms: it.intake.rooms, clientReference: proposal.code }) : Promise.resolve([] as SupplierHotelBooking[]),
    usStays.length ? bookUnifyStays({ hotels: quoteHotels.filter((h) => h.supplier === 'UNIFYSTAYS'), guests: args.guests!, contact: args.contact!, rooms: it.intake.rooms, clientReference: proposal.code, endUserIp: args.endUserIp }) : Promise.resolve([] as SupplierUnifyBooking[]),
    liveLegs.length ? bookTransfers({ transfers: quoteTransfers, contact: args.contact!, clientReference: proposal.code, guestNames: (args.guests?.rooms ?? []).flatMap((r) => [...r.adults, ...r.children]).map((p) => `${p.name} ${p.surname}`.trim()) }) : Promise.resolve([] as SupplierTransferBooking[]),
  ]);
  const hotels: SupplierItem[] = [...hotelResults, ...unifyResults, ...transferResults];
  const confirmed = hotels.filter((h) => h.status === 'CONFIRMED');
  const label = (h: SupplierItem) => (h.supplier === 'HOTELBEDS' || h.supplier === 'UNIFYSTAYS' ? h.hotelName : h.product === 'activity' ? h.fromName : `${h.fromName} → ${h.toName}`);

  // Every live booking failed → nothing is held at any supplier: undo everything.
  // A pending one (Unifystays still confirming) may yet go through, so it never triggers this.
  if (liveCount && hotels.every((h) => h.status === 'FAILED')) {
    await db.$transaction(async (tx) => {
      await tx.booking.delete({ where: { id: bookingId } });
      await tx.agency.update({ where: { id: agencyId }, data: { walletPaise: { increment: net } } });
      await tx.walletTxn.create({ data: { agencyId, type: 'REFUND', amountPaise: net, ref: proposal.code, note: 'Supplier booking failed — debit reversed' } });
      await tx.proposal.update({ where: { id: proposalId }, data: { status: priorStatus } });
    });
    return { ok: false, code: 'supplier_failed', error: hotels.map((h) => `${label(h)}: ${h.error}`).join(' · '), hotels };
  }

  const allOk = confirmed.length === hotels.length;
  await db.booking.update({
    where: { id: bookingId },
    data: {
      status: allOk ? 'CONFIRMED' : 'PENDING',
      pnrs: confirmed.map((h) => `${h.supplier === 'HOTELBEDS' ? 'HB' : h.supplier === 'UNIFYSTAYS' ? 'US' : 'LM'} ${h.reference}`).join(', ') || null,
      supplierJson: hotels.length ? JSON.stringify(hotels) : null,
    },
  });
  if (proposal.leadId) await db.lead.update({ where: { id: proposal.leadId }, data: { status: 'BOOKED' } });

  await emitNotification({
    agencyId, userId, kind: 'BOOKING_CONFIRMED',
    title: allOk ? `Booking confirmed · ${proposal.code}` : `Booking needs attention · ${proposal.code}`,
    body: allOk
      ? `${proposal.lead?.customerName ?? 'Customer'} · ${proposal.name}${confirmed.length ? ` · ${confirmed.map((h) => h.reference).join(', ')}` : ''}`
      : [
          hotels.some((h) => h.status === 'FAILED') && `${hotels.filter((h) => h.status === 'FAILED').map(label).join(', ')} could not be booked — operations will follow up.`,
          hotels.some((h) => h.status === 'PENDING') && `${hotels.filter((h) => h.status === 'PENDING').map(label).join(', ')} is waiting for the supplier to confirm. Check its status in Bookings.`,
        ].filter(Boolean).join(' '),
    href: '/bookings',
  });

  return { ok: true, bookingId, code: proposal.code, status: allOk ? 'CONFIRMED' : 'PENDING', hotels };
}
