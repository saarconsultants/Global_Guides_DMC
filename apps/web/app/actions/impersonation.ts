'use server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/client';
import { getSession } from '@/lib/auth/session';
import { requireSuperAdmin } from '@/lib/auth/ctx';

// Super-admin: start viewing the agency-side app scoped to a given agency.
export async function viewAsAgencyAction(agencyId: string) {
  await requireSuperAdmin();
  const a = await db.agency.findUnique({ where: { id: agencyId }, select: { id: true } });
  if (!a) return;
  const s = await getSession();
  s.impersonatingAgencyId = a.id;
  await s.save();
  redirect('/dashboard');
}

// Stop impersonating and return to the platform admin.
export async function exitImpersonationAction() {
  const s = await getSession();
  s.impersonatingAgencyId = undefined;
  await s.save();
  redirect('/admin');
}
