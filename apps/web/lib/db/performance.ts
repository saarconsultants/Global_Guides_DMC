// Performance analytics (Tier 5).
//
//  - agentPerformance(agencyId)  → per-counsellor funnel for one agency (owner view)
//  - platformPerformance()       → per-agency funnel across the platform (super-admin)
//
// "Sent" counts proposals that actually reached a customer (left DRAFT, not retired).
// "Won" = ACCEPTED or BOOKED. Revenue sums the customer price of won proposals.

import { db } from './client';

const SENT_STATUSES = ['SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'BOOKED'];
const WON_STATUSES = ['ACCEPTED', 'BOOKED'];

export interface AgentRow {
  userId: string;
  name: string;
  email: string;
  role: string;
  drafts: number;
  sent: number;
  viewed: number;
  won: number;
  booked: number;
  revenuePaise: bigint;
  conversionPct: number;   // won / sent
}

export interface AgentPerformance {
  rows: AgentRow[];
  totals: { drafts: number; sent: number; viewed: number; won: number; booked: number; revenuePaise: bigint; conversionPct: number };
  windowDays: number | null;
}

function blankAgg() {
  return { drafts: 0, sent: 0, viewed: 0, won: 0, booked: 0, revenuePaise: 0n };
}

export async function agentPerformance(agencyId: string, opts: { windowDays?: number } = {}): Promise<AgentPerformance> {
  const since = opts.windowDays ? new Date(Date.now() - opts.windowDays * 86_400_000) : undefined;

  const [users, proposals] = await Promise.all([
    db.user.findMany({
      where: { agencyId },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { createdAt: 'asc' },
    }),
    db.proposal.findMany({
      where: { agencyId, ...(since && { createdAt: { gte: since } }) },
      select: { ownerUserId: true, status: true, pricePaise: true },
    }),
  ]);

  const agg = new Map<string, ReturnType<typeof blankAgg>>();
  for (const u of users) agg.set(u.id, blankAgg());
  const UNASSIGNED = '__unassigned__';

  for (const p of proposals) {
    const key = p.ownerUserId && agg.has(p.ownerUserId) ? p.ownerUserId : (p.ownerUserId ?? UNASSIGNED);
    if (!agg.has(key)) agg.set(key, blankAgg());
    const a = agg.get(key)!;
    if (p.status === 'DRAFT') a.drafts++;
    if (SENT_STATUSES.includes(p.status)) a.sent++;
    if (p.status === 'VIEWED') a.viewed++;
    if (WON_STATUSES.includes(p.status)) { a.won++; a.revenuePaise += p.pricePaise; }
    if (p.status === 'BOOKED') a.booked++;
  }

  const rows: AgentRow[] = users.map((u) => {
    const a = agg.get(u.id) ?? blankAgg();
    return {
      userId: u.id,
      name: u.name ?? u.email.split('@')[0]!,
      email: u.email,
      role: u.role,
      ...a,
      conversionPct: a.sent > 0 ? Math.round((a.won / a.sent) * 100) : 0,
    };
  });

  // Surface an "Unassigned" bucket only if it carries data.
  const un = agg.get(UNASSIGNED);
  if (un && (un.sent > 0 || un.drafts > 0)) {
    rows.push({
      userId: UNASSIGNED, name: 'Unassigned', email: '—', role: 'OTHER', ...un,
      conversionPct: un.sent > 0 ? Math.round((un.won / un.sent) * 100) : 0,
    });
  }

  rows.sort((x, y) => y.won - x.won || Number(y.revenuePaise - x.revenuePaise) || y.sent - x.sent);

  const totals = rows.reduce(
    (t, r) => {
      t.drafts += r.drafts; t.sent += r.sent; t.viewed += r.viewed; t.won += r.won; t.booked += r.booked; t.revenuePaise += r.revenuePaise;
      return t;
    },
    { ...blankAgg(), conversionPct: 0 },
  );
  totals.conversionPct = totals.sent > 0 ? Math.round((totals.won / totals.sent) * 100) : 0;

  return { rows, totals, windowDays: opts.windowDays ?? null };
}

export interface AgencyPerfRow {
  agencyId: string;
  agencyName: string;
  code: string;
  counsellors: number;
  sent: number;
  won: number;
  booked: number;
  revenuePaise: bigint;
  conversionPct: number;
}

export interface PlatformPerformance {
  rows: AgencyPerfRow[];
  totals: { agencies: number; counsellors: number; sent: number; won: number; booked: number; revenuePaise: bigint; conversionPct: number };
  windowDays: number | null;
}

export async function platformPerformance(opts: { windowDays?: number } = {}): Promise<PlatformPerformance> {
  const since = opts.windowDays ? new Date(Date.now() - opts.windowDays * 86_400_000) : undefined;

  const [agencies, proposals, userCounts] = await Promise.all([
    db.agency.findMany({ select: { id: true, name: true, code: true }, orderBy: { createdAt: 'asc' } }),
    db.proposal.findMany({
      where: { ...(since && { createdAt: { gte: since } }) },
      select: { agencyId: true, status: true, pricePaise: true },
    }),
    db.user.groupBy({ by: ['agencyId'], where: { role: { in: ['AGENCY_OWNER', 'COUNSELLOR', 'OPS'] } }, _count: { _all: true } }),
  ]);

  const counsellorsByAgency = new Map<string, number>();
  for (const g of userCounts) if (g.agencyId) counsellorsByAgency.set(g.agencyId, g._count._all);

  const agg = new Map<string, ReturnType<typeof blankAgg>>();
  for (const a of agencies) agg.set(a.id, blankAgg());
  for (const p of proposals) {
    if (!agg.has(p.agencyId)) agg.set(p.agencyId, blankAgg());
    const a = agg.get(p.agencyId)!;
    if (SENT_STATUSES.includes(p.status)) a.sent++;
    if (WON_STATUSES.includes(p.status)) { a.won++; a.revenuePaise += p.pricePaise; }
    if (p.status === 'BOOKED') a.booked++;
  }

  const rows: AgencyPerfRow[] = agencies.map((ag) => {
    const a = agg.get(ag.id) ?? blankAgg();
    return {
      agencyId: ag.id, agencyName: ag.name, code: ag.code,
      counsellors: counsellorsByAgency.get(ag.id) ?? 0,
      sent: a.sent, won: a.won, booked: a.booked, revenuePaise: a.revenuePaise,
      conversionPct: a.sent > 0 ? Math.round((a.won / a.sent) * 100) : 0,
    };
  });
  rows.sort((x, y) => Number(y.revenuePaise - x.revenuePaise) || y.won - x.won || y.sent - x.sent);

  const totals = rows.reduce(
    (t, r) => {
      t.counsellors += r.counsellors; t.sent += r.sent; t.won += r.won; t.booked += r.booked; t.revenuePaise += r.revenuePaise;
      return t;
    },
    { agencies: rows.length, counsellors: 0, sent: 0, won: 0, booked: 0, revenuePaise: 0n, conversionPct: 0 },
  );
  totals.conversionPct = totals.sent > 0 ? Math.round((totals.won / totals.sent) * 100) : 0;

  return { rows, totals, windowDays: opts.windowDays ?? null };
}
