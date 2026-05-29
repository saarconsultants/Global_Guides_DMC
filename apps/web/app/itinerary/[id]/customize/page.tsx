'use client';
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Stepper } from '@/components/itinerary/stepper';
import { QuickNavRail } from '@/components/itinerary/quick-nav-rail';
import { PriceRail } from '@/components/itinerary/price-rail';
import { TripSummaryRail } from '@/components/itinerary/trip-summary-rail';
import { StayCard } from '@/components/itinerary/stay-card';
import { DayCard } from '@/components/itinerary/day-card';
import { SaveProposalModal } from '@/components/itinerary/save-proposal-modal';
import { useItineraryStore } from '@/lib/itinerary/store';
import { findCityCodeByName } from '@/lib/cities';
import { formatINR } from '@/lib/utils';
import { saveProposalAction } from '@/app/actions/save-proposal';
import { loadItineraryByIdAction } from '@/app/actions/load-itinerary';
import { toast } from '@/components/ui/toast';
import { Plane, ShieldCheck, FileText, Check, Loader2 } from 'lucide-react';

export default function CustomizePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const itinerary = useItineraryStore((s) => s.byId[id]);
  const upsert = useItineraryStore((s) => s.upsert);
  const changeHotel = useItineraryStore((s) => s.changeHotel);
  const setActivity = useItineraryStore((s) => s.setActivity);
  const removeInclusion = useItineraryStore((s) => s.removeInclusion);
  const toggleVisa = useItineraryStore((s) => s.toggleVisa);
  const toggleInsurance = useItineraryStore((s) => s.toggleInsurance);
  const setFlight = useItineraryStore((s) => s.setFlight);
  const [saveOpen, setSaveOpen] = useState(false);
  const [hydrating, setHydrating] = useState(false);
  const [hydrateFailed, setHydrateFailed] = useState(false);

  // Hydrate from DB if not in memory (page refresh, deep link from My Proposals, etc.)
  useEffect(() => {
    if (itinerary || hydrating || hydrateFailed) return;
    setHydrating(true);
    loadItineraryByIdAction(id).then((r) => {
      if (r.ok) upsert(r.itinerary);
      else setHydrateFailed(true);
    }).finally(() => setHydrating(false));
  }, [id, itinerary, hydrating, hydrateFailed, upsert]);

  useEffect(() => { if (hydrateFailed) router.replace('/itinerary/new'); }, [hydrateFailed, router]);

  // Pick up a flight selection handed off from /flights via sessionStorage
  useEffect(() => {
    if (!itinerary) return;
    try {
      const raw = sessionStorage.getItem('gg-pending-flight');
      if (!raw) return;
      const { itineraryId, selection } = JSON.parse(raw);
      if (itineraryId !== id) return;
      setFlight(id, selection);
      sessionStorage.removeItem('gg-pending-flight');
      toast.success('Flight attached', `${selection.segments[0].airlineName} · ${formatINR(selection.totalPaise)} added to itinerary.`);
    } catch (e) {
      console.error('flight handoff parse failed', e);
    }
  }, [itinerary, id, setFlight]);

  if (!itinerary) return (
    <div className="min-h-[60vh] flex items-center justify-center text-[rgb(var(--text-secondary))]">
      <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading proposal…</span>
    </div>
  );

  const totalNights = itinerary.destinations.reduce((s, d) => s + d.nights, 0);
  const rooms = itinerary.intake.rooms.length;
  const adults = itinerary.intake.rooms.reduce((s, r) => s + r.adults, 0);

  return (
    <div className="bg-canvas min-h-screen">
      {/* sticky stepper bar */}
      <div className="sticky top-[92px] z-20 bg-canvas border-b border-border-subtle">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between gap-4">
          <Stepper step={2} />
          <div className="text-right">
            <p className="text-xs text-[rgb(var(--text-secondary))]">{fmtDate(itinerary.intake.departureDate)} · {totalNights} night{totalNights !== 1 ? 's' : ''} · {rooms} room · {adults} adult{adults !== 1 ? 's' : ''}</p>
            <p className="font-mono font-bold text-navy-900">{formatINR(itinerary.pricePaise)}</p>
          </div>
        </div>
      </div>

      <QuickNavRail />

      <div className="mx-auto max-w-7xl px-6 py-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* main column */}
        <div className="space-y-8">
          {/* Flights */}
          <section id="section-flights">
            <h2 className="text-xl font-semibold text-navy-900 mb-3 flex items-center gap-2"><Plane className="w-4 h-4 text-crimson-700" />Flights</h2>
            <Card>
              <CardContent className="pt-5">
                {(() => {
                  const fromIATA = resolveOriginIATA(itinerary.intake.leavingFromCode, itinerary.intake.leavingFromName);
                  const toIATA   = airport(itinerary.destinations[0]?.cityCode ?? '');
                  const searchHref = `/flights?from=${fromIATA}&to=${toIATA}&date=${itinerary.intake.departureDate}&adults=${adults}&returnTo=${id}`;
                  if (itinerary.flights) {
                    return (
                      <SelectedFlightCard
                        flight={itinerary.flights}
                        searchHref={searchHref}
                        onRemove={() => { setFlight(id, undefined); toast.info('Flight removed', 'No flights are now included in this proposal.'); }}
                      />
                    );
                  }
                  return (
                    <>
                      <p className="font-semibold text-navy-900 text-sm mb-1">Add flights to my trip — {itinerary.intake.leavingFromName} to {itinerary.destinations[0]?.cityName}</p>
                      <p className="text-crimson-700 text-sm mb-3">No flight included yet{!fromIATA && <span className="ml-1 text-[rgb(var(--text-secondary))]">(we'll let you type the origin airport on the next page)</span>}</p>
                      <Link href={searchHref as any}>
                        <Button className="gap-1.5"><Plane className="w-4 h-4" />Add flights to my trip</Button>
                      </Link>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </section>

          {/* Stays per destination */}
          <section id="section-trans">
            {itinerary.destinations.map((d) => (
              d.stay ? (
                <div key={d.cityCode} className="mb-6">
                  <StayCard
                    cityCode={d.cityCode}
                    cityName={d.cityName}
                    nights={d.nights}
                    stay={d.stay}
                    onChange={(h) => { changeHotel(itinerary.id, d.cityCode, h); toast.success('Hotel changed', `Now staying at ${h.name} in ${d.cityName}.`); }}
                  />
                </div>
              ) : null
            ))}
          </section>

          {/* Day-by-day */}
          <section>
            <h2 className="text-xl font-semibold text-navy-900 mb-3">Day by day</h2>
            <div className="space-y-4 stagger">
              {itinerary.days.map((d) => {
                const hotel = itinerary.destinations.find((x) => x.cityCode === d.cityCode)?.stay?.hotel;
                const overnight = d.overnightAtHotelId && hotel ? hotel.name : undefined;
                return (
                  <DayCard
                    key={d.dayNo}
                    day={d}
                    hotelNameForOvernight={overnight}
                    onSetActivity={(slot, a) => {
                      setActivity(itinerary.id, d.dayNo, slot, a);
                      if (a) toast.success(`Added "${a.name}" to Day ${d.dayNo} ${slot}`);
                    }}
                    onRemoveTransfer={(tid) => {
                      removeInclusion(itinerary.id, d.dayNo, tid);
                      toast.info('Transfer removed');
                    }}
                  />
                );
              })}
            </div>
          </section>

          {/* Visa */}
          <section>
            <h2 className="text-xl font-semibold text-navy-900 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-crimson-700" />Visa</h2>
            <Card>
              <CardContent className="pt-5 space-y-3">
                {itinerary.visa.map((v) => (
                  <div key={v.countryCode} className="flex items-center justify-between gap-4 py-2">
                    <div>
                      <p className="text-sm font-medium text-navy-900">{v.description}</p>
                      <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5">{v.included ? 'Included' : 'Not Included'}</p>
                    </div>
                    <Button size="sm" variant={v.included ? 'secondary' : 'outline'} onClick={() => toggleVisa(itinerary.id, v.countryCode, !v.included)}>
                      {v.included ? <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" />Included</span> : 'Include'}
                    </Button>
                  </div>
                ))}
                {itinerary.visa.length === 0 && <p className="text-sm text-[rgb(var(--text-secondary))]">Visa-free trip — nothing required.</p>}
              </CardContent>
            </Card>
          </section>

          {/* Insurance */}
          <section id="section-ins">
            <h2 className="text-xl font-semibold text-navy-900 mb-3 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-crimson-700" />Travel Insurance</h2>
            <Card>
              <CardContent className="pt-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-navy-900">{itinerary.insurance.description}</p>
                  <p className="text-xs text-[rgb(var(--text-secondary))] mt-0.5">{itinerary.insurance.included ? `Included — ${formatINR(itinerary.insurance.pricePaise)}` : 'Not Included'}</p>
                </div>
                <Button size="sm" variant={itinerary.insurance.included ? 'secondary' : 'outline'} onClick={() => toggleInsurance(itinerary.id, !itinerary.insurance.included)}>
                  {itinerary.insurance.included ? <span className="inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" />Added</span> : '+ Add'}
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Sticky rails */}
        <aside id="section-price" className="space-y-4 lg:sticky lg:top-[170px] self-start">
          <PriceRail itinerary={itinerary} onSave={() => setSaveOpen(true)} />
          <TripSummaryRail itinerary={itinerary} />
        </aside>
      </div>

      <SaveProposalModal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        defaultMarkupPct={15}
        netPaise={itinerary.pricePaise}
        currentTotalPaise={itinerary.pricePaise}
        onSave={async ({ customer, markupPct }) => saveProposalAction({ itinerary, customer, markupPct })}
      />
    </div>
  );
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function airport(cityCode: string) {
  // For now, leveraging IATA city codes 1:1. Fine for PAR/AMS/DXB/BKK/etc.
  return cityCode;
}

// Resolve origin IATA — prefer the explicit code from intake, then look up by city name.
function resolveOriginIATA(code: string, name: string) {
  if (code && code.length === 3) return code.toUpperCase();
  return findCityCodeByName(name) ?? '';
}

function SelectedFlightCard({ flight, searchHref, onRemove }: { flight: NonNullable<ReturnType<typeof useItineraryStore.getState>['byId'][string]>['flights']; searchHref: string; onRemove: () => void }) {
  if (!flight) return null;
  const first = flight.segments[0]!;
  const last  = flight.segments[flight.segments.length - 1]!;
  const stops = flight.segments.length - 1;
  const dep = first.departureAt; const arr = last.arrivalAt;
  const depT = dep.slice(11, 16); const arrT = arr.slice(11, 16);
  const depD = new Date(dep).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Pill variant="success" className="inline-flex items-center gap-1.5"><Check className="w-3 h-3" />Flight attached</Pill>
        <p className="font-mono text-lg font-bold text-navy-900">{formatINR(flight.totalPaise)}</p>
      </div>
      <div className="rounded-md border border-border-subtle bg-surface-2 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-md bg-crimson-50 text-crimson-700 flex items-center justify-center">
            <Plane className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-navy-900 text-sm">{first.airlineName}</p>
            <p className="text-xs text-[rgb(var(--text-secondary))] font-mono">{flight.segments.map((s) => `${s.airlineCode} ${s.flightNumber}`).join(' · ')} · {flight.cabin}</p>
          </div>
          <Pill variant={stops === 0 ? 'success' : 'neutral'}>{stops === 0 ? 'Non-stop' : `${stops} stop${stops > 1 ? 's' : ''}`}</Pill>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-sm">
          <div>
            <p className="text-xl font-bold text-navy-900 font-mono">{depT}</p>
            <p className="text-xs font-semibold text-navy-700">{first.fromIATA}</p>
            <p className="text-[10px] text-[rgb(var(--text-secondary))]">{depD}</p>
          </div>
          <div className="text-center text-xs text-[rgb(var(--text-secondary))]">→</div>
          <div className="text-right">
            <p className="text-xl font-bold text-navy-900 font-mono">{arrT}</p>
            <p className="text-xs font-semibold text-navy-700">{last.toIATA}</p>
            <p className="text-[10px] text-[rgb(var(--text-secondary))]">arrival</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Link href={searchHref as any}><Button size="sm" variant="secondary">Change flight</Button></Link>
        <Button size="sm" variant="ghost" onClick={onRemove} className="text-danger-500 hover:text-danger-500">Remove</Button>
      </div>
    </div>
  );
}
