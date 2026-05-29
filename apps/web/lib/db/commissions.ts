// Commission engine. Reads CommissionRule rows (agency-specific > platform default)
// and writes CommissionEntry rows for a saved proposal.
//
// Pricing model:
//   - We approximate per-product spend by category from the Itinerary JSON.
//   - Until adapters return real cost lines, we treat TOTAL category-spend as the basis.
//   - For each product category, the most specific active rule wins.

import { db } from './client';
import type { Day } from '@/lib/itinerary/types';

type Category = 'FLIGHT' | 'HOTEL' | 'TRANSFER' | 'ACTIVITY' | 'VISA' | 'INSURANCE' | 'INVOICE_TOTAL';

interface SpendBreakdown { FLIGHT: bigint; HOTEL: bigint; TRANSFER: bigint; ACTIVITY: bigint; VISA: bigint; INSURANCE: bigint; INVOICE_TOTAL: bigint; }

function spendBreakdownFromProposal(p: { destinations: string; days: string; visa: string; insurance: string; pricePaise: bigint; flights: string | null }): SpendBreakdown {
  const dests = JSON.parse(p.destinations) as any[];
  const days  = JSON.parse(p.days) as Day[];
  const visa  = JSON.parse(p.visa) as any[];
  const ins   = JSON.parse(p.insurance) as any;
  const flights = p.flights ? JSON.parse(p.flights) : null;

  let hotel = 0;
  for (const d of dests) if (d.stay) hotel += (d.stay.hotel.pricePerNightPaise ?? 0) * (d.nights ?? 0);

  let transfer = 0, activity = 0;
  for (const day of days) {
    for (const inc of day.inclusions ?? []) {
      if (inc.kind === 'transfer') transfer += inc.transfer?.pricePaise ?? 0;
    }
    for (const slot of ['morning','afternoon','evening'] as const) {
      const a = (day as any)[slot]; if (a?.pricePaise) activity += a.pricePaise;
    }
  }

  const visaTotal = (visa ?? []).reduce((s, v) => s + (v.included ? (v.pricePaise ?? 0) : 0), 0);
  const insuranceTotal = ins?.included ? (ins.pricePaise ?? 0) : 0;
  const flightTotal = flights?.totalPaise ?? 0;
  const total = Number(p.pricePaise);

  return {
    FLIGHT:        BigInt(Math.round(flightTotal)),
    HOTEL:         BigInt(Math.round(hotel)),
    TRANSFER:      BigInt(Math.round(transfer)),
    ACTIVITY:      BigInt(Math.round(activity)),
    VISA:          BigInt(Math.round(visaTotal)),
    INSURANCE:     BigInt(Math.round(insuranceTotal)),
    INVOICE_TOTAL: BigInt(Math.round(total)),
  };
}

async function resolveRule(agencyId: string, productType: Category) {
  // Specific (agency) > generic (platform-default null agencyId)
  const specific = await db.commissionRule.findFirst({ where: { agencyId, productType, active: true } });
  if (specific) return specific;
  const fallback = await db.commissionRule.findFirst({ where: { agencyId: null, productType, active: true } });
  return fallback;
}

export async function computeAndRecordCommissions(proposalId: string) {
  const p = await db.proposal.findUnique({ where: { id: proposalId } });
  if (!p) return;
  const breakdown = spendBreakdownFromProposal(p);

  // Clear existing entries for idempotency
  await db.commissionEntry.deleteMany({ where: { proposalId } });

  const cats: Category[] = ['FLIGHT', 'HOTEL', 'TRANSFER', 'ACTIVITY', 'VISA', 'INSURANCE', 'INVOICE_TOTAL'];
  for (const cat of cats) {
    const rule = await resolveRule(p.agencyId, cat);
    if (!rule) continue;
    const basis = breakdown[cat];
    if (basis === 0n && !rule.flatPaise) continue;
    let amount = 0n;
    if (rule.percent) amount += BigInt(Math.round(Number(basis) * (rule.percent / 100)));
    if (rule.flatPaise) amount += BigInt(rule.flatPaise);
    if (amount === 0n) continue;
    await db.commissionEntry.create({
      data: {
        agencyId: p.agencyId, proposalId: p.id, productType: cat,
        basisPaise: basis, amountPaise: amount,
        note: `Rule ${rule.id} · ${rule.percent ?? 0}%${rule.flatPaise ? ` + flat ${rule.flatPaise}` : ''}`,
      },
    });
  }
}

export async function platformCommissionTotalPaise(opts: { from?: Date; to?: Date; agencyId?: string } = {}): Promise<bigint> {
  const where: any = {};
  if (opts.agencyId) where.agencyId = opts.agencyId;
  if (opts.from || opts.to) where.createdAt = { gte: opts.from, lte: opts.to };
  const rows = await db.commissionEntry.findMany({ where, select: { amountPaise: true } });
  return rows.reduce((s, r) => s + r.amountPaise, 0n);
}

export async function listAllCommissions(opts: { take?: number } = {}) {
  return db.commissionEntry.findMany({
    orderBy: { createdAt: 'desc' },
    include: { agency: { select: { name: true, code: true } }, proposal: { select: { code: true, name: true } } },
    take: opts.take ?? 200,
  });
}
