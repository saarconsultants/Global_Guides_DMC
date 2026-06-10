// Low-level Hotelbeds HTTP client.
//
// Auth: every request signs an X-Signature header.
//   X-Signature = SHA-256-HEX(apiKey + secret + epochSeconds)
//
// Because the signature changes every second, Hotelbeds does NOT require
// IP whitelisting — we can call directly from Vercel without a proxy.
//
// Headers:
//   Api-key:       <key>
//   X-Signature:   <hex>
//   Accept:        application/json
//   Accept-Encoding: gzip   (Hotelbeds recommends gzip; fetch handles it)
//   Content-Type:  application/json   (for POST)

import { createHash } from 'node:crypto';

/** Body is an HTML page, not JSON — i.e. a gateway/CDN error page, not a Hotelbeds API response. */
function looksLikeHtml(s: string): boolean {
  const head = s.trimStart().slice(0, 200).toLowerCase();
  return head.startsWith('<!doctype html') || head.startsWith('<html') || head.includes('<head');
}

export class HotelbedsHttpError extends Error {
  /** Supplier-side / transient failure (5xx, 429, or an HTML gateway page) — our request was fine, retry later. */
  public readonly upstream: boolean;
  /** Clean, user-safe sentence. Never contains raw HTML or response bodies. */
  public readonly userMessage: string;
  constructor(public status: number, public body: string) {
    const upstream = status >= 500 || status === 429 || looksLikeHtml(body);
    const userMessage =
      status === 429 ? 'Hotelbeds rate-limited the request. Wait a minute and try again.'
      : status === 504 ? 'Hotelbeds took too long to respond. Please try again in a moment.'
      : upstream ? `Hotelbeds is temporarily unavailable (gateway error ${status}). This is a supplier-side issue — please retry shortly.`
      : `Hotelbeds rejected the request (HTTP ${status}).`;
    // Keep .message clean so it is safe to surface to users (search warnings render
    // it directly). Raw body stays on .body for server logs only.
    super(userMessage);
    this.name = 'HotelbedsHttpError';
    this.upstream = upstream;
    this.userMessage = userMessage;
  }
}

export type Product = 'hotels' | 'activities' | 'transfers';

function baseUrl(): string {
  return process.env.HOTELBEDS_BASE_URL ?? 'https://api.test.hotelbeds.com';
}

// Per-product credentials with fallback to the generic pair.
// Hotelbeds often gives separate API keys per product (hotels, activities,
// transfers) with their own rate limits and quotas. Set product-specific
// env vars to use them; otherwise the generic key applies to all three.
function credsFor(product: Product): { key?: string; secret?: string } {
  const upper = product.toUpperCase();
  const key = process.env[`HOTELBEDS_${upper}_API_KEY`] ?? process.env.HOTELBEDS_API_KEY;
  const secret = process.env[`HOTELBEDS_${upper}_API_SECRET`] ?? process.env.HOTELBEDS_API_SECRET;
  return { key, secret };
}

export function isLive(product: Product = 'hotels'): boolean {
  const { key, secret } = credsFor(product);
  return !!(key && secret);
}

export interface HotelbedsProbeResult {
  reachable: boolean;
  status: number | null;
  ms: number;
  detail: string;
}

const PRODUCT_STATUS_PATH: Record<Product, string> = {
  hotels: '/hotel-api/1.0/status',
  activities: '/activity-api/3.0/status',
  transfers: '/transfer-api/1.0/status',
};

