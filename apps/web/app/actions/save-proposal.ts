'use server';
import { saveProposal } from '@/lib/db/proposals';
import type { Itinerary } from '@/lib/itinerary/types';
import { revalidatePath } from 'next/cache';

export async function saveProposalAction(args: {
  itinerary: Itinerary;
  customer?: { name?: string; email?: string; phone?: string };
  markupPct?: number;
}): Promise<{ ok: true; code: string; shareToken: string } | { ok: false; error: string }> {
  try {
    const r = await saveProposal({
      itinerary: args.itinerary,
      customerName: args.customer?.name,
      customerEmail: args.customer?.email,
      customerPhone: args.customer?.phone,
      markupPct: args.markupPct,
    });
    revalidatePath('/proposals');
    revalidatePath('/leads');
    revalidatePath('/dashboard');
    return { ok: true, code: r.code, shareToken: r.shareToken };
  } catch (e: any) {
    console.error('[saveProposalAction]', e);
    return { ok: false, error: e?.message ?? 'Failed to save' };
  }
}
