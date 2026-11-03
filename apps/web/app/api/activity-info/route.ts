// GET /api/activity-info?id=<leamigo activity id> — everything the supplier
// publishes about one activity, loaded when an agent opens its details.

import { NextResponse } from 'next/server';
import { leamigoActivityInfo } from '@gg/leamigo';
import { getActor } from '@/lib/auth/ctx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await getActor())) return NextResponse.json({ ok: false, error: 'Please sign in.' }, { status: 401 });
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ ok: false, error: 'Missing activity.' }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, info: await leamigoActivityInfo(id) });
  } catch {
    return NextResponse.json({ ok: false, error: "Details couldn't load. Try again in a minute." }, { status: 502 });
  }
}
