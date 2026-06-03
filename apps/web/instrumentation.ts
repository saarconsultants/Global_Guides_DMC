// Next.js instrumentation — runs once when the server starts, plus a global
// hook for uncaught errors in server components, route handlers, and rendering.
// https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation

import { captureException, observabilityEnabled } from '@/lib/observability';

export async function register() {
  if (observabilityEnabled()) {
    // eslint-disable-next-line no-console
    console.log('[observability] Sentry DSN detected — server errors will be forwarded.');
  }
}

// Stable in Next 15. Called for every uncaught server-side error.
export async function onRequestError(
  error: unknown,
  request: { path?: string; method?: string },
  context: { routerKind?: string; routePath?: string; renderSource?: string },
) {
  await captureException(error, {
    path: request?.path,
    method: request?.method,
    routerKind: context?.routerKind,
    routePath: context?.routePath,
    renderSource: context?.renderSource,
  });
}
