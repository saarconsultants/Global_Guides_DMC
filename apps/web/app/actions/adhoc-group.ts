'use server';
import { db } from '@/lib/db/client';
import { requireAgency } from '@/lib/auth/ctx';
import { emitNotification } from '@/lib/db/notifications';
import { revalidatePath } from 'next/cache';

export interface AdhocGroupState {
  ok: boolean;
  error?: string;
  leadId?: string;
}

const GROUP_TYPES = ['Corporate offsite', 'Wedding / family event', 'College / school tour', 'MICE / conference', 'Other'];
const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max) : s);

/** Save an ad-hoc group quote request as a lead (with the full brief in a note) and notify the team. */
export async function submitAdhocGroupAction(_prev: AdhocGroupState, formData: FormData): Promise<AdhocGroupState> {
  const actor = await requireAgency();

  const destinations = clip(String(formData.get('destinations') ?? '').trim(), 300);
  const paxCount = parseInt(String(formData.get('paxCount') ?? ''), 10);
  const fromDateStr = String(formData.get('fromDate') ?? '').trim();
  const toDateStr = String(formData.get('toDate') ?? '').trim();
  const nightsRaw = parseInt(String(formData.get('nights') ?? ''), 10);
  const groupTypeRaw = String(formData.get('groupType') ?? '').trim();
  const groupType = GROUP_TYPES.includes(groupTypeRaw) ? groupTypeRaw : 'Other';
  const groupName = clip(String(formData.get('groupName') ?? '').trim(), 120);
  const brief = clip(String(formData.get('brief') ?? '').trim(), 4000);

  if (!destinations) return { ok: false, error: 'Please tell us where the group wants to go.' };
  if (!Number.isFinite(paxCount) || paxCount < 15) return { ok: false, error: 'Group quotes start at 15 travellers. Please enter the approximate group size.' };
  if (paxCount > 500) return { ok: false, error: 'For groups over 500, please call or WhatsApp our team directly.' };

  const fromDate = fromDateStr ? new Date(fromDateStr) : null;
  const toDate = toDateStr ? new Date(toDateStr) : null;
  if (fromDate && isNaN(fromDate.getTime())) return { ok: false, error: 'The "Travel from" date doesn\'t look right.' };
  if (toDate && isNaN(toDate.getTime())) return { ok: false, error: 'The "Travel to" date doesn\'t look right.' };
  if (fromDate && toDate && toDate < fromDate) return { ok: false, error: '"Travel to" must be on or after "Travel from".' };

  let nights: number | null = Number.isFinite(nightsRaw) && nightsRaw > 0 ? Math.min(nightsRaw, 60) : null;
  if (!nights && fromDate && toDate) {
    const diff = Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000);
    if (diff > 0) nights = diff;
  }

  const customerName = groupName || `${groupType} group (${paxCount} pax)`;
  const fmtDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : 'not set');
  const noteBody = [
    'Ad-hoc group quote request (sent to ops)',
    `Group type: ${groupType}`,
    `Group size: about ${paxCount} travellers`,
    `Destinations: ${destinations}`,
    `Travel dates: ${fmtDate(fromDate)} to ${fmtDate(toDate)}`,
    `Nights: ${nights ?? 'not set'}`,
    `Brief: ${brief || 'none given'}`,
  ].join('\n');

  const lead = await db.lead.create({
    data: {
      agencyId: actor.agencyId,
      customerName,
      destinations,
      nights,
      travelDate: fromDate,
      source: 'adhoc-group',
      status: 'NEW',
      notes: { create: { authorId: actor.userId, kind: 'NOTE', body: noteBody } },
    },
  });

  await emitNotification({
    agencyId: actor.agencyId,
    kind: 'LEAD_NEW',
    title: `Group quote requested: ${customerName}`,
    body: `${destinations} · about ${paxCount} travellers. Ops will reply within 48 hours.`,
    href: `/leads/${lead.id}`,
  });

  revalidatePath('/leads');
  return { ok: true, leadId: lead.id };
}
