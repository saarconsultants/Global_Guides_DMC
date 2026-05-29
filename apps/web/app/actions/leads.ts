'use server';
import { db } from '@/lib/db/client';
import { requireAgency } from '@/lib/auth/ctx';
import { revalidatePath } from 'next/cache';

const VALID_STATUSES = ['NEW', 'QUOTED', 'FOLLOWUP', 'BOOKED', 'LOST'] as const;
type LeadStatus = (typeof VALID_STATUSES)[number];

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
  // Only own author or AGENCY_OWNER can delete
  const note = await db.leadNote.findUnique({ where: { id: noteId } });
  if (!note) return;
  const lead = await db.lead.findFirst({ where: { id: note.leadId, agencyId: actor.agencyId }, select: { id: true } });
  if (!lead) return;
  if (note.authorId !== actor.userId && actor.role !== 'AGENCY_OWNER') return;
  await db.leadNote.delete({ where: { id: noteId } });
  revalidatePath(`/leads/${leadId}`);
}
