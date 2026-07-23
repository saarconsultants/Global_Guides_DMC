import { existsSync } from 'fs';
import path from 'path';

// Server-only: resolve owner-supplied artwork in public/promos/. Pages check
// here and pass URLs down; missing files return null so components keep their
// gradient-art fallbacks. Drop a correctly named file in and it's live on the
// next request — no code change.
const EXTS = ['webp', 'jpg', 'jpeg', 'png'];

export function promoSrc(name: string): string | null {
  // Accept any common format: strip the requested extension and probe each.
  const base = name.replace(/\.(webp|jpe?g|png)$/i, '');
  for (const ext of EXTS) {
    const file = `${base}.${ext}`;
    if (existsSync(path.join(process.cwd(), 'public', 'promos', file))) return `/promos/${file}`;
  }
  return null;
}

/** Region artwork fallback for template cards without their own hero image. */
export function regionSrc(region: string): string | null {
  return promoSrc(`region-${region.toLowerCase().replace(/_/g, '-')}.jpg`);
}
