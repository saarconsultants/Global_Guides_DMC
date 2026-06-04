import { NextResponse } from 'next/server';
import { z } from 'zod';
import { searchFlights, TripjackHttpError, TripjackBizError } from '@gg/tripjack';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  from: z.string().length(3),
  to: z.string().length(3),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.coerce.number().int().min(1).max(9),
  children: z.coerce.number().int().min(0).max(4).default(0),
  infants: z.coerce.number().int().min(0).max(4).default(0),
  cabin: z.enum(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST']).default('ECONOMY'),
  directOnly: z.coerce.boolean().default(false),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parse = schema.safeParse(Object.fromEntries(url.searchParams));
  if (!parse.success) return NextResponse.json({ error: parse.error.flatten() }, { status: 400 });
  const q = parse.data;
  try {
    const result = await searchFlights({
      legs: [{ fromIATA: q.from, toIATA: q.to, date: q.date }],
      adults: q.adults,
      children: q.children,
      infants: q.infants,
      cabin: q.cabin,
      directOnly: q.directOnly,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    // Full detail (incl. raw upstream body) to server logs only — never to the client.
    console.error('[flights/search] error:', err?.body ? `${err.message}\n--- upstream body ---\n${String(err.body).slice(0, 1000)}` : err);
    if (err instanceof TripjackHttpError) {
      return NextResponse.json({ error: err.userMessage, upstream: err.upstream }, { status: err.upstream ? 502 : 400 });
    }
    if (err instanceof TripjackBizError) {
      return NextResponse.json({ error: 'Tripjack could not fulfil this search. Try different dates or route.', upstream: false }, { status: 422 });
    }
    return NextResponse.json({ error: 'Flight search failed. Please try again.', upstream: false }, { status: 500 });
  }
}
