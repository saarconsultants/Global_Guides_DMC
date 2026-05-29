import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Used by Vercel + uptime monitors to verify the app + DB are alive.
// GET /api/health → 200 if all green, 503 if DB unreachable.
export async function GET() {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      uptime: process.uptime(),
      dbLatencyMs: Date.now() - start,
      env: process.env.VERCEL_ENV ?? 'local',
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      time: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 503 });
  }
}
