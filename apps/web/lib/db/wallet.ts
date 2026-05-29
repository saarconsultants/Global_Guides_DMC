import { db } from './client';
import { requireAgency } from '@/lib/auth/ctx';

export async function getWalletBalance(): Promise<bigint> {
  const actor = await requireAgency();
  const a = await db.agency.findUnique({ where: { id: actor.agencyId }, select: { walletPaise: true } });
  return a?.walletPaise ?? 0n;
}

export async function listWalletTxns(opts: { from?: Date; to?: Date } = {}) {
  const actor = await requireAgency();
  return db.walletTxn.findMany({
    where: {
      agencyId: actor.agencyId,
      ...(opts.from || opts.to ? { createdAt: { gte: opts.from, lte: opts.to } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
}

export async function recordWalletTxn(args: { type: 'CREDIT' | 'DEBIT' | 'REFUND'; amountPaise: bigint; ref?: string; note?: string }) {
  const actor = await requireAgency();
  return db.$transaction(async (tx) => {
    const row = await tx.walletTxn.create({
      data: { agencyId: actor.agencyId, type: args.type, amountPaise: args.amountPaise, ref: args.ref, note: args.note },
    });
    const delta = args.type === 'DEBIT' ? -args.amountPaise : args.amountPaise;
    await tx.agency.update({ where: { id: actor.agencyId }, data: { walletPaise: { increment: delta } } });
    return row;
  });
}
