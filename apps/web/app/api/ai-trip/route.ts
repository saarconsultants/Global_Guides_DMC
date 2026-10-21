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
  // No AI key is not fatal: the architect falls back to the typed city order
  // and best-value picks, so the trip still builds from live inventory.
  if (!aiEnabled()) console.warn('[ai-trip]', aiKeyError());

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

  // ?stream=1 → NDJSON: {type:'stage',stage,detail} … then {type:'done',…} or {type:'error',error}.
  if (new URL(req.url).searchParams.get('stream') === '1') {
    const enc = new TextEncoder();
    const stream = new ReadableStream({
      async start(ctrl) {
        const send = (o: unknown) => { try { ctrl.enqueue(enc.encode(JSON.stringify(o) + '\n')); } catch { /* closed */ } };
        try {
          const result = await architectTrip(input, (p) => send({ type: 'stage', ...p }));
          send({ type: 'done', ...result });
        } catch (e: any) {
          console.error('[ai-trip]', e);
          send({ type: 'error', error: friendly(e) });
        } finally {
          try { ctrl.close(); } catch { /* closed */ }
        }
      },
    });
    return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' } });
  }

  try {
    const result = await architectTrip(input);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    console.error('[ai-trip]', e);
    return NextResponse.json({ ok: false, error: friendly(e) }, { status: 500 });
  }
}

/** Agent-facing message: validation-style errors pass through, everything else is generic. */
function friendly(e: any): string {
  const m = String(e?.message ?? '');
  if (/recognise those destinations|unsupported cities/i.test(m)) return m;
  return "We couldn't build this trip just now. Please try again in a minute.";
}
