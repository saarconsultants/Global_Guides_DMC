// Session helpers built on iron-session (encrypted cookie).
// Read with `getSession()` in server components / route handlers.

import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

import { sessionOptions, type SessionPayload } from './session-options';

export { sessionOptions, type SessionPayload };

export async function getSession() {
  const jar = await cookies();
  return getIronSession<SessionPayload>(jar as any, sessionOptions);
}

export async function destroySession() {
  const s = await getSession();
  s.destroy();
}
