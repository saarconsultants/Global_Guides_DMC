// GET /api/activity-cities — the cities an agent can search for activities:
// our own catalogue. Typing also searches any city Leamigo has ("LM-<id>").
// With ?q=, also Leamigo's full directory (~157k), which is searched, never listed.

import { NextResponse } from 'next/server';
import { matchesCity, searchLeamigoCityDirectory } from '@gg/leamigo';
import { getActor } from '@/lib/auth/ctx';
import { CITIES } from '@/lib/cities';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!(await getActor())) return NextResponse.json({ ok: false, error: 'Please sign in.' }, { status: 401 });
  const q = new URL(req.url).searchParams.get('q');
  if (q) {
    const rows = await searchLeamigoCityDirectory(q).catch(() => []);
    const cities = rows
      .filter((r) => !CITIES.some((k) => matchesCity(r, k.name, k.countryCode)))
      .map((r) => ({ code: `LM-${r.id}`, name: r.name, country: r.country.split(',')[0]! }));
    return NextResponse.json({ ok: true, cities });
  }
  return NextResponse.json({
    ok: true,
    cities: CITIES.map((c) => ({ code: c.code, name: c.name, country: c.country })),
  });
}
