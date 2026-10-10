// Public proposal access by shareToken (no agency check — token IS the auth).

import { db } from './client';
import { proposalToItinerary } from './proposals';
import { emitNotification } from './notifications';

export async function getProposalByToken(token: string) {
  const p = await db.proposal.findUnique({ where: { shareToken: token }, include: { lead: true, agency: { select: { id: true, name: true, code: true, contact: true, email: true, primaryColor: true, accentColor: true, logoUrl: true, tagline: true, footerText: true, supportEmail: true, supportPhone: true, currency: true } } } });
  return p;
}

export async function recordProposalView(token: string) {
  // Only fire once per (token, day): we look for an existing PROPOSAL_VIEWED note today.
  try {
    const p = await db.proposal.findUnique({ where: { shareToken: token }, select: { id: true, code: true, agencyId: true, lastViewedAt: true, status: true, ownerUserId: true } });
    if (!p) return;
    const isFirstView = !p.lastViewedAt;
    await db.proposal.update({ where: { id: p.id }, data: { lastViewedAt: new Date(), status: p.status === 'DRAFT' || p.status === 'SENT' ? 'VIEWED' : p.status } });
    if (isFirstView) {
      await emitNotification({
        agencyId: p.agencyId, userId: p.ownerUserId,
        kind: 'PROPOSAL_VIEWED',
        title: `${p.code} opened by customer`,
        body: `Your customer just opened the proposal. Now might be a great time to follow up.`,
        href: `/proposals`,
      });
    }
  } catch { /* viewing should never error the page */ }
}

/** Customer accepted the proposal. Returns false if the link is unknown. */
export async function recordProposalAcceptance(token: string): Promise<boolean> {
  const p = await db.proposal.findUnique({ where: { shareToken: token }, select: { id: true, code: true, agencyId: true, ownerUserId: true, status: true } });
  if (!p) return false;
  // Already accepted or booked: nothing to change, don't notify twice.
  if (p.status === 'ACCEPTED' || p.status === 'BOOKED') return true;
  await db.proposal.update({
    where: { id: p.id },
    data: { status: 'ACCEPTED', acceptedAt: new Date() },
  });
  await emitNotification({
    agencyId: p.agencyId, userId: p.ownerUserId,
    kind: 'PROPOSAL_ACCEPTED',
    title: `🎉 ${p.code} accepted`,
    body: 'Customer accepted the proposal. Convert to a booking.',
    href: '/proposals',
  });
  return true;
}

/**
 * Customer asked for changes. This does NOT change the proposal's status:
 * we record their message on the lead (when the proposal has one) and
 * notify the agency so they can send a revised version.
 */
export async function recordProposalChangeRequest(token: string, message: string): Promise<boolean> {
  const p = await db.proposal.findUnique({ where: { shareToken: token }, select: { id: true, code: true, agencyId: true, ownerUserId: true, leadId: true } });
  if (!p) return false;
  if (p.leadId) {
    await db.leadNote.create({
      data: { leadId: p.leadId, authorId: null, kind: 'NOTE', body: `Customer asked for changes on ${p.code}:\n${message}` },
    });
  }
  const preview = message.length > 400 ? `${message.slice(0, 400)}…` : message;
  await emitNotification({
    agencyId: p.agencyId, userId: p.ownerUserId,
    kind: 'PROPOSAL_CHANGES_REQUESTED',
    title: `${p.code}: customer asked for changes`,
    body: `"${preview}"`,
    href: p.leadId ? `/leads/${p.leadId}` : '/proposals',
  });
  return true;
}

export { proposalToItinerary };
