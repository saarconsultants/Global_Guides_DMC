// Higher-level context: tells the rest of the app "who's logged in".

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/client';
import { getSession, type SessionPayload } from './session';

export type Role = NonNullable<SessionPayload['role']>;

export interface ActorContext {
  userId: string;
  email: string;
  name?: string;
  role: Role;
  agencyId: string | null;     // null only for SUPER_ADMIN (unless impersonating)
  agency?: { id: string; name: string; code: string; slug: string; logoUrl: string | null; primaryColor: string | null; accentColor: string | null; currency: string; walletPaise: bigint };
  impersonating?: boolean;     // super-admin is "viewing as" agency
}

// Only the agency columns the app shell needs — never the markup JSON blobs.
const AGENCY_SELECT = {
  id: true, name: true, code: true, slug: true, logoUrl: true,
  primaryColor: true, accentColor: true, currency: true, walletPaise: true,
} as const;

// Memoised per request (React cache): the root layout, the page, getDisplayMoney()
// and lib helpers all call this, and without the cache each call re-decrypted the
// cookie and re-ran the user+agency lookup (3–4× per page view). Server actions run
// outside React's render cache, so mutations always see fresh data.
export const getActor = cache(async function getActor(): Promise<ActorContext | null> {
  const s = await getSession();
  if (!s.userId || !s.role) return null;
  const user = await db.user.findUnique({
    where: { id: s.userId },
    select: { id: true, email: true, name: true, role: true, agencyId: true, agency: { select: AGENCY_SELECT } },
  });
  if (!user) return null;

  let agencyId = user.agencyId;
  let agency = user.agency;
  let impersonating = false;
  // Super-admin "view as agency": override the effective agency with the chosen one.
  if (user.role === 'SUPER_ADMIN' && s.impersonatingAgencyId) {
    const imp = await db.agency.findUnique({ where: { id: s.impersonatingAgencyId }, select: AGENCY_SELECT });
    if (imp) { agencyId = imp.id; agency = imp; impersonating = true; }
  }

  return {
    userId: user.id,
    email: user.email,
    name: user.name ?? undefined,
    role: user.role as Role,
    agencyId,
    agency: agency ? {
      id: agency.id, name: agency.name, code: agency.code, slug: agency.slug,
      logoUrl: agency.logoUrl, primaryColor: agency.primaryColor, accentColor: agency.accentColor,
      currency: agency.currency, walletPaise: agency.walletPaise,
    } : undefined,
    impersonating,
  };
});

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
