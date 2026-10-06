// Leamigo Partner API — HTTP client.
//
// Docs:  https://staging-transfers.leamigo.com/api-doc/partner
// Auth:  `x-api-key` header. Server-side only: the key is read from the
//        environment, never logged, never sent to the browser.
// Base:  LEAMIGO_BASE_URL (defaults to the staging host). Switch to the
//        production host by changing that one env var.

const DEFAULT_BASE = 'https://staging-transfers.leamigo.com';

export function baseUrl(): string {
  return (process.env.LEAMIGO_BASE_URL ?? DEFAULT_BASE).replace(/\/+$/, '');
}

export function isLive(): boolean {
  return !!process.env.LEAMIGO_API_KEY;
}

/** Documented error envelope: { error: { code, message, timestamp } }. */
export interface LeamigoErrorBody {
  error?: { code?: string; message?: string; timestamp?: string };
  message?: string | string[];
  statusCode?: number;
}

export class LeamigoError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | undefined,
    /** Auth / account problems — retrying will not help. */
    readonly fatal: boolean,
  ) {
    super(message);
    this.name = 'LeamigoError';
  }
}

interface CallOpts {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
  query?: Record<string, string | undefined>;
  timeoutMs?: number;
}

export async function lmCall<T>(path: string, opts: CallOpts = {}): Promise<T> {
  const key = process.env.LEAMIGO_API_KEY;
  if (!key) throw new LeamigoError('LEAMIGO_API_KEY is not set — Leamigo is in mock-only mode.', 0, 'NO_KEY', true);

  const url = new URL(baseUrl() + path);
  for (const [k, v] of Object.entries(opts.query ?? {})) if (v !== undefined) url.searchParams.set(k, v);

  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers: {
        'x-api-key': key,
        Accept: 'application/json',
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: AbortSignal.timeout(opts.timeoutMs ?? 8_000),
      cache: 'no-store',
    });
  } catch (e: any) {
    const timeout = e?.name === 'TimeoutError' || e?.name === 'AbortError';
    throw new LeamigoError(timeout ? 'Leamigo did not respond in time.' : 'Could not reach Leamigo.', 0, timeout ? 'TIMEOUT' : 'NETWORK', false);
  }

  const text = await res.text().catch(() => '');
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }

  if (!res.ok) {
    const body = (json ?? {}) as LeamigoErrorBody;
    const code = body.error?.code;
    const raw = body.error?.message ?? (Array.isArray(body.message) ? body.message.join('; ') : body.message) ?? text.slice(0, 200);
    const fatal = res.status === 401 || res.status === 403;
    const friendly =
      res.status === 401 ? 'Leamigo rejected the API key (401). Check LEAMIGO_API_KEY.' :
      res.status === 403 ? `Leamigo account inactive or transfers not enabled for this key (403${code ? ` ${code}` : ''}).` :
      `Leamigo ${res.status}${code ? ` ${code}` : ''}: ${raw}`;
    // Log status + code only. Never the request headers (they carry the key).
    console.error(`[leamigo] ${opts.method ?? 'GET'} ${path} → ${res.status}${code ? ` ${code}` : ''}`);
    throw new LeamigoError(friendly, res.status, code, fatal);
  }

  return json as T;
}

/** Admin "Check now": a real authenticated round trip that also reveals coverage. */
export async function probeLeamigo(): Promise<{ reachable: boolean; status: number | null; ms: number; detail: string }> {
  const t0 = Date.now();
  if (!isLive()) return { reachable: false, status: null, ms: 0, detail: 'LEAMIGO_API_KEY not set' };
  try {
    const res = await lmCall<{ data?: Array<{ country_code?: string; status?: string }> }>('/v1/transfers/search/operators', { timeoutMs: 6_000 });
    const ops = res?.data ?? [];
    const active = ops.filter((o) => o.status === 'active');
    const countries = Array.from(new Set(active.map((o) => o.country_code).filter(Boolean))).sort();
    return {
      reachable: true,
      status: 200,
      ms: Date.now() - t0,
      detail: `${active.length} active operator${active.length !== 1 ? 's' : ''}${countries.length ? ` · ${countries.join(', ')}` : ''}`,
    };
  } catch (e: any) {
    return { reachable: false, status: e?.status ?? null, ms: Date.now() - t0, detail: String(e?.message ?? e) };
  }
}
