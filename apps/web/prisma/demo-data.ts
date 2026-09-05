// Demo data for design and investor demos — LOCAL ONLY. Populates the Global
// Guides demo agency with realistic leads, proposals and bookings composed from
// the mock inventory (nothing invented beyond names and dates).
// Run: npx tsx prisma/demo-data.ts    (re-runnable: replaces earlier demo rows)
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { composeItinerary } from '../lib/itinerary/compose';
import type { IntakeForm } from '../lib/itinerary/types';

const db = new PrismaClient();
const DEMO = 'demo-seed';
const day = (n: number) => new Date(Date.now() + n * 86400000);
const code = (i: number) => `GG-9${String(1000 + i).slice(-4)}`;
const token = () => randomBytes(18).toString('base64url');

async function main() {
  const agency = await db.agency.findUnique({ where: { slug: 'global-guides' } });
  if (!agency) throw new Error('Run prisma/seed.ts first');
  const owner = await db.user.findFirst({ where: { agencyId: agency.id }, orderBy: { createdAt: 'asc' } });
  const templates = await db.itineraryTemplate.findMany({ orderBy: { createdAt: 'asc' } });
  const tpl = (codeStart: string) => templates.find((t) => t.code.startsWith(codeStart)) ?? templates[0]!;

  // wipe previous demo rows
  const oldProposals = await db.proposal.findMany({ where: { agencyId: agency.id, code: { startsWith: 'GG-9' } }, select: { id: true } });
  await db.booking.deleteMany({ where: { proposalId: { in: oldProposals.map((p) => p.id) } } });
  await db.commissionEntry.deleteMany({ where: { proposalId: { in: oldProposals.map((p) => p.id) } } }).catch(() => {});
  await db.proposal.deleteMany({ where: { id: { in: oldProposals.map((p) => p.id) } } });
  await db.leadNote.deleteMany({ where: { lead: { agencyId: agency.id, source: DEMO } } }).catch(() => {});
  await db.lead.deleteMany({ where: { agencyId: agency.id, source: DEMO } });

  const leadsSpec = [
    { customerName: 'Rohit & Priya Mehta', customerPhone: '+91 98200 11223', customerEmail: 'rohit.mehta@example.com', destinations: 'PAR,AMS,ZRH', originCity: 'DEL', nights: 7, travelDate: day(32), status: 'QUOTED', createdAt: day(-3) },
    { customerName: 'Sharma family', customerPhone: '+91 98110 45566', destinations: 'DXB', originCity: 'BOM', nights: 4, travelDate: day(40), status: 'QUOTED', createdAt: day(-5) },
    { customerName: 'Anita Desai', customerEmail: 'anita.d@example.com', destinations: 'MLE', originCity: 'DEL', nights: 5, travelDate: day(58), status: 'BOOKED', createdAt: day(-12) },
    { customerName: 'Kapoor group (6 pax)', customerPhone: '+91 99870 33221', destinations: 'BKK', originCity: 'DEL', nights: 6, travelDate: day(95), status: 'BOOKED', createdAt: day(-20) },
    { customerName: 'Website enquiry · Neha Iyer', customerEmail: 'neha.iyer@example.com', destinations: 'SIN', originCity: 'BLR', nights: 4, travelDate: day(70), status: 'NEW', createdAt: day(-0.2) },
    { customerName: 'Farhan Qureshi', customerPhone: '+91 97000 12121', destinations: 'IST', originCity: 'HYD', nights: 6, travelDate: day(48), status: 'FOLLOWUP', createdAt: day(-8) },
    { customerName: 'Deshpande honeymoon', customerPhone: '+91 90040 77889', destinations: 'DPS', originCity: 'PUN', nights: 6, travelDate: day(120), status: 'NEW', createdAt: day(-1) },
  ];
  const leads = [] as Array<{ id: string; customerName: string }>;
  for (const l of leadsSpec) {
    const row = await db.lead.create({ data: { agencyId: agency.id, source: DEMO, ...l } });
    leads.push(row);
  }

  function build(t: (typeof templates)[number], origin: string, departure: Date, adults = 2, children = 0) {
    const dests = JSON.parse(t.destinations) as any[];
    const intake: IntakeForm = {
      destinations: dests.map((d) => ({ cityCode: d.cityCode, cityName: d.cityName, countryCode: d.countryCode ?? '', nights: d.nights ?? 2 })),
      leavingFromCode: origin, leavingFromName: origin, nationality: 'IN',
      departureDate: departure.toISOString().slice(0, 10),
      rooms: [{ adults, children }], starRating: t.category === 'LUXURY' || t.category === 'HONEYMOON' ? 5 : 4, addTransfers: true,
    };
    return composeItinerary(intake);
  }

  const proposalsSpec = [
    { i: 1, t: tpl('TPL-EUR'), lead: leads[0], origin: 'DEL', dep: day(32), status: 'VIEWED', lastViewedAt: day(-1.5), createdAt: day(-3) },
    { i: 2, t: tpl('TPL-DXB'), lead: leads[1], origin: 'BOM', dep: day(40), status: 'SENT', createdAt: day(-4) },
    { i: 3, t: tpl('TPL-MLE'), lead: leads[2], origin: 'DEL', dep: day(58), status: 'ACCEPTED', lastViewedAt: day(-9), acceptedAt: day(-8), createdAt: day(-11) },
    { i: 4, t: tpl('TPL-EUR'), lead: leads[3], origin: 'DEL', dep: day(95), status: 'BOOKED', lastViewedAt: day(-16), acceptedAt: day(-15), createdAt: day(-19), adults: 6 },
    { i: 5, t: tpl('TPL-DXB'), lead: leads[5], origin: 'HYD', dep: day(48), status: 'VIEWED', lastViewedAt: day(-2.2), createdAt: day(-7) },
    { i: 6, t: tpl('TPL-MLE'), lead: leads[6], origin: 'PUN', dep: day(120), status: 'DRAFT', createdAt: day(-0.5) },
  ];
  const created = [] as Array<{ id: string; status: string; pricePaise: bigint }>;
  for (const p of proposalsSpec) {
    const it = build(p.t, p.origin, p.dep, p.adults ?? 2);
    const total = BigInt(it.pricePaise);
    const net = BigInt(Math.round(Number(total) * 0.85));
    const row = await db.proposal.create({
      data: {
        code: code(p.i), agencyId: agency.id, ownerUserId: owner?.id, leadId: p.lead?.id, templateId: p.t.id,
        name: p.t.title,
        travelDate: p.dep, nationality: 'IN',
        travelers: JSON.stringify({ rooms: [{ adults: p.adults ?? 2, children: 0 }] }),
        destinations: JSON.stringify(it.destinations), days: JSON.stringify(it.days),
        flights: null, visa: JSON.stringify(it.visa), insurance: JSON.stringify(it.insurance),
        netCostPaise: net, markupPaise: total - net, pricePaise: total, pricePerAdultPaise: BigInt(it.pricePerAdultPaise),
        shareToken: token(), status: p.status, lastViewedAt: p.lastViewedAt ?? null, acceptedAt: p.acceptedAt ?? null, createdAt: p.createdAt,
      },
    });
    created.push({ id: row.id, status: row.status, pricePaise: row.pricePaise });
  }
  for (const p of created.filter((c) => c.status === 'BOOKED' || c.status === 'ACCEPTED')) {
    await db.booking.create({ data: { agencyId: agency.id, proposalId: p.id, status: p.status === 'BOOKED' ? 'CONFIRMED' : 'PENDING', pnrs: p.status === 'BOOKED' ? 'AI-6K2PQR, HB-88213' : null, paidPaise: p.status === 'BOOKED' ? p.pricePaise : 0n, bookedAt: day(-14) } });
  }
  console.log(`demo: ${leads.length} leads, ${created.length} proposals, bookings for accepted/booked`);
}
main().finally(() => db.$disconnect());
