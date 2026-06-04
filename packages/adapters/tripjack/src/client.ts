// Low-level Tripjack HTTP client. All callers go through tjPost().
// IPv6 leak guard: do NOT use `dns-lookup` here; for serverless (Vercel) fetch
// goes IPv4 by default. For self-hosted Node, set NODE_OPTIONS=--dns-result-order=ipv4first.

/** Body is an HTML page, not JSON — i.e. a gateway/CDN error page, not a Tripjack API response. */
function looksLikeHtml(s: string): boolean {
  const head = s.trimStart().slice(0, 200).toLowerCase();
  return head.startsWith('<!doctype html') || head.startsWith('<html') || head.includes('<head');
}

export class TripjackHttpError extends Error {
  /** Supplier-side / transient failure (5xx, 429, or an HTML gateway page) — our request was fine, retry later. */
  public readonly upstream: boolean;
  /** Clean, user-safe sentence. Never contains raw HTML or response bodies. */
  public readonly userMessage: string;
  constructor(public status: number, public body: string) {
    const upstream = status >= 500 || status === 429 || looksLikeHtml(body);
    const userMessage =
      status === 429 ? 'Tripjack rate-limited the request. Wait ~60–120s and try again.'
      : status === 504 ? 'Tripjack took too long to respond. Please try again in a moment.'
      : upstream ? `Tripjack is temporarily unavailable (gateway error ${status}). This is a supplier-side outage — please retry shortly.`
      : `Tripjack rejected the request (HTTP ${status}).`;
    // Keep .message clean so it is safe to surface to users. Raw body stays on .body for server logs.
    super(userMessage);
    this.name = 'TripjackHttpError';
    this.upstream = upstream;
    this.userMessage = userMessage;
  }
}

export class TripjackBizError extends Error {
  constructor(public detail: unknown, public fullBody?: string) {
    super(`Tripjack rejected the request — ${JSON.stringify(detail)}${fullBody ? `\n\nFull response body:\n${fullBody.slice(0, 1500)}` : ''}`);
    this.name = 'TripjackBizError';
  }
}

function baseUrl(): string {
  return process.env.TRIPJACK_BASE_URL ?? 'https://apitest.tripjack.com';
}

function apiKey(): string | undefined {
  return process.env.TRIPJACK_API_KEY;
}

// When set, we're going through our Tripjack-fronting proxy on Railway.
// In proxy mode the proxy injects `apikey` upstream and we send `x-proxy-token`
// instead. Vercel never sees the real TRIPJACK_API_KEY.
function proxyToken(): string | undefined {
  return process.env.TRIPJACK_PROXY_TOKEN;
}

function isProxyMode(): boolean {
  return !!proxyToken();
}

export function isLive(): boolean {
  return !!apiKey() || isProxyMode();
}

/**
 * POST to Tripjack. Returns parsed JSON or throws.
 *
 * Two modes:
 * 1. Direct mode (local dev): TRIPJACK_API_KEY set → fetch sends `apikey` header
 *    directly to apitest.tripjack.com.
 * 2. Proxy mode (Vercel): TRIPJACK_PROXY_TOKEN set, TRIPJACK_BASE_URL points at
 *    Railway proxy. We send `x-proxy-token`; the proxy injects the real `apikey`.
 */
export async function tjPost<T = unknown>(path: string, body: unknown, init?: { timeoutMs?: number }): Promise<T> {
  const proxy = isProxyMode();
  const key = apiKey();
  if (!proxy && !key) {
    throw new Error('Neither TRIPJACK_API_KEY (direct mode) nor TRIPJACK_PROXY_TOKEN (proxy mode) is set — adapter is in mock-only mode.');
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (proxy) {
    headers['x-proxy-token'] = proxyToken()!;
  } else {
    headers['apikey'] = key!;
  }

  const ctl = new AbortController();
  // Default 9s — under Vercel's 10s Hobby function cap, so OUR clean error fires
  // before Vercel kills the function with its own opaque 504. Override via env for local dev.
  const timeoutMs = init?.timeoutMs ?? Number(process.env.TRIPJACK_TIMEOUT_MS ?? 9_000);
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: ctl.signal,
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) {
      // Full upstream body (often an HTML gateway page) → server logs only, never the client.
      console.error(`[Tripjack] HTTP ${res.status} on ${path}:\n`, text.slice(0, 1000));
      throw new TripjackHttpError(res.status, text);
    }
    let json: any;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      console.error(`[Tripjack] 200 but non-JSON body on ${path}:\n`, text.slice(0, 1000));
      throw new TripjackHttpError(502, text);
    }
    // Tripjack pattern: HTTP 200 with embedded status.success === false
    if (json && typeof json === 'object' && 'status' in json && json.status && json.status.success === false) {
      // Log the full body to server console so Bipin can see it in `npm run dev` output.
      console.error('[Tripjack] Business error response body:\n', text);
      throw new TripjackBizError(json.status, text);
    }
    return json as T;
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new TripjackHttpError(504, `Request aborted after ${timeoutMs}ms timeout.`);
    throw e;
  } finally {
    clearTimeout(t);
  }
}
