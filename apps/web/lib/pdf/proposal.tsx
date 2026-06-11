// Branded itinerary PDF for a saved proposal — editorial "travel magazine" design.
//
// Structure: full-bleed brand cover (title, tagline, meta grid) → content pages
// (numbered serif sections, ghost day numerals, white Investment treatment) with
// a fixed accent stripe, rotated spine wordmark and footer on every content page.
//
// Notes on @react-pdf limitations we work around here:
//  - Helvetica lacks many currency glyphs (₹, €, ฿…), so money is printed with
//    the 3-letter ISO code (formatMoneyCode) instead of the symbol.
//  - <Image> cannot render SVG. Agency logos that aren't PNG/JPG fall back to a
//    styled text wordmark so the brand always shows.
//  - No gradients — layered low-opacity circles ("orbs") stand in for depth.

import { Document, Page, View, Text, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { formatMoneyCode } from '@/lib/money';
import type { Itinerary } from '@/lib/itinerary/types';

// Emoji in @react-pdf are rendered as images fetched from a CDN (Helvetica has no
// emoji glyphs). Used for the small activity/transfer markers.
Font.registerEmojiSource({ format: 'png', url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/' });

// Hotel star rating is always gold (independent of the agency accent colour).
const STAR_GOLD = '#F5B301';

interface AgencyBrand {
  name: string;
  tagline?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  footerText?: string | null;
}

export interface ProposalPdfInput {
  agency: AgencyBrand;
  code: string;
  version?: number;
  customerName?: string | null;
  currency?: string;   // agency display currency (default INR)
  rate?: number;       // INR→currency multiplier
  images?: boolean;    // render remote hotel photos (default true; route disables on fallback)
  fonts?: boolean;     // use the Fraunces display font (route falls back to built-ins)
  itinerary: Itinerary;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}
function isRasterLogo(url?: string | null): boolean {
  if (!url) return false;
  return /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url) || url.startsWith('data:image/');
}
// Only absolute http(s) or data URLs are fetchable by @react-pdf server-side.
function pdfImg(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('data:image/')) return url;
  return /^https?:\/\//i.test(url) ? url : null;
}
// Emoji marker per activity category (rendered via the registered twemoji source).
function activityEmoji(category?: string): string {
  switch (category) {
    case 'museum': return '🏛️';
    case 'tour': return '🧭';
    case 'experience': return '🎟️';
    default: return '📸'; // sightseeing
  }
}
const pad2 = (n: number) => String(n).padStart(2, '0');

const styles = (primary: string, accent: string, fonts: boolean) => {
  const display = fonts ? 'Fraunces' : 'Helvetica-Bold';
  const italicProps = fonts
    ? ({ fontFamily: 'Fraunces', fontStyle: 'italic' as const, fontWeight: 500 as const })
    : ({ fontFamily: 'Helvetica-Oblique' });
  return StyleSheet.create({
    // ── Cover ──
    coverPage: { padding: 0 },
    cover: { backgroundColor: primary, width: '100%', height: '100%', padding: 48, color: '#FFFFFF', position: 'relative', overflow: 'hidden', flexDirection: 'column', justifyContent: 'space-between' },
    orb1: { position: 'absolute', top: -120, right: -80, width: 340, height: 340, borderRadius: 170, backgroundColor: '#FFFFFF', opacity: 0.05 },
    orb2: { position: 'absolute', top: 60, right: 40, width: 150, height: 150, borderRadius: 75, backgroundColor: accent, opacity: 0.09 },
    orb3: { position: 'absolute', bottom: -90, left: -70, width: 260, height: 260, borderRadius: 130, backgroundColor: '#FFFFFF', opacity: 0.04 },
    logoChip: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 6, padding: 7, alignSelf: 'flex-start' },
    logoImg: { height: 30, maxWidth: 200, objectFit: 'contain' },
    wordmark: { color: primary, fontFamily: 'Helvetica-Bold', fontSize: 12 },
    eyebrowChip: { alignSelf: 'flex-start', border: `1 solid ${accent}66`, borderRadius: 10, paddingVertical: 3, paddingHorizontal: 9, marginBottom: 14 },
    eyebrow: { fontSize: 8, letterSpacing: 2, color: accent, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    coverTitle: { fontFamily: display, fontSize: 40, lineHeight: 1.08 },
    coverTag: { ...italicProps, fontSize: 14, color: accent, marginTop: 10 },
    coverFor: { fontSize: 10.5, color: 'rgba(255,255,255,0.85)', marginTop: 8 },
    coverRule: { height: 1, backgroundColor: 'rgba(255,255,255,0.22)', marginBottom: 14 },
    metaRow: { flexDirection: 'row' },
    metaCol: { flex: 1, paddingRight: 8 },
    metaKicker: { fontSize: 7, letterSpacing: 1.5, color: 'rgba(255,255,255,0.55)', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    metaValue: { fontFamily: display, fontSize: 14, marginTop: 4, lineHeight: 1 },
    metaSub: { fontSize: 7.5, color: 'rgba(255,255,255,0.45)', marginTop: 3 },
    coverFootRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
    coverFootText: { fontSize: 8, color: 'rgba(255,255,255,0.5)' },

    // ── Content pages ──
    page: { paddingTop: 46, paddingBottom: 56, paddingHorizontal: 48, fontFamily: 'Helvetica', color: '#0F172A', fontSize: 10 },
    pageStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: accent },
    spineWrap: { position: 'absolute', left: -116, top: 370, width: 260, height: 10, transform: 'rotate(-90deg)' },
    spineText: { fontSize: 6.5, letterSpacing: 2.5, color: '#C5CCD6', fontFamily: 'Helvetica-Bold', textAlign: 'center' },

    section: { marginBottom: 18 },
    secNum: { ...italicProps, fontSize: 11, color: primary },
    secTitle: { fontFamily: display, fontSize: 16, color: '#0B1F3A' },

    // Included checklist
    incWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },
    incChip: { flexDirection: 'row', alignItems: 'center', width: '50%', marginBottom: 6 },
    incSq: { width: 4.5, height: 4.5, backgroundColor: primary, marginRight: 7 },
    incSqOff: { width: 4.5, height: 4.5, border: '1 solid #D8DEE7', backgroundColor: 'transparent', marginRight: 7 },
    incText: { fontSize: 9.5, color: '#1F2937' },
    incMuted: { fontSize: 9.5, color: '#C3CBD6' },

    card: { backgroundColor: '#FBFCFD', borderRadius: 6, padding: 12, marginBottom: 8, border: '1 solid #E8EDF2' },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    bold: { fontFamily: 'Helvetica-Bold' },
    muted: { color: '#64748B', fontSize: 9, marginTop: 2 },

    // Stays
    hotelCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 6, marginBottom: 8, border: '1 solid #E8EDF2', overflow: 'hidden' },
    hotelPhotoCol: { width: 110, height: 84 },
    hotelThumb: { width: '100%', height: '100%', objectFit: 'cover' },
    hotelBody: { flex: 1, padding: 11, justifyContent: 'center' },
    hotelName: { fontFamily: display, fontSize: 11.5, color: '#0B1F3A' },
    hotelPrice: { fontFamily: display, fontSize: 12, color: primary },
    priceSub: { fontSize: 7, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1, textAlign: 'right' },

    // Day by day — ghost numerals
    dayItem: { flexDirection: 'row', marginBottom: 15 },
    dayNumCol: { width: 40 },
    dayNum: { fontFamily: display, fontSize: 24, color: primary, opacity: 0.25, lineHeight: 1 },
    dayContent: { flex: 1 },
    dayDate: { fontSize: 7.5, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.2, fontFamily: 'Helvetica-Bold' },
    dayHeader: { fontFamily: display, fontSize: 13, color: primary, marginTop: 2 },
    dayNarr: { fontSize: 9.5, lineHeight: 1.5, marginTop: 3, color: '#475569' },
    slotRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    slotMarker: { width: 20, marginRight: 6, alignItems: 'center', justifyContent: 'center' },
    markerEmoji: { fontSize: 13 },
    slotText: { fontSize: 9.5, color: '#334155', flex: 1, lineHeight: 1.4 },
    slotWhen: { fontFamily: 'Helvetica-Bold', color: '#1F2937' },

    // Documents pills
    pillOn: { borderRadius: 8, backgroundColor: `${accent}2E`, paddingVertical: 2.5, paddingHorizontal: 8 },
    pillOnText: { fontSize: 7, color: '#1F2937', fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
    pillOff: { borderRadius: 8, backgroundColor: '#F1F5F9', paddingVertical: 2.5, paddingHorizontal: 8 },
    pillOffText: { fontSize: 7, color: '#64748B', fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },

    // Investment
    invBar: { height: 3, backgroundColor: primary, width: 28, marginBottom: 10 },
    invKicker: { fontSize: 7.5, letterSpacing: 1.5, color: primary, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    invTotal: { fontFamily: display, fontSize: 34, color: primary, marginTop: 4, lineHeight: 1 },
    invSub: { fontSize: 9, color: '#64748B', marginTop: 5 },
    invRule: { height: 1, backgroundColor: '#EEF2F6', marginTop: 14, marginBottom: 10 },
    invContactTitle: { fontFamily: display, fontSize: 12, color: '#0B1F3A' },
    invContactLine: { fontSize: 9, color: '#475569', marginTop: 3 },

    footer: { position: 'absolute', bottom: 18, left: 48, right: 48, fontSize: 8, color: '#94A3B8', borderTop: '1 solid #E2E8F0', paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  });
};

export function buildProposalPdf(input: ProposalPdfInput) {
  return <ProposalPdf {...input} />;
}

function ProposalPdf({ agency, code, version, customerName, currency = 'INR', rate = 1, images = true, fonts = true, itinerary: it }: ProposalPdfInput) {
  const primary = agency.primaryColor || '#630909';
  const accent = agency.accentColor || '#FFBA06';
  const money = (paise: number | bigint) => formatMoneyCode(paise, currency, rate);
  const s = styles(primary, accent, fonts);
  const cities = it.destinations.map((d) => d.cityName);
  const nights = it.destinations.reduce((sum, d) => sum + d.nights, 0);
  const title = cities.length === 1 ? cities[0]! : `${cities.slice(0, -1).join(', ')} & ${cities.at(-1)}`;
  const adults = it.intake.rooms.reduce((sum, r) => sum + r.adults, 0);
  const children = it.intake.rooms.reduce((sum, r) => sum + (r.children ?? 0), 0);
  const travellers = `${adults} adult${adults !== 1 ? 's' : ''}${children ? ` · ${children} child${children !== 1 ? 'ren' : ''}` : ''}`;

  const activityCount = it.days.reduce((n, d) => n + (['morning', 'afternoon', 'evening'] as const).filter((slot) => (d as any)[slot]).length, 0);
  const transferCount = it.days.reduce((n, d) => n + d.inclusions.filter((i) => i.kind === 'transfer').length, 0);
  const hotelCount = it.destinations.filter((d) => d.stay).length;
  const visaIncluded = it.visa.some((v) => v.included);
  const hasDocs = it.visa.length > 0 || !!it.insurance;

  const included: Array<{ label: string; on: boolean }> = [
    { label: it.flights ? `Flights — ${it.flights.return ? 'round-trip' : 'one-way'}` : 'Flights', on: !!it.flights },
    { label: `Hotels — ${hotelCount} ${hotelCount === 1 ? 'stay' : 'stays'}`, on: hotelCount > 0 },
    { label: `Airport transfers — ${transferCount}`, on: transferCount > 0 },
    { label: `Activities & tours — ${activityCount}`, on: activityCount > 0 },
    { label: 'Visa assistance', on: visaIncluded },
    { label: 'Travel insurance', on: !!it.insurance?.included },
  ];

  // Sequential section numbers (sections render conditionally).
  let n = 0;
  const sec = {
    included: pad2(++n),
    flights: it.flights ? pad2(++n) : '',
    stays: hotelCount > 0 ? pad2(++n) : '',
    days: pad2(++n),
    docs: hasDocs ? pad2(++n) : '',
    invest: pad2(++n),
  };

  const departLong = new Date(it.intake.departureDate);

  return (
    <Document author={agency.name} title={`${title} · ${code}`}>
      {/* ── COVER ── */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.cover}>
          <View style={s.orb1} />
          <View style={s.orb2} />
          <View style={s.orb3} />

          <View style={s.logoChip}>
            {isRasterLogo(agency.logoUrl)
              ? <Image src={agency.logoUrl!} style={s.logoImg} />
              : <Text style={s.wordmark}>{agency.name}</Text>}
          </View>

          <View>
            <View style={s.eyebrowChip}><Text style={s.eyebrow}>Trip Proposal · {code}{version && version > 1 ? ` · v${version}` : ''}</Text></View>
            <Text style={s.coverTitle}>{title}</Text>
            <Text style={s.coverTag}>A journey we built for you.</Text>
            <Text style={s.coverFor}>{customerName ? `Prepared exclusively for ${customerName}` : 'Your custom itinerary'}</Text>
          </View>

          <View>
            <View style={s.coverRule} />
            <View style={s.metaRow}>
              <View style={s.metaCol}><Text style={s.metaKicker}>Destinations</Text><Text style={s.metaValue}>{cities.length}</Text><Text style={s.metaSub}>{cities.join(', ')}</Text></View>
              <View style={s.metaCol}><Text style={s.metaKicker}>Duration</Text><Text style={s.metaValue}>{nights} nights</Text><Text style={s.metaSub}>{it.days.length} days</Text></View>
              <View style={s.metaCol}><Text style={s.metaKicker}>Travellers</Text><Text style={s.metaValue}>{adults + children} pax</Text><Text style={s.metaSub}>{travellers}</Text></View>
              <View style={s.metaCol}><Text style={s.metaKicker}>Departs</Text><Text style={s.metaValue}>{departLong.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text><Text style={s.metaSub}>{departLong.toLocaleDateString('en-GB', { weekday: 'long' })}</Text></View>
            </View>
            <View style={s.coverFootRow}>
              <Text style={s.coverFootText}>Crafted by {agency.name}</Text>
              <Text style={s.coverFootText}>{agency.supportEmail ?? agency.supportPhone ?? ''}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ── CONTENT ── */}
      <Page size="A4" style={s.page}>
        <View fixed style={s.pageStripe} />
        <View fixed style={s.spineWrap}>
          <Text style={s.spineText}>{agency.name.toUpperCase()} — TRIP {code}</Text>
        </View>

        {/* What's included */}
        <View style={s.section}>
          <SectionTitle s={s} accent={accent} num={sec.included}>What's included</SectionTitle>
          <View style={s.incWrap}>
            {included.map((inc, i) => (
              <View key={i} style={s.incChip}>
                <View style={inc.on ? s.incSq : s.incSqOff} />
                <Text style={inc.on ? s.incText : s.incMuted}>{inc.label}{inc.on ? '' : ' — not included'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Flights */}
        {it.flights && (
          <View style={s.section}>
            <SectionTitle s={s} accent={accent} num={sec.flights}>Flights</SectionTitle>
            <FlightLegPdf s={s} label="Outbound" leg={it.flights} money={money} />
            {it.flights.return && <FlightLegPdf s={s} label="Return" leg={it.flights.return} money={money} />}
          </View>
        )}

        {/* Stays */}
        {hotelCount > 0 && (
          <View style={s.section}>
            <SectionTitle s={s} accent={accent} num={sec.stays}>Where you'll stay</SectionTitle>
            {it.destinations.map((d) => {
              if (!d.stay) return null;
              const hThumb = images ? pdfImg(d.stay.hotel.thumb) : null;
              return (
                <View key={d.cityCode} style={s.hotelCard} wrap={false}>
                  {hThumb ? <View style={s.hotelPhotoCol}><Image src={hThumb} style={s.hotelThumb} /></View> : null}
                  <View style={s.hotelBody}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={[s.hotelName, { flex: 1, marginRight: 8 }]}>{d.stay.hotel.name}</Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={s.hotelPrice}>{money(d.stay.hotel.pricePerNightPaise * d.nights)}</Text>
                        <Text style={s.priceSub}>total stay</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
                      {d.stay.hotel.stars > 0 ? (
                        <View style={{ flexDirection: 'row', marginRight: 6 }}>
                          {Array.from({ length: d.stay.hotel.stars }).map((_, k) => (
                            <View key={k} style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: STAR_GOLD, marginRight: 2 }} />
                          ))}
                        </View>
                      ) : null}
                      <Text style={s.muted}>{d.stay.hotel.address}</Text>
                    </View>
                    <Text style={s.muted}>{d.nights} night{d.nights !== 1 ? 's' : ''} · {d.stay.hotel.room.name} · {d.stay.hotel.mealPlan}{d.stay.hotel.refundable ? ' · Refundable' : ''}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Day by day — heading rides inside Day 1's unbreakable block */}
        <View style={s.section}>
          {it.days.map((day, di) => {
            const slots = (['morning', 'afternoon', 'evening'] as const)
              .map((slot) => ({ slot, a: day[slot] }))
              .filter((x) => x.a);
            const transfers = day.inclusions.filter((i) => i.kind === 'transfer');
            return (
              <View key={day.dayNo} wrap={false}>
                {di === 0 && <SectionTitle s={s} accent={accent} num={sec.days}>Day by day</SectionTitle>}
                <View style={s.dayItem}>
                  <View style={s.dayNumCol}><Text style={s.dayNum}>{pad2(day.dayNo)}</Text></View>
                  <View style={s.dayContent}>
                    <Text style={s.dayDate}>{fmtDate(day.date)}</Text>
                    <Text style={s.dayHeader}>{dayHeading(day)}</Text>
                    {day.narrative ? <Text style={s.dayNarr}>{day.narrative}</Text> : null}
                    {slots.map(({ slot, a }) => (
                      <View key={slot} style={s.slotRow}>
                        <View style={s.slotMarker}><Text style={s.markerEmoji}>{activityEmoji(a!.category)}</Text></View>
                        <Text style={s.slotText}><Text style={s.slotWhen}>{slot[0]!.toUpperCase() + slot.slice(1)}</Text>  {a!.name}</Text>
                      </View>
                    ))}
                    {transfers.map((i, idx) => i.kind === 'transfer' ? (
                      <View key={`t${idx}`} style={s.slotRow}>
                        <View style={s.slotMarker}><Text style={s.markerEmoji}>🚗</Text></View>
                        <Text style={s.slotText}><Text style={s.slotWhen}>Transfer</Text>  {i.transfer.fromName} – {i.transfer.toName}</Text>
                      </View>
                    ) : null)}
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Documents & cover */}
        {hasDocs && (
          <View style={s.section} wrap={false}>
            <SectionTitle s={s} accent={accent} num={sec.docs}>Documents &amp; cover</SectionTitle>
            {it.visa.map((v) => (
              <View key={v.countryCode} style={[s.row, { alignItems: 'center' }]}>
                <Text style={{ flex: 1, marginRight: 8 }}>{v.description}</Text>
                <View style={v.included ? s.pillOn : s.pillOff}><Text style={v.included ? s.pillOnText : s.pillOffText}>{v.included ? 'INCLUDED' : 'NOT INCLUDED'}</Text></View>
              </View>
            ))}
            {it.insurance && (
              <View style={[s.row, { alignItems: 'center' }]}>
                <Text style={{ flex: 1, marginRight: 8 }}>{it.insurance.description}</Text>
                <View style={it.insurance.included ? s.pillOn : s.pillOff}><Text style={it.insurance.included ? s.pillOnText : s.pillOffText}>{it.insurance.included ? 'INCLUDED' : 'NOT INCLUDED'}</Text></View>
              </View>
            )}
          </View>
        )}

        {/* Investment */}
        <View wrap={false} style={{ marginTop: 6 }}>
          <View style={s.invBar} />
          <Text style={s.invKicker}>Your trip total</Text>
          <Text style={s.invTotal}>{money(it.pricePaise)}</Text>
          <Text style={s.invSub}>Per adult: {money(it.pricePerAdultPaise)}  ·  {travellers}  ·  All taxes included</Text>
          <View style={s.invRule} />
          <Text style={s.invContactTitle}>Ready to book, or want changes?</Text>
          <Text style={s.invContactLine}>
            Contact {agency.name}
            {agency.supportEmail ? `  ·  ${agency.supportEmail}` : ''}
            {agency.supportPhone ? `  ·  ${agency.supportPhone}` : ''}
          </Text>
          {agency.footerText ? <Text style={[s.invContactLine, { color: '#94A3B8', marginTop: 4 }]}>{agency.footerText}</Text> : null}
        </View>

        <View style={s.footer} fixed>
          <Text>{agency.name} · {code}{version && version > 1 ? ` · v${version}` : ''}</Text>
          {/* Cover is uncounted — content pages read 1 / N. */}
          <Text render={({ pageNumber, totalPages }) => `${pageNumber - 1} / ${totalPages - 1}`} />
        </View>
      </Page>
    </Document>
  );
}

function FlightLegPdf({ s, label, leg, money }: { s: any; label: string; leg: { segments: Array<{ airlineName: string; airlineCode: string; flightNumber: string; fromIATA: string; toIATA: string; departureAt: string; arrivalAt: string }>; totalPaise: number }; money: (p: number | bigint) => string }) {
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={s.bold}>{label} · {leg.segments[0]!.airlineName}</Text>
        <Text style={s.bold}>{money(leg.totalPaise)}</Text>
      </View>
      {leg.segments.map((seg, i) => (
        <Text key={i} style={s.muted}>{seg.airlineCode} {seg.flightNumber} · {seg.fromIATA} {seg.departureAt.slice(11, 16)} – {seg.toIATA} {seg.arrivalAt.slice(11, 16)}</Text>
      ))}
    </View>
  );
}

function dayHeading(d: any) {
  if (d.type === 'arrival') return `Arrival in ${d.cityName}`;
  if (d.type === 'departure') return `Departure from ${d.cityName}`;
  if (d.type === 'transit') return `${d.fromCityName ?? ''} – ${d.cityName}`;
  return `Day in ${d.cityName}`;
}

// Numbered editorial section heading: italic accent numeral + serif title over a
// short accent bar bleeding into a hairline rule.
function SectionTitle({ s, accent, num, children }: { s: any; accent: string; num: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        {num ? <Text style={s.secNum}>{num}</Text> : null}
        <Text style={s.secTitle}>{children}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
        <View style={{ width: 28, height: 2.5, backgroundColor: primary }} />
        <View style={{ flex: 1, height: 1, backgroundColor: '#EEF2F6' }} />
      </View>
    </View>
  );
}
