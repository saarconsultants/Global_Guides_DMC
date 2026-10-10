'use server';
import { requireAgency } from '@/lib/auth/ctx';
import { db } from '@/lib/db/client';
import { parseMarkupRules, resolveTripMarkupPct } from '@/lib/markup';

/**
 * The markup % the builder should pre-fill in "Save as proposal": the agency's
 * destination/season rules for this trip, falling back to its default markup
 * (Settings → Sales). Same resolution saveProposal() uses when no override is given.
 */
export async function getTripMarkupPctAction(args: { destinationCodes: string[]; travelDate: string }): Promise<number> {
  const actor = await requireAgency();
  const agency = await db.agency.findUnique({
    where: { id: actor.agencyId },
    select: { markupPct: true, markupRulesJson: true },
  });
  return resolveTripMarkupPct(agency?.markupPct ?? 15, {
    rules: parseMarkupRules(agency?.markupRulesJson),
    destinationCodes: args.destinationCodes,
    travelDate: args.travelDate,
  }).pct;
}
