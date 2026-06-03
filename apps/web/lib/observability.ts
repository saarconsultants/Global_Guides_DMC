// Env-gated error capture (Tier 5 — hardening).
//
// Goals:
//   - Always log errors to the runtime console (Vercel captures these into the
//     deployment logs your team can read while testing).
//   - When SENTRY_DSN is set AND @sentry/nextjs is installed, forward there too.
//   - Never throw, never hard-depend on @sentry/nextjs (it's an optional add-on).
//
// To turn on full Sentry later (no code changes needed here):
//   1. cd apps/web && npm i @sentry/nextjs
//   2. Set SENTRY_DSN (server) + NEXT_PUBLIC_SENTRY_DSN (browser) in Vercel.
//   3. Redeploy. captureException() below will start forwarding automatically.

type Ctx = Record<string, unknown>;

let sentryPromise: Promise<any | null> | null = null;

// Fully-dynamic import that the bundler cannot statically resolve, so a missing
// @sentry/nextjs never breaks the build. Resolves to null if absent or DSN unset.
async function loadSentry(): Promise<any | null> {
  if (!process.env.SENTRY_DSN) return null;
  if (sentryPromise) return sentryPromise;
  sentryPromise = (async () => {
    try {
      const spec = '@sentry/nextjs';
      const dynImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;
      const mod = await dynImport(spec);
      if (mod?.getClient?.() == null && typeof mod?.init === 'function') {
        mod.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1, environment: process.env.VERCEL_ENV ?? 'development' });
      }
      return mod;
    } catch {
      return null; // package not installed — console logging still happens
    }
  })();
  return sentryPromise;
}

function fmt(ctx?: Ctx): string {
  if (!ctx || Object.keys(ctx).length === 0) return '';
  try { return ' ' + JSON.stringify(ctx); } catch { return ''; }
}

/** Report a caught error. Safe to call from anywhere; never throws. */
export async function captureException(error: unknown, ctx?: Ctx): Promise<void> {
  const err = error instanceof Error ? error : new Error(typeof error === 'string' ? error : 'Unknown error');
  // eslint-disable-next-line no-console
  console.error(`[capture] ${err.message}${fmt(ctx)}`, err.stack ?? '');
  try {
    const sentry = await loadSentry();
    sentry?.captureException?.(err, ctx ? { extra: ctx } : undefined);
  } catch { /* swallow — observability must never break the request */ }
}

/** Report a noteworthy non-error message (e.g. a degraded fallback). */
export async function captureMessage(message: string, ctx?: Ctx): Promise<void> {
  // eslint-disable-next-line no-console
  console.warn(`[capture] ${message}${fmt(ctx)}`);
  try {
    const sentry = await loadSentry();
    sentry?.captureMessage?.(message, ctx ? { level: 'warning', extra: ctx } : undefined);
  } catch { /* swallow */ }
}

/** True when error forwarding to Sentry is configured (DSN present). */
export function observabilityEnabled(): boolean {
  return !!process.env.SENTRY_DSN;
}
