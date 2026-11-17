// POST /api/bookings/cancel-hotel { bookingId, reference, confirm? }
//   confirm=false → cancellation fee preview (Hotelbeds SIMULATION / Unifystays quote, no change)
//   confirm=true  → cancel at the supplier, refund (hotel net − fee) to the wallet

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAgency } from '@/lib/auth/ctx';
import { db } from '@/lib/db/client';
import { simulateCancellation, cancelBooking, toInrPaise } from '@gg/hotelbeds';
import { cancellationQuote, cancelBooking as unifyCancel, waitForBooking } from '@gg/unifystays';
import type { SupplierItem } from '@/lib/bookings/confirm';
import type { SupplierUnifyBooking } from '@/lib/bookings/unifystays';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: Request) {
  const actor = await requireAgency();
  const body = await req.json().catch(() => ({}));
  const booking = await db.booking.findFirst({ where: { id: String(body?.bookingId ?? ''), agencyId: actor.agencyId }, include: { proposal: true } });
  if (!booking?.supplierJson) return NextResponse.json({ ok: false, error: 'Booking not found.' }, { status: 404 });
  const hotels = JSON.parse(booking.supplierJson) as SupplierItem[];
  const found = hotels.find((h) => (h.supplier === 'HOTELBEDS' || h.supplier === 'UNIFYSTAYS') && h.reference === body?.reference);
  if (!found || found.status !== 'CONFIRMED') return NextResponse.json({ ok: false, error: 'No active hotel booking with that reference.' }, { status: 404 });
  if (found.supplier === 'UNIFYSTAYS') return cancelUnify(found, hotels, booking, actor.agencyId, body?.confirm === true);
  if (found.supplier !== 'HOTELBEDS') return NextResponse.json({ ok: false, error: 'Not a hotel booking.' }, { status: 404 });
  const entry = found;

  try {
    const sim = await simulateCancellation(entry.reference!);
    const feePaise = Math.min(entry.netPaise, await toInrPaise(sim.feeAmount, sim.currency));
    if (body?.confirm !== true) {
      return NextResponse.json({ ok: true, preview: true, feePaise, feeAmount: sim.feeAmount, currency: sim.currency, refundPaise: entry.netPaise - feePaise });
    }

    const res = await cancelBooking(entry.reference!);
    if (res.status !== 'CANCELLED') return NextResponse.json({ ok: false, error: `Hotelbeds returned status ${res.status || 'unknown'} — not cancelled.` }, { status: 502 });

    const refundPaise = Math.max(0, entry.netPaise - feePaise);
    entry.status = 'CANCELLED';
    entry.cancellation = { at: new Date().toISOString(), feePaise, refundPaise, reference: res.cancellationReference };
    const allCancelled = hotels.every((h) => h.status !== 'CONFIRMED');

    await db.$transaction(async (tx) => {
      await tx.booking.update({ where: { id: booking.id }, data: { supplierJson: JSON.stringify(hotels), ...(allCancelled ? { status: 'CANCELLED' } : {}) } });
      if (refundPaise > 0) {
        await tx.agency.update({ where: { id: actor.agencyId }, data: { walletPaise: { increment: BigInt(refundPaise) } } });
        await tx.walletTxn.create({ data: { agencyId: actor.agencyId, type: 'REFUND', amountPaise: BigInt(refundPaise), ref: booking.proposal.code, note: `Hotel cancelled · ${entry.hotelName} · HB ${entry.reference}` } });
      }
    });
    for (const p of ['/bookings', '/statement']) revalidatePath(p);
    return NextResponse.json({ ok: true, cancelled: true, feePaise, refundPaise });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Cancellation failed.' }, { status: 502 });
  }
}

/** Unifystays: quote (never treat an unknown fee as zero) → cancel with an Idempotency-Key → refund once CANCELLED. */
async function cancelUnify(entry: SupplierUnifyBooking, hotels: SupplierItem[], booking: { id: string; proposal: { code: string } }, agencyId: string, confirm: boolean) {
  try {
    const quote = await cancellationQuote(entry.reference!);
    if (!quote.cancellable) return NextResponse.json({ ok: false, error: 'The supplier says this booking can no longer be cancelled.' }, { status: 409 });
    if (quote.penaltyPaise === null) return NextResponse.json({ ok: false, error: 'The supplier could not say what cancelling would cost. Contact Unifystays support before cancelling.' }, { status: 409 });
    const feePaise = Math.min(entry.netPaise, quote.penaltyPaise);
    if (!confirm) return NextResponse.json({ ok: true, preview: true, feePaise, refundPaise: entry.netPaise - feePaise });

    let s = await unifyCancel(entry.reference!, quote.quoteId, `cancel-${entry.reference}`);
    if (!s.isTerminal) s = await waitForBooking(entry.reference!, Date.now() + 25_000).catch(() => s);
    if (s.status !== 'CANCELLED') {
      entry.unifyStatus = s.status;
      await db.booking.update({ where: { id: booking.id }, data: { supplierJson: JSON.stringify(hotels) } });
      return NextResponse.json({ ok: false, error: s.status === 'CANCELLATION_PENDING' ? 'Cancellation sent and still pending with the supplier. Try Cancel again in a few minutes to finish it; no refund until it is cancelled.' : `Unifystays returned status ${s.status || 'unknown'} — not cancelled.` }, { status: 502 });
    }
    const refundPaise = Math.max(0, entry.netPaise - feePaise);
    entry.status = 'CANCELLED';
    entry.unifyStatus = s.status;
    entry.cancellation = { at: new Date().toISOString(), feePaise, refundPaise };
    const allCancelled = hotels.every((h) => h.status !== 'CONFIRMED' && h.status !== 'PENDING');
    await db.$transaction(async (tx) => {
      await tx.booking.update({ where: { id: booking.id }, data: { supplierJson: JSON.stringify(hotels), ...(allCancelled ? { status: 'CANCELLED' } : {}) } });
      if (refundPaise > 0) {
        await tx.agency.update({ where: { id: agencyId }, data: { walletPaise: { increment: BigInt(refundPaise) } } });
        await tx.walletTxn.create({ data: { agencyId, type: 'REFUND', amountPaise: BigInt(refundPaise), ref: booking.proposal.code, note: `Hotel cancelled · ${entry.hotelName} · US ${entry.reference}` } });
      }
    });
    for (const p of ['/bookings', '/statement']) revalidatePath(p);
    return NextResponse.json({ ok: true, cancelled: true, feePaise, refundPaise });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Cancellation failed.' }, { status: 502 });
  }
}
