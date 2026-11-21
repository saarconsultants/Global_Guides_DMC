'use server';
import { getProposal, proposalToItinerary } from '@/lib/db/proposals';
import type { Itinerary } from '@/lib/itinerary/types';

export async function loadItineraryByIdAction(id: string): Promise<{ ok: true; itinerary: Itinerary } | { ok: false; error: string }> {
  // Treat the id as either a proposal id OR a fresh in-memory id (it_xxx) — only proposal ids resolve.
  const p = await getProposal(id);
  if (!p) return { ok: false, error: 'not_found' };
  const itin = proposalToItinerary(p);
  if (!itin) return { ok: false, error: 'not_found' };
  // The builder works in net prices and adds the markup at save. Handing it the customer
  // price would apply the markup a second time.
  const net = Number(p.netCostPaise) > 0 ? Number(p.netCostPaise) : Number(p.pricePaise);
  const adults = itin.intake.rooms.reduce((s, r) => s + r.adults, 0) || 1;
  return {
    ok: true,
    itinerary: {
      ...itin, pricePaise: net, pricePerAdultPaise: Math.round(net / adults),
      proposal: {
        id: p.id, code: p.code, status: p.status,
        customerName: p.lead?.customerName ?? undefined, customerEmail: p.lead?.customerEmail ?? undefined, customerPhone: p.lead?.customerPhone ?? undefined,
        markupPct: net > 0 ? Math.round((Number(p.markupPaise) / net) * 1000) / 10 : 0,
      },
    },
  };
}
