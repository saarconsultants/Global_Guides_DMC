// POST /api/search-activities
// Replaces the searchActivitiesAction server action.
// We use a plain API route here (not a server action) because server actions
// trigger an implicit router cache invalidation in Next.js — which causes
// the Add Activity modal's parent to re-render mid-fetch, unmounting the
// dialog. A plain fetch endpoint has no such side-effect.

import { NextResponse } from 'next/server';
import { searchActivities, type HotelbedsActivity } from '@gg/hotelbeds';
import { searchLeamigoActivities, isLive as leamigoLive, type LeamigoActivity } from '@gg/leamigo';
import { cityInfo } from '@/lib/itinerary/mock-inventory';
import type { Activity } from '@/lib/itinerary/types';

const within = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([p.catch(() => fallback), new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

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
    const pax = Math.max(1, (input.paxAdults ?? 1) + (input.paxChildren ?? 0));
    const [res, lm] = await Promise.all([
      searchActivities(input).catch((e) => ({ activities: [] as HotelbedsActivity[], source: 'mock' as const, warning: String(e?.message ?? e) })),
      leamigoLive() ? within(searchLeamigoActivities({ cityName: cityInfo(input.cityCode).name, pax }), 12_000, { activities: [] as LeamigoActivity[] }) : Promise.resolve({ activities: [] as LeamigoActivity[] }),
    ]);
    const activities = [...res.activities.map(toApp), ...lm.activities.map(lmToApp(input.cityCode))];
    return NextResponse.json({
      ok: true,
      activities,
      source: lm.activities.length ? 'live' : res.source,
      warning: lm.activities.length && res.source !== 'live' ? undefined : res.warning,
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
    thumb: a.thumb,
    description: a.description,
  };
}

const lmToApp = (cityCode: string) => (a: LeamigoActivity): Activity => ({
  id: a.id,
  name: a.title,
  category: 'tour',
  durationMin: a.durationMin,
  pricePaise: a.pricePaise,
  cityCode,
  thumb: a.thumb,
  description: [a.optionName, a.description, a.freeCancellation ? 'Free cancellation' : 'Non-refundable', 'Leamigo'].filter(Boolean).join(' · '),
  leamigo: {
    activityId: a.activityId, optionId: a.optionId, ticketId: a.ticketId, quantity: a.quantity,
    openDated: a.bookingType === 'open_dated', freeCancellation: a.freeCancellation, cancellationRules: a.cancellationRules,
  },
});
