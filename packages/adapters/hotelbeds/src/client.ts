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

export class HotelbedsHttpError extends Error {
  constructor(public status: number, public body: string) {
    super(`Hotelbeds HTTP ${status}: ${body.slice(0, 300)}`);
    this.name = 'HotelbedsHttpError';
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

function signature(key: string, secret: string): string {
  const epoch = Math.floor(Date.now() / 1000);
  return createHash('sha256').update(key + secret + epoch).digest('hex');
}

interface HbCallInit {
  method?: 'GET' | 'POST';
  timeoutMs?: number;
  product?: Product;
}

export async function hbCall<T = unknown>(path: string, body?: unknown, init?: HbCallInit): Promise<T> {
  const product = init?.product ?? 'hotels';
  const { key, secret } = credsFor(product);
  if (!key || !secret) {
    throw new Error(`HOTELBEDS_${product.toUpperCase()}_API_KEY / SECRET (or fallback HOTELBEDS_API_KEY/SECRET) not set — adapter is in mock-only mode for ${product}.`);
  }

  const headers: Record<string, string> = {
    'Api-key': key,
    'X-Signature': signature(key, secret),
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip',
  };

  const method = init?.method ?? (body ? 'POST' : 'GET');
  if (method === 'POST') headers['Content-Type'] = 'application/json';

  // Vercel Hobby has a 10s function timeout — we MUST come back under it
  // even on slow upstream calls. Default 8s budget per Hotelbeds call.
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), init?.timeoutMs ?? 8_000);
  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      method,
      headers,
      body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined,
      signal: ctl.signal,
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) throw new HotelbedsHttpError(res.status, text);
    return text ? (JSON.parse(text) as T) : ({} as T);
  } finally {
    clearTimeout(t);
  }
}
