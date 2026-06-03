// Full branded itinerary PDF for a saved proposal. Multi-page:
// hero → at-a-glance → what's included → flights → hotels → day-by-day →
// docs & cover → price → contact. Rendered server-side via @react-pdf/renderer.
//
// Notes on @react-pdf limitations we work around here:
//  - Helvetica lacks many currency glyphs (₹, €, ฿…), so money is printed with
//    the 3-letter ISO code (formatMoneyCode) instead of the symbol.
//  - <Image> cannot render SVG. Agency logos that aren't PNG/JPG fall back to a
//    styled text wordmark so the brand always shows.

import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import { formatMoneyCode } from '@/lib/money';
import type { Itinerary } from '@/lib/itinerary/types';

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
  itinerary: Itinerary;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}
function isRasterLogo(url?: string | null): boolean {
  if (!url) return false;
  return /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url) || url.startsWith('data:image/');
}

const styles = (primary: string, accent: string) =>
  StyleSheet.create({
    page: { paddingTop: 0, paddingBottom: 56, paddingHorizontal: 0, fontFamily: 'Helvetica', color: '#0F172A', fontSize: 10 },
    body: { paddingHorizontal: 36 },

    // Hero
    hero: { backgroundColor: primary, color: '#FFFFFF', padding: 36, paddingBottom: 28 },
    logo: { height: 30, width: 160, objectFit: 'contain', marginBottom: 14 },
    wordmark: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', marginBottom: 2 },
    wordmarkTag: { fontSize: 8.5, color: accent, marginBottom: 14 },
    eyebrow: { color: accent, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    title: { fontSize: 28, fontFamily: 'Helvetica-Bold', marginTop: 8, lineHeight: 1.1 },
    heroMeta: { fontSize: 10, color: '#E5E9F0', marginTop: 10 },

    // At-a-glance stat strip (overlaps hero bottom)
    statRow: { flexDirection: 'row', marginTop: 18, marginHorizontal: 36, marginBottom: 4 },
    stat: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 6, padding: 10, marginRight: 8, border: '1 solid #E2E8F0' },
    statLast: { marginRight: 0 },
    statLabel: { fontSize: 7, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Helvetica-Bold' },
    statValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: primary, marginTop: 3 },
    statSub: { fontSize: 7.5, color: '#94A3B8', marginTop: 1 },

    section: { marginBottom: 16, marginTop: 6 },
    sectionLabel: { color: primary, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginBottom: 8, borderBottom: `1 solid ${accent}`, paddingBottom: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },

    // Included checklist
    incWrap: { flexDirection: 'row', flexWrap: 'wrap' },
    incChip: { flexDirection: 'row', alignItems: 'center', width: '50%', marginBottom: 5 },
    incDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: accent, marginRight: 6 },
    incText: { fontSize: 9.5, color: '#1F2937' },
    incMuted: { fontSize: 9.5, color: '#CBD5E1' },

    card: { backgroundColor: '#F8FAFC', borderRadius: 6, padding: 12, marginBottom: 8, border: '1 solid #EEF2F6' },
    bold: { fontFamily: 'Helvetica-Bold' },
    muted: { color: '#64748B', fontSize: 9, marginTop: 2 },

    dayHeader: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: primary },
    dayDate: { fontSize: 8, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 },
    dayNarr: { fontSize: 9.5, lineHeight: 1.5, marginTop: 3, color: '#1F2937' },
    bullet: { fontSize: 9, marginTop: 2.5, color: '#334155' },
    daySep: { borderBottom: '1 solid #EEF2F6', marginTop: 9, marginBottom: 9 },

    priceBox: { backgroundColor: primary, color: '#FFFFFF', borderRadius: 8, padding: 18, marginTop: 8 },
    priceTotal: { fontSize: 26, fontFamily: 'Helvetica-Bold', marginTop: 2 },

    contact: { marginTop: 14, borderRadius: 6, border: `1 solid ${accent}`, padding: 12 },
    contactTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: primary },
    contactLine: { fontSize: 9, color: '#475569', marginTop: 3 },

    footer: { position: 'absolute', bottom: 18, left: 36, right: 36, fontSize: 8, color: '#94A3B8', borderTop: '1 solid #E2E8F0', paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  });

export function buildProposalPdf(input: ProposalPdfInput) {
  return <ProposalPdf {...input} />;
}

