// POST /api/bookings/cancel-transfer { bookingId, reference, confirm? }
//   confirm=false → fee preview from Leamigo's cancellation policy (no change)
//   confirm=true  → cancel at Leamigo, refund (transfer net − penalty) to the wallet

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAgency } from '@/lib/auth/ctx';
import { db } from '@/lib/db/client';
import { transferCancellationPolicy, cancelTransferBooking, chargePctNow } from '@gg/leamigo';
import type { SupplierItem } from '@/lib/bookings/confirm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: Request) {
  const actor = await requireAgency();
  const body = await req.json().catch(() => ({}));
  const booking = await db.booking.findFirst({ where: { id: String(body?.bookingId ?? ''), agencyId: actor.agencyId }, include: { proposal: true } });
  if (!booking?.supplierJson) return NextResponse.json({ ok: false, error: 'Booking not found.' }, { status: 404 });
  const items = JSON.parse(booking.supplierJson) as SupplierItem[];
  const entry = items.find((h) => h.supplier === 'LEAMIGO' && h.reference === body?.reference);
  if (!entry || entry.supplier !== 'LEAMIGO' || entry.status !== 'CONFIRMED') return NextResponse.json({ ok: false, error: 'No active transfer booking with that reference.' }, { status: 404 });

  try {
    // Pickup is local to the destination; Leamigo rules are in hours, so a
    // few hours of timezone slack only matters right at a rule boundary.
    const pickupAt = new Date(`${entry.pickupDate}T${entry.pickupTime}:00Z`);
    const policy = await transferCancellationPolicy(entry.reference!);
    const pct = chargePctNow(policy, pickupAt);
    const feePaise = Math.round((entry.netPaise * pct) / 100);
    if (body?.confirm !== true) {
      return NextResponse.json({ ok: true, preview: true, feePaise, chargePct: pct, refundPaise: entry.netPaise - feePaise });
    }

    const res = await cancelTransferBooking(entry.reference!);
    if (res.status !== 'cancelled') return NextResponse.json({ ok: false, error: `Leamigo returned status ${res.status || 'unknown'} — not cancelled.` }, { status: 502 });

    // Leamigo reports its penalty in supplier currency; when it charges nothing,
    // refund in full even if our local policy estimate said otherwise.
    const finalFee = res.penaltyMinor === 0 ? 0 : feePaise;
    const refundPaise = Math.max(0, entry.netPaise - finalFee);
    entry.status = 'CANCELLED';
    entry.cancellation = { at: new Date().toISOString(), feePaise: finalFee, refundPaise };
    const allCancelled = items.every((h) => h.status !== 'CONFIRMED');

    await db.$transaction(async (tx) => {
      await tx.booking.update({ where: { id: booking.id }, data: { supplierJson: JSON.stringify(items), ...(allCancelled ? { status: 'CANCELLED' } : {}) } });
      if (refundPaise > 0) {
        await tx.agency.update({ where: { id: actor.agencyId }, data: { walletPaise: { increment: BigInt(refundPaise) } } });
        await tx.walletTxn.create({ data: { agencyId: actor.agencyId, type: 'REFUND', amountPaise: BigInt(refundPaise), ref: booking.proposal.code, note: `Transfer cancelled · ${entry.fromName} → ${entry.toName} · LM ${entry.reference}` } });
      }
    });
    for (const p of ['/bookings', '/statement']) revalidatePath(p);
    return NextResponse.json({ ok: true, cancelled: true, feePaise: finalFee, refundPaise });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Cancellation failed.' }, { status: 502 });
  }
}
