import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { inventoryStatus } from '@/lib/inventory-status';
import { probeApi } from '@/lib/inventory-probe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Used by Vercel + uptime monitors to verify the app + DB are alive.
// Also reports which inventory APIs are live so Bipin can verify keys
// without logging in. GET /api/health → 200 if DB up, 503 if unreachable.
// ?check=1 also asks each supplier whether it accepts our key (cached ~5 min,
// so this can't be used to hammer them). Yes/no and status code only.
export async function GET(req: Request) {
  const start = Date.now();
  const apis = inventoryStatus();
  let suppliers: Record<string, { ok: boolean; status: number | null }> | undefined;
  if (new URL(req.url).searchParams.get('check')) {
    const [leamigo, flights] = await Promise.all([probeApi('leamigo'), probeApi('flights')]);
    suppliers = {
      leamigo: { ok: !!leamigo.reachable, status: leamigo.status ?? null },
      flights: { ok: !!flights.reachable, status: flights.status ?? null },
    };
  }
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      uptime: process.uptime(),
      dbLatencyMs: Date.now() - start,
      env: process.env.VERCEL_ENV ?? 'local',
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      inventory: apis.reduce<Record<string, boolean>>((acc, a) => { acc[a.key] = a.live; return acc; }, {}),
      suppliers,
      time: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e), inventory: apis.reduce<Record<string, boolean>>((acc, a) => { acc[a.key] = a.live; return acc; }, {}) }, { status: 503 });
  }
}
