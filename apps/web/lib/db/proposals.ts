// CRUD helpers for proposals + leads. Multi-tenant aware via requireAgency().

import { randomBytes } from 'node:crypto';
import { db } from './client';
import { requireAgency } from '@/lib/auth/ctx';
import { computeAndRecordCommissions } from './commissions';
import { emitNotification } from './notifications';
import { parseMarkupRules, resolveTripMarkupPct } from '@/lib/markup';
import type { Itinerary } from '@/lib/itinerary/types';

const PROPOSAL_PREFIX = 'GG';

function genCode() {
  const n = Math.floor(10000 + Math.random() * 89999);
  return `${PROPOSAL_PREFIX}-${n}`;
}

function genShareToken() {
  return randomBytes(18).toString('base64url');
}

export interface SaveProposalArgs {
  itinerary: Itinerary;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  markupPct?: number;        // override of agency default
}

/** Net (the builder's price), the agent's markup on top, and the customer total. */
async function priceProposal(agencyId: string, it: Itinerary, override?: number) {
  const net = BigInt(it.pricePaise);
  let markupPct: number;
  if (typeof override === 'number' && override >= 0 && override <= 100) {
    markupPct = override;
  } else {
    // No per-proposal override: the agency's destination/season rules, then its default.
    const agency = await db.agency.findUnique({ where: { id: agencyId }, select: { markupPct: true, markupRulesJson: true } });
    markupPct = resolveTripMarkupPct(agency?.markupPct ?? 15, {
      rules: parseMarkupRules(agency?.markupRulesJson),
      destinationCodes: it.destinations.map((d) => d.cityCode),
      travelDate: it.intake.departureDate,
    }).pct;
  }
  // Integer basis-point math (handles fractional % like 12.5): exact, no float round-trip on money.
  const total = net + (net * BigInt(Math.round(markupPct * 100))) / 10000n;
  const adults = it.intake.rooms.reduce((s, r) => s + r.adults, 0) || 1;
  return { net, markup: total - net, total, perAdult: BigInt(Math.round(Number(total) / adults)) };
}

const contentOf = (it: Itinerary) => ({
  name: tripName(it),
  travelDate: new Date(it.intake.departureDate),
  nationality: it.intake.nationality,
  travelers: JSON.stringify({ rooms: it.intake.rooms }),
  destinations: JSON.stringify(it.destinations),
  days: JSON.stringify(it.days),
  flights: it.flights ? JSON.stringify(it.flights) : null,
  visa: JSON.stringify(it.visa),
  insurance: JSON.stringify(it.insurance),
});

/**
 * Save edits to an existing proposal in place: same code, same customer link, same lead.
 * A proposal the customer already accepted goes back to SENT, because what they accepted has changed.
 */
export async function updateProposal(args: SaveProposalArgs & { proposalId: string }): Promise<{ id: string; code: string; shareToken: string }> {
  const actor = await requireAgency();
  const it = args.itinerary;
  const p = await db.proposal.findFirst({ where: { id: args.proposalId, agencyId: actor.agencyId } });
  if (!p) throw new Error('Proposal not found.');
  if (p.status === 'BOOKED') throw new Error('This trip is already booked, so it can\u2019t be changed here. Use Copy on the Proposals page to quote a new one.');
  if (p.status === 'SUPERSEDED' || p.status === 'DECLINED') throw new Error('This proposal is closed. Use Copy on the Proposals page to start a new one from it.');
  const price = await priceProposal(actor.agencyId, it, args.markupPct);
  const changedPrice = price.total !== p.pricePaise;
  await db.proposal.update({
    where: { id: p.id },
    data: {
      ...contentOf(it),
      netCostPaise: price.net, markupPaise: price.markup, pricePaise: price.total, pricePerAdultPaise: price.perAdult,
      ...(p.status === 'ACCEPTED' ? { status: 'SENT', acceptedAt: null } : {}),
    },
  });
  if (p.leadId) {
    const name = args.customerName?.trim();
    await db.lead.update({
      where: { id: p.leadId },
      data: {
        ...(name ? { customerName: name } : {}),
        ...(args.customerEmail !== undefined ? { customerEmail: args.customerEmail || null } : {}),
        ...(args.customerPhone !== undefined ? { customerPhone: args.customerPhone || null } : {}),
        destinations: it.destinations.map((d) => d.cityCode).join(','),
        travelDate: new Date(it.intake.departureDate),
        nights: it.destinations.reduce((s, d) => s + d.nights, 0),
      },
    });
    await db.leadNote.create({ data: { leadId: p.leadId, authorId: actor.userId, kind: 'SYSTEM', body: `Updated ${p.code}${changedPrice ? ' with a new price' : ''}${p.status === 'ACCEPTED' ? '. The customer needs to accept it again.' : ''}` } });
  }
  await computeAndRecordCommissions(p.id);
  return { id: p.id, code: p.code, shareToken: p.shareToken };
}

