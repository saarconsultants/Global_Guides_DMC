// Crediting an online wallet top-up exactly once, however many times it is reported
// (the browser's callback and the gateway's webhook can both arrive, in any order).

import { db } from './client';

export async function creditTopup(orderId: string, paymentId: string): Promise<{ credited: boolean; amountPaise: bigint; agencyId: string } | null> {
  const topup = await db.walletTopup.findUnique({ where: { orderId } });
  if (!topup) return null;
  const credited = await db.$transaction(async (tx) => {
    // The claim: only one caller flips CREATED → PAID.
    const claim = await tx.walletTopup.updateMany({ where: { orderId, status: 'CREATED' }, data: { status: 'PAID', paymentId, paidAt: new Date() } });
    if (claim.count === 0) return false;
    await tx.agency.update({ where: { id: topup.agencyId }, data: { walletPaise: { increment: topup.amountPaise } } });
    await tx.walletTxn.create({ data: { agencyId: topup.agencyId, type: 'CREDIT', amountPaise: topup.amountPaise, ref: paymentId, note: 'Online top-up' } });
    return true;
  });
  return { credited, amountPaise: topup.amountPaise, agencyId: topup.agencyId };
}
