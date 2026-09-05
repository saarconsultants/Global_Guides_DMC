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
      <div className="overflow-hidden rounded-lg shadow-md">
        <div className="flex transition-transform duration-700 ease-standard" style={{ transform: `translateX(-${idx * 100}%)` }}>
          {banners.map((b) => (
            <div key={b.key} className={`relative w-full shrink-0 min-h-[440px] lg:min-h-[500px] bg-gradient-to-br ${b.tint} text-white overflow-hidden`}>
              {b.img && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,12,18,0.84)_0%,rgba(10,12,18,0.5)_45%,rgba(10,12,18,0.1)_85%)]" />
                  <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/55 to-transparent" />
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
              <div className="relative flex flex-col justify-start px-8 lg:px-12 pt-12 lg:pt-14 pb-[170px] max-w-2xl">
                                <h2 className="font-extrabold text-[32px] lg:text-[42px] leading-[1.02] tracking-[-0.02em] [text-wrap:balance]">
                  {b.title}{b.titleAccent && <> <span className="text-amber-300">{b.titleAccent}</span></>}
                </h2>
                <p className="mt-3 text-[15px] text-white/82 max-w-xl">{b.body}</p>
                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  <Link
                    href={b.cta.href as any}
                    className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-amber-500 text-ink font-bold text-sm hover:bg-amber-300 transition-colors"
                  >
                    {b.cta.label} <ArrowRight className="w-4 h-4" />
                  </Link>
                  {b.cta2 && (
                    <Link
                      href={b.cta2.href as any}
                      className="inline-flex items-center gap-1.5 h-11 px-4 rounded-md border border-white/35 text-white font-bold text-sm hover:bg-white/10 transition-colors"
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
            className="hidden md:flex absolute left-3 top-[38%] -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            aria-label="Next promotion"
            onClick={() => setIdx((i) => (i + 1) % n)}
            className="hidden md:flex absolute right-3 top-[38%] -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute top-5 right-6 flex items-center gap-1.5">
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
