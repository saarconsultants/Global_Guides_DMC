// POST /api/bookings/supplier-manage { bookingId, reference, action, ... }
// Any Leamigo item on this agency's booking:
//   action='details'    → live status, driver, supplier contacts, meeting points, voucher
//   action='amend'      → guest details, flight number, notes (transfers and rentals)
//   action='reschedule' → new start and end (Headout activities)

import { NextResponse } from 'next/server';
import { requireAgency } from '@/lib/auth/ctx';
import { db } from '@/lib/db/client';
import { leamigoBookingLive, amendTransferBooking, amendRentalBooking, rescheduleActivityBooking } from '@gg/leamigo';
import { productOf } from '@/lib/bookings/leamigo';
import type { SupplierItem } from '@/lib/bookings/confirm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  const actor = await requireAgency();
  const body = await req.json().catch(() => ({}));
  const booking = await db.booking.findFirst({ where: { id: String(body?.bookingId ?? ''), agencyId: actor.agencyId } });
  if (!booking?.supplierJson) return NextResponse.json({ ok: false, error: 'Booking not found.' }, { status: 404 });
  const items = JSON.parse(booking.supplierJson) as SupplierItem[];
  const entry = items.find((h) => h.supplier === 'LEAMIGO' && h.reference === body?.reference);
  if (!entry || entry.supplier !== 'LEAMIGO' || !entry.reference) return NextResponse.json({ ok: false, error: 'No Leamigo booking with that reference.' }, { status: 404 });
  const product = productOf(entry);

  try {
    if (body?.action === 'details') {
      return NextResponse.json({ ok: true, product, live: await leamigoBookingLive(product, entry.reference) });
    }
    if (body?.action === 'amend') {
      if (product === 'activity') return NextResponse.json({ ok: false, error: 'Activities can be rescheduled, not amended.' }, { status: 400 });
      const a = body.amend ?? {};
      const clean = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
      const change = {
        firstName: clean(a.firstName, 60), lastName: clean(a.lastName, 60), email: clean(a.email, 120), phone: clean(a.phone, 20),
        specialRequirements: clean(a.specialRequirements, 500), flightNumber: product === 'transfer' ? clean(a.flightNumber, 12) : undefined,
      };
      if (!Object.values(change).some(Boolean)) return NextResponse.json({ ok: false, error: 'Enter at least one change.' }, { status: 400 });
      if (product === 'transfer') await amendTransferBooking(entry.reference, change);
      else await amendRentalBooking(entry.reference, change);
      return NextResponse.json({ ok: true });
    }
    if (body?.action === 'reschedule') {
      if (product !== 'activity') return NextResponse.json({ ok: false, error: 'Only activities can be rescheduled here.' }, { status: 400 });
      const start = String(body.startDateTime ?? ''), end = String(body.endDateTime ?? '');
      if (!start || !end) return NextResponse.json({ ok: false, error: 'Enter the new start and end.' }, { status: 400 });
      await rescheduleActivityBooking(entry.reference, { startDateTime: start, endDateTime: end, comment: typeof body.comment === 'string' ? body.comment.slice(0, 300) : undefined });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: 'Unknown action.' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Leamigo could not do that.' }, { status: 502 });
  }
}
