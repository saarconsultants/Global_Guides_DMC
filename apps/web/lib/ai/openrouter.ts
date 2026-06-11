// OpenRouter (OpenAI-compatible) chat client for the AI Suggester.
//
// Server-side only — the OPENROUTER_API_KEY never reaches the browser. We call
// the plain HTTP /chat/completions endpoint with `fetch` (no SDK dependency) so
// the agency can point OPENROUTER_MODEL at any model OpenRouter hosts.
//
// Default model: nvidia/nemotron-3-ultra-550b-a55b:free — a free NVIDIA Nemotron
// reasoning model. Because it (and most free models) don't reliably support
// OpenAI tool-calling / json_schema, the Suggester asks for raw JSON in the
// prompt and parses it defensively (see suggest-itinerary.ts). Reasoning is
// disabled by default for speed; set OPENROUTER_REASONING=1 to re-enable it.

const BASE = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';

export function aiModel(): string {
  return process.env.OPENROUTER_MODEL ?? 'nvidia/nemotron-3-ultra-550b-a55b:free';
}

export function aiEnabled(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

const NO_KEY_MSG =
  'OPENROUTER_API_KEY is not set. Add it in Vercel (Project → Settings → Environment Variables) and, for local dev, in apps/web/.env.local. Get a key at https://openrouter.ai/keys.';

export function aiKeyError(): string {
  return NO_KEY_MSG;
}

/**
 * One-shot chat completion. Returns the assistant's text content.
 * Throws a clean, user-facing Error on any failure (missing key, bad model
 * slug, rate-limit, no credits, timeout) — the raw upstream body is logged
 * server-side, never surfaced.
 */
export async function chat(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error(NO_KEY_MSG);

  const body: Record<string, unknown> = {
    model: aiModel(),
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    max_tokens: opts.maxTokens ?? 4000,
    temperature: opts.temperature ?? 0.3,
  };
  // Reasoning models (e.g. Nemotron) emit hidden reasoning tokens by default,
  // which is slow and can blow the token budget. Disable unless asked for.
  if (process.env.OPENROUTER_REASONING !== '1') {
    body.reasoning = { enabled: false };
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        // Optional attribution headers shown on the OpenRouter dashboard.
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL ?? 'https://globalguidesdmc.com',
        'X-Title': process.env.OPENROUTER_SITE_NAME ?? 'Global Guides DMC',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 55_000),
      cache: 'no-store',
    });
  } catch (e: any) {
    if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {
      throw new Error('The AI model took too long to respond. Try again, or set OPENROUTER_MODEL to a lighter model (e.g. nvidia/nemotron-3-super-120b-a12b:free).');
    }
    throw new Error('Could not reach OpenRouter. Check your network and try again.');
  }

  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    console.error(`[openrouter] HTTP ${res.status}:`, raw.slice(0, 500));
    let msg = `OpenRouter HTTP ${res.status}`;
    try {
      const j = JSON.parse(raw);
      if (j?.error?.message) msg = `OpenRouter: ${j.error.message}`;
    } catch {
      /* non-JSON body — keep the status-code message */
    }
    if (res.status === 401) msg = 'OpenRouter rejected the API key (401). Check OPENROUTER_API_KEY is correct and has credits.';
    if (res.status === 429) msg = 'OpenRouter rate limit hit (429) — the free tier is busy. Wait a moment and try again.';
    throw new Error(msg);
  }

  const json: any = await res.json().catch(() => null);
  const message = json?.choices?.[0]?.message;
  // Prefer the answer content; some reasoning models leave content empty and put
  // everything in `reasoning` — fall back to it so the parser still gets the JSON.
  const content: string = (typeof message?.content === 'string' && message.content) || (typeof message?.reasoning === 'string' && message.reasoning) || '';
  if (!content.trim()) {
    console.error('[openrouter] empty completion:', JSON.stringify(json).slice(0, 500));
    throw new Error('The AI model returned an empty response. Try again.');
  }
  return content;
}
