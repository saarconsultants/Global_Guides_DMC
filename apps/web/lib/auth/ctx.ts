// Higher-level context: tells the rest of the app "who's logged in".

import { redirect } from 'next/navigation';
import { db } from '@/lib/db/client';
import { getSession, type SessionPayload } from './session';

export type Role = NonNullable<SessionPayload['role']>;

export interface ActorContext {
  userId: string;
  email: string;
  name?: string;
  role: Role;
  agencyId: string | null;     // null only for SUPER_ADMIN
  agency?: { id: string; name: string; code: string; slug: string; logoUrl: string | null; primaryColor: string | null; accentColor: string | null };
}

export async function getActor(): Promise<ActorContext | null> {
  const s = await getSession();
  if (!s.userId || !s.role) return null;
  const user = await db.user.findUnique({ where: { id: s.userId }, include: { agency: true } });
  if (!user) return null;
  return {
    userId: user.id,
    email: user.email,
    name: user.name ?? undefined,
    role: user.role as Role,
    agencyId: user.agencyId,
    agency: user.agency ? {
      id: user.agency.id, name: user.agency.name, code: user.agency.code, slug: user.agency.slug,
      logoUrl: user.agency.logoUrl, primaryColor: user.agency.primaryColor, accentColor: user.agency.accentColor,
    } : undefined,
  };
}

export async function requireActor(): Promise<ActorContext> {
  const a = await getActor();
  if (!a) redirect('/login');
  return a;
}

export async function requireSuperAdmin(): Promise<ActorContext> {
  const a = await requireActor();
  if (a.role !== 'SUPER_ADMIN') redirect('/dashboard');
  return a;
}

export async function requireAgency(): Promise<ActorContext & { agencyId: string }> {
  const a = await requireActor();
  if (!a.agencyId) redirect('/admin');
  return a as ActorContext & { agencyId: string };
}
