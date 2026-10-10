'use server';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db/client';
import { requireAgency } from '@/lib/auth/ctx';
import { getSession as readSession } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const VALID_ROLES = ['COUNSELLOR', 'OPS', 'AGENCY_OWNER'] as const;

export async function createInviteAction(formData: FormData): Promise<void> {
  const actor = await requireAgency();
  if (actor.role !== 'AGENCY_OWNER') return;

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role  = String(formData.get('role') ?? 'COUNSELLOR');
  if (!email.includes('@')) return;
  if (!VALID_ROLES.includes(role as any)) return;

  // Refuse if a user already exists with this email on any agency
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error(`A user with that email already exists${existing.agencyId === actor.agencyId ? ' on your agency' : ''}.`);

  const token = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.invite.create({
    data: { agencyId: actor.agencyId, email, role, token, expiresAt },
  });
  revalidatePath('/settings/team');
}

export async function revokeInviteAction(inviteId: string) {
  const actor = await requireAgency();
  if (actor.role !== 'AGENCY_OWNER') return;
  await db.invite.deleteMany({ where: { id: inviteId, agencyId: actor.agencyId, acceptedAt: null } });
  revalidatePath('/settings/team');
}

export async function removeTeamMemberAction(userId: string) {
  const actor = await requireAgency();
  if (actor.role !== 'AGENCY_OWNER') return;
  if (userId === actor.userId) throw new Error("You can't remove yourself.");
  await db.user.deleteMany({ where: { id: userId, agencyId: actor.agencyId } });
  revalidatePath('/settings/team');
}

/** Agency owner sets a new password for a teammate who has forgotten theirs. */
// Returns a result instead of throwing: thrown messages are hidden from the browser in production.
export async function resetMemberPasswordAction(userId: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const actor = await requireAgency();
  if (actor.role !== 'AGENCY_OWNER') return { ok: false, error: 'Only the agency owner can reset passwords.' };
  if (userId === actor.userId) return { ok: false, error: 'To change your own password, please contact Global Guides support.' };

  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirm') ?? '');
  if (password.length < 8) return { ok: false, error: 'The new password must be at least 8 characters.' };
  if (password !== confirm) return { ok: false, error: "The two passwords don't match." };

  const passwordHash = await bcrypt.hash(password, 10);
  // Tenant-scoped in the WHERE: an owner can only reset members of their own agency.
  const updated = await db.user.updateMany({
    where: { id: userId, agencyId: actor.agencyId, role: { not: 'SUPER_ADMIN' } },
    data: { passwordHash },
  });
  if (updated.count === 0) return { ok: false, error: 'That team member could not be found.' };
  revalidatePath('/settings/team');
  return { ok: true };
}

// Accept an invite (no auth required — token IS the auth)
export async function acceptInviteAction(token: string, formData: FormData): Promise<void> {
  const invite = await db.invite.findUnique({ where: { token } });
  if (!invite) throw new Error('Invite not found or already used.');
  if (invite.acceptedAt) throw new Error('This invite has already been accepted.');
  if (invite.expiresAt < new Date()) throw new Error('This invite has expired. Ask the agency owner to send a new one.');

  const name     = String(formData.get('name') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) throw new Error('Password must be at least 8 characters.');

  const exists = await db.user.findUnique({ where: { email: invite.email } });
  if (exists) throw new Error('A user with that email already exists. Sign in instead.');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await db.user.create({
    data: { email: invite.email, name: name || invite.email.split('@')[0], passwordHash, role: invite.role, agencyId: invite.agencyId },
  });
  await db.invite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } });

  // Sign them in immediately
  const session = await readSession();
  session.userId = user.id;
  session.agencyId = user.agencyId ?? undefined;
  session.role = user.role as any;
  session.email = user.email;
  session.name = user.name ?? undefined;
  await session.save();

  redirect('/dashboard');
}
