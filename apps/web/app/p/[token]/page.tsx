import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProposalByToken, proposalToItinerary, recordProposalView } from '@/lib/db/share';
import { formatDateShort } from '@/lib/utils';
import { displayMoneyFor } from '@/lib/money-server';
import { Check, Bed, ShieldCheck, FileText, MapPin, Sparkles, Plane } from 'lucide-react';
import { ResponseButtons } from './response-buttons';

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
  // White-label brand
  const primary = p.agency.primaryColor ?? '#0369A1';
  const accent  = p.agency.accentColor  ?? '#C9A24A';
  const heroBg = `linear-gradient(135deg, ${primary} 0%, ${shade(primary, -25)} 60%, #081428 100%)`;

  return (
    <div className="font-sans">
      {/* Hero */}
      <header className="relative overflow-hidden text-white" style={{ background: heroBg }}>
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl" style={{ background: `${accent}33` }} />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full blur-3xl" style={{ background: `${primary}55` }} />
        <div className="relative mx-auto max-w-3xl px-6 py-14 lg:py-20">
          <div className="flex items-center gap-3 mb-5">
            {p.agency.logoUrl ? (
              <img src={p.agency.logoUrl} alt={p.agency.name} className="h-10 w-auto rounded bg-white/95 p-1" />
            ) : (
              <div className="h-10 w-10 rounded bg-white/20 backdrop-blur-md flex items-center justify-center font-extrabold">{(p.agency.name || '?').slice(0, 1)}</div>
            )}
            <div>
              <p className="text-sm font-semibold leading-tight">{p.agency.name}</p>
              {p.agency.tagline && <p className="text-xs text-white/70 leading-tight">{p.agency.tagline}</p>}
            </div>
          </div>
          <p className="text-xs uppercase tracking-widest font-bold inline-flex items-center gap-1.5" style={{ color: accent }}><Sparkles className="w-3 h-3" /> Trip Proposal · {p.code}</p>
          <h1 className="mt-3 text-4xl lg:text-5xl font-bold leading-tight">
            {cities.length === 1 ? cities[0] : `${cities.slice(0, -1).join(', ')} & ${cities.at(-1)}`}
          </h1>
          <p className="mt-2 font-display italic text-xl" style={{ color: accent }}>A journey we built for you.</p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
            <span className="inline-flex items-center gap-1.5 text-white/80"><MapPin className="w-4 h-4" /> {cities.length} destination{cities.length !== 1 ? 's' : ''}</span>
            <span className="inline-flex items-center gap-1.5 text-white/80"><Bed className="w-4 h-4" /> {nights} night{nights !== 1 ? 's' : ''}</span>
            <span className="inline-flex items-center gap-1.5 text-white/80">Departs {formatDateShort(p.travelDate)}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-12">
        {/* Trip Summary at-a-glance */}
        <section>
          <h2 className="font-display text-2xl font-semibold text-navy-900 mb-4">At a glance</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {it.destinations.map((d) => d.stay && (
              <div key={d.cityCode} className="rounded-lg bg-surface border border-border-subtle p-4 lift">
                <p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">{d.nights} night{d.nights !== 1 ? 's' : ''} in</p>
                <p className="text-lg font-bold text-navy-900">{d.cityName}</p>
                <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">{d.stay.hotel.stars}★ {d.stay.hotel.name}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Day by day */}
        <section>
          <h2 className="font-display text-2xl font-semibold text-navy-900 mb-4">Day by day</h2>
          <ol className="relative border-l-2 pl-6 space-y-6" style={{ borderColor: `${primary}2e` }}>
            {it.days.map((day) => {
              const hotel = it.destinations.find((x) => x.cityCode === day.cityCode)?.stay?.hotel;
              return (
                <li key={day.dayNo} className="relative">
                  <span className="absolute -left-[33px] top-1 w-6 h-6 rounded-full text-white text-xs font-bold inline-flex items-center justify-center shadow-sm" style={{ background: primary }}>{day.dayNo}</span>
                  <p className="text-xs uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">{fmtDayLabel(day.date)}</p>
                  <p className="text-lg font-bold text-navy-900 mt-0.5">{heading(day)}</p>
                  <p className="text-sm text-[rgb(var(--text-primary))] mt-1.5 leading-relaxed">{day.narrative}</p>
                  {(day.morning || day.afternoon || day.evening) && (
                    <div className="mt-3 grid sm:grid-cols-3 gap-2">
                      {(['morning','afternoon','evening'] as const).map((s) => {
                        const a = day[s]; if (!a) return null;
                        return (
                          <div key={s} className="rounded-md bg-surface border border-border-subtle p-3">
                            <p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">{s}</p>
                            <p className="text-sm font-medium text-navy-900 mt-0.5">{a.name}</p>
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
            <h2 className="font-display text-2xl font-semibold text-navy-900 mb-4 flex items-center gap-2"><Plane className="w-5 h-5" style={{ color: primary }} />How you'll fly</h2>
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
          <h2 className="font-display text-2xl font-semibold text-navy-900 mb-4 flex items-center gap-2"><Bed className="w-5 h-5" style={{ color: primary }} />Where you'll stay</h2>
          <div className="space-y-3">
            {it.destinations.map((d) => d.stay && (
              <div key={d.cityCode} className="rounded-lg bg-surface border border-border-subtle p-4 lift">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-gold-500 text-sm">{'★'.repeat(d.stay.hotel.stars)}</span>
                      <p className="font-bold text-navy-900">{d.stay.hotel.name}</p>
                    </div>
                    <p className="text-xs text-[rgb(var(--text-secondary))]">{d.stay.hotel.address}</p>
                    <p className="text-sm text-[rgb(var(--text-primary))] mt-2">{d.stay.hotel.room.name} · {d.stay.hotel.mealPlan}</p>
                    {d.stay.hotel.refundable && <p className="text-xs text-success-500 mt-1">Fully refundable until check-in</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[rgb(var(--text-secondary))]">{d.nights} night{d.nights !== 1 ? 's' : ''}</p>
                    <p className="font-mono font-bold text-navy-900">{fmt(d.stay.hotel.pricePerNightPaise * d.nights)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Visa / Insurance */}
        {(it.visa.length > 0 || it.insurance) && (
          <section>
            <h2 className="font-display text-2xl font-semibold text-navy-900 mb-4">Documents &amp; cover</h2>
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
        <section className="rounded-2xl text-white p-6 lg:p-8" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${shade(primary, -30)} 100%)` }}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest font-bold" style={{ color: accent }}>Your trip total</p>
              <p className="mt-1 text-4xl font-bold font-mono">{fmt(it.pricePaise)}</p>
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
      <p className="text-[10px] uppercase tracking-widest text-crimson-700 font-bold mb-2">{label}</p>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-bold text-navy-900">{leg.segments[0]!.airlineName}</p>
          <p className="text-xs text-[rgb(var(--text-secondary))] font-mono">{leg.segments.map((s) => `${s.airlineCode} ${s.flightNumber}`).join(' · ')} · {cabin}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-[rgb(var(--text-secondary))]">Total</p>
          <p className="font-mono font-bold text-navy-900">{fmt(leg.totalPaise)}</p>
        </div>
      </div>
      <ol className="space-y-2.5">
        {leg.segments.map((s, i) => {
          const depD = new Date(s.departureAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
          return (
            <li key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm bg-surface-2 rounded-md px-3 py-2">
              <div>
                <p className="font-bold text-navy-900 font-mono">{s.departureAt.slice(11, 16)}</p>
                <p className="text-xs font-semibold">{s.fromIATA}</p>
                <p className="text-[10px] text-[rgb(var(--text-secondary))]">{depD}</p>
              </div>
              <div className="text-center text-xs text-[rgb(var(--text-tertiary))]">→</div>
              <div className="text-right">
                <p className="font-bold text-navy-900 font-mono">{s.arrivalAt.slice(11, 16)}</p>
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
