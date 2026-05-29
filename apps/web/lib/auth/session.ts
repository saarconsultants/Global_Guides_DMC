// Session helpers built on iron-session (encrypted cookie).
// Read with `getSession()` in server components / route handlers.

import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionPayload {
  userId?: string;
  agencyId?: string;
  role?: 'SUPER_ADMIN' | 'AGENCY_OWNER' | 'COUNSELLOR' | 'OPS';
  email?: string;
  name?: string;
}

const SESSION_PASSWORD = process.env.SESSION_PASSWORD ?? 'dev-only-please-change-min-32-chars-long-secret';

export const sessionOptions: SessionOptions = {
  password: SESSION_PASSWORD,
  cookieName: 'gg_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,           // 30 days
  },
};

export async function getSession() {
  const jar = await cookies();
  return getIronSession<SessionPayload>(jar as any, sessionOptions);
}

export async function destroySession() {
  const s = await getSession();
  s.destroy();
}
