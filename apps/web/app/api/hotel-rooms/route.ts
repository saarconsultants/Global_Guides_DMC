// POST /api/hotel-rooms — a Unifystays hotel's live room offers, fetched when the
// agent opens Change room (Unifystays search gives one price per hotel, not rooms).

import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth/ctx';
import { unifyIsLive, unifyRoomOptions, UNIFY_PREFIX } from '@/lib/hotels/unifystays';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request) {
  if (!(await getActor())) return NextResponse.json({ ok: false, error: 'Please sign in.' }, { status: 401 });
  const b = await req.json().catch(() => null);
  const hotelId = String(b?.hotelId ?? '');
  const rooms = Array.isArray(b?.rooms) ? b.rooms.slice(0, 8).map((r: any) => ({ adults: Math.max(1, Number(r?.adults) || 1), children: Math.max(0, Number(r?.children) || 0), childAges: Array.isArray(r?.childAges) ? r.childAges.map(Number) : undefined })) : [];
  if (!hotelId.startsWith(UNIFY_PREFIX) || !ISO.test(b?.checkIn ?? '') || !ISO.test(b?.checkOut ?? '') || !rooms.length) {
    return NextResponse.json({ ok: false, error: 'Missing hotel, dates or rooms.' }, { status: 400 });
  }
  if (!unifyIsLive()) return NextResponse.json({ ok: false, error: 'Unifystays is not connected.' }, { status: 503 });
  try {
    const res = await unifyRoomOptions(hotelId, { checkIn: b.checkIn, checkOut: b.checkOut, rooms, nationality: b.nationality });
    return NextResponse.json({ ok: true, ...res });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Rooms could not load.' }, { status: 502 });
  }
}
