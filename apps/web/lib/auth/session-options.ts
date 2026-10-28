// Session cookie config + payload type. Kept free of `next/headers` so the edge
// middleware can import it without pulling in server-only modules.

import type { SessionOptions } from 'iron-session';

export interface SessionPayload {
  userId?: string;
  agencyId?: string;
  role?: 'SUPER_ADMIN' | 'AGENCY_OWNER' | 'COUNSELLOR' | 'OPS';
  email?: string;
  name?: string;
  // Super-admin "view as agency": when set, the admin sees the agency-side app
  // scoped to this agency. Only honoured for SUPER_ADMIN.
  impersonatingAgencyId?: string;
}

const SESSION_PASSWORD = process.env.SESSION_PASSWORD ?? 'dev-only-please-change-min-32-chars-long-secret';
// Fail loudly in production if the session secret is missing/weak — silently
// falling back to the public dev string would let anyone forge sessions.
if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_PASSWORD || process.env.SESSION_PASSWORD.length < 32)) {
  throw new Error('SESSION_PASSWORD must be set (min 32 chars) in production.');
}

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
