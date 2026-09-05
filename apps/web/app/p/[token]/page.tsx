import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProposalByToken, proposalToItinerary, recordProposalView } from '@/lib/db/share';
import { formatDateShort } from '@/lib/utils';
import { displayMoneyFor } from '@/lib/money-server';
import { Check, Bed, ShieldCheck, FileText, Plane, Star } from 'lucide-react';
import { ResponseButtons } from './response-buttons';
import { ImageWithFallback } from '@/components/common/image-with-fallback';

export const dynamic = 'force-dynamic';

function shade(hex: string, percent: number) {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) + Math.round(255 * percent / 100)));
  const g = Math.max(0, Math.min(255, ((n >> 8)  & 0xff) + Math.round(255 * percent / 100)));
  const b = Math.max(0, Math.min(255, ( n        & 0xff) + Math.round(255 * percent / 100)));
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const p = await getProposalByToken(token);
  if (!p) return { title: 'Proposal not found' };
  return {
    title: `${p.name} — ${p.agency.name}`,
    description: `Trip proposal: ${p.name}. Total ${(await displayMoneyFor(p.agency.currency)).fmt(p.pricePaise)}.`,
  };
}

export default async function ProposalPublicPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const p = await getProposalByToken(token);
  if (!p) notFound();
  await recordProposalView(token);
  const it = proposalToItinerary(p)!;
  const { fmt } = await displayMoneyFor(p.agency.currency);
  const accepted = p.status === 'ACCEPTED' || p.status === 'BOOKED';
  const declined = p.status === 'DECLINED';

  const cities = it.destinations.map((d) => d.cityName);
  const nights = it.destinations.reduce((s, d) => s + d.nights, 0);
  // Destination photo collage for the hero — hotel photos first, then activity
  // photos. Rendered only when we have at least 2 (a lone photo looks sparse);
  // with 0–1 the hero stays the pure brand gradient.
  const heroPhotos = Array.from(new Set(
    [
      ...it.destinations.map((d) => d.stay?.hotel.thumb),
      ...it.days.flatMap((day) => [day.morning?.thumb, day.afternoon?.thumb, day.evening?.thumb]),
    ].filter((u): u is string => !!u && /^https?:\/\//i.test(u)),
  )).slice(0, 3);
  // White-label brand
  const primary = p.agency.primaryColor ?? '#0369A1';
  const accent  = p.agency.accentColor  ?? '#C9A24A';
  const heroBg = `linear-gradient(135deg, ${primary} 0%, ${shade(primary, -25)} 60%, #081428 100%)`;

  return (
    <div className="font-sans">
      {/* Hero: the customer's trip pass under the agency's own brand. */}
      <header className="relative overflow-hidden text-white" style={{ background: heroBg }}>
        <div className="relative mx-auto max-w-3xl px-6 pt-10 pb-24 lg:pt-14 lg:pb-28">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {p.agency.logoUrl ? (
                <img src={p.agency.logoUrl} alt={p.agency.name} className="h-10 w-auto rounded bg-white/95 p-1" />
              ) : (
                <div className="h-10 w-10 rounded bg-white/20 backdrop-blur-md flex items-center justify-center font-extrabold">{(p.agency.name || '?').slice(0, 1)}</div>
              )}
              <div>
                <p className="text-sm font-bold leading-tight">{p.agency.name}</p>
                {p.agency.tagline && <p className="text-xs text-white/70 leading-tight">{p.agency.tagline}</p>}
              </div>
            </div>
            <span className="font-mono text-[12px] font-bold tracking-[0.06em] bg-white/15 border border-white/20 rounded-[6px] px-2 py-1">{p.code}</span>
          </div>
          <h1 className="mt-8 text-[36px] lg:text-[48px] font-extrabold leading-[1.02] tracking-[-0.02em] [text-wrap:balance]">
            {cities.length === 1 ? cities[0] : `${cities.slice(0, -1).join(', ')} & ${cities.at(-1)}`}
          </h1>
          <p className="mt-3 text-[16px] text-white/80">Your trip proposal from {p.agency.name}. Every hotel, transfer and fare below is a real, bookable option.</p>
          {heroPhotos.length >= 2 && (
            <div className="relative mt-8 grid grid-cols-3 gap-3">
              {heroPhotos.map((src) => (
                <div key={src} className="h-24 sm:h-28 lg:h-36 rounded-lg overflow-hidden ring-1 ring-white/25">
                  <ImageWithFallback src={src} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* The pass, overlapping the brand band. */}
      <div className="relative mx-auto max-w-3xl px-6 -mt-16">
        <div className="rounded-lg bg-surface shadow-xl overflow-hidden flex flex-col sm:flex-row">
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 p-5">
            <div><div className="label">Destinations</div><div className="mt-1 text-[15px] font-bold text-ink truncate">{cities.length}</div><div className="text-[12px] text-[rgb(var(--text-secondary))] truncate">{cities.join(' · ')}</div></div>
            <div><div className="label">Nights</div><div className="mt-1 font-mono text-[22px] font-bold text-ink leading-none tnum">{nights}</div></div>
            <div><div className="label">Depart</div><div className="mt-1 text-[15px] font-bold text-ink tnum">{formatDateShort(p.travelDate)}</div></div>
            <div><div className="label">Travellers</div><div className="mt-1 text-[15px] font-bold text-ink tnum">{(() => { try { const r = JSON.parse(p.travelers).rooms as Array<{ adults: number; children: number }>; const a = r.reduce((s, x) => s + x.adults, 0); const c = r.reduce((s, x) => s + (x.children ?? 0), 0); return `${a} adult${a !== 1 ? 's' : ''}${c ? `, ${c} child` : ''}`; } catch { return '—'; } })()}</div></div>
          </div>
          <div className="sm:w-0 border-t-2 sm:border-t-0 sm:border-l-2 border-dashed border-border" />
          <div className="sm:w-[210px] px-5 py-4 flex flex-col justify-center text-white" style={{ background: primary }}>
            <div className="label" style={{ color: accent }}>Trip total</div>
            <div className="money text-[24px] leading-none mt-1">{fmt(it.pricePaise)}</div>
            <div className="text-[12px] text-white/75 mt-1">per adult {fmt(it.pricePerAdultPaise)}</div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-12">
        {/* Trip Summary at-a-glance */}
        <section>
          <h2 className="text-[22px] font-extrabold tracking-[-0.01em] text-ink mb-4">At a glance</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {it.destinations.map((d) => d.stay && (
              <div key={d.cityCode} className="rounded-lg bg-surface border border-border-subtle p-4 lift overflow-hidden">
                {d.stay.hotel.thumb && /^https?:\/\//i.test(d.stay.hotel.thumb) && (
                  <div className="h-20 -mx-4 -mt-4 mb-3 overflow-hidden">
                    <ImageWithFallback src={d.stay.hotel.thumb} alt={d.stay.hotel.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="label">{d.nights} night{d.nights !== 1 ? 's' : ''} in</p>
                <p className="text-lg font-bold text-ink">{d.cityName}</p>
                <p className="text-sm text-[rgb(var(--text-secondary))] mt-1 inline-flex items-center gap-1.5"><span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${d.stay.hotel.stars} star`}>{Array.from({ length: d.stay.hotel.stars }).map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-500" />)}</span>{d.stay.hotel.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Day by day */}
        <section>
          <h2 className="text-[22px] font-extrabold tracking-[-0.01em] text-ink mb-4">Day by day</h2>
          <ol className="relative border-l-2 pl-6 space-y-6" style={{ borderColor: `${primary}2e` }}>
            {it.days.map((day) => {
              const hotel = it.destinations.find((x) => x.cityCode === day.cityCode)?.stay?.hotel;
              return (
                <li key={day.dayNo} className="relative">
                  <span className="absolute -left-[33px] top-1 w-6 h-6 rounded-full text-white text-xs font-bold inline-flex items-center justify-center shadow-sm" style={{ background: primary }}>{day.dayNo}</span>
                  <p className="label">{fmtDayLabel(day.date)}</p>
                  <p className="text-lg font-bold text-ink mt-0.5">{heading(day)}</p>
                  <p className="text-sm text-[rgb(var(--text-primary))] mt-1.5 leading-relaxed">{day.narrative}</p>
                  {(day.morning || day.afternoon || day.evening) && (
                    <div className="mt-3 grid sm:grid-cols-3 gap-2">
                      {(['morning','afternoon','evening'] as const).map((s) => {
                        const a = day[s]; if (!a) return null;
                        return (
                          <div key={s} className="rounded-md bg-surface border border-border-subtle p-3">
                            <p className="label">{s}</p>
                            <p className="text-sm font-medium text-ink mt-0.5">{a.name}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {day.inclusions.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {day.inclusions.map((inc, i) => (inc.kind === 'transfer' ? (
                        <li key={i} className="text-sm flex items-start gap-2"><Check className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" /><span className="text-[rgb(var(--text-primary))]">{transferLine(inc.transfer)}</span></li>
                      ) : null))}
                    </ul>
                  )}
                  {day.overnightAtHotelId && hotel && (
                    <div className="mt-3 inline-flex items-center gap-1.5 text-xs bg-surface-2 px-2.5 py-1 rounded-md text-navy-700">
                      <Bed className="w-3.5 h-3.5" /> Overnight at {hotel.name}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        {/* Flights */}
        {it.flights && (
          <section>
            <h2 className="text-[22px] font-extrabold tracking-[-0.01em] text-ink mb-4 flex items-center gap-2"><Plane className="w-5 h-5" style={{ color: primary }} />How you'll fly</h2>
            <FlightLegCard label="Outbound" leg={it.flights} cabin={it.flights.cabin} fmt={fmt} />
            {it.flights.return && (
              <div className="mt-3">
                <FlightLegCard label="Return" leg={it.flights.return} cabin={it.flights.cabin} fmt={fmt} />
              </div>
            )}
          </section>
        )}

        {/* Hotels detail */}
        <section>
          <h2 className="text-[22px] font-extrabold tracking-[-0.01em] text-ink mb-4 flex items-center gap-2"><Bed className="w-5 h-5" style={{ color: primary }} />Where you'll stay</h2>
          <div className="space-y-3">
            {it.destinations.map((d) => d.stay && (
              <div key={d.cityCode} className="rounded-lg bg-surface border border-border-subtle p-4 lift">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${d.stay.hotel.stars} star`}>{Array.from({ length: d.stay.hotel.stars }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />)}</span>
                      <p className="font-bold text-ink">{d.stay.hotel.name}</p>
                    </div>
                    <p className="text-xs text-[rgb(var(--text-secondary))]">{d.stay.hotel.address}</p>
                    <p className="text-sm text-[rgb(var(--text-primary))] mt-2">{d.stay.hotel.room.name} · {d.stay.hotel.mealPlan}</p>
                    {d.stay.hotel.refundable && <p className="text-xs text-success-500 mt-1">Fully refundable until check-in</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[rgb(var(--text-secondary))]">{d.nights} night{d.nights !== 1 ? 's' : ''}</p>
                    <p className="money text-ink">{fmt(d.stay.hotel.pricePerNightPaise * d.nights)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Visa / Insurance */}
        {(it.visa.length > 0 || it.insurance) && (
          <section>
            <h2 className="text-[22px] font-extrabold tracking-[-0.01em] text-ink mb-4">Documents &amp; cover</h2>
            <div className="space-y-2">
              {it.visa.map((v) => (
                <div key={v.countryCode} className="rounded-md bg-surface border border-border-subtle p-3 flex items-start justify-between text-sm">
                  <div className="flex gap-2"><FileText className="w-4 h-4 mt-0.5" style={{ color: primary }} /><span>{v.description}</span></div>
                  <span className={v.included ? 'text-success-500 font-semibold' : 'text-[rgb(var(--text-secondary))]'}>{v.included ? 'Included' : 'Not Included'}</span>
                </div>
              ))}
              <div className="rounded-md bg-surface border border-border-subtle p-3 flex items-start justify-between text-sm">
                <div className="flex gap-2"><ShieldCheck className="w-4 h-4 mt-0.5" style={{ color: primary }} /><span>{it.insurance.description}</span></div>
                <span className={it.insurance.included ? 'text-success-500 font-semibold' : 'text-[rgb(var(--text-secondary))]'}>{it.insurance.included ? 'Included' : 'Not Included'}</span>
              </div>
            </div>
          </section>
        )}

        {/* Price + actions */}
        <section className="rounded-lg text-white p-6 lg:p-8" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${shade(primary, -30)} 100%)` }}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label" style={{ color: accent }}>Your trip total</p>
              <p className="mt-1 money text-[40px] leading-none">{fmt(it.pricePaise)}</p>
              <p className="text-sm text-white/70 mt-0.5">Per adult: {fmt(it.pricePerAdultPaise)}</p>
            </div>
            <div className="text-right text-xs text-white/70">
              <p>Prepared by</p>
              <p className="font-semibold text-white">{p.agency.name}</p>
              <p className="text-white/50">{p.agency.code}</p>
            </div>
          </div>
          {accepted ? (
            <div className="mt-6 rounded-md bg-success-500/20 border border-success-500/40 px-4 py-3 text-sm inline-flex items-center gap-2">
              <Check className="w-4 h-4" /> You've accepted this proposal. {p.agency.name} will be in touch.
            </div>
          ) : declined ? (
            <div className="mt-6 rounded-md bg-danger-500/20 border border-danger-500/40 px-4 py-3 text-sm">
              You've declined this proposal. {p.agency.name} can send a revised one if you want changes.
            </div>
          ) : (
            <ResponseButtons token={token} accent={accent} />
          )}
        </section>

        <footer className="text-center text-xs text-[rgb(var(--text-secondary))] pt-6">
          <p>Questions? Contact <span className="font-semibold">{p.agency.name}</span>{(p.agency as any).supportEmail && <> · <a className="hover:underline" style={{ color: primary }} href={`mailto:${(p.agency as any).supportEmail}`}>{(p.agency as any).supportEmail}</a></>}{(p.agency as any).supportPhone && <> · <a className="hover:underline" style={{ color: primary }} href={`tel:${(p.agency as any).supportPhone}`}>{(p.agency as any).supportPhone}</a></>}.</p>
          <p className="mt-2">Proposal {p.code} · Quoted {formatDateShort(p.createdAt)}</p>
          {(p.agency as any).footerText && <p className="mt-3 text-[10px] tracking-wider uppercase text-[rgb(var(--text-tertiary))]">{(p.agency as any).footerText}</p>}
        </footer>
      </main>
    </div>
  );
}

function fmtDayLabel(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long' });
}
function heading(d: any) {
  if (d.type === 'arrival')   return `Arrival in ${d.cityName}`;
  if (d.type === 'departure') return `Departure from ${d.cityName}`;
  if (d.type === 'transit')   return `${d.fromCityName} → ${d.cityName}`;
  return `Day in ${d.cityName}`;
}
function transferLine(t: any) {
  if (t.kind === 'arrival')   return `${t.fromName} → Hotel (Private Premium transfer)`;
  if (t.kind === 'departure') return `Hotel → ${t.toName} (Private transfer)`;
  return `${t.fromName} → ${t.toName} (Private transfer)`;
}

function FlightLegCard({ label, leg, cabin, fmt }: { label: string; leg: { segments: Array<{ airlineCode: string; airlineName: string; flightNumber: string; fromIATA: string; toIATA: string; departureAt: string; arrivalAt: string }>; totalPaise: number }; cabin: string; fmt: (p: number | bigint) => string }) {
  return (
    <div className="rounded-lg bg-surface border border-border-subtle p-4 lift">
      <p className="label mb-2">{label}</p>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-bold text-ink">{leg.segments[0]!.airlineName}</p>
          <p className="text-xs text-[rgb(var(--text-secondary))] font-mono">{leg.segments.map((s) => `${s.airlineCode} ${s.flightNumber}`).join(' · ')} · {cabin}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[rgb(var(--text-secondary))]">Total</p>
          <p className="money text-ink">{fmt(leg.totalPaise)}</p>
        </div>
      </div>
      <ol className="space-y-2.5">
        {leg.segments.map((s, i) => {
          const depD = new Date(s.departureAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
          return (
            <li key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm bg-surface-2 rounded-md px-3 py-2">
              <div>
                <p className="font-bold text-ink font-mono tnum">{s.departureAt.slice(11, 16)}</p>
                <p className="text-xs font-semibold">{s.fromIATA}</p>
                <p className="text-[10px] text-[rgb(var(--text-secondary))]">{depD}</p>
              </div>
              <div className="text-center text-xs text-[rgb(var(--text-tertiary))]">→</div>
              <div className="text-right">
                <p className="font-bold text-ink font-mono tnum">{s.arrivalAt.slice(11, 16)}</p>
                <p className="text-xs font-semibold">{s.toIATA}</p>
                <p className="text-[10px] text-[rgb(var(--text-secondary))]">arrival</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
