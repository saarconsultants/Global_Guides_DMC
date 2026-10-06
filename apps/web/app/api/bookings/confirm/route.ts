// POST /api/bookings/confirm { proposalId, quoteToken?, guests?, contact?, acceptPriceChange? }
// Books every live hotel with Hotelbeds (60s confirmation timeout each, run in
// parallel), then finalizes the internal booking. See lib/bookings/confirm.ts.

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAgency } from '@/lib/auth/ctx';
import { confirmProposalBooking } from '@/lib/bookings/confirm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(req: Request) {
  const actor = await requireAgency();
  const body = await req.json().catch(() => ({}));
  const res = await confirmProposalBooking({
    agencyId: actor.agencyId, userId: actor.userId,
    proposalId: String(body?.proposalId ?? ''),
    quoteToken: body?.quoteToken, guests: body?.guests, contact: body?.contact, acceptPriceChange: body?.acceptPriceChange === true,
  });
  if (res.ok) for (const p of ['/bookings', '/proposals', '/statement', '/leads', '/dashboard']) revalidatePath(p);
  return NextResponse.json(res, { status: res.ok ? 200 : res.code === 'not_found' ? 404 : 409 });
}
