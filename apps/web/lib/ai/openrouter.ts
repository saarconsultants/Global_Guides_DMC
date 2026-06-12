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
    max_tokens: opts.maxTokens ?? 6000,
    temperature: opts.temperature ?? 0.3,
    // Nemotron-3 (and most reasoning models) are reasoning-NATIVE: fully turning
    // reasoning OFF returns an empty message. Keep it on but minimal ("low"
    // effort) so the call stays fast and the final answer lands in `content`.
    // max_tokens must leave room for the (hidden) reasoning tokens + the answer.
    reasoning: { effort: process.env.OPENROUTER_REASONING_EFFORT || 'low' },
  };

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
  const choice = json?.choices?.[0];
  const message = choice?.message;
  // Pull the answer from wherever the model put it: content first, then a
  // `reasoning` string, then reasoning_details[].text — reasoning models vary.
  let content = typeof message?.content === 'string' ? message.content : '';
  if (!content.trim() && typeof message?.reasoning === 'string') content = message.reasoning;
  if (!content.trim() && Array.isArray(message?.reasoning_details)) {
    content = message.reasoning_details.map((r: any) => r?.text ?? '').join('\n');
  }
  if (!content.trim()) {
    console.error('[openrouter] empty completion. finish_reason=%s message=%s', choice?.finish_reason, JSON.stringify(message).slice(0, 400));
    const hint = choice?.finish_reason === 'length' ? ' — it ran out of tokens before answering' : '';
    throw new Error(`The AI model returned an empty response${hint}. Please try again.`);
  }
  return content;
}
