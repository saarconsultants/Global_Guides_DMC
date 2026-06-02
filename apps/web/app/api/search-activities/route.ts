// POST /api/search-activities
// Replaces the searchActivitiesAction server action.
// We use a plain API route here (not a server action) because server actions
// trigger an implicit router cache invalidation in Next.js — which causes
// the Add Activity modal's parent to re-render mid-fetch, unmounting the
// dialog. A plain fetch endpoint has no such side-effect.

import { NextResponse } from 'next/server';
import { searchActivities, type HotelbedsActivity } from '@gg/hotelbeds';
import type { Activity } from '@/lib/itinerary/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  cityCode: string;
  fromDate: string;
  toDate: string;
  paxAdults: number;
  paxChildren?: number;
}

export async function POST(req: Request) {
  let input: Body;
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const res = await searchActivities(input);
    return NextResponse.json({
      ok: true,
      activities: res.activities.map(toApp),
      source: res.source,
      warning: res.warning,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) });
  }
}

function toApp(a: HotelbedsActivity): Activity {
  return {
    id: a.id,
    name: a.name,
    category: 'tour',
    durationMin: a.durationMin,
    pricePaise: a.pricePaise,
    cityCode: a.cityCode,
  };
}
