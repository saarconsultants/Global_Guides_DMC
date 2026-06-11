// Full branded itinerary PDF for a saved proposal. Multi-page:
// hero → at-a-glance → what's included → flights → hotels → day-by-day →
// docs & cover → price → contact. Rendered server-side via @react-pdf/renderer.
//
// Notes on @react-pdf limitations we work around here:
//  - Helvetica lacks many currency glyphs (₹, €, ฿…), so money is printed with
//    the 3-letter ISO code (formatMoneyCode) instead of the symbol.
//  - <Image> cannot render SVG. Agency logos that aren't PNG/JPG fall back to a
//    styled text wordmark so the brand always shows.

import { Document, Page, View, Text, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { formatMoneyCode } from '@/lib/money';
import type { Itinerary } from '@/lib/itinerary/types';

// Emoji in @react-pdf are rendered as images fetched from a CDN (Helvetica has no
// emoji glyphs). Used for the small transfer marker.
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
  images?: boolean;    // render remote hotel/activity photos (default true; route disables on fallback)
  fonts?: boolean;       // use the Fraunces display font (route falls back to built-ins)
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
    case 'museum': return '🏛️';      // 🏛️
    case 'tour': return '🧭';                 // 🧭
    case 'experience': return '🎟️';   // 🎟️
    default: return '📸';                      // 📸 sightseeing
  }
}

