// Anthropic client singleton.

import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (_client) return _client;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set. Get a key at https://console.anthropic.com/settings/keys and add it to apps/web/.env.local.');
  _client = new Anthropic({ apiKey: key });
  return _client;
}

export function aiModel(): string {
  return process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';
}

export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
