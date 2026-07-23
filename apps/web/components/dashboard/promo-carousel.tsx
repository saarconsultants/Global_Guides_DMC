'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

export interface PromoBanner {
  key: string;
  kicker: string;
  title: string;
  titleAccent?: string;      // italic amber tail
  body: string;
  cta: { label: string; href: string };
  cta2?: { label: string; href: string };
  /** Resolved /promos/... url when the image exists; null renders the gradient art. */
  img: string | null;
  /** Tailwind gradient classes for the art fallback (and the base behind images). */
  tint: string;
  ghost?: string;            // oversized faint word bottom-right
}

// Auto-rotating storefront banner — the "shop window" of the agent home page.
export function PromoCarousel({ banners }: { banners: PromoBanner[] }) {
  const [idx, setIdx] = useState(0);
  const hover = useRef(false);
  const n = banners.length;

  useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(() => { if (!hover.current) setIdx((i) => (i + 1) % n); }, 6000);
    return () => clearInterval(t);
  }, [n]);

  if (n === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Promotions"
      className="relative"
      onMouseEnter={() => { hover.current = true; }}
      onMouseLeave={() => { hover.current = false; }}
    >
      <div className="overflow-hidden rounded-2xl shadow-lg">
        <div className="flex transition-transform duration-700 ease-standard" style={{ transform: `translateX(-${idx * 100}%)` }}>
          {banners.map((b) => (
            <div key={b.key} className={`relative w-full shrink-0 min-h-[280px] lg:min-h-[360px] bg-gradient-to-br ${b.tint} text-white overflow-hidden`}>
              {b.img && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/35 to-transparent" />
                </>
              )}
              {!b.img && (
                <>
                  <div className="absolute -top-16 -right-10 w-72 h-72 rounded-full bg-amber-500/20 blur-3xl" />
                  <div className="absolute -bottom-20 left-1/4 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
                  {b.ghost && (
                    <span aria-hidden className="absolute -right-2 -bottom-6 font-display italic font-medium text-[130px] leading-none text-white/[0.06] select-none pointer-events-none">
                      {b.ghost}
                    </span>
                  )}
                </>
              )}
              <div className="relative h-full flex flex-col justify-center px-8 lg:px-12 py-10 max-w-2xl">
                <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-amber-300">{b.kicker}</p>
                <h2 className="mt-2 font-display font-semibold text-[1.75rem] lg:text-[2.1rem] leading-tight tracking-tight">
                  {b.title}{b.titleAccent && <> <i className="italic text-amber-300">{b.titleAccent}</i></>}
                </h2>
                <p className="mt-2.5 text-sm lg:text-[15px] text-white/80 max-w-xl">{b.body}</p>
                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  <Link
                    href={b.cta.href as any}
                    className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-amber-500 text-crimson-900 font-bold text-sm hover:bg-amber-300 transition-colors"
                  >
                    {b.cta.label} <ArrowRight className="w-4 h-4" />
                  </Link>
                  {b.cta2 && (
                    <Link
                      href={b.cta2.href as any}
                      className="inline-flex items-center gap-1.5 h-11 px-4 rounded-lg border border-white/30 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
                    >
                      {b.cta2.label}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {n > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous promotion"
            onClick={() => setIdx((i) => (i - 1 + n) % n)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/25 hover:bg-black/45 text-white backdrop-blur flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Next promotion"
            onClick={() => setIdx((i) => (i + 1) % n)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/25 hover:bg-black/45 text-white backdrop-blur flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.key}
                type="button"
                aria-label={`Go to promotion ${i + 1}`}
                onClick={() => setIdx(i)}
                className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-amber-500' : 'w-1.5 bg-white/50 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
