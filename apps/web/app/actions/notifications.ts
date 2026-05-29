'use server';
import { requireAgency } from '@/lib/auth/ctx';
import { markAllReadForUser } from '@/lib/db/notifications';
import { revalidatePath } from 'next/cache';

export async function markAllReadAction() {
  const actor = await requireAgency();
  await markAllReadForUser(actor.agencyId, actor.userId);
  revalidatePath('/dashboard');
  revalidatePath('/leads');
  revalidatePath('/proposals');
}
