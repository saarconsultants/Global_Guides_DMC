// Low-level Tripjack HTTP client. All callers go through tjPost().
// IPv6 leak guard: do NOT use `dns-lookup` here; for serverless (Vercel) fetch
// goes IPv4 by default. For self-hosted Node, set NODE_OPTIONS=--dns-result-order=ipv4first.

export class TripjackHttpError extends Error {
  constructor(public status: number, public body: string) {
    super(`Tripjack HTTP ${status}: ${body.slice(0, 300)}`);
    this.name = 'TripjackHttpError';
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
  const t = setTimeout(() => ctl.abort(), init?.timeoutMs ?? 30_000);
  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: ctl.signal,
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) throw new TripjackHttpError(res.status, text);
    const json = text ? JSON.parse(text) : {};
    // Tripjack pattern: HTTP 200 with embedded status.success === false
    if (json && typeof json === 'object' && 'status' in json && (json as any).status && (json as any).status.success === false) {
      // Log the full body to server console so Bipin can see it in `npm run dev` output.
      console.error('[Tripjack] Business error response body:\n', text);
      throw new TripjackBizError((json as any).status, text);
    }
    return json as T;
  } finally {
    clearTimeout(t);
  }
}
