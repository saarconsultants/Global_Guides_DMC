// POST /api/activity-options — one Leamigo activity's options for a party, asked for
// when an agent opens a listing that search didn't get to check.

import { NextResponse } from 'next/server';
import { leamigoActivityOptions } from '@gg/leamigo';
import { getActor } from '@/lib/auth/ctx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!(await getActor())) return NextResponse.json({ ok: false, error: 'Please sign in.' }, { status: 401 });
  const b = await req.json().catch(() => null);
  const id = Number(b?.activityId);
  if (!id) return NextResponse.json({ ok: false, error: 'Missing activity.' }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, options: await leamigoActivityOptions(id, Number(b.adults) || 1, Number(b.children) || 0) });
  } catch {
    return NextResponse.json({ ok: false, error: 'The supplier did not answer.' }, { status: 502 });
  }
}
