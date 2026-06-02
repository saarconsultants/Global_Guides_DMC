'use server';
import { db } from '@/lib/db/client';
import { requireAgency } from '@/lib/auth/ctx';
import { composeItineraryAction } from './compose-itinerary';
import type { IntakeForm } from '@/lib/itinerary/types';
import { redirect } from 'next/navigation';
// Compose an Itinerary in-process, persist it as a Draft Proposal,
// then redirect the agent to /itinerary/[id]/customize which hydrates from DB.
import { computeAndRecordCommissions } from '@/lib/db/commissions';
import { randomBytes } from 'node:crypto';

function genCode() {
  const n = Math.floor(10000 + Math.random() * 89999);
  return `GG-${n}`;
}
function genShareToken() {
  return randomBytes(18).toString('base64url');
}

export async function cloneTemplateAction(templateId: string): Promise<{ proposalId: string }> {
  const actor = await requireAgency();
  const tpl = await db.itineraryTemplate.findUnique({ where: { id: templateId } });
  if (!tpl) throw new Error('Template not found');

  // Build a minimal intake form from the template destinations, default 2 adults,
  // departure date = 30 days from today, no flights yet. Compose locally so we get
  // hotels, transfers, days, visa, insurance, prices from mock-inventory.
  const dests = JSON.parse(tpl.destinations) as any[];
  const departureDate = new Date(); departureDate.setDate(departureDate.getDate() + 30);
  const intake: IntakeForm = {
    destinations: dests.map((d) => ({
      cityCode: d.cityCode, cityName: d.cityName, countryCode: d.countryCode ?? '', nights: d.nights ?? 2,
    })),
    leavingFromCode: 'PUN', leavingFromName: 'Pune',
    nationality: 'IN',
    departureDate: departureDate.toISOString().slice(0, 10),
    rooms: [{ adults: 2, children: 0 }],
    starRating: tpl.category === 'LUXURY' ? 5 : tpl.category === 'FAMILY' ? 4 : undefined,
    addTransfers: true,
  };
  // Use the live-Hotelbeds composer so cloned templates also get real hotels
  // (with our 90s cache, repeat clones of the same template don't re-hit the API).
  const it = await composeItineraryAction(intake);

  const total = BigInt(it.pricePaise);
  const netCost = BigInt(Math.round(Number(total) * 0.85));
  const markup = total - netCost;

  const proposal = await db.proposal.create({
    data: {
      code: genCode(),
      agencyId: actor.agencyId,
      ownerUserId: actor.userId,
      templateId: tpl.id,
      name: tpl.title,
      travelDate: departureDate,
      nationality: intake.nationality,
      travelers: JSON.stringify({ rooms: intake.rooms }),
      destinations: JSON.stringify(it.destinations),
      days: JSON.stringify(it.days),
      visa: JSON.stringify(it.visa),
      insurance: JSON.stringify(it.insurance),
      netCostPaise: netCost, markupPaise: markup,
      pricePaise: total, pricePerAdultPaise: BigInt(it.pricePerAdultPaise),
      shareToken: genShareToken(),
      status: 'DRAFT',
    },
  });
  await computeAndRecordCommissions(proposal.id);

  return { proposalId: proposal.id };
}

export async function cloneAndRedirectAction(templateId: string) {
  const { proposalId } = await cloneTemplateAction(templateId);
  redirect(`/itinerary/${proposalId}/customize`);
}
