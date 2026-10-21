// POST /api/search-activities — every supplier's activities for one city/date,
// priced for the party. Used by the builder's Add activity modal.
// A plain API route (not a server action): server actions invalidate the
// router cache, which re-rendered the modal's parent mid-fetch.

import { NextResponse } from 'next/server';
import { searchAllActivities } from '@/lib/activities/search';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  if (!b?.cityCode || !b?.fromDate) return NextResponse.json({ ok: false, error: 'Missing city or date.' }, { status: 400 });
  const res = await searchAllActivities({ cityCode: b.cityCode, fromDate: b.fromDate, toDate: b.toDate ?? b.fromDate, adults: b.paxAdults ?? 2, children: b.paxChildren ?? 0 });
  return NextResponse.json({ ok: true, ...res });
}
