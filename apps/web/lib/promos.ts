import { existsSync } from 'fs';
import path from 'path';

// Server-only: resolve owner-supplied artwork in public/promos/. Pages check
// here and pass URLs down; missing files return null so components keep their
// gradient-art fallbacks. Drop a correctly named file in and it's live on the
// next request — no code change.
export function promoSrc(name: string): string | null {
  return existsSync(path.join(process.cwd(), 'public', 'promos', name)) ? `/promos/${name}` : null;
}

/** Region artwork fallback for template cards without their own hero image. */
export function regionSrc(region: string): string | null {
  return promoSrc(`region-${region.toLowerCase().replace(/_/g, '-')}.jpg`);
}