function tripName(it: Itinerary): string {
  const cities = it.destinations.map((d) => d.cityName).join(' + ');
  const nights = it.destinations.reduce((s, d) => s + d.nights, 0);
  return `${cities} · ${nights}N`;
}

export async function saveProposal(args: SaveProposalArgs): Promise<{ id: string; code: string; shareToken: string }> {
  const actor = await requireAgency();
  const it = args.itinerary;

  // The builder's price is the supplier-net total; the agent's markup goes on top at save.
  const price = await priceProposal(actor.agencyId, it, args.markupPct);

  const lead = await db.lead.create({
    data: {
      agencyId: actor.agencyId,
      customerName: args.customerName ?? 'Unknown customer',
      customerEmail: args.customerEmail,
      customerPhone: args.customerPhone,
      destinations: it.destinations.map((d) => d.cityCode).join(','),
      originCity: it.intake.leavingFromName,
      travelDate: new Date(it.intake.departureDate),
      nights: it.destinations.reduce((s, d) => s + d.nights, 0),
      source: 'builder',
      status: 'QUOTED',
    },
  });

  const proposal = await db.proposal.create({
    data: {
      code: genCode(),
      agencyId: actor.agencyId,
      ownerUserId: actor.userId,
      leadId: lead.id,
      ...contentOf(it),
      netCostPaise: price.net,
      markupPaise: price.markup,
      pricePaise: price.total,
      pricePerAdultPaise: price.perAdult,
      currency: it.currency,
      shareToken: genShareToken(),
      status: 'DRAFT',
    },
  });

  // Record commission ledger entries (platform revenue)
  await computeAndRecordCommissions(proposal.id);

  // Notify the agency that a new proposal is out the door
  await emitNotification({
    agencyId: actor.agencyId,
    userId: actor.userId,
    kind: 'PROPOSAL_SENT',
    title: `Proposal ${proposal.code} saved`,
    body: `${args.customerName ?? 'Unknown customer'} · ${tripName(it)}`,
    href: `/proposals`,
  });

  return { id: proposal.id, code: proposal.code, shareToken: proposal.shareToken };
}

export interface ProposalListFilter {
  q?: string;            // searches code, customer name, trip name, destinations CSV
  status?: string;
  from?: Date;
  to?: Date;
}

export async function listProposals(filter: ProposalListFilter = {}) {
  const actor = await requireAgency();
  const where: any = { agencyId: actor.agencyId };
  if (filter.status) where.status = filter.status;
  if (filter.from || filter.to) where.createdAt = { ...(filter.from && { gte: filter.from }), ...(filter.to && { lte: filter.to }) };
  if (filter.q) {
    const q = filter.q.trim();
    where.OR = [
      { code: { contains: q } },
      { name: { contains: q } },
      { lead: { customerName: { contains: q } } },
      { lead: { customerEmail: { contains: q } } },
      { lead: { destinations: { contains: q } } },
    ];
  }
  // List columns only — the itinerary JSON (days/flights/visa/insurance/travelers)
  // is large and only needed when a single proposal is opened.
  return db.proposal.findMany({
    where, orderBy: { createdAt: 'desc' }, take: 200,
    select: {
      id: true, code: true, name: true, status: true, version: true,
      travelDate: true, createdAt: true, pricePaise: true, netCostPaise: true, shareToken: true,
      lead: { select: { customerName: true } },
    },
  });
}

export async function getProposal(id: string) {
  const actor = await requireAgency();
  return db.proposal.findFirst({ where: { id, agencyId: actor.agencyId }, include: { lead: true } });
}

