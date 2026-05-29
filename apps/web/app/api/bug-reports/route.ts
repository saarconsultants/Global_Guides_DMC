import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getActor } from '@/lib/auth/ctx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 }); }

  const title = String(body.title ?? '').trim();
  const bodyText = String(body.body ?? '').trim();
  if (!title || !bodyText) return NextResponse.json({ ok: false, error: 'Title and description required' }, { status: 400 });

  const severity = ['LOW', 'MEDIUM', 'HIGH', 'BLOCKER'].includes(String(body.severity).toUpperCase()) ? String(body.severity).toUpperCase() : 'MEDIUM';
  const category = ['BUG', 'UX', 'DATA', 'PERFORMANCE', 'FEATURE_REQUEST', 'OTHER'].includes(String(body.category).toUpperCase()) ? String(body.category).toUpperCase() : 'BUG';

  // Optional session (a customer on /p/[token] can also report — userId stays null)
  let userId: string | null = null;
  let agencyId: string | null = null;
  let userName: string | null = null;
  let userEmail: string | null = null;
  try {
    const actor = await getActor();
    if (actor?.userId) {
      userId = actor.userId;
      agencyId = actor.agencyId ?? null;
      userName = actor.name ?? null;
      userEmail = actor.email ?? null;
    }
  } catch { /* unauth → ok */ }

  const report = await db.bugReport.create({
    data: {
      agencyId, userId, userName, userEmail,
      severity, category,
      title: title.slice(0, 200),
      body: bodyText.slice(0, 4000),
      pageUrl:   String(body.pageUrl   ?? '').slice(0, 500) || null,
      userAgent: String(body.userAgent ?? '').slice(0, 500) || null,
      viewport:  String(body.viewport  ?? '').slice(0, 20)  || null,
    },
  });

  // Best-effort Slack ping (only if SLACK_BUG_WEBHOOK is set)
  const hook = process.env.SLACK_BUG_WEBHOOK;
  if (hook) {
    const sevEmoji: Record<string, string> = { LOW: 'ℹ️', MEDIUM: '⚠️', HIGH: '🔥', BLOCKER: '🚨' };
    const txt = `${sevEmoji[severity] ?? '⚠️'} *[${severity}] ${category}* — ${title}\n` +
                `> ${bodyText.slice(0, 300)}${bodyText.length > 300 ? '…' : ''}\n` +
                `Reporter: ${userName ?? userEmail ?? 'anonymous'}` +
                (body.pageUrl ? ` · <${body.pageUrl}>` : '');
    fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: txt }) }).catch(() => {});
  }

  return NextResponse.json({ ok: true, id: report.id });
}
