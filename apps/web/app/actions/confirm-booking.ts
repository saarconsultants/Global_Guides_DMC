'use server';
import { db } from '@/lib/db/client';
import { requireAgency } from '@/lib/auth/ctx';
import { emitNotification } from '@/lib/db/notifications';
import { revalidatePath } from 'next/cache';

export type ConfirmBookingResult =
  | { ok: true; bookingId: string; code: string }
  | { ok: false; error: 'not_found' | 'already_booked' | 'insufficient_funds' | 'bad_status'; balancePaise?: string; netPaise?: string };

/**
 * Convert an accepted proposal into a confirmed booking:
 *   guard → check wallet balance → (atomic) create Booking + debit wallet +
 *   mark proposal BOOKED + mark lead BOOKED. The agency's prepaid wallet is
 *   debited at NET supplier cost (markup is the agency's retained margin).
 *
 * Supplier-side confirmation (PNRs / vouchers from Tripjack/Hotelbeds) is added
 * by ops after this internal booking — flipping on live supplier commits needs
 * production keys + owner sign-off, so we don't call them here.
 */
export async function confirmBookingAction(proposalId: string): Promise<ConfirmBookingResult> {
  const actor = await requireAgency();

  const proposal = await db.proposal.findFirst({
    where: { id: proposalId, agencyId: actor.agencyId },
    include: { lead: true },
  });
  if (!proposal) return { ok: false, error: 'not_found' };
  if (proposal.status === 'BOOKED') return { ok: false, error: 'already_booked' };
  if (proposal.status === 'SUPERSEDED' || proposal.status === 'DECLINED') return { ok: false, error: 'bad_status' };

  // Idempotency: never double-book the same proposal.
  const existing = await db.booking.findFirst({ where: { proposalId, agencyId: actor.agencyId } });
  if (existing) return { ok: false, error: 'already_booked' };

  const net = proposal.netCostPaise;
  // Fast-path UX check only — the authoritative balance check happens atomically
  // inside the transaction below (a read-then-write here would race).
  const agency = await db.agency.findUnique({ where: { id: actor.agencyId }, select: { walletPaise: true } });
  const balance = agency?.walletPaise ?? 0n;
  if (balance < net) {
    return { ok: false, error: 'insufficient_funds', balancePaise: String(balance), netPaise: String(net) };
  }

  let booking: { id: string };
  try {
    booking = await db.$transaction(async (tx) => {
      // Gate 1 — atomically claim the proposal. Two concurrent confirms can both
      // pass the pre-checks above; only one wins this conditional flip.
      const claimed = await tx.proposal.updateMany({
        where: { id: proposalId, agencyId: actor.agencyId, status: { notIn: ['BOOKED', 'SUPERSEDED', 'DECLINED'] } },
        data: { status: 'BOOKED' },
      });
      if (claimed.count === 0) throw new Error('ALREADY_BOOKED');

      // Gate 2 — atomic conditional debit: only succeeds if the balance still
      // covers the net cost at write time. Prevents concurrent overdraw.
      const debited = await tx.agency.updateMany({
        where: { id: actor.agencyId, walletPaise: { gte: net } },
        data: { walletPaise: { decrement: net } },
      });
      if (debited.count === 0) throw new Error('INSUFFICIENT_FUNDS');

      const b = await tx.booking.create({
        data: { agencyId: actor.agencyId, proposalId, paidPaise: net, status: 'CONFIRMED' },
      });
      await tx.walletTxn.create({
        data: { agencyId: actor.agencyId, type: 'DEBIT', amountPaise: net, ref: proposal.code, note: `Booking confirmed · ${proposal.name}` },
      });
      if (proposal.leadId) await tx.lead.update({ where: { id: proposal.leadId }, data: { status: 'BOOKED' } });
      return b;
    });
  } catch (e: any) {
    if (e?.message === 'ALREADY_BOOKED') return { ok: false, error: 'already_booked' };
    if (e?.message === 'INSUFFICIENT_FUNDS') {
      const a = await db.agency.findUnique({ where: { id: actor.agencyId }, select: { walletPaise: true } });
      return { ok: false, error: 'insufficient_funds', balancePaise: String(a?.walletPaise ?? 0n), netPaise: String(net) };
    }
    throw e;
  }

  await emitNotification({
    agencyId: actor.agencyId,
    userId: actor.userId,
    kind: 'BOOKING_CONFIRMED',
    title: `Booking confirmed · ${proposal.code}`,
    body: `${proposal.lead?.customerName ?? 'Customer'} · ${proposal.name}`,
    href: '/bookings',
  });

  revalidatePath('/bookings');
  revalidatePath('/proposals');
  revalidatePath('/statement');
  revalidatePath('/leads');
  revalidatePath('/dashboard');
  return { ok: true, bookingId: booking.id, code: proposal.code };
}