export async function duplicateProposal(sourceId: string): Promise<{ id: string; code: string } | null> {
  const actor = await requireAgency();
  const src = await db.proposal.findFirst({ where: { id: sourceId, agencyId: actor.agencyId } });
  if (!src) return null;

  const copy = await db.proposal.create({
    data: {
      code: genCode(),
      agencyId: actor.agencyId,
      ownerUserId: actor.userId,
      leadId: src.leadId,
      name: `${src.name} (copy)`,
      travelDate: src.travelDate,
      nationality: src.nationality,
      travelers: src.travelers,
      destinations: src.destinations,
      days: src.days,
      flights: src.flights,
      visa: src.visa,
      insurance: src.insurance,
      netCostPaise: src.netCostPaise,
      markupPaise: src.markupPaise,
      pricePaise: src.pricePaise,
      pricePerAdultPaise: src.pricePerAdultPaise,
      currency: src.currency,
      shareToken: genShareToken(),
      status: 'DRAFT',
    },
  });
  // Log a note on the source's lead if there is one
  if (src.leadId) {
    await db.leadNote.create({ data: { leadId: src.leadId, authorId: actor.userId, kind: 'SYSTEM', body: `Duplicated ${src.code} → ${copy.code}` } });
  }
  return { id: copy.id, code: copy.code };
}

// Create a revised version: a linked copy with version+1. The source is
// marked SUPERSEDED. Returns the new proposal id+code (or null).
export async function reviseProposal(sourceId: string): Promise<{ id: string; code: string } | null> {
  const actor = await requireAgency();
  const src = await db.proposal.findFirst({ where: { id: sourceId, agencyId: actor.agencyId } });
  if (!src) return null;

  const next = await db.proposal.create({
    data: {
      code: genCode(),
      agencyId: actor.agencyId,
      ownerUserId: actor.userId,
      leadId: src.leadId,
      name: src.name,
      travelDate: src.travelDate,
      nationality: src.nationality,
      travelers: src.travelers,
      destinations: src.destinations,
      days: src.days,
      flights: src.flights,
      visa: src.visa,
      insurance: src.insurance,
      netCostPaise: src.netCostPaise,
      markupPaise: src.markupPaise,
      pricePaise: src.pricePaise,
      pricePerAdultPaise: src.pricePerAdultPaise,
      currency: src.currency,
      shareToken: genShareToken(),
      status: 'DRAFT',
      version: ((src as any).version ?? 1) + 1,
      revisedFromId: src.id,
    },
  });
  // Retire the old version so its share link no longer collects responses.
  await db.proposal.update({ where: { id: src.id }, data: { status: 'SUPERSEDED' } });
  if (src.leadId) {
    await db.leadNote.create({ data: { leadId: src.leadId, authorId: actor.userId, kind: 'SYSTEM', body: `Revised ${src.code} → ${next.code} (v${(next as any).version})` } });
  }
  return { id: next.id, code: next.code };
}

export interface LeadListFilter { q?: string; status?: string }

export async function listLeads(filter: LeadListFilter = {}) {
  const actor = await requireAgency();
  const where: any = { agencyId: actor.agencyId };
  if (filter.status) where.status = filter.status;
  if (filter.q) {
    const q = filter.q.trim();
    where.OR = [
      { customerName: { contains: q } },
      { customerEmail: { contains: q } },
      { customerPhone: { contains: q } },
      { destinations:  { contains: q } },
      { originCity:    { contains: q } },
    ];
  }
  return db.lead.findMany({
    where, orderBy: { createdAt: 'desc' },
    include: { proposals: { select: { id: true, code: true, pricePaise: true, status: true } } },
    take: 200,
  });
}

// Convert a DB Proposal row back into a runtime Itinerary (best-effort)
export function proposalToItinerary(p: Awaited<ReturnType<typeof getProposal>>): Itinerary | null {
  if (!p) return null;
  const travelers = JSON.parse(p.travelers);
  return {
    id: p.id,
    createdAt: p.createdAt.toISOString(),
    intake: {
      destinations: (JSON.parse(p.destinations) as any[]).map((d) => ({ cityCode: d.cityCode, cityName: d.cityName, countryCode: d.countryCode ?? '', nights: d.nights })),
      leavingFromCode: '',
      leavingFromName: '',
      nationality: p.nationality,
      departureDate: p.travelDate.toISOString().slice(0, 10),
      rooms: travelers.rooms,
      addTransfers: true,
    },
    destinations: JSON.parse(p.destinations),
    days: JSON.parse(p.days),
    visa: JSON.parse(p.visa),
    insurance: JSON.parse(p.insurance),
    flights: p.flights ? JSON.parse(p.flights) : undefined,
    pricePaise: Number(p.pricePaise),
    pricePerAdultPaise: Number(p.pricePerAdultPaise),
    currency: p.currency as 'INR',
    status: p.status.toLowerCase() as Itinerary['status'],
  };
}
