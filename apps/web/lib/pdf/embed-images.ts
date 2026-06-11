// Pre-fetch an itinerary's remote photos (hotels + activities) server-side and
// inline them as base64 data URLs BEFORE handing the itinerary to @react-pdf.
//
// Why: @react-pdf fetches <Image src> URLs during render. On serverless that's
// flaky — a slow/failed fetch leaves an ugly empty box (or, worse, can hang the
// function). By embedding the bytes ourselves we (a) make rendering reliable and
// fetch-free, and (b) DROP any image we can't fetch, so a failure becomes "no
// photo" (clean) instead of an empty bordered box.

import type { Itinerary } from '@/lib/itinerary/types';

async function toDataUrl(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || 'image/jpeg';
    if (!ct.startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > 3_000_000) return null; // skip empty / oversized
    return `data:${ct};base64,${buf.toString('base64')}`;
  } catch {
    return null; // timeout / network / abort → drop the image
  }
}

export async function embedItineraryImages(
  it: Itinerary,
  opts?: { perImageMs?: number; max?: number },
): Promise<Itinerary> {
  const perImageMs = opts?.perImageMs ?? 3000;
  const max = opts?.max ?? 12;

  const urls = new Set<string>();
  const add = (t?: string) => { if (t && /^https?:\/\//i.test(t)) urls.add(t); };
  for (const d of it.destinations) add(d.stay?.hotel.thumb);
  // Activities render emoji markers (not photos), so only hotel images need embedding.

  const list = Array.from(urls).slice(0, max);
  const fetched = await Promise.all(list.map(async (u) => [u, await toDataUrl(u, perImageMs)] as const));
  const map = new Map(fetched);
  // data URL if fetched OK, else undefined → component renders no photo (clean fallback)
  const repl = (t?: string): string | undefined => (t ? map.get(t) ?? undefined : undefined) ?? undefined;

  return {
    ...it,
    destinations: it.destinations.map((d) =>
      d.stay ? { ...d, stay: { ...d.stay, hotel: { ...d.stay.hotel, thumb: repl(d.stay.hotel.thumb) } } } : d,
    ),
  };
}
