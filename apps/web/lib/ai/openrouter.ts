// OpenRouter (OpenAI-compatible) chat client for the AI Suggester.
//
// Server-side only — OPENROUTER_API_KEY never reaches the browser. We call the
// plain HTTP /chat/completions endpoint with `fetch` (no SDK dependency).
//
// Default model: meta-llama/llama-3.3-70b-instruct:free — free, fast, NON-
// reasoning, strong at structured JSON. Free models are rate-limited and shared,
// so on a 429 / transient failure we automatically fall back through other free
// models (different upstream providers) before giving up. Override the primary
// with OPENROUTER_MODEL. Structured output is prompt-based JSON, parsed
// defensively in suggest-itinerary.ts.

const BASE = process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';

// Free, non-reasoning instruct models in fallback order. All return clean JSON
// quickly and sit on different providers, so a 429 on one often clears on the next.
const FREE_FALLBACKS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
];

function modelChain(): string[] {
  const primary = process.env.OPENROUTER_MODEL?.trim();
  const chain = primary ? [primary, ...FREE_FALLBACKS] : [...FREE_FALLBACKS];
  return Array.from(new Set(chain)); // dedupe, preserve order
}

export function aiModel(): string {
  return modelChain()[0]!;
}

export function aiEnabled(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}

const NO_KEY_MSG =
  'OPENROUTER_API_KEY is not set. Add it in Vercel (Project → Settings → Environment Variables) and, for local dev, in apps/web/.env.local. Get a key at https://openrouter.ai/keys.';

export function aiKeyError(): string {
  return NO_KEY_MSG;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Errors flagged retryable cause chat() to try the next free model.
class RetryableError extends Error {
  readonly retryable = true;
}

interface ChatOpts {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

/**
 * One-shot chat completion with automatic free-model fallback. Returns the
 * assistant's text content. Throws a clean, user-facing Error only after every
 * model in the chain has failed (or on a non-retryable error like a bad key).
 */
export async function chat(opts: ChatOpts): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error(NO_KEY_MSG);

  const models = modelChain();
  let lastErr: Error | null = null;
  for (let i = 0; i < models.length; i++) {
    try {
      return await callModel(models[i]!, key, opts);
    } catch (e: any) {
      lastErr = e;
      if (!(e instanceof RetryableError)) throw e; // e.g. bad key — stop immediately
      console.error(`[openrouter] ${models[i]} failed: ${e.message} — trying next free model`);
      if (i < models.length - 1) await sleep(800); // brief gap to dodge the per-minute window
    }
  }

  const m = lastErr?.message ?? '';
  if (/429|rate.?limit/i.test(m)) {
    throw new Error('All free AI models are busy right now (rate limited). Please wait a minute and try again. Tip: adding a small one-time credit at openrouter.ai raises the free daily limit substantially.');
  }
  throw lastErr ?? new Error('AI request failed. Please try again.');
}

async function callModel(model: string, key: string, opts: ChatOpts): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
    max_tokens: opts.maxTokens ?? 8000,
    temperature: opts.temperature ?? 0.3,
  };
  // Only send a reasoning effort if explicitly asked (reasoning-native models only).
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
      signal: AbortSignal.timeout(opts.timeoutMs ?? 45_000),
      cache: 'no-store',
    });
  } catch (e: any) {
    if (e?.name === 'TimeoutError' || e?.name === 'AbortError') throw new RetryableError('the model took too long to respond');
    throw new RetryableError('could not reach OpenRouter');
  }

  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    console.error(`[openrouter] ${model} HTTP ${res.status}:`, raw.slice(0, 400));
    if (res.status === 401) throw new Error('OpenRouter rejected the API key (401). Check OPENROUTER_API_KEY is correct and has access.');
    if (res.status === 429) throw new RetryableError('free-tier rate limit (429)');
    if (res.status >= 500) throw new RetryableError(`upstream ${res.status}`);
    let msg = `OpenRouter HTTP ${res.status}`;
    try { const j = JSON.parse(raw); if (j?.error?.message) msg = `OpenRouter: ${j.error.message}`; } catch { /* keep status msg */ }
    throw new Error(msg); // other 4xx — not retryable
  }

  // OpenRouter pads slow/non-streaming bodies with SSE keep-alive comment lines
  // (": OPENROUTER PROCESSING") that break a plain .json(). Read text, try a
  // direct parse, then slice the JSON object out of the padded text.
  const rawText = await res.text().catch(() => '');
  let json: any = null;
  try {
    json = JSON.parse(rawText);
  } catch {
    const s = rawText.indexOf('{');
    const e = rawText.lastIndexOf('}');
    if (s !== -1 && e > s) { try { json = JSON.parse(rawText.slice(s, e + 1)); } catch { /* unparseable */ } }
  }
  if (!json || typeof json !== 'object') {
    console.error('[openrouter] %s unparseable body (len %d): %s', model, rawText.length, rawText.slice(0, 300));
    throw new RetryableError('unreadable response');
  }

  // HTTP 200 with an error in the body (provider outage / unsupported param /
  // free-tier limit). Rate/availability errors are retryable; surface the rest.
  if (json.error) {
    const m = String(json.error?.message ?? JSON.stringify(json.error));
    console.error('[openrouter] %s 200-with-error: %s', model, m.slice(0, 300));
    if (/rate|limit|quota|busy|unavailable|capacity|temporar/i.test(m)) throw new RetryableError(m.slice(0, 120));
    throw new Error(`OpenRouter: ${m.slice(0, 200)}`);
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
    console.error('[openrouter] %s empty completion. finish_reason=%s', model, choice?.finish_reason);
    throw new RetryableError('empty response');
  }
  return content;
}
