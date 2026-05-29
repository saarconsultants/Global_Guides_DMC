'use server';
import { suggestItinerary, type SuggestInput, type SuggestResult } from '@/lib/ai/suggest-itinerary';
import { aiEnabled } from '@/lib/ai/anthropic';

export async function aiSuggestAction(
  input: SuggestInput,
): Promise<{ ok: true; result: SuggestResult } | { ok: false; error: string }> {
  if (!aiEnabled()) {
    return { ok: false, error: 'ANTHROPIC_API_KEY not set. Add it to apps/web/.env.local and restart the dev server. Get a key at https://console.anthropic.com/settings/keys.' };
  }
  try {
    const result = await suggestItinerary(input);
    return { ok: true, result };
  } catch (e: any) {
    console.error('[aiSuggestAction]', e);
    return { ok: false, error: e?.message ?? 'AI request failed' };
  }
}
