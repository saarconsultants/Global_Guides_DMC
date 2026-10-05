// POST /api/bookings/cancel-hotel { bookingId, reference, confirm? }
//   confirm=false → cancellation fee preview (Hotelbeds SIMULATION, no change)
//   confirm=true  → cancel at Hotelbeds, refund (hotel net − fee) to the wallet

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAgency } from '@/lib/auth/ctx';
import { db } from '@/lib/db/client';
import { simulateCancellation, cancelBooking, toInrPaise } from '@gg/hotelbeds';
import type { SupplierHotelBooking } from '@/lib/bookings/hotelbeds';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: Request) {
  const actor = await requireAgency();
  const body = await req.json().catch(() => ({}));
  const booking = await db.booking.findFirst({ where: { id: String(body?.bookingId ?? ''), agencyId: actor.agencyId }, include: { proposal: true } });
  if (!booking?.supplierJson) return NextResponse.json({ ok: false, error: 'Booking not found.' }, { status: 404 });
  const hotels = JSON.parse(booking.supplierJson) as SupplierHotelBooking[];
  const entry = hotels.find((h) => h.reference === body?.reference);
  if (!entry || entry.status !== 'CONFIRMED') return NextResponse.json({ ok: false, error: 'No active hotel booking with that reference.' }, { status: 404 });

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
