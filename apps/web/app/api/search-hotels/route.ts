// POST /api/search-hotels — see comment in search-activities/route.ts for why this isn't a server action.

import { NextResponse } from 'next/server';
import { searchLiveHotels } from '@/lib/hotels/live';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface Body {
  cityCode: string;
  checkIn: string;
  checkOut: string;
  rooms: Array<{ adults: number; children?: number; childAges?: number[] }>;
  nationality?: string;
  includeUnpriced?: boolean;
}

export async function POST(req: Request) {
  let input: Body;
  try { input = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }); }

  try {
    const res = await searchLiveHotels({ ...input, rooms: input.rooms.map((r) => ({ adults: r.adults, children: r.children ?? 0, childAges: r.childAges })), nationality: input.nationality, includeUnpriced: input.includeUnpriced === true });
    return NextResponse.json({
      ok: true,
      hotels: res.hotels,
      source: res.source,
      warning: res.warning,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) });
  }
}

