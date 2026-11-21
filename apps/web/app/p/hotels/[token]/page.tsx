// Public page: hotel options an agent shared for the customer to choose from.
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Star, Check } from 'lucide-react';
import { db } from '@/lib/db/client';
import { displayMoneyFor } from '@/lib/money-server';
import { formatDateRange, formatDateShort } from '@/lib/utils';
import { ImageWithFallback } from '@/components/common/image-with-fallback';
import type { SharedHotel } from '@/lib/hotels/share';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Hotel options', robots: { index: false } };

export default async function HotelOptionsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await db.hotelShare.findUnique({
    where: { token },
    include: { agency: { select: { name: true, tagline: true, logoUrl: true, primaryColor: true, supportEmail: true, supportPhone: true, email: true, footerText: true, currency: true } } },
  });
  if (!share) notFound();
  const hotels = JSON.parse(share.hotels) as SharedHotel[];
  const { fmt } = await displayMoneyFor(share.agency.currency);
  const nights = Math.max(1, Math.round((Date.parse(share.checkOut) - Date.parse(share.checkIn)) / 86_400_000));
  const primary = share.agency.primaryColor ?? '#0369A1';
  const phone = (share.agency.supportPhone ?? '').replace(/\D/g, '');
  const mail = share.agency.supportEmail ?? share.agency.email;
  // "I prefer this one" opens WhatsApp (or email) to the agency with the choice filled in.
  const prefer = (h: SharedHotel, i: number) => {
    const text = `Hi, for ${share.cityName} (${formatDateRange(share.checkIn, share.checkOut)}) I prefer option ${i + 1}: ${h.name}.`;
    // An Indian number saved without its country code still has to open the right chat.
    if (phone) return `https://wa.me/${phone.length === 10 ? `91${phone}` : phone}?text=${encodeURIComponent(text)}`;
    return mail ? `mailto:${mail}?subject=${encodeURIComponent(`Hotel choice for ${share.cityName}`)}&body=${encodeURIComponent(text)}` : null;
  };
  const cheapest = Math.min(...hotels.map((h) => h.totalPaise));

  return (
    <div className="font-sans min-h-screen bg-surface-2">
      <header className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-10">
          <p className="text-sm font-bold">{share.agency.name}</p>
          {share.agency.tagline && <p className="text-xs text-white/70 mt-0.5">{share.agency.tagline}</p>}
          <h1 className="mt-6 text-[30px] lg:text-[40px] font-extrabold leading-[1.05] tracking-[-0.02em] [text-wrap:balance]">Hotel options for your {share.cityName} stay</h1>
          <p className="mt-3 text-[15px] text-white/80">
            <span className="font-mono font-bold tnum">{formatDateRange(share.checkIn, share.checkOut)}</span> · {nights} night{nights !== 1 ? 's' : ''} · {share.guests}
          </p>
          <p className="mt-2 text-[14px] text-white/70">Compare them below and tell us which one you prefer.</p>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        <ul className={`grid gap-4 sm:grid-cols-2 ${hotels.length >= 4 ? 'lg:grid-cols-4' : hotels.length === 3 ? 'lg:grid-cols-3' : ''}`}>
          {hotels.map((h, i) => {
            const href = prefer(h, i);
            return (
              <li key={i} className="flex flex-col rounded-lg bg-surface border border-border-subtle shadow-sm overflow-hidden">
                <div className="h-44 bg-ink">
                  <ImageWithFallback src={h.thumb} alt={h.name} className="w-full h-44 object-cover" fallback={<div className="w-full h-44 flex items-center justify-center text-white/60 text-sm">No photo</div>} />
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <p className="label">Option {i + 1}{h.totalPaise === cheapest && hotels.some((x) => x.totalPaise !== cheapest) ? ' · lowest price' : ''}</p>
                  <h2 className="mt-1 text-[17px] font-bold text-ink leading-snug">{h.name}</h2>
                  {h.stars > 0 && (
                    <p className="mt-1 inline-flex items-center gap-0.5 text-amber-500" role="img" aria-label={`${h.stars} star hotel`}>
                      {Array.from({ length: h.stars }).map((_, k) => <Star key={k} className="w-3.5 h-3.5 fill-amber-500" />)}
                    </p>
                  )}
                  {h.address && <p className="mt-1 text-[13px] text-[rgb(var(--text-secondary))]">{h.address}</p>}
                  <dl className="mt-3 space-y-2 text-[13px]">
                    {h.room && <div><dt className="label">Room</dt><dd className="font-semibold text-ink">{h.room}</dd></div>}
                    {h.board && <div><dt className="label">Meals</dt><dd className="font-semibold text-ink">{h.board}</dd></div>}
                    <div><dt className="label">Cancellation</dt><dd className={`font-semibold ${h.refundable ? 'text-success-600' : 'text-ink'}`}>{h.refundable ? <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" />Free cancellation available</span> : 'Non-refundable'}</dd></div>
                  </dl>
                  <div className="mt-auto pt-4">
                    <p className="money text-[22px] text-ink leading-none">{fmt(h.totalPaise)}</p>
                    <p className="text-[12px] text-[rgb(var(--text-secondary))] mt-1 tnum">for {nights} night{nights !== 1 ? 's' : ''} · {fmt(h.perNightPaise)} per night</p>
                    {href && (
                      <a href={href} target="_blank" rel="noreferrer" className="mt-3 inline-flex w-full items-center justify-center min-h-11 rounded-md px-4 text-sm font-bold text-white" style={{ background: primary }}>I prefer this one</a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <footer className="text-center text-xs text-[rgb(var(--text-secondary))] pt-8 pb-4">
          <p>Prices as of <span className="font-mono">{formatDateShort(share.createdAt)}</span>, for the whole stay, taxes included. Rooms and prices are confirmed when you book.</p>
          <p className="mt-2">Questions? Contact <span className="font-semibold">{share.agency.name}</span>{mail && <> · <a className="underline" href={`mailto:${mail}`}>{mail}</a></>}{share.agency.supportPhone && <> · <a className="underline" href={`tel:${share.agency.supportPhone}`}>{share.agency.supportPhone}</a></>}</p>
          {share.agency.footerText && <p className="mt-3 text-[10px] tracking-wider uppercase text-[rgb(var(--text-tertiary))]">{share.agency.footerText}</p>}
        </footer>
      </main>
    </div>
  );
}
