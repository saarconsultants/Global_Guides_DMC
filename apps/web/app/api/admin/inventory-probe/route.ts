import { NextResponse } from 'next/server';
import { getActor } from '@/lib/auth/ctx';
import { probeApi } from '@/lib/inventory-probe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// On-demand supplier reachability probe for the admin Inventory APIs page.
// Super-admin only. Result is cached ~5min server-side (see probeApi).
export async function POST(req: Request) {
  const actor = await getActor();
  if (!actor || actor.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json().catch(() => ({} as any));
  const key = body?.key;
  if (typeof key !== 'string') return NextResponse.json({ error: 'Missing key' }, { status: 400 });
  try {
    return NextResponse.json(await probeApi(key, true));
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message ?? e) }, { status: 400 });
  }
}