// On-demand reachability probe. Hits the product's lightweight /status endpoint.
// "Reachable" = gateway answered with a non-5xx, non-HTML response (even a 401/404
// proves the gateway is up). 5xx / HTML error page / timeout = supplier down.
export async function probeHotelbeds(product: Product): Promise<HotelbedsProbeResult> {
  const started = Date.now();
  const { key, secret } = credsFor(product);
  if (!key || !secret) return { reachable: false, status: null, ms: 0, detail: 'No credentials configured.' };
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8_000);
  try {
    const res = await fetch(`${baseUrl()}${PRODUCT_STATUS_PATH[product]}`, {
      method: 'GET',
      headers: { 'Api-key': key, 'X-Signature': signature(key, secret), Accept: 'application/json' },
      signal: ctl.signal,
      cache: 'no-store',
    });
    const ms = Date.now() - started;
    const text = await res.text();
    const html = /^\s*<(?:!doctype|html)/i.test(text.trimStart());
    if (res.status >= 500 || html) return { reachable: false, status: res.status, ms, detail: `Gateway error ${res.status}.` };
    if (res.ok) return { reachable: true, status: res.status, ms, detail: 'Responding (200 OK).' };
    return { reachable: true, status: res.status, ms, detail: `Gateway answered (HTTP ${res.status}).` };
  } catch (e: any) {
    const ms = Date.now() - started;
    if (e?.name === 'AbortError') return { reachable: false, status: 504, ms, detail: 'Timed out after 8s.' };
    return { reachable: false, status: null, ms, detail: String(e?.message ?? e) };
  } finally {
    clearTimeout(t);
  }
}

function signature(key: string, secret: string): string {
  const epoch = Math.floor(Date.now() / 1000);
  return createHash('sha256').update(key + secret + epoch).digest('hex');
}

interface HbCallInit {
  method?: 'GET' | 'POST';
  timeoutMs?: number;
  product?: Product;
  /** Retries for FAST transient upstream blips (5xx/HTML). Only set on idempotent searches. */
  retries?: number;
}

export async function hbCall<T = unknown>(path: string, body?: unknown, init?: HbCallInit): Promise<T> {
  const product = init?.product ?? 'hotels';
  const { key, secret } = credsFor(product);
  if (!key || !secret) {
    throw new Error(`HOTELBEDS_${product.toUpperCase()}_API_KEY / SECRET (or fallback HOTELBEDS_API_KEY/SECRET) not set — adapter is in mock-only mode for ${product}.`);
  }

  const method = init?.method ?? (body ? 'POST' : 'GET');
  // Vercel Hobby has a 10s function timeout — we MUST come back under it
  // even on slow upstream calls. Default 8s budget per Hotelbeds call.
  const timeoutMs = init?.timeoutMs ?? 8_000;
  const maxRetries = init?.retries ?? 0;
  const overallStart = Date.now();

  for (let attempt = 0; ; attempt++) {
    const headers: Record<string, string> = {
      'Api-key': key,
      'X-Signature': signature(key, secret), // time-based — must be fresh per attempt
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
    };
    if (method === 'POST') headers['Content-Type'] = 'application/json';

    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(`${baseUrl()}${path}`, {
        method,
        headers,
        body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
        signal: ctl.signal,
        cache: 'no-store',
      });
      const text = await res.text();
      if (!res.ok) {
        // Full upstream body (often an HTML gateway page) → server logs only, never the client.
        console.error(`[Hotelbeds] HTTP ${res.status} on ${path}:\n`, text.slice(0, 1000));
        throw new HotelbedsHttpError(res.status, text);
      }
      try {
        return text ? (JSON.parse(text) as T) : ({} as T);
      } catch {
        console.error(`[Hotelbeds] 200 but non-JSON body on ${path}:\n`, text.slice(0, 1000));
        throw new HotelbedsHttpError(502, text);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') e = new HotelbedsHttpError(504, `Request aborted after ${timeoutMs}ms timeout.`);
      // Retry once on a FAST transient blip (5xx/HTML) — never on 429 (makes it
      // worse) or 504 (budget already spent), and only with time budget left.
      const transient = e instanceof HotelbedsHttpError && e.upstream && e.status !== 429 && e.status !== 504;
      if (transient && attempt < maxRetries && Date.now() - overallStart < 3_000) {
        console.warn(`[Hotelbeds] transient ${e.status} on ${path} — retry ${attempt + 1}/${maxRetries}`);
        clearTimeout(t);
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      throw e;
    } finally {
      clearTimeout(t);
    }
  }
}
