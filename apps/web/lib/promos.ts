import { existsSync } from 'fs';
import path from 'path';

// Server-only: resolve owner-supplied artwork in public/promos/. Pages check
// here and pass URLs down; missing files return null so components keep their
// gradient-art fallbacks. Drop a correctly named file in and it's live on the
// next request — no code change.
const EXTS = ['webp', 'jpg', 'jpeg', 'png'];

// public/ can't change inside a deployed build, so in production each lookup is
// memoised (up to 4 sync stat calls per image per render otherwise). Dev keeps
// probing so a newly dropped file shows on refresh.
const memo = new Map<string, string | null>();
const MEMO = process.env.NODE_ENV === 'production';

export function promoSrc(name: string): string | null {
  if (MEMO && memo.has(name)) return memo.get(name)!;
  // Accept any common format: strip the requested extension and probe each.
  const base = name.replace(/\.(webp|jpe?g|png)$/i, '');
  let found: string | null = null;
  for (const ext of EXTS) {
    const file = `${base}.${ext}`;
    if (existsSync(path.join(process.cwd(), 'public', 'promos', file))) { found = `/promos/${file}`; break; }
  }
  if (MEMO) memo.set(name, found);
  return found;
}

/** Region artwork fallback for template cards without their own hero image. */
export function regionSrc(region: string): string | null {
  return promoSrc(`region-${region.toLowerCase().replace(/_/g, '-')}.jpg`);
}
