// POST /api/activity-times { activityId, optionId, ticketId, quantity, date }
// Start times for a Leamigo activity that needs one, priced for the party.
// `times` is empty when the supplier takes any start time (`anyTime: true`).

import { NextResponse } from 'next/server';
import { activityAvailability, inrRatesFor, isLive } from '@gg/leamigo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const b = await req.json().catch(() => null);
  const activityId = Number(b?.activityId), optionId = Number(b?.optionId), quantity = Math.max(1, Number(b?.quantity) || 1);
  if (!activityId || !optionId || !/^\d{4}-\d{2}-\d{2}$/.test(b?.date ?? '')) return NextResponse.json({ ok: false, error: 'Missing activity or date.' }, { status: 400 });
  if (!isLive()) return NextResponse.json({ ok: false, error: 'Live activities are not connected.' });
  try {
    const [av, fx] = await Promise.all([activityAvailability(activityId, optionId, b.date), inrRatesFor()]);
    if (!av.available) return NextResponse.json({ ok: true, available: false, times: [], anyTime: false });
    const times = av.timeslots.map((t) => {
      const tk = t.tickets.find((k) => k.id === String(b.ticketId)) ?? (t.tickets.length === 1 ? t.tickets[0] : undefined);
      const unitMinor = tk?.priceMinor ?? t.priceMinor;
      const cur = tk?.currency ?? t.currency;
      const pricePaise = unitMinor !== undefined && cur ? fx(Math.round(unitMinor * quantity), cur) : null;
      return {
        start: t.start, end: t.end,
        available: t.available && (t.capacity === null || t.capacity >= quantity),
        seatsLeft: t.capacity,
        ticketId: tk?.id ?? null,
        pricePaise,
      };
    });
    return NextResponse.json({ ok: true, available: true, times, anyTime: times.length === 0 });
  } catch (e: any) {
    console.error('[activity-times]', e?.message);
    return NextResponse.json({ ok: false, error: "Start times couldn't load. Try again in a minute." });
  }
}
