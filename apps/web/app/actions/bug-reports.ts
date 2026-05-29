'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db/client';
import { requireSuperAdmin } from '@/lib/auth/ctx';

const STATUSES = ['OPEN', 'TRIAGED', 'IN_PROGRESS', 'FIXED', 'WONTFIX', 'DUPLICATE'];

export async function resolveBugReportAction(id: string, formData: FormData) {
  const actor = await requireSuperAdmin();
  const status = String(formData.get('status') ?? '').toUpperCase();
  const resolution = String(formData.get('resolution') ?? '').trim() || null;
  if (!STATUSES.includes(status)) return;
  const isResolved = ['FIXED', 'WONTFIX', 'DUPLICATE'].includes(status);
  await db.bugReport.update({
    where: { id },
    data: {
      status,
      resolution,
      resolvedAt: isResolved ? new Date() : null,
      resolvedBy: isResolved ? actor.userId : null,
    },
  });
  revalidatePath('/admin/bug-reports');
}