const styles = (primary: string, accent: string, fonts: boolean) => {
  const display = fonts ? 'Fraunces' : 'Helvetica-Bold';
  const italicProps = fonts
    ? ({ fontFamily: 'Fraunces', fontStyle: 'italic' as const, fontWeight: 500 as const })
    : ({ fontFamily: 'Helvetica-Oblique' });
  return StyleSheet.create({
    // paddingTop gives continuation pages (2+) a top gap. Page 1's hero cancels it
    // with a matching negative marginTop so the hero still bleeds to the very top.
    page: { paddingTop: 36, paddingBottom: 56, paddingHorizontal: 0, fontFamily: 'Helvetica', color: '#0F172A', fontSize: 10 },
    body: { paddingHorizontal: 36 },

    // Hero
    hero: { backgroundColor: primary, color: '#FFFFFF', padding: 36, paddingBottom: 28, marginTop: -36, position: 'relative', overflow: 'hidden' },
    orbLg: { position: 'absolute', top: -70, right: -50, width: 220, height: 220, borderRadius: 110, backgroundColor: '#FFFFFF', opacity: 0.05 },
    orbSm: { position: 'absolute', top: 20, right: 60, width: 120, height: 120, borderRadius: 60, backgroundColor: accent, opacity: 0.1 },
    pageStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: accent },
    // Fixed height + alignSelf:'flex-start' so the logo keeps its aspect ratio and sits
    // left. Without alignSelf the hero (a stretch column) pulls the image to full width
    // and distorts it; objectFit:'contain' + maxWidth guard keeps very wide logos sane.
    logo: { height: 38, maxWidth: 260, objectFit: 'contain', alignSelf: 'flex-start', marginBottom: 16 },
    wordmark: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', marginBottom: 2 },
    wordmarkTag: { fontSize: 8.5, color: accent, marginBottom: 14 },
    eyebrowChip: { alignSelf: 'flex-start', border: `1 solid ${accent}66`, borderRadius: 10, paddingVertical: 3, paddingHorizontal: 9 },
    eyebrow: { color: accent, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    title: { fontSize: 30, fontFamily: display, marginTop: 8, lineHeight: 1.1 },
    heroTag: { ...italicProps, fontSize: 12.5, color: accent, marginTop: 5 },
    heroMeta: { fontSize: 10, color: '#E5E9F0', marginTop: 10 },

    // At-a-glance stat strip (overlaps hero bottom)
    statRow: { flexDirection: 'row', marginTop: 18, marginHorizontal: 36, marginBottom: 4 },
    stat: { flex: 1, backgroundColor: '#FCFCFD', borderRadius: 6, padding: 10, marginRight: 8, border: '1 solid #E8EDF2', borderTop: `2.5 solid ${accent}` },
    statLast: { marginRight: 0 },
    statLabel: { fontSize: 7, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Helvetica-Bold' },
    statValue: { fontSize: 14, fontFamily: display, color: primary, marginTop: 3, lineHeight: 1 },
    statSub: { fontSize: 7.5, color: '#94A3B8', marginTop: 2 },

    section: { marginBottom: 16, marginTop: 6 },
    sectionLabel: { fontFamily: display, fontSize: 14, color: '#0B1F3A' },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },

    // Included checklist
    incWrap: { flexDirection: 'row', flexWrap: 'wrap' },
    incChip: { flexDirection: 'row', alignItems: 'center', width: '50%', marginBottom: 5 },
    incDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: accent, marginRight: 6 },
    incText: { fontSize: 9.5, color: '#1F2937' },
    incMuted: { fontSize: 9.5, color: '#CBD5E1' },

    card: { backgroundColor: '#F8FAFC', borderRadius: 6, padding: 12, marginBottom: 8, border: '1 solid #EEF2F6' },
    hotelCard: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 6, marginBottom: 8, border: '1 solid #EEF2F6', overflow: 'hidden' },
    hotelPhotoCol: { width: 96, height: 76 },
    hotelBody: { flex: 1, padding: 10, justifyContent: 'center' },
    hotelThumb: { width: '100%', height: '100%', objectFit: 'cover' },
    // Every day-by-day slot uses one fixed-width emoji marker so the text after it
    // always left-aligns (activities by category, 🚗 for transfers).
    slotMarker: { width: 22, marginRight: 6, alignItems: 'center', justifyContent: 'center' },
    markerEmoji: { fontSize: 15 },
    priceSub: { fontSize: 7, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
    bold: { fontFamily: 'Helvetica-Bold' },
    muted: { color: '#64748B', fontSize: 9, marginTop: 2 },
    pillOn: { borderRadius: 8, backgroundColor: `${accent}2E`, paddingVertical: 2.5, paddingHorizontal: 8 },
    pillOnText: { fontSize: 7, color: '#1F2937', fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
    pillOff: { borderRadius: 8, backgroundColor: '#F1F5F9', paddingVertical: 2.5, paddingHorizontal: 8 },
    pillOffText: { fontSize: 7, color: '#64748B', fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },

    // Day-by-day timeline
    dayItem: { flexDirection: 'row', marginBottom: 10 },
    dayRail: { width: 30, alignItems: 'center' },
    dayBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: primary, alignItems: 'center', justifyContent: 'center' },
    dayBadgeNum: { color: '#FFFFFF', fontSize: 10, fontFamily: 'Helvetica-Bold' },
    dayConnector: { width: 2, flexGrow: 1, backgroundColor: '#E5E9F0', marginTop: 4, borderRadius: 1 },
    dayContent: { flex: 1, paddingLeft: 10, paddingBottom: 6 },
    dayDate: { fontSize: 8, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1 },
    dayHeader: { fontSize: 12.5, fontFamily: display, color: primary, marginTop: 1 },
    dayNarr: { fontSize: 9.5, lineHeight: 1.5, marginTop: 3, color: '#475569' },
    slotRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    slotText: { fontSize: 9.5, color: '#334155', flex: 1, lineHeight: 1.4 },
    slotWhen: { fontFamily: 'Helvetica-Bold', color: '#1F2937' },

    priceBox: { backgroundColor: primary, color: '#FFFFFF', borderRadius: 8, borderTop: `3 solid ${accent}`, padding: 18, marginTop: 8 },
    priceTotal: { fontSize: 26, fontFamily: display, marginTop: 2 },

    contact: { marginTop: 14, borderRadius: 6, border: `1 solid ${accent}`, padding: 12 },
    contactTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: primary },
    contactLine: { fontSize: 9, color: '#475569', marginTop: 3 },

    footer: { position: 'absolute', bottom: 18, left: 36, right: 36, fontSize: 8, color: '#94A3B8', borderTop: '1 solid #E2E8F0', paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
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

  const included: Array<{ label: string; on: boolean }> = [
    { label: it.flights ? `Flights — ${it.flights.return ? 'round-trip' : 'one-way'}` : 'Flights', on: !!it.flights },
    { label: `Hotels — ${hotelCount} ${hotelCount === 1 ? 'stay' : 'stays'}`, on: hotelCount > 0 },
    { label: `Airport transfers — ${transferCount}`, on: transferCount > 0 },
    { label: `Activities & tours — ${activityCount}`, on: activityCount > 0 },
    { label: 'Visa assistance', on: visaIncluded },
    { label: 'Travel insurance', on: !!it.insurance?.included },
  ];

  const footer = (
    <View style={s.footer} fixed>
      <Text>{agency.name} · {code}{version && version > 1 ? ` · v${version}` : ''}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );

  return (
    <Document author={agency.name} title={`${title} · ${code}`}>
      <Page size="A4" style={s.page}>
        {/* Brand accent stripe on every page top (page 1's hero covers it). */}
        <View fixed style={s.pageStripe} />
        {/* Hero */}
        <View style={s.hero}>
          <View style={s.orbLg} />
          <View style={s.orbSm} />
          {isRasterLogo(agency.logoUrl) ? (
            <Image src={agency.logoUrl!} style={s.logo} />
          ) : (
            <>
              <Text style={s.wordmark}>{agency.name}</Text>
              {agency.tagline ? <Text style={s.wordmarkTag}>{agency.tagline}</Text> : null}
            </>
          )}
          <View style={s.eyebrowChip}><Text style={s.eyebrow}>Trip Proposal · {code}{version && version > 1 ? ` · v${version}` : ''}</Text></View>
          <Text style={s.title}>{title}</Text>
          <Text style={s.heroTag}>A journey we built for you.</Text>
          <Text style={s.heroMeta}>
            {customerName ? `Prepared for ${customerName}` : 'Your custom itinerary'}
          </Text>
        </View>

        {/* At-a-glance stat strip */}
        <View style={s.statRow}>
          <View style={s.stat}><Text style={s.statLabel}>Destinations</Text><Text style={s.statValue}>{cities.length}</Text><Text style={s.statSub}>{cities.join(', ')}</Text></View>
          <View style={s.stat}><Text style={s.statLabel}>Duration</Text><Text style={s.statValue}>{nights} nights</Text><Text style={s.statSub}>{it.days.length} days</Text></View>
          <View style={s.stat}><Text style={s.statLabel}>Travellers</Text><Text style={s.statValue}>{adults + children} pax</Text><Text style={s.statSub}>{travellers}</Text></View>
          <View style={[s.stat, s.statLast]}><Text style={s.statLabel}>Departs</Text><Text style={s.statValue}>{new Date(it.intake.departureDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</Text><Text style={s.statSub}>{new Date(it.intake.departureDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric' })}</Text></View>
        </View>

        <View style={s.body}>
          {/* What's included */}
          <View style={s.section}>
            <SectionTitle s={s} accent={accent}>What's included</SectionTitle>
            <View style={s.incWrap}>
              {included.map((inc, i) => (
                <View key={i} style={s.incChip}>
                  <View style={[s.incDot, !inc.on ? { backgroundColor: '#E2E8F0' } : {}]} />
                  <Text style={inc.on ? s.incText : s.incMuted}>{inc.label}{inc.on ? '' : ' — not included'}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Flights */}
          {it.flights && (
            <View style={s.section}>
              <SectionTitle s={s} accent={accent}>Flights</SectionTitle>
              <FlightLegPdf s={s} label="Outbound" leg={it.flights} money={money} />
              {it.flights.return && <FlightLegPdf s={s} label="Return" leg={it.flights.return} money={money} />}
            </View>
          )}

          {/* Hotels */}
          {hotelCount > 0 && (
            <View style={s.section}>
              <SectionTitle s={s} accent={accent}>Where you'll stay</SectionTitle>
              {it.destinations.map((d) => {
                if (!d.stay) return null;
                const hThumb = images ? pdfImg(d.stay.hotel.thumb) : null;
                return (
                  <View key={d.cityCode} style={s.hotelCard}>
                    {hThumb ? <View style={s.hotelPhotoCol}><Image src={hThumb} style={s.hotelThumb} /></View> : null}
                    <View style={s.hotelBody}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Text style={[s.bold, { flex: 1, marginRight: 8 }]}>{d.stay.hotel.name}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={s.bold}>{money(d.stay.hotel.pricePerNightPaise * d.nights)}</Text>
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

          {/* Day by day — flows after hotels (no forced page break, so page 1 isn't left half-empty).
              minPresenceAhead keeps the section heading from being stranded at the very bottom. */}
          {/* 200pt ≈ heading + one full day item — never strand the heading alone. */}
          <View style={[s.section, { marginTop: 14 }]}>
            {it.days.map((day, di) => {
              const slots = (['morning', 'afternoon', 'evening'] as const)
                .map((slot) => ({ slot, a: day[slot] }))
                .filter((x) => x.a);
              const transfers = day.inclusions.filter((i) => i.kind === 'transfer');
              const isLast = di === it.days.length - 1;
              return (
                <View key={day.dayNo} wrap={false}>
                  {di === 0 && <SectionTitle s={s} accent={accent}>Day by day</SectionTitle>}
                  <View style={s.dayItem}>
                  <View style={s.dayRail}>
                    <View style={s.dayBadge}><Text style={s.dayBadgeNum}>{day.dayNo}</Text></View>
                    {!isLast && <View style={s.dayConnector} />}
                  </View>
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

          {/* Docs & cover */}
          {(it.visa.length > 0 || it.insurance) && (
            <View style={s.section} wrap={false}>
              <SectionTitle s={s} accent={accent}>Documents &amp; cover</SectionTitle>
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

          {/* Price */}
          <View style={s.priceBox} wrap={false}>
            <Text style={{ fontSize: 8, color: accent, textTransform: 'uppercase', letterSpacing: 1 }}>Your trip total</Text>
            <Text style={s.priceTotal}>{money(it.pricePaise)}</Text>
            <Text style={{ fontSize: 9, color: '#E5E9F0', marginTop: 3 }}>Per adult: {money(it.pricePerAdultPaise)}  ·  {travellers}  ·  All taxes included</Text>
          </View>

          {/* Contact */}
          <View style={s.contact} wrap={false}>
            <Text style={s.contactTitle}>Ready to book, or want changes?</Text>
            <Text style={s.contactLine}>
              Contact {agency.name}
              {agency.supportEmail ? `  ·  ${agency.supportEmail}` : ''}
              {agency.supportPhone ? `  ·  ${agency.supportPhone}` : ''}
            </Text>
            {agency.footerText ? <Text style={[s.contactLine, { color: '#94A3B8', marginTop: 4 }]}>{agency.footerText}</Text> : null}
          </View>
        </View>

        {footer}
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

// Serif section heading with a short accent bar bleeding into a hairline rule —
// mirrors the section treatment on the customer share page.
function SectionTitle({ s, accent, children }: { s: any; accent: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 9 }}>
      <Text style={s.sectionLabel}>{children}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
        <View style={{ width: 28, height: 2.5, backgroundColor: accent }} />
        <View style={{ flex: 1, height: 1, backgroundColor: '#EEF2F6' }} />
      </View>
    </View>
  );
}
