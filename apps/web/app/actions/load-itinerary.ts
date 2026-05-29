'use server';
import { getProposal, proposalToItinerary } from '@/lib/db/proposals';
import type { Itinerary } from '@/lib/itinerary/types';

export async function loadItineraryByIdAction(id: string): Promise<{ ok: true; itinerary: Itinerary } | { ok: false; error: string }> {
  // Treat the id as either a proposal id OR a fresh in-memory id (it_xxx) — only proposal ids resolve.
  const p = await getProposal(id);
  if (!p) return { ok: false, error: 'not_found' };
  const itin = proposalToItinerary(p);
  if (!itin) return { ok: false, error: 'not_found' };
  return { ok: true, itinerary: itin };
}
