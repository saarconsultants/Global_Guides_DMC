import { NextResponse } from 'next/server';
import { z } from 'zod';
import { searchFlights } from '@gg/tripjack';

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
    return NextResponse.json({ error: err.message ?? 'Search failed' }, { status: 500 });
  }
}
