import { NextResponse } from 'next/server';
import { z } from 'zod';
import { recordProposalAcceptance, recordProposalChangeRequest } from '@/lib/db/share';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ACCEPT marks the proposal accepted. REQUEST_CHANGES only passes the
// customer's message to the agency; the proposal's status stays as it is.
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('ACCEPT') }),
  z.object({ action: z.literal('REQUEST_CHANGES'), message: z.string().trim().min(1).max(2000) }),
]);

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Please check your message and try again.' }, { status: 400 });
  }
  try {
    const found = parsed.data.action === 'ACCEPT'
      ? await recordProposalAcceptance(token)
      : await recordProposalChangeRequest(token, parsed.data.message);
    if (!found) return NextResponse.json({ ok: false, error: 'This proposal link is no longer valid.' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[proposal respond]', e);
    return NextResponse.json({ ok: false, error: "We couldn't send that just now. Please try again." }, { status: 500 });
  }
}
