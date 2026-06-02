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

function baseUrl(): string {
  return process.env.HOTELBEDS_BASE_URL ?? 'https://api.test.hotelbeds.com';
}

function apiKey(): string | undefined {
  return process.env.HOTELBEDS_API_KEY;
}

function apiSecret(): string | undefined {
  return process.env.HOTELBEDS_API_SECRET;
}

export function isLive(): boolean {
  return !!(apiKey() && apiSecret());
}

function signature(key: string, secret: string): string {
  const epoch = Math.floor(Date.now() / 1000);
  return createHash('sha256').update(key + secret + epoch).digest('hex');
}

interface HbCallInit {
  method?: 'GET' | 'POST';
  timeoutMs?: number;
}

export async function hbCall<T = unknown>(path: string, body?: unknown, init?: HbCallInit): Promise<T> {
  const key = apiKey();
  const secret = apiSecret();
  if (!key || !secret) {
    throw new Error('HOTELBEDS_API_KEY / HOTELBEDS_API_SECRET not set — adapter is in mock-only mode.');
  }

  const headers: Record<string, string> = {
    'Api-key': key,
    'X-Signature': signature(key, secret),
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip',
  };

  const method = init?.method ?? (body ? 'POST' : 'GET');
  if (method === 'POST') headers['Content-Type'] = 'application/json';

  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), init?.timeoutMs ?? 30_000);
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