function ProposalPdf({ agency, code, version, customerName, currency = 'INR', rate = 1, itinerary: it }: ProposalPdfInput) {
  const primary = agency.primaryColor || '#630909';
  const accent = agency.accentColor || '#FFBA06';
  const money = (paise: number | bigint) => formatMoneyCode(paise, currency, rate);
  const s = styles(primary, accent);
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
        {/* Hero */}
        <View style={s.hero}>
          {isRasterLogo(agency.logoUrl) ? (
            <Image src={agency.logoUrl!} style={s.logo} />
          ) : (
            <>
              <Text style={s.wordmark}>{agency.name}</Text>
              {agency.tagline ? <Text style={s.wordmarkTag}>{agency.tagline}</Text> : null}
            </>
          )}
          <Text style={s.eyebrow}>Trip Proposal · {code}{version && version > 1 ? ` · v${version}` : ''}</Text>
          <Text style={s.title}>{title}</Text>
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
            <Text style={s.sectionLabel}>What's included</Text>
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
              <Text style={s.sectionLabel}>Flights</Text>
              <FlightLegPdf s={s} label="Outbound" leg={it.flights} money={money} />
              {it.flights.return && <FlightLegPdf s={s} label="Return" leg={it.flights.return} money={money} />}
            </View>
          )}

          {/* Hotels */}
          {hotelCount > 0 && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>Where you'll stay</Text>
              {it.destinations.map((d) => d.stay && (
                <View key={d.cityCode} style={s.card}>
                  <View style={s.row}>
                    <Text style={s.bold}>{'★'.repeat(d.stay.hotel.stars)} {d.stay.hotel.name}</Text>
                    <Text style={s.bold}>{money(d.stay.hotel.pricePerNightPaise * d.nights)}</Text>
                  </View>
                  <Text style={s.muted}>{d.stay.hotel.address}</Text>
                  <Text style={s.muted}>{d.nights} night{d.nights !== 1 ? 's' : ''} · {d.stay.hotel.room.name} · {d.stay.hotel.mealPlan}{d.stay.hotel.refundable ? ' · Refundable' : ''}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Day by day */}
          <View style={s.section} break>
            <Text style={s.sectionLabel}>Day by day</Text>
            {it.days.map((day, di) => (
              <View key={day.dayNo} wrap={false}>
                <Text style={s.dayDate}>Day {day.dayNo} · {fmtDate(day.date)}</Text>
                <Text style={s.dayHeader}>{dayHeading(day)}</Text>
                {day.narrative && <Text style={s.dayNarr}>{day.narrative}</Text>}
                {(['morning', 'afternoon', 'evening'] as const).map((slot) => {
                  const a = day[slot]; if (!a) return null;
                  return <Text key={slot} style={s.bullet}>• {slot[0]!.toUpperCase() + slot.slice(1)}: {a.name}</Text>;
                })}
                {day.inclusions.filter((i) => i.kind === 'transfer').map((i, idx) => i.kind === 'transfer' ? (
                  <Text key={idx} style={s.bullet}>• Transfer: {i.transfer.fromName} → {i.transfer.toName}</Text>
                ) : null)}
                {di < it.days.length - 1 && <View style={s.daySep} />}
              </View>
            ))}
          </View>

          {/* Docs & cover */}
          {(it.visa.length > 0 || it.insurance) && (
            <View style={s.section} wrap={false}>
              <Text style={s.sectionLabel}>Documents &amp; cover</Text>
              {it.visa.map((v) => (
                <View key={v.countryCode} style={s.row}><Text>{v.description}</Text><Text style={s.muted}>{v.included ? 'Included' : 'Not included'}</Text></View>
              ))}
              {it.insurance && <View style={s.row}><Text>{it.insurance.description}</Text><Text style={s.muted}>{it.insurance.included ? 'Included' : 'Not included'}</Text></View>}
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
        <Text key={i} style={s.muted}>{seg.airlineCode} {seg.flightNumber} · {seg.fromIATA} {seg.departureAt.slice(11, 16)} → {seg.toIATA} {seg.arrivalAt.slice(11, 16)}</Text>
      ))}
    </View>
  );
}

function dayHeading(d: any) {
  if (d.type === 'arrival') return `Arrival in ${d.cityName}`;
  if (d.type === 'departure') return `Departure from ${d.cityName}`;
  if (d.type === 'transit') return `${d.fromCityName ?? ''} → ${d.cityName}`;
  return `Day in ${d.cityName}`;
}
