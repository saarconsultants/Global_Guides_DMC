import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { inventoryStatus } from '@/lib/inventory-status';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Used by Vercel + uptime monitors to verify the app + DB are alive.
// Also reports which inventory APIs are live so Bipin can verify keys
// without logging in. GET /api/health → 200 if DB up, 503 if unreachable.
export async function GET() {
  const start = Date.now();
  const apis = inventoryStatus();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      uptime: process.uptime(),
      dbLatencyMs: Date.now() - start,
      env: process.env.VERCEL_ENV ?? 'local',
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      inventory: apis.reduce<Record<string, boolean>>((acc, a) => { acc[a.key] = a.live; return acc; }, {}),
      time: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e), inventory: apis.reduce<Record<string, boolean>>((acc, a) => { acc[a.key] = a.live; return acc; }, {}) }, { status: 503 });
  }
}
