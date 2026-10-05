// POST /api/bookings/prepare { proposalId } → live Hotelbeds price check for
// every hotel in the proposal: current price, cancellation fees, rate comments.
// Returns a signed quote that /api/bookings/confirm will book exactly.

import { NextResponse } from 'next/server';
import { requireAgency } from '@/lib/auth/ctx';
import { db } from '@/lib/db/client';
import { proposalToItinerary } from '@/lib/db/proposals';
import { prepareHotelBookings, signQuote, PRICE_TOLERANCE_PCT } from '@/lib/bookings/hotelbeds';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: Request) {
  const actor = await requireAgency();
  const body = await req.json().catch(() => ({}));
  const proposalId = String(body?.proposalId ?? '');
  const p = await db.proposal.findFirst({ where: { id: proposalId, agencyId: actor.agencyId }, include: { lead: true } });
  if (!p) return NextResponse.json({ ok: false, error: 'Proposal not found.' }, { status: 404 });
  const it = proposalToItinerary(p as any);
  if (!it) return NextResponse.json({ ok: false, error: 'Proposal data is unreadable.' }, { status: 422 });

  const res = await prepareHotelBookings(it);
  const signed = res.hotels.length && res.problems.length === 0 ? signQuote(proposalId, res.hotels) : undefined;
  return NextResponse.json({
    ok: true,
    ...res,
    token: signed?.token,
    expiresAt: signed?.expiresAt,
    tolerancePct: PRICE_TOLERANCE_PCT,
    rooms: it.intake.rooms,
    leadName: p.lead?.customerName ?? null,
  });
}
