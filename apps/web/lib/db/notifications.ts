// Notification helpers. Emit() is called from server actions / routes when
// something happens that the agency team should see in the bell.

import { db } from './client';

export interface EmitArgs {
  agencyId: string;
  userId?: string | null;        // null = agency-wide
  kind: string;
  title: string;
  body?: string | null;
  href?: string | null;
}

export async function emitNotification(a: EmitArgs) {
  try {
    await db.notification.create({
      data: {
        agencyId: a.agencyId,
        userId: a.userId ?? null,
        kind: a.kind,
        title: a.title,
        body: a.body ?? null,
        href: a.href ?? null,
      },
    });
  } catch (e) {
    // Never let a notification failure break the calling flow.
    console.error('[emitNotification]', e);
  }
}

export async function listNotifications(agencyId: string, userId: string, limit = 25) {
  return db.notification.findMany({
    where: { agencyId, OR: [{ userId }, { userId: null }] },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function countUnread(agencyId: string, userId: string): Promise<number> {
  return db.notification.count({
    where: { agencyId, OR: [{ userId }, { userId: null }], readAt: null },
  });
}

export async function markAllReadForUser(agencyId: string, userId: string) {
  await db.notification.updateMany({
    where: { agencyId, OR: [{ userId }, { userId: null }], readAt: null },
    data: { readAt: new Date() },
  });
}
