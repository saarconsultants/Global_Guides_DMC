// POST /api/wallet/topup/verify { orderId, paymentId, signature } — the checkout reporting back.
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAgency } from '@/lib/auth/ctx';
import { db } from '@/lib/db/client';
import { creditTopup } from '@/lib/db/topup';
import { fetchPayment, validPaymentSignature } from '@/lib/payments/razorpay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const actor = await requireAgency();
  const b = await req.json().catch(() => null);
  const orderId = String(b?.orderId ?? ''), paymentId = String(b?.paymentId ?? '');
  const topup = await db.walletTopup.findUnique({ where: { orderId } });
  if (!topup || topup.agencyId !== actor.agencyId) return NextResponse.json({ ok: false, error: 'Top-up not found.' }, { status: 404 });
  if (!validPaymentSignature(orderId, paymentId, b?.signature)) return NextResponse.json({ ok: false, error: 'The payment could not be verified. If money left your account, contact support with the payment reference.' }, { status: 400 });
  try {
    // Credit only money the gateway has actually captured, for this order and this amount.
    const pay = await fetchPayment(paymentId);
    if (pay.order_id !== orderId || BigInt(pay.amount) !== topup.amountPaise) return NextResponse.json({ ok: false, error: 'The payment does not match this top-up.' }, { status: 400 });
    if (pay.status !== 'captured') return NextResponse.json({ ok: true, pending: true, message: 'Payment received and being processed. Your wallet is credited as soon as the bank confirms it, usually within minutes.' });
    const r = await creditTopup(orderId, paymentId);
    for (const p of ['/statement', '/dashboard', '/proposals']) revalidatePath(p);
    return NextResponse.json({ ok: true, credited: true, amountPaise: Number(r?.amountPaise ?? 0n) });
  } catch (e: any) {
    return NextResponse.json({ ok: true, pending: true, message: 'Payment received. We could not confirm it with the gateway just now; your wallet is credited automatically once it is confirmed.' });
  }
}
