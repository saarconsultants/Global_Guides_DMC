'use server';
import { db } from '@/lib/db/client';
import { requireAgency } from '@/lib/auth/ctx';
import { revalidatePath } from 'next/cache';

const VALID_STATUSES = ['NEW', 'QUOTED', 'FOLLOWUP', 'BOOKED', 'LOST'] as const;
type LeadStatus = (typeof VALID_STATUSES)[number];
const PROTECTED_QUOTES = ['ACCEPTED', 'BOOKED'];

export async function setLeadStatusAction(leadId: string, formData: FormData) {
  const actor = await requireAgency();
  const status = String(formData.get('status') ?? '');
  if (!VALID_STATUSES.includes(status as LeadStatus)) return;
  const updated = await db.lead.updateMany({ where: { id: leadId, agencyId: actor.agencyId }, data: { status } });
  if (updated.count > 0) {
    await db.leadNote.create({ data: { leadId, authorId: actor.userId, kind: 'SYSTEM', body: `Status changed to ${status}` } });
  }
  revalidatePath(`/leads/${leadId}`);
  revalidatePath('/leads');
}

export async function updateLeadAction(leadId: string, formData: FormData) {
  const actor = await requireAgency();
  const customerName = String(formData.get('customerName') ?? '').trim();
  const customerEmail = String(formData.get('customerEmail') ?? '').trim();
  const customerPhone = String(formData.get('customerPhone') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  // Tenant scoping enforced in the WHERE itself (updateMany), not via a separate
  // pre-check — a check-then-update by bare id leaves a cross-tenant window.
  await db.lead.updateMany({
    where: { id: leadId, agencyId: actor.agencyId },
    data: {
      ...(customerName ? { customerName } : {}),
      customerEmail: customerEmail || null,
      customerPhone: customerPhone || null,
      ...(VALID_STATUSES.includes(status as LeadStatus) ? { status } : {}),
    },
  });
  revalidatePath('/leads');
  revalidatePath(`/leads/${leadId}`);
}

const VALID_NOTE_KINDS = ['NOTE', 'CALL', 'EMAIL', 'WHATSAPP'] as const;

export async function addLeadNoteAction(leadId: string, formData: FormData) {
  const actor = await requireAgency();
  const body = String(formData.get('body') ?? '').trim();
  const kind = String(formData.get('kind') ?? 'NOTE');
  if (!body) return;
  if (!VALID_NOTE_KINDS.includes(kind as any)) return;
  // Confirm the lead belongs to this agency
  const lead = await db.lead.findFirst({ where: { id: leadId, agencyId: actor.agencyId }, select: { id: true } });
  if (!lead) return;
  await db.leadNote.create({ data: { leadId, authorId: actor.userId, kind, body } });
  revalidatePath(`/leads/${leadId}`);
}

export async function deleteLeadNoteAction(noteId: string, leadId: string) {
  const actor = await requireAgency();
  // Only own author or AGENCY_OWNER can delete (policy pre-check), and the DELETE
  // itself is tenant-scoped through the lead relation so a stale/forged id can
  // never remove another agency's note.
  const note = await db.leadNote.findUnique({ where: { id: noteId }, select: { authorId: true } });
  if (!note) return;
  if (note.authorId !== actor.userId && actor.role !== 'AGENCY_OWNER') return;
  await db.leadNote.deleteMany({ where: { id: noteId, lead: { agencyId: actor.agencyId } } });
  revalidatePath(`/leads/${leadId}`);
}

/**
 * Deletes a lead, its notes and its quotes. Refused when any quote was accepted or
 * booked: bookings and commissions are financial records and must keep their proposal.
 */
export async function deleteLeadAction(leadId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const actor = await requireAgency();
  const lead = await db.lead.findFirst({
    where: { id: leadId, agencyId: actor.agencyId },
    select: { id: true, proposals: { select: { id: true, status: true } } },
  });
  if (!lead) return { ok: false, error: 'This lead no longer exists.' };

  const proposalIds = lead.proposals.map((p) => p.id);
  const [bookings, commissions] = await Promise.all([
    db.booking.count({ where: { proposalId: { in: proposalIds } } }),
    db.commissionEntry.count({ where: { proposalId: { in: proposalIds } } }),
  ]);
  if (bookings > 0 || commissions > 0 || lead.proposals.some((p) => PROTECTED_QUOTES.includes(p.status))) {
    return { ok: false, error: 'This lead has an accepted or booked quote, so it can’t be deleted. Mark it as Lost instead.' };
  }

  await db.$transaction([
    db.notification.deleteMany({
      where: { agencyId: actor.agencyId, OR: [{ href: `/leads/${leadId}` }, ...proposalIds.map((id) => ({ href: { contains: id } }))] },
    }),
    db.proposal.deleteMany({ where: { id: { in: proposalIds }, agencyId: actor.agencyId } }),
    db.lead.delete({ where: { id: leadId } }),   // notes go with it (cascade)
  ]);
  for (const path of ['/leads', '/proposals', '/dashboard']) revalidatePath(path);
  return { ok: true };
}
