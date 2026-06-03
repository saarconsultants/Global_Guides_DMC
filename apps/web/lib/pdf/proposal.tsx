// Full branded itinerary PDF for a saved proposal. Multi-page:
// hero → flights → hotels → day-by-day → docs & cover → price.
// Rendered server-side via @react-pdf/renderer.

import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer';
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
  itinerary: Itinerary;
}

function inr(paise: number | bigint) {
  return '₹ ' + Math.round(Number(paise) / 100).toLocaleString('en-IN');
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

const styles = (primary: string, accent: string) =>
  StyleSheet.create({
    page: { paddingTop: 28, paddingBottom: 44, paddingHorizontal: 36, fontFamily: 'Helvetica', color: '#0F172A', fontSize: 10 },
    hero: { backgroundColor: primary, color: '#FFFFFF', margin: -36, marginTop: -28, padding: 36, marginBottom: 20 },
    eyebrow: { color: accent, fontSize: 8, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    title: { fontSize: 26, fontFamily: 'Helvetica-Bold', marginTop: 8, lineHeight: 1.15 },
    heroMeta: { fontSize: 10, color: '#E5E9F0', marginTop: 10 },
    logo: { height: 26, width: 'auto', marginBottom: 12 },
    section: { marginBottom: 16 },
    sectionLabel: { color: primary, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginBottom: 8, borderBottom: `1 solid ${accent}`, paddingBottom: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    card: { backgroundColor: '#F8FAFC', borderRadius: 6, padding: 12, marginBottom: 8 },
    bold: { fontFamily: 'Helvetica-Bold' },
    muted: { color: '#64748B', fontSize: 9 },
    dayHeader: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: primary },
    dayDate: { fontSize: 8, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 },
    dayNarr: { fontSize: 9.5, lineHeight: 1.5, marginTop: 3, color: '#1F2937' },
    bullet: { fontSize: 9, marginTop: 2, color: '#334155' },
    priceBox: { backgroundColor: primary, color: '#FFFFFF', borderRadius: 8, padding: 18, marginTop: 6 },
    priceTotal: { fontSize: 24, fontFamily: 'Helvetica-Bold' },
    footer: { position: 'absolute', bottom: 18, left: 36, right: 36, fontSize: 8, color: '#94A3B8', borderTop: '1 solid #E2E8F0', paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' },
  });

export function buildProposalPdf(input: ProposalPdfInput) {
  return <ProposalPdf {...input} />;
}

function ProposalPdf({ agency, code, version, customerName, itinerary: it }: ProposalPdfInput) {
  const primary = agency.primaryColor || '#630909';
  const accent = agency.accentColor || '#FFBA06';
  const s = styles(primary, accent);
  const cities = it.destinations.map((d) => d.cityName);
  const nights = it.destinations.reduce((sum, d) => sum + d.nights, 0);
  const title = cities.length === 1 ? cities[0]! : `${cities.slice(0, -1).join(', ')} & ${cities.at(-1)}`;

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
          {agency.logoUrl ? <Image src={agency.logoUrl} style={s.logo} /> : <Text style={[s.bold, { fontSize: 14, marginBottom: 8 }]}>{agency.name}</Text>}
          <Text style={s.eyebrow}>Trip Proposal · {code}{version && version > 1 ? ` · v${version}` : ''}</Text>
          <Text style={s.title}>{title}</Text>
          <Text style={s.heroMeta}>
            {customerName ? `Prepared for ${customerName}  ·  ` : ''}{cities.length} destination{cities.length !== 1 ? 's' : ''}  ·  {nights} night{nights !== 1 ? 's' : ''}  ·  Departs {fmtDate(it.intake.departureDate)}
          </Text>
        </View>

        {/* Flights */}
        {it.flights && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>Flights</Text>
            <FlightLegPdf s={s} label="Outbound" leg={it.flights} />
            {it.flights.return && <FlightLegPdf s={s} label="Return" leg={it.flights.return} />}
          </View>
        )}

        {/* Hotels */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Where you'll stay</Text>
          {it.destinations.map((d) => d.stay && (
            <View key={d.cityCode} style={s.card}>
              <View style={s.row}>
                <Text style={s.bold}>{'★'.repeat(d.stay.hotel.stars)} {d.stay.hotel.name}</Text>
                <Text style={s.bold}>{inr(d.stay.hotel.pricePerNightPaise * d.nights)}</Text>
              </View>
              <Text style={s.muted}>{d.stay.hotel.address}</Text>
              <Text style={s.muted}>{d.nights} night{d.nights !== 1 ? 's' : ''} · {d.stay.hotel.room.name} · {d.stay.hotel.mealPlan}{d.stay.hotel.refundable ? ' · Refundable' : ''}</Text>
            </View>
          ))}
        </View>

        {/* Day by day */}
        <View style={s.section} break>
          <Text style={s.sectionLabel}>Day by day</Text>
          {it.days.map((day) => (
            <View key={day.dayNo} style={{ marginBottom: 10 }} wrap={false}>
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
            <View style={s.row}><Text>{it.insurance.description}</Text><Text style={s.muted}>{it.insurance.included ? 'Included' : 'Not included'}</Text></View>
          </View>
        )}

        {/* Price */}
        <View style={s.priceBox} wrap={false}>
          <View style={s.row}>
            <View>
              <Text style={{ fontSize: 8, color: accent, textTransform: 'uppercase', letterSpacing: 1 }}>Your trip total</Text>
              <Text style={s.priceTotal}>{inr(it.pricePaise)}</Text>
              <Text style={{ fontSize: 9, color: '#E5E9F0', marginTop: 2 }}>Per adult: {inr(it.pricePerAdultPaise)}</Text>
            </View>
          </View>
        </View>

        {footer}
      </Page>
    </Document>
  );
}

function FlightLegPdf({ s, label, leg }: { s: any; label: string; leg: { segments: Array<{ airlineName: string; airlineCode: string; flightNumber: string; fromIATA: string; toIATA: string; departureAt: string; arrivalAt: string }>; totalPaise: number } }) {
  return (
    <View style={s.card}>
      <View style={s.row}>
        <Text style={s.bold}>{label} · {leg.segments[0]!.airlineName}</Text>
        <Text style={s.bold}>{inr(leg.totalPaise)}</Text>
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
