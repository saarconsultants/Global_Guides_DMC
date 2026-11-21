// POST /api/public/razorpay-webhook — Razorpay telling us a payment was captured.
// Credits a top-up whose browser tab closed before it reported back. Signed by
// Razorpay over the raw body; anything unsigned is refused.
import { NextResponse } from 'next/server';
import { creditTopup } from '@/lib/db/topup';
import { validWebhookSignature } from '@/lib/payments/razorpay';
import { db } from '@/lib/db/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const raw = await req.text();
  if (!validWebhookSignature(raw, req.headers.get('x-razorpay-signature'))) return NextResponse.json({ ok: false }, { status: 401 });
  let event: any;
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const pay = event?.payload?.payment?.entity;
  if (event?.event === 'payment.captured' && pay?.order_id && pay?.id) {
    const topup = await db.walletTopup.findUnique({ where: { orderId: String(pay.order_id) } });
    // Not one of ours, or the amount differs: acknowledge and ignore.
    if (topup && BigInt(pay.amount ?? 0) === topup.amountPaise) await creditTopup(topup.orderId, String(pay.id));
  }
  return NextResponse.json({ ok: true });   // always 200 for a signed event, so Razorpay stops retrying
}
