// GET /api/activity-cities — every city an agent can search for activities:
// our own catalogue, plus any city only Leamigo sells in ("LM-<id>").

import { NextResponse } from 'next/server';
import { leamigoActivityCities, matchesCity } from '@gg/leamigo';
import { getActor } from '@/lib/auth/ctx';
import { CITIES } from '@/lib/cities';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await getActor())) return NextResponse.json({ ok: false, error: 'Please sign in.' }, { status: 401 });
  const lm = await leamigoActivityCities().catch(() => []);
  const extra = lm
    .filter((c) => !CITIES.some((k) => matchesCity(c, k.name, k.countryCode)))
    .map((c) => ({ code: `LM-${c.id}`, name: c.name, country: c.country.split(',')[0]! }));
  return NextResponse.json({
    ok: true,
    cities: [...CITIES.map((c) => ({ code: c.code, name: c.name, country: c.country })), ...extra],
  });
}
