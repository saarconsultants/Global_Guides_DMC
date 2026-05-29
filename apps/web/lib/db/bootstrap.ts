// Backwards-compat helper. Old code paths called getOrCreateAgency() to receive
// the single tenant. With real auth we just resolve the logged-in actor's agency.
// SUPER_ADMIN users do not have an agency — callers must handle null.

import { requireAgency } from '@/lib/auth/ctx';

export async function getOrCreateAgency() {
  const a = await requireAgency();
  return { id: a.agencyId, code: a.agency!.code, name: a.agency!.name };
}
