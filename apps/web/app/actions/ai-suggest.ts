'use server';
import { suggestItinerary, type SuggestInput, type SuggestResult } from '@/lib/ai/suggest-itinerary';
import { aiEnabled, aiKeyError } from '@/lib/ai/openrouter';

export async function aiSuggestAction(
  input: SuggestInput,
): Promise<{ ok: true; result: SuggestResult } | { ok: false; error: string }> {
  if (!aiEnabled()) {
    return { ok: false, error: aiKeyError() };
  }
  try {
    const result = await suggestItinerary(input);
    return { ok: true, result };
  } catch (e: any) {
    console.error('[aiSuggestAction]', e);
    return { ok: false, error: e?.message ?? 'AI request failed' };
  }
}
