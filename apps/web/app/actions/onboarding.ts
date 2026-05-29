'use server';
import { db } from '@/lib/db/client';
import { requireActor } from '@/lib/auth/ctx';
import { revalidatePath } from 'next/cache';

export async function dismissWelcomeAction() {
  const actor = await requireActor();
  await db.user.update({ where: { id: actor.userId }, data: { welcomeDismissedAt: new Date() } });
  revalidatePath('/dashboard');
}
