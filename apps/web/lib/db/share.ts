// Public proposal access by shareToken (no agency check — token IS the auth).

import { db } from './client';
import { proposalToItinerary } from './proposals';
import { emitNotification } from './notifications';

export async function getProposalByToken(token: string) {
  const p = await db.proposal.findUnique({ where: { shareToken: token }, include: { lead: true, agency: { select: { id: true, name: true, code: true, contact: true, email: true, primaryColor: true, accentColor: true, logoUrl: true, tagline: true, footerText: true, supportEmail: true, supportPhone: true } } } });
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

export async function recordProposalResponse(token: string, action: 'ACCEPT' | 'DECLINE') {
  const status = action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';
  const p = await db.proposal.findUnique({ where: { shareToken: token }, select: { id: true, code: true, agencyId: true, ownerUserId: true } });
  if (!p) return;
  await db.proposal.update({
    where: { id: p.id },
    data: { status, acceptedAt: action === 'ACCEPT' ? new Date() : null },
  });
  await emitNotification({
    agencyId: p.agencyId, userId: p.ownerUserId,
    kind: action === 'ACCEPT' ? 'PROPOSAL_ACCEPTED' : 'PROPOSAL_DECLINED',
    title: action === 'ACCEPT' ? `🎉 ${p.code} accepted` : `${p.code} declined`,
    body: action === 'ACCEPT' ? 'Customer accepted the proposal. Convert to a booking.' : 'Customer asked for changes. Open the proposal to revise.',
    href: '/proposals',
  });
}

export { proposalToItinerary };
