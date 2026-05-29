// Tripjack-fronting proxy.
//
// Why this exists: Tripjack whitelists by source IP. Vercel's serverless
// functions use a wide pool of dynamic AWS IPs that Tripjack will not
// whitelist. This proxy runs on a host with a static outbound IP (Railway)
// so we whitelist ONE IP with Tripjack instead of trying to whitelist
// every AWS region's worth of CIDRs.
//
// Security model:
// - The real TRIPJACK_API_KEY lives ONLY here, never on Vercel.
// - Vercel calls this proxy with a shared secret (PROXY_AUTH_TOKEN) in
//   the `x-proxy-token` header. Without it, the proxy returns 401.
// - The proxy strips `x-proxy-token`, injects the real `apikey` header,
//   and forwards everything else to Tripjack unchanged.
//
// Operational:
// - GET /health → 200, used by Railway's healthcheck.
// - * /tripjack/<path> → forwards to TRIPJACK_BASE_URL/<path>.

import express, { type Request, type Response } from 'express';

const PORT = parseInt(process.env.PORT ?? '8080', 10);
const TRIPJACK_BASE_URL = process.env.TRIPJACK_BASE_URL ?? 'https://apitest.tripjack.com';
const TRIPJACK_API_KEY = process.env.TRIPJACK_API_KEY ?? '';
const PROXY_AUTH_TOKEN = process.env.PROXY_AUTH_TOKEN ?? '';

if (!TRIPJACK_API_KEY) {
  console.error('FATAL: TRIPJACK_API_KEY env var is required');
  process.exit(1);
}
if (!PROXY_AUTH_TOKEN || PROXY_AUTH_TOKEN.length < 24) {
  console.error('FATAL: PROXY_AUTH_TOKEN env var is required and must be at least 24 characters');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));

// Trust Railway's TLS terminator so req.ip is the real client (good for logging)
app.set('trust proxy', 1);

// ─── Health ────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    target: TRIPJACK_BASE_URL,
    time: new Date().toISOString(),
  });
});

app.get('/', (_req, res) => {
  res.send('Tripjack proxy. POST /tripjack/<path>');
});

// ─── Diagnostic: outbound IP ──────────────────────────────────────────────
// Hits an external IP-echo service and reports back the public IP that
// requests originate from. Useful for telling Tripjack which IP to whitelist.
app.get('/whoami', async (_req, res) => {
  try {
    const [v4, v6] = await Promise.allSettled([
      fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5_000) }).then((r) => r.json()),
      fetch('https://api64.ipify.org?format=json', { signal: AbortSignal.timeout(5_000) }).then((r) => r.json()),
    ]);
    res.json({
      ipv4: v4.status === 'fulfilled' ? (v4.value as any).ip : null,
      ipv4OrIpv6: v6.status === 'fulfilled' ? (v6.value as any).ip : null,
      hint: 'Email this ipv4 value to Tripjack for whitelisting. If ipv4 is null but ipv4OrIpv6 has an IPv6, Tripjack likely won’t accept it.',
    });
  } catch (e: any) {
    res.status(502).json({ error: String(e?.message ?? e) });
  }
});

// ─── Proxy ─────────────────────────────────────────────────────────────────
app.all('/tripjack/*', async (req: Request, res: Response) => {
  // 1. Auth: require the shared secret
  const token = req.get('x-proxy-token');
  if (token !== PROXY_AUTH_TOKEN) {
    console.warn(`[proxy] REJECT ${req.method} ${req.path} — bad token (ip=${req.ip})`);
    return res.status(401).json({ error: 'Unauthorized — invalid x-proxy-token' });
  }

  // 2. Build upstream URL: /tripjack/foo/bar?x=1 → ${TRIPJACK_BASE_URL}/foo/bar?x=1
  const upstreamPath = req.originalUrl.replace(/^\/tripjack/, '');
  const upstreamUrl = `${TRIPJACK_BASE_URL}${upstreamPath}`;

  // 3. Forward — copy method, body. Inject apikey, strip our token.
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: TRIPJACK_API_KEY,
  };
  // Pass through some safe Tripjack-meaningful headers if present
  const acceptLanguage = req.get('accept-language');
  if (acceptLanguage) headers['Accept-Language'] = acceptLanguage;

  const start = Date.now();
  try {
    const upstreamRes = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body ?? {}),
      // 30s timeout matches the Vercel function timeout
      signal: AbortSignal.timeout(30_000),
    });
    const text = await upstreamRes.text();
    const ms = Date.now() - start;
    console.log(`[proxy] ${req.method} ${upstreamPath} → ${upstreamRes.status} (${ms}ms)`);
    res.status(upstreamRes.status);
    // Pass through Content-Type so JSON stays JSON
    const ct = upstreamRes.headers.get('content-type');
    if (ct) res.set('Content-Type', ct);
    return res.send(text);
  } catch (e: any) {
    const ms = Date.now() - start;
    console.error(`[proxy] ${req.method} ${upstreamPath} → ERROR after ${ms}ms:`, e?.message ?? e);
    return res.status(502).json({ error: 'Upstream Tripjack call failed', detail: String(e?.message ?? e) });
  }
});

app.listen(PORT, () => {
  console.log(`Tripjack proxy listening on :${PORT} → ${TRIPJACK_BASE_URL}`);
});
