// Unifystays hotel API — HTTP client.
//
// Docs:  https://docs.unifystays.com
// Auth:  `x-api-key` header, server-side only: never logged, never sent to the browser.
// Base:  UNIFYSTAYS_BASE_URL (defaults to the sandbox). Production is https://api.unifystays.com
//        and needs a Production key: a key used on the wrong host returns 403.
// Money: every call asks for INR (`X-Unifystays-Currency`), so display amounts are paise.

const DEFAULT_BASE = 'https://api-sandbox.unifystays.com';

export const baseUrl = () => (process.env.UNIFYSTAYS_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');
export const isLive = () => !!process.env.UNIFYSTAYS_API_KEY;

export class UnifyError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | undefined,
    /** The supplier or API says a retry can work. */
    readonly retryable: boolean,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'UnifyError';
  }
}

export interface CallOpts {
  method?: 'GET' | 'POST';
  body?: unknown;
  query?: Record<string, string | undefined>;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export function headers(extra?: Record<string, string>): Record<string, string> {
  const key = process.env.UNIFYSTAYS_API_KEY;
  if (!key) throw new UnifyError('UNIFYSTAYS_API_KEY is not set.', 0, 'NO_KEY', false);
  return { 'x-api-key': key, 'X-Unifystays-Currency': 'INR', Accept: 'application/json', ...extra };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One call. Returns the whole JSON body (callers read `.data`); throws UnifyError on a non-2xx. */
export async function usCall<T = any>(path: string, opts: CallOpts = {}): Promise<T> {
  const url = new URL(baseUrl() + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined) url.searchParams.set(k, v);
  const method = opts.method ?? 'GET';

  // Reads are retried once on a rate limit or supplier hiccup; bookings carry their own Idempotency-Key.
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: headers({ ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...opts.headers }),
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(opts.timeoutMs ?? 20_000),
      });
    } catch (e: any) {
      throw new UnifyError(e?.name === 'TimeoutError' ? 'Unifystays took too long to answer.' : 'Unifystays could not be reached.', 0, 'NETWORK', true);
    }
    const text = await res.text();
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON gateway page */ }
    if (res.ok) return json as T;

    const code: string | undefined = json?.error?.code;
    const retryable = res.status === 429 && code !== 'MONTHLY_LIMIT_REACHED' || [502, 503, 504].includes(res.status) || !!json?.error?.details?.retryable;
    const wait = Math.min(5_000, (Number(res.headers.get('retry-after')) || 1) * 1000);
    if (attempt === 0 && retryable && (method === 'GET' || code === 'PREBOOK_IN_PROGRESS' || code === 'HOTEL_MAPPING_CHECK_PENDING')) { await sleep(wait); continue; }

    // Status, code and request id only: never headers (they carry the key) or guest data.
    console.error(`[unifystays] ${method} ${path.replace(/\/(ubk|srch|stream)_[\w-]+/g, '/$1_…')} → ${res.status} ${code ?? ''} ${json?.request_id ?? res.headers.get('x-request-id') ?? ''}`);
    const message =
      res.status === 401 || res.status === 403 ? `Unifystays rejected the API key (${code ?? res.status}).` :
      code === 'RATE_LIMITED' ? 'Unifystays rate limit reached. Try again in a minute.' :
      code === 'MONTHLY_LIMIT_REACHED' ? 'The Unifystays monthly allowance is used up.' :
      String(json?.error?.message ?? `Unifystays error ${res.status}`);
    throw new UnifyError(message, res.status, code, retryable, json?.request_id);
  }
}

/** A money object `{ amount_minor, currency, currency_exponent }` as paise, when it is INR. */
export function inrPaise(m: { amount_minor?: number; currency?: string; currency_exponent?: number } | null | undefined): number | null {
  if (!m || m.currency !== 'INR' || !Number.isFinite(m.amount_minor)) return null;
  return Math.round(Number(m.amount_minor) * Math.pow(10, 2 - Number(m.currency_exponent ?? 2)));
}

/** Admin "Check now": a real authenticated call. */
export async function probeUnifystays(): Promise<{ reachable: boolean; status: number | null; ms: number; detail: string }> {
  const t0 = Date.now();
  if (!isLive()) return { reachable: false, status: null, ms: 0, detail: 'UNIFYSTAYS_API_KEY not set' };
  try {
    const r = await usCall<any>('/destinations/autocomplete', { query: { q: 'dubai', types: 'place', limit: '1' }, timeoutMs: 8_000 });
    return { reachable: true, status: 200, ms: Date.now() - t0, detail: `Responding${baseUrl().includes('sandbox') ? ' · SANDBOX' : ''} · ${r?.data?.total ?? 0} match for Dubai` };
  } catch (e: any) {
    return { reachable: false, status: e?.status ?? null, ms: Date.now() - t0, detail: String(e?.message ?? e) };
  }
}
