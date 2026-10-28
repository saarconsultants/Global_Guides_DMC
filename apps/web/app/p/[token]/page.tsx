import { notFound } from 'next/navigation';
import { after } from 'next/server';
import type { Metadata } from 'next';
import { getProposalByToken, proposalToItinerary, recordProposalView } from '@/lib/db/share';
import { formatDateShort, formatWeekdayDate, formatDayMonth } from '@/lib/utils';
import { displayMoneyFor } from '@/lib/money-server';
import { Check, Bed, ShieldCheck, FileText, Plane, Star } from 'lucide-react';
import { ResponseButtons } from './response-buttons';
import { ImageWithFallback } from '@/components/common/image-with-fallback';
import { AcceptButton, StickyAcceptBar } from './accept-cta';
import { allocate, insuranceDetail, visaDetail, visaTitle } from '@/lib/itinerary/display';
import type { Day } from '@/lib/itinerary/types';

export const dynamic = 'force-dynamic';

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
  // Record the view after the response is sent — the customer shouldn't wait on
  // the status update + notification writes before seeing their trip.
  after(() => recordProposalView(token));
  const it = proposalToItinerary(p)!;
  const { fmt } = await displayMoneyFor(p.agency.currency);
  const accepted = p.status === 'ACCEPTED' || p.status === 'BOOKED';
  const declined = p.status === 'DECLINED';

  const cities = it.destinations.map((d) => d.cityName);
  const nights = it.destinations.reduce((s, d) => s + d.nights, 0);
  // Destination photo collage for the hero — hotel photos first, then activity
  // photos. Rendered only when we have at least 2 (a lone photo looks sparse);
  // with 0–1 the hero is a plain ink band.
  const heroPhotos = Array.from(new Set(
    [
      ...it.destinations.map((d) => d.stay?.hotel.thumb),
      ...it.days.flatMap((day) => [day.morning?.thumb, day.afternoon?.thumb, day.evening?.thumb]),
    ].filter((u): u is string => !!u && /^https?:\/\//i.test(u)),
  )).slice(0, 3);
  // White-label brand
  const primary = p.agency.primaryColor ?? '#0369A1';
  const accent  = p.agency.accentColor  ?? '#C9A24A';
  const open = !accepted && !declined;

  // Price breakdown in the customer's selling price: each component's share
  // of the itinerary, applied to the quoted total — never the net cost.
  const stayNet = it.destinations.map((d) => (d.stay ? d.stay.hotel.pricePerNightPaise * d.nights : 0));
  const flightNet = [it.flights?.totalPaise ?? 0, it.flights?.return?.totalPaise ?? 0];
  let transferNet = 0; let activityNet = 0; let transferCount = 0; let activityCount = 0;
  for (const day of it.days) {
    for (const inc of day.inclusions) if (inc.kind === 'transfer') { transferNet += inc.transfer.pricePaise; transferCount++; }
    for (const slot of ['morning', 'afternoon', 'evening'] as const) { const a = day[slot]; if (a) { activityNet += a.pricePaise; activityCount++; } }
  }
  const includedVisas = it.visa.filter((v) => v.included);
  const visaNet = includedVisas.reduce((s, v) => s + (v.pricePaise ?? 0), 0);
  const insuranceNet = it.insurance?.included ? it.insurance.pricePaise : 0;
  const stayTotalNet = stayNet.reduce((s, x) => s + x, 0);
  const flightTotalNet = flightNet[0]! + flightNet[1]!;
  const [staySell, flightSell, transferSell, activitySell, visaSell, insuranceSell] =
    allocate([stayTotalNet, flightTotalNet, transferNet, activityNet, visaNet, insuranceNet], it.pricePaise) as [number, number, number, number, number, number];
  const staySellEach = allocate(stayNet, staySell);
  const [outboundSell, returnSell] = allocate(flightNet, flightSell) as [number, number];
  const breakdown = [
    { label: `Hotels · ${nights} night${nights !== 1 ? 's' : ''}`, paise: staySell },
    { label: it.flights?.return ? 'Return flights' : 'Flights', paise: flightSell },
    { label: `Transfers · ${transferCount}`, paise: transferSell },
    { label: `Activities · ${activityCount}`, paise: activitySell },
    { label: 'Visa assistance', paise: visaSell },
    { label: 'Travel insurance', paise: insuranceSell },
  ].filter((r) => r.paise > 0);
  const quoted = new Date(p.createdAt);
  const validUntil = new Date(quoted.getTime() + 7 * 24 * 60 * 60 * 1000);
  const dayGroups = groupFreeDays(it.days);

  return (
    <div className="font-sans">
      {/* Hero: a flat ink band under the agency's own name. */}
      <header className="relative overflow-hidden text-white bg-ink">
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-8 pb-24 lg:pt-14 lg:pb-28">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <AgencyMark name={p.agency.name} logoUrl={p.agency.logoUrl} />
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight break-words">{p.agency.name}</p>
                {p.agency.tagline && <p className="text-xs text-white/70 leading-tight mt-0.5">{p.agency.tagline}</p>}
              </div>
            </div>
            <span className="shrink-0 whitespace-nowrap font-mono text-[12px] font-bold tracking-[0.06em] bg-white/10 border border-white/20 rounded-[6px] px-2 py-1">{p.code}</span>
          </div>
          <h1 className="mt-8 text-[34px] lg:text-[48px] font-extrabold leading-[1.02] tracking-[-0.02em] [text-wrap:balance]">
            {cities.length === 1 ? cities[0] : `${cities.slice(0, -1).join(', ')} & ${cities.at(-1)}`}
          </h1>
          <p className="mt-3 text-[16px] text-white/80">Your trip proposal from {p.agency.name}. Every hotel, transfer and fare below is a real, bookable option.</p>
          {heroPhotos.length >= 2 && (
            <div className="relative mt-8 grid grid-cols-3 gap-3">
              {heroPhotos.map((src) => (
                <div key={src} className="h-24 sm:h-28 lg:h-36 rounded-lg overflow-hidden ring-1 ring-white/20 bg-white/5">
                  <ImageWithFallback src={src} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* The pass, overlapping the brand band. */}
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 -mt-16">
        <div className="rounded-lg bg-surface shadow-xl overflow-hidden flex flex-col sm:flex-row">
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 p-5">
            <div><div className="label">Destinations</div><div className="mt-1 text-[15px] font-bold text-ink truncate">{cities.length}</div><div className="text-[12px] text-[rgb(var(--text-secondary))] truncate">{cities.join(' · ')}</div></div>
            <div><div className="label">Nights</div><div className="mt-1 font-mono text-[22px] font-bold text-ink leading-none tnum">{nights}</div></div>
            <div><div className="label">Depart</div><div className="mt-1 font-mono text-[14px] font-bold text-ink tnum whitespace-nowrap">{formatDateShort(p.travelDate)}</div></div>
            <div><div className="label">Travellers</div><div className="mt-1 text-[15px] font-bold text-ink tnum">{(() => { try { const r = JSON.parse(p.travelers).rooms as Array<{ adults: number; children: number }>; const a = r.reduce((s, x) => s + x.adults, 0); const c = r.reduce((s, x) => s + (x.children ?? 0), 0); return `${a} adult${a !== 1 ? 's' : ''}${c ? `, ${c} ${c === 1 ? 'child' : 'children'}` : ''}`; } catch { return '—'; } })()}</div></div>
          </div>
          <div className="sm:w-0 border-t-2 sm:border-t-0 sm:border-l-2 border-dashed border-border" />
          <div className="sm:w-[220px] px-5 py-4 flex flex-col justify-center text-white" style={{ background: primary }}>
            <div className="label !text-white/85">Trip total</div>
            <div className="money text-[24px] leading-none mt-1">{fmt(it.pricePaise)}</div>
            <div className="text-[12px] text-white/75 mt-1">per adult <span className="money">{fmt(it.pricePerAdultPaise)}</span></div>
            {open && <AcceptButton className="mt-3 w-full bg-white" style={{ color: primary }} />}
            {accepted && <p className="mt-3 text-[12.5px] font-bold inline-flex items-center gap-1.5"><Check className="w-4 h-4" aria-hidden />Accepted</p>}
          </div>
        </div>
      </div>

      <div className={`mx-auto max-w-3xl px-4 sm:px-6 py-10 space-y-12 ${open ? 'pb-28 sm:pb-10' : ''}`}>
        {/* Trip Summary at-a-glance */}
        <section>
          <h2 className="text-[22px] font-extrabold tracking-[-0.01em] text-ink mb-4">At a glance</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {it.destinations.map((d) => d.stay && (
              <div key={d.cityCode} className="rounded-lg bg-surface border border-border-subtle p-4 overflow-hidden">
                {d.stay.hotel.thumb && /^https?:\/\//i.test(d.stay.hotel.thumb) && (
                  <div className="h-20 -mx-4 -mt-4 mb-3 overflow-hidden">
                    <ImageWithFallback src={d.stay.hotel.thumb} alt={d.stay.hotel.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <p className="label">{d.nights} night{d.nights !== 1 ? 's' : ''} in</p>
                <p className="text-lg font-bold text-ink">{d.cityName}</p>
                <p className="text-sm text-[rgb(var(--text-secondary))] mt-1 inline-flex items-center gap-1.5"><span className="inline-flex items-center gap-0.5 text-amber-500" role="img" aria-label={`${d.stay.hotel.stars} star`}>{Array.from({ length: d.stay.hotel.stars }).map((_, i) => <Star key={i} className="w-3 h-3 fill-amber-500" />)}</span>{d.stay.hotel.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Day by day */}
        <section>
          <h2 className="text-[22px] font-extrabold tracking-[-0.01em] text-ink mb-4">Day by day</h2>
          <ol className="relative border-l-2 pl-6 space-y-6" style={{ borderColor: `${primary}2e` }}>
            {dayGroups.map((g) => {
              if (g.length > 1) {
                const first = g[0]!; const last = g[g.length - 1]!;
                const hotel = it.destinations.find((x) => x.cityCode === first.cityCode)?.stay?.hotel;
                return (
                  <li key={first.dayNo} className="relative">
                    <span className="absolute -left-[33px] top-1 w-6 h-6 rounded-full text-white text-[10px] font-bold inline-flex items-center justify-center shadow-sm tnum" style={{ background: primary }}>{first.dayNo}</span>
                    <p className="font-mono text-[11.5px] font-bold tracking-[0.06em] text-[rgb(var(--text-secondary))] tnum">{formatDayMonth(first.date)} → {formatDayMonth(last.date)}</p>
                    <p className="text-lg font-bold text-ink mt-0.5">Days {first.dayNo}–{last.dayNo} · Free days at leisure in {first.cityName}</p>
                    <p className="text-sm text-[rgb(var(--text-primary))] mt-1.5 leading-relaxed">{g.length} days to explore {first.cityName} at your own pace. Ask us to add tours or experiences on any of these days.</p>
                    {hotel && (
                      <div className="mt-3 inline-flex items-center gap-1.5 text-xs bg-surface-2 px-2.5 py-1 rounded-md text-navy-700">
                        <Bed className="w-3.5 h-3.5" /> Overnight at {hotel.name}
                      </div>
                    )}
                  </li>
                );
              }
              const day = g[0]!;
              const hotel = it.destinations.find((x) => x.cityCode === day.cityCode)?.stay?.hotel;
              return (
                <li key={day.dayNo} className="relative">
                  <span className="absolute -left-[33px] top-1 w-6 h-6 rounded-full text-white text-xs font-bold inline-flex items-center justify-center shadow-sm tnum" style={{ background: primary }}>{day.dayNo}</span>
                  <p className="font-mono text-[11.5px] font-bold tracking-[0.06em] text-[rgb(var(--text-secondary))] tnum">{formatWeekdayDate(day.date)}</p>
                  <p className="text-lg font-bold text-ink mt-0.5">{heading(day)}</p>
                  <p className="text-sm text-[rgb(var(--text-primary))] mt-1.5 leading-relaxed">{customerNarrative(day)}</p>
                  {(day.morning || day.afternoon || day.evening) && (
                    <div className="mt-3 grid sm:grid-cols-3 gap-2">
                      {(['morning','afternoon','evening'] as const).map((s) => {
                        const a = day[s]; if (!a) return null;
                        return (
                          <div key={s} className="rounded-md bg-surface border border-border-subtle p-3">
                            <p className="label">{s}</p>
                            <p className="text-sm font-medium text-ink mt-0.5">{a.leamigo?.startTime && <span className="font-mono mr-1">{a.leamigo.startTime}</span>}{a.name}</p>
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
            <FlightLegCard label="Outbound" leg={it.flights} sellPaise={outboundSell} cabin={it.flights.cabin} fmt={fmt} />
            {it.flights.return && (
              <div className="mt-3">
                <FlightLegCard label="Return" leg={it.flights.return} sellPaise={returnSell} cabin={it.flights.cabin} fmt={fmt} />
              </div>
            )}
          </section>
        )}

        {/* Hotels detail */}
        <section>
          <h2 className="text-[22px] font-extrabold tracking-[-0.01em] text-ink mb-4 flex items-center gap-2"><Bed className="w-5 h-5" style={{ color: primary }} />Where you'll stay</h2>
          <div className="space-y-3">
            {it.destinations.map((d, di) => d.stay && (
              <div key={d.cityCode} className="rounded-lg bg-surface border border-border-subtle p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span className="inline-flex items-center gap-0.5 text-amber-500" role="img" aria-label={`${d.stay.hotel.stars} star`}>{Array.from({ length: d.stay.hotel.stars }).map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-500" />)}</span>
                      <p className="font-bold text-ink">{d.stay.hotel.name}</p>
                    </div>
                    <p className="text-xs text-[rgb(var(--text-secondary))]">{d.stay.hotel.address}</p>
                    <p className="text-sm text-[rgb(var(--text-primary))] mt-2">{d.stay.hotel.room.name} · {d.stay.hotel.mealPlan}</p>
                    {d.stay.hotel.refundable && <p className="text-xs text-success-500 mt-1">Fully refundable until check-in</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[rgb(var(--text-secondary))]">{d.nights} night{d.nights !== 1 ? 's' : ''}</p>
                    <p className="money text-ink">{fmt(staySellEach[di] ?? 0)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Visa / insurance — only what is included; nothing "not included" is shown to the customer. */}
        {(includedVisas.length > 0 || it.insurance?.included) && (
          <section>
            <h2 className="text-[22px] font-extrabold tracking-[-0.01em] text-ink mb-4">Documents &amp; cover</h2>
            <div className="space-y-2">
              {includedVisas.map((v) => (
                <div key={v.countryCode} className="rounded-md bg-surface border border-border-subtle p-3 flex items-start justify-between gap-3 text-sm">
                  <div className="flex gap-2 min-w-0"><FileText className="w-4 h-4 mt-0.5 shrink-0" style={{ color: primary }} /><span><span className="block font-bold text-ink">{visaTitle(v.country)}</span><span className="block text-[rgb(var(--text-secondary))]">{visaDetail(v.description)}</span></span></div>
                  <span className="shrink-0 text-success-500 font-semibold">Included</span>
                </div>
              ))}
              {it.insurance?.included && (
                <div className="rounded-md bg-surface border border-border-subtle p-3 flex items-start justify-between gap-3 text-sm">
                  <div className="flex gap-2 min-w-0"><ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: primary }} /><span><span className="block font-bold text-ink">Travel insurance</span><span className="block text-[rgb(var(--text-secondary))]">{insuranceDetail(it.insurance.description)}</span></span></div>
                  <span className="shrink-0 text-success-500 font-semibold">Included</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* What the price covers, in the customer's selling price. */}
        {breakdown.length > 0 && (
          <section>
            <h2 className="text-[22px] font-extrabold tracking-[-0.01em] text-ink mb-4">What&apos;s included in the price</h2>
            <div className="rounded-lg bg-surface border border-border-subtle overflow-hidden">
              <ul className="divide-y divide-border-subtle text-sm">
                {breakdown.map((r) => (
                  <li key={r.label} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-ink font-semibold">{r.label}</span>
                    <span className="money text-ink">{fmt(r.paise)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-surface-2 border-t border-border-subtle">
                <span className="label">Trip total</span>
                <span className="money text-[18px] text-ink">{fmt(it.pricePaise)}</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-[rgb(var(--text-secondary))]">All taxes included. Prices valid for 7 days from <span className="font-mono">{formatDateShort(quoted)}</span> (until <span className="font-mono">{formatDateShort(validUntil)}</span>); hotel rooms and fares are confirmed at booking.</p>
          </section>
        )}

        {/* Price + actions */}
        <section id="respond" className="rounded-lg text-white p-6 lg:p-8 scroll-mt-24" style={{ background: primary }}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label !text-white/85">Your trip total</p>
              <p className="mt-1 money text-[40px] leading-none">{fmt(it.pricePaise)}</p>
              <p className="text-sm text-white/70 mt-0.5">Per adult: <span className="money">{fmt(it.pricePerAdultPaise)}</span></p>
            </div>
            <div className="text-right text-xs text-white/70">
              <p>Prepared by</p>
              <p className="font-semibold text-white">{p.agency.name}</p>
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
          <p>Questions? Contact <span className="font-semibold">{p.agency.name}</span>{(p.agency as any).supportEmail && <> · <a className="underline hover:no-underline" style={{ color: primary }} href={`mailto:${(p.agency as any).supportEmail}`}>{(p.agency as any).supportEmail}</a></>}{(p.agency as any).supportPhone && <> · <a className="underline hover:no-underline" style={{ color: primary }} href={`tel:${(p.agency as any).supportPhone}`}>{(p.agency as any).supportPhone}</a></>}.</p>
          <p className="mt-2">Proposal <span className="font-mono whitespace-nowrap">{p.code}</span> · Quoted <span className="font-mono">{formatDateShort(p.createdAt)}</span></p>
          {(p.agency as any).footerText && <p className="mt-3 text-[10px] tracking-wider uppercase text-[rgb(var(--text-tertiary))]">{(p.agency as any).footerText}</p>}
        </footer>
      </div>
      {open && <StickyAcceptBar total={fmt(it.pricePaise)} primary={primary} />}
    </div>
  );
}

/** Agency logo on a white plate; initials when there is no logo or it fails to load. */
function AgencyMark({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const initials = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
  const fallback = <div className="h-10 w-10 shrink-0 rounded-md bg-white text-ink flex items-center justify-center text-sm font-extrabold">{initials}</div>;
  if (!logoUrl) return fallback;
  return (
    <div className="h-10 shrink-0 rounded-md bg-white px-1.5 flex items-center">
      <ImageWithFallback src={logoUrl} alt={name} className="h-8 w-auto max-w-[120px] object-contain" fallback={<span className="text-sm font-extrabold text-ink px-1">{initials}</span>} />
    </div>
  );
}

/** Consecutive free days in the same city (no activities, no transfers) fold into one row. */
function groupFreeDays(days: Day[]): Day[][] {
  const isFree = (d: Day) => d.type === 'stay' && !d.morning && !d.afternoon && !d.evening && !d.inclusions.some((i) => i.kind === 'transfer');
  const out: Day[][] = [];
  for (const d of days) {
    const prev = out[out.length - 1];
    const last = prev?.[prev.length - 1];
    if (prev && last && isFree(d) && isFree(last) && last.cityCode === d.cityCode) prev.push(d);
    else out.push([d]);
  }
  return out;
}
/** Older proposals saved builder instructions as the day text; show customers a friendly line instead. */
function customerNarrative(d: { narrative?: string | null; cityName?: string }): string {
  const text = d.narrative ?? '';
  if (text.includes('Use morning, afternoon and evening slots')) {
    return `A free day in ${d.cityName ?? 'the city'} to explore at your own pace.`;
  }
  return text;
}

function heading(d: any) {
  if (d.type === 'arrival')   return `Arrival in ${d.cityName}`;
  if (d.type === 'departure') return `Departure from ${d.cityName}`;
  if (d.type === 'transit')   return `${d.fromCityName} → ${d.cityName}`;
  return `Day in ${d.cityName}`;
}
function transferLine(t: any) {
  if (t.kind === 'rental')    return `Car with driver from ${t.fromName} (${t.toName})`;
  if (t.kind === 'arrival')   return `${t.fromName} → Hotel (Private Premium transfer)`;
  if (t.kind === 'departure') return `Hotel → ${t.toName} (Private transfer)`;
  return `${t.fromName} → ${t.toName} (Private transfer)`;
}

function FlightLegCard({ label, leg, sellPaise, cabin, fmt }: { label: string; leg: { segments: Array<{ airlineCode: string; airlineName: string; flightNumber: string; fromIATA: string; toIATA: string; departureAt: string; arrivalAt: string }>; totalPaise: number }; sellPaise: number; cabin: string; fmt: (p: number | bigint) => string }) {
  return (
    <div className="rounded-lg bg-surface border border-border-subtle p-4">
      <p className="label mb-2">{label}</p>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-bold text-ink">{leg.segments[0]!.airlineName}</p>
          <p className="text-xs text-[rgb(var(--text-secondary))] font-mono">{leg.segments.map((s) => `${s.airlineCode} ${s.flightNumber}`).join(' · ')} · {cabin}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[rgb(var(--text-secondary))]">Total</p>
          <p className="money text-ink">{fmt(sellPaise)}</p>
        </div>
      </div>
      <ol className="space-y-2.5">
        {leg.segments.map((s, i) => {
          const depD = formatDayMonth(s.departureAt);
          return (
            <li key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm bg-surface-2 rounded-md px-3 py-2">
              <div>
                <p className="font-bold text-ink font-mono tnum">{s.departureAt.slice(11, 16)}</p>
                <p className="text-xs font-semibold">{s.fromIATA}</p>
                <p className="text-[10px] font-mono text-[rgb(var(--text-secondary))]">{depD}</p>
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
