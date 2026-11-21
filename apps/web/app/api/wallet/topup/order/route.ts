// POST /api/wallet/topup/order { rupees } — start an online wallet top-up.
import { NextResponse } from 'next/server';
import { requireAgency } from '@/lib/auth/ctx';
import { db } from '@/lib/db/client';
import { createOrder, isEnabled, keyId } from '@/lib/payments/razorpay';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIN_RUPEES = 100, MAX_RUPEES = 5_00_000;

export async function POST(req: Request) {
  const actor = await requireAgency();
  if (!isEnabled()) return NextResponse.json({ ok: false, error: 'Online top-up is not switched on yet. Use bank transfer.' }, { status: 503 });
  const rupees = Math.round(Number((await req.json().catch(() => null))?.rupees));
  if (!Number.isFinite(rupees) || rupees < MIN_RUPEES || rupees > MAX_RUPEES) {
    return NextResponse.json({ ok: false, error: `Enter an amount between ₹${MIN_RUPEES.toLocaleString('en-IN')} and ₹${MAX_RUPEES.toLocaleString('en-IN')}.` }, { status: 400 });
  }
  try {
    const order = await createOrder(rupees * 100, `wallet-${actor.agency?.code ?? actor.agencyId}-${Date.now()}`, { agencyId: actor.agencyId, purpose: 'wallet-topup' });
    // The amount is fixed here: later steps credit this record, never a figure from the browser.
    await db.walletTopup.create({ data: { orderId: order.id, agencyId: actor.agencyId, amountPaise: BigInt(rupees * 100) } });
    return NextResponse.json({ ok: true, orderId: order.id, amountPaise: rupees * 100, keyId: keyId(), agencyName: actor.agency?.name ?? '', email: actor.email });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'Could not start the payment.' }, { status: 502 });
  }
}
