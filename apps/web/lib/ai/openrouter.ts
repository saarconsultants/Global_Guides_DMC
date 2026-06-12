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
    max_tokens: opts.maxTokens ?? 8000,
    temperature: opts.temperature ?? 0.3,
  };
  // Nemotron-3 is reasoning-NATIVE. We let it reason in its default mode (the
  // answer then lands in `content`) — do NOT disable reasoning, that returns an
  // empty message. Only send an explicit reasoning effort if asked to, since a
  // bad/unsupported param makes some free providers reply with a 200-body error.
  const effort = process.env.OPENROUTER_REASONING_EFFORT;
  if (effort) body.reasoning = { effort };

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
  if (!json || typeof json !== 'object') {
    throw new Error('OpenRouter returned an unreadable response. Please try again.');
  }
  // OpenRouter can return HTTP 200 with an error in the BODY (provider outage,
  // unsupported param, free-tier limit) instead of a normal completion. Surface
  // it rather than crashing downstream on a missing message.
  if (json.error) {
    const m = json.error?.message ?? JSON.stringify(json.error);
    console.error('[openrouter] 200-with-error:', String(m).slice(0, 400));
    throw new Error(`OpenRouter: ${String(m).slice(0, 300)}`);
  }
  const choice = json.choices?.[0];
  const message = choice?.message;
  // Pull the answer from wherever the model put it: content first, then a
  // `reasoning` string, then reasoning_details[].text — reasoning models vary.
  let content = typeof message?.content === 'string' ? message.content : '';
  if (!content.trim() && typeof message?.reasoning === 'string') content = message.reasoning;
  if (!content.trim() && Array.isArray(message?.reasoning_details)) {
    content = message.reasoning_details.map((r: any) => (typeof r?.text === 'string' ? r.text : '')).join('\n');
  }
  if (!content.trim()) {
    // Log the whole body (safe: json is a non-null object here) so we can see the shape.
    console.error('[openrouter] empty completion. finish_reason=%s body=%s', choice?.finish_reason, JSON.stringify(json).slice(0, 600));
    const hint = choice?.finish_reason === 'length' ? ' — it ran out of tokens before answering' : '';
    throw new Error(`The AI model returned an empty response${hint}. Please try again.`);
  }
  return content;
}
