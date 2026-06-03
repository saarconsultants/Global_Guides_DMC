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
  const agency = await db.agency.findUnique({ where: { id: actor.agencyId }, select: { walletPaise: true } });
  const balance = agency?.walletPaise ?? 0n;
  if (balance < net) {
    return { ok: false, error: 'insufficient_funds', balancePaise: String(balance), netPaise: String(net) };
  }

  const booking = await db.$transaction(async (tx) => {
    const b = await tx.booking.create({
      data: { agencyId: actor.agencyId, proposalId, paidPaise: net, status: 'CONFIRMED' },
    });
    await tx.walletTxn.create({
      data: { agencyId: actor.agencyId, type: 'DEBIT', amountPaise: net, ref: proposal.code, note: `Booking confirmed · ${proposal.name}` },
    });
    await tx.agency.update({ where: { id: actor.agencyId }, data: { walletPaise: { decrement: net } } });
    await tx.proposal.update({ where: { id: proposalId }, data: { status: 'BOOKED' } });
    if (proposal.leadId) await tx.lead.update({ where: { id: proposal.leadId }, data: { status: 'BOOKED' } });
    return b;
  });

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
