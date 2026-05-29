'use server';
import { duplicateProposal } from '@/lib/db/proposals';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function duplicateProposalAction(sourceId: string) {
  const r = await duplicateProposal(sourceId);
  if (!r) throw new Error('Could not duplicate — proposal not found or you do not have access.');
  revalidatePath('/proposals');
  revalidatePath('/leads');
  redirect(`/itinerary/${r.id}/customize`);
}
