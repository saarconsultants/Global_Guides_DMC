// GET /api/activity-cities — the cities an agent can search for activities:
// our own catalogue, plus any city only Leamigo sells in ("LM-<id>").
// With ?q=, also Leamigo's full directory (~157k), which is searched, never listed.

import { NextResponse } from 'next/server';
import { leamigoActivityCities, matchesCity, searchLeamigoCityDirectory } from '@gg/leamigo';
import { getActor } from '@/lib/auth/ctx';
import { CITIES } from '@/lib/cities';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!(await getActor())) return NextResponse.json({ ok: false, error: 'Please sign in.' }, { status: 401 });
  const lm = await leamigoActivityCities().catch(() => []);
  const q = new URL(req.url).searchParams.get('q');
  if (q) {
    const rows = await searchLeamigoCityDirectory(q).catch(() => []);
    const count = new Map(lm.map((c) => [c.id, c.count]));
    const cities = rows
      .filter((r) => !CITIES.some((k) => matchesCity(r, k.name, k.countryCode)))
      .map((r) => ({ code: `LM-${r.id}`, name: r.name, country: r.country.split(',')[0]!, note: count.has(r.id) ? undefined : 'No activities yet' }))
      .sort((x, y) => Number(!!x.note) - Number(!!y.note));
    return NextResponse.json({ ok: true, cities });
  }
  const extra = lm
    .filter((c) => !CITIES.some((k) => matchesCity(c, k.name, k.countryCode)))
    .map((c) => ({ code: `LM-${c.id}`, name: c.name, country: c.country.split(',')[0]! }));
  return NextResponse.json({
    ok: true,
    cities: [...CITIES.map((c) => ({ code: c.code, name: c.name, country: c.country })), ...extra],
  });
}
