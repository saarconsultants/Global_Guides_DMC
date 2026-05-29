import { NextResponse } from 'next/server';
import { z } from 'zod';
import { recordProposalResponse } from '@/lib/db/share';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  action: z.enum(['ACCEPT', 'DECLINE']),
  feedback: z.string().max(2000).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  try {
    await recordProposalResponse(token, parsed.data.action);
    // feedback (decline reason) — log to console for now; persist as ProposalNote in a later iteration
    if (parsed.data.feedback) console.log(`[Proposal ${token}] customer feedback:`, parsed.data.feedback);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'failed' }, { status: 500 });
  }
}
