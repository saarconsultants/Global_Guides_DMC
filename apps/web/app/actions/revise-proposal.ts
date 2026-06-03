'use server';
import { reviseProposal } from '@/lib/db/proposals';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Create a revised version of a proposal and jump straight to editing it.
export async function reviseProposalAction(sourceId: string) {
  const r = await reviseProposal(sourceId);
  revalidatePath('/proposals');
  if (r) redirect(`/itinerary/${r.id}/customize`);
}
