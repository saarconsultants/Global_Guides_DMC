// POST /api/bookings/hotel-status { bookingId, reference } — ask Unifystays where a
// pending hotel booking stands and record it. A booking that failed after it was
// paid for is refunded to the wallet once.

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAgency } from '@/lib/auth/ctx';
import { db } from '@/lib/db/client';
import { bookingStatus } from '@gg/unifystays';
import { statusFields } from '@/lib/bookings/unifystays';
import type { SupplierItem } from '@/lib/bookings/confirm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const actor = await requireAgency();
  const body = await req.json().catch(() => ({}));
  const booking = await db.booking.findFirst({ where: { id: String(body?.bookingId ?? ''), agencyId: actor.agencyId }, include: { proposal: true } });
  if (!booking?.supplierJson) return NextResponse.json({ ok: false, error: 'Booking not found.' }, { status: 404 });
  const items = JSON.parse(booking.supplierJson) as SupplierItem[];
  const entry = items.find((h) => h.supplier === 'UNIFYSTAYS' && h.reference === body?.reference);
  if (!entry || entry.supplier !== 'UNIFYSTAYS') return NextResponse.json({ ok: false, error: 'No Unifystays booking with that reference.' }, { status: 404 });
  if (entry.status !== 'PENDING') return NextResponse.json({ ok: true, message: `Already ${entry.status.toLowerCase()}.` });

  try {
    const s = await bookingStatus(entry.reference!);
    const next = statusFields(s);
    Object.assign(entry, next);
    entry.error = next.status === 'FAILED' ? s.message ?? 'The supplier did not confirm the booking.' : s.status === 'AWAITING_REVIEW' ? 'Waiting for approval in the Unifystays portal.' : undefined;
    const failed = next.status === 'FAILED';
    const allSettled = items.every((h) => h.status !== 'PENDING');
    const anyConfirmed = items.some((h) => h.status === 'CONFIRMED');
    await db.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: booking.id },
        data: {
          supplierJson: JSON.stringify(items),
          ...(allSettled ? { status: anyConfirmed && items.every((h) => h.status === 'CONFIRMED' || h.status === 'CANCELLED') ? 'CONFIRMED' : anyConfirmed ? 'PENDING' : 'CANCELLED' } : {}),
          pnrs: items.filter((h) => h.status === 'CONFIRMED').map((h) => `${h.supplier === 'HOTELBEDS' ? 'HB' : h.supplier === 'UNIFYSTAYS' ? 'US' : 'LM'} ${h.reference}`).join(', ') || null,
        },
      });
      if (failed && entry.netPaise > 0) {
        await tx.agency.update({ where: { id: actor.agencyId }, data: { walletPaise: { increment: BigInt(entry.netPaise) } } });
        await tx.walletTxn.create({ data: { agencyId: actor.agencyId, type: 'REFUND', amountPaise: BigInt(entry.netPaise), ref: booking.proposal.code, note: `Hotel not confirmed · ${entry.hotelName} · US ${entry.reference}` } });
      }
    });
    for (const p of ['/bookings', '/statement']) revalidatePath(p);
    return NextResponse.json({
      ok: true, status: next.status,
      message: next.status === 'CONFIRMED' ? `${entry.hotelName} is confirmed.` : failed ? `${entry.hotelName} was not confirmed. ₹${(entry.netPaise / 100).toLocaleString('en-IN')} refunded to your wallet.` : `${entry.hotelName} is still waiting for the supplier.`,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Status check failed.' }, { status: 502 });
  }
}
