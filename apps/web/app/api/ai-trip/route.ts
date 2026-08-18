// POST /api/ai-trip → full AI-architected itinerary (route → fetch → select →
// assemble). Runs as a route handler (not a server action) so we can raise the
// serverless time budget: two LLM calls + live supplier fetches take 15-40s.

import { NextResponse } from 'next/server';
import { requireAgency } from '@/lib/auth/ctx';
import { aiEnabled, aiKeyError } from '@/lib/ai/openrouter';
import { architectTrip, type ArchitectInput } from '@/lib/ai/trip-architect';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    await requireAgency();
  } catch {
    return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  }
  if (!aiEnabled()) {
    return NextResponse.json({ ok: false, error: aiKeyError() }, { status: 503 });
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Bad request.' }, { status: 400 }); }

  const destinationsText = String(body?.destinationsText ?? '').trim();
  const totalNights = parseInt(String(body?.totalNights ?? ''), 10);
  const departureDate = String(body?.departureDate ?? '').trim();
  const adults = Math.min(9, Math.max(1, parseInt(String(body?.adults ?? '2'), 10) || 2));
  if (!destinationsText) return NextResponse.json({ ok: false, error: 'Enter at least one destination.' }, { status: 400 });
  if (!Number.isFinite(totalNights) || totalNights < 2 || totalNights > 21) return NextResponse.json({ ok: false, error: 'Nights must be between 2 and 21.' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(departureDate) || new Date(departureDate) < new Date(new Date().toDateString())) {
    return NextResponse.json({ ok: false, error: 'Pick a departure date in the future.' }, { status: 400 });
  }

  const input: ArchitectInput = {
    destinationsText,
    totalNights,
    departureDate,
    adults,
    children: Math.min(6, Math.max(0, parseInt(String(body?.children ?? '0'), 10) || 0)),
    originIATA: typeof body?.originIATA === 'string' && /^[A-Za-z]{3}$/.test(body.originIATA) ? body.originIATA.toUpperCase() : undefined,
    cabin: ['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'].includes(body?.cabin) ? body.cabin : 'ECONOMY',
    budget: ['standard', 'premium', 'luxury'].includes(body?.budget) ? body.budget : undefined,
    notes: typeof body?.notes === 'string' ? body.notes.slice(0, 500) : undefined,
  };

  try {
    const result = await architectTrip(input);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    console.error('[ai-trip]', e);
    return NextResponse.json({ ok: false, error: e?.message ?? 'Trip build failed. Please try again.' }, { status: 500 });
  }
}
