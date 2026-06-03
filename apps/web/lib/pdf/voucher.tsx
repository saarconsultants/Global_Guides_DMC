// Branded booking-confirmation voucher (single page) for a confirmed booking.
// Same @react-pdf conventions as proposal.tsx: ISO currency codes (glyph-safe),
// raster-only logo with text wordmark fallback.

import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer';
import { formatMoneyCode } from '@/lib/money';
import type { Itinerary } from '@/lib/itinerary/types';

interface AgencyBrand {
  name: string; tagline?: string | null; logoUrl?: string | null;
  primaryColor?: string | null; accentColor?: string | null;
  supportEmail?: string | null; supportPhone?: string | null; footerText?: string | null;
}

export interface VoucherPdfInput {
  agency: AgencyBrand;
  code: string;
  bookedAt: string;       // ISO
  customerName?: string | null;
  currency?: string;
  rate?: number;
  itinerary: Itinerary;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}
function isRasterLogo(url?: string | null): boolean {
  if (!url) return false;
  return /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url) || url.startsWith('data:image/');
}

const styles = (primary: string, accent: string) => StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 50, paddingHorizontal: 0, fontFamily: 'Helvetica', color: '#0F172A', fontSize: 10 },
  hero: { backgroundColor: primary, color: '#FFFFFF', padding: 32 },
  logo: { height: 28, width: 150, objectFit: 'contain', marginBottom: 12 },
  wordmark: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: '#FFFFFF', marginBottom: 12 },
  badge: { alignSelf: 'flex-start', backgroundColor: accent, color: primary, fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 1, textTransform: 'uppercase', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 3, marginBottom: 8 },
  title: { fontSize: 24, fontFamily: 'Helvetica-Bold' },
  heroMeta: { fontSize: 10, color: '#E5E9F0', marginTop: 8 },
  body: { padding: 32, paddingTop: 22 },
  refRow: { flexDirection: 'row', marginBottom: 18 },
  refBox: { flex: 1, border: '1 solid #E2E8F0', borderRadius: 6, padding: 10, marginRight: 8 },
  refLast: { marginRight: 0 },
  refLabel: { fontSize: 7, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Helvetica-Bold' },
  refValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: primary, marginTop: 3 },
  section: { marginBottom: 14 },
  sectionLabel: { color: primary, fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginBottom: 6, borderBottom: `1 solid ${accent}`, paddingBottom: 3 },
  card: { backgroundColor: '#F8FAFC', borderRadius: 6, padding: 10, marginBottom: 6, border: '1 solid #EEF2F6' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  bold: { fontFamily: 'Helvetica-Bold' },
  muted: { color: '#64748B', fontSize: 9, marginTop: 2 },
  note: { fontSize: 8.5, color: '#64748B', marginTop: 4, lineHeight: 1.5 },
  contact: { marginTop: 12, borderRadius: 6, border: `1 solid ${accent}`, padding: 10 },
  footer: { position: 'absolute', bottom: 16, left: 32, right: 32, fontSize: 8, color: '#94A3B8', borderTop: '1 solid #E2E8F0', paddingTop: 5, flexDirection: 'row', justifyContent: 'space-between' },
});

export function buildVoucherPdf(input: VoucherPdfInput) {
  return <VoucherPdf {...input} />;
}

function VoucherPdf({ agency, code, bookedAt, customerName, currency = 'INR', rate = 1, itinerary: it }: VoucherPdfInput) {
  const primary = agency.primaryColor || '#630909';
  const accent = agency.accentColor || '#FFBA06';
  const money = (p: number | bigint) => formatMoneyCode(p, currency, rate);
  const s = styles(primary, accent);
  const cities = it.destinations.map((d) => d.cityName);
  const nights = it.destinations.reduce((sum, d) => sum + d.nights, 0);
  const title = cities.length === 1 ? cities[0]! : `${cities.slice(0, -1).join(', ')} & ${cities.at(-1)}`;
  const adults = it.intake.rooms.reduce((sum, r) => sum + r.adults, 0);

  return (
    <Document author={agency.name} title={`Voucher ${code}`}>
      <Page size="A4" style={s.page}>
        <View style={s.hero}>
          {isRasterLogo(agency.logoUrl) ? <Image src={agency.logoUrl!} style={s.logo} /> : <Text style={s.wordmark}>{agency.name}</Text>}
          <Text style={s.badge}>✓ Booking Confirmed</Text>
          <Text style={s.title}>{title}</Text>
          <Text style={s.heroMeta}>{customerName ? `Booked for ${customerName}` : 'Confirmed booking'}</Text>
        </View>

        <View style={s.body}>
          <View style={s.refRow}>
            <View style={s.refBox}><Text style={s.refLabel}>Booking ref</Text><Text style={s.refValue}>{code}</Text></View>
            <View style={s.refBox}><Text style={s.refLabel}>Booked on</Text><Text style={s.refValue}>{new Date(bookedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text></View>
            <View style={s.refBox}><Text style={s.refLabel}>Travel from</Text><Text style={s.refValue}>{new Date(it.intake.departureDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</Text></View>
            <View style={[s.refBox, s.refLast]}><Text style={s.refLabel}>Trip</Text><Text style={s.refValue}>{nights}N · {adults} pax</Text></View>
          </View>

          {it.destinations.some((d) => d.stay) && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>Accommodation</Text>
              {it.destinations.map((d) => d.stay && (
                <View key={d.cityCode} style={s.card}>
                  <View style={s.row}>
                    <Text style={s.bold}>{'★'.repeat(d.stay.hotel.stars)} {d.stay.hotel.name}</Text>
                    <Text style={s.muted}>{d.nights} night{d.nights !== 1 ? 's' : ''}</Text>
                  </View>
                  <Text style={s.muted}>{d.stay.hotel.address} · {d.stay.hotel.room.name} · {d.stay.hotel.mealPlan}</Text>
                </View>
              ))}
            </View>
          )}

          {it.flights && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>Flights</Text>
              <View style={s.card}>
                {it.flights.segments.map((seg, i) => (
                  <Text key={i} style={s.muted}>{seg.airlineCode} {seg.flightNumber} · {seg.fromIATA} {seg.departureAt.slice(11, 16)} → {seg.toIATA} {seg.arrivalAt.slice(11, 16)}</Text>
                ))}
                {it.flights.return?.segments.map((seg, i) => (
                  <Text key={`r${i}`} style={s.muted}>{seg.airlineCode} {seg.flightNumber} · {seg.fromIATA} {seg.departureAt.slice(11, 16)} → {seg.toIATA} {seg.arrivalAt.slice(11, 16)}</Text>
                ))}
              </View>
            </View>
          )}

          <View style={s.section}>
            <Text style={s.sectionLabel}>Itinerary</Text>
            {it.days.map((d) => (
              <Text key={d.dayNo} style={{ fontSize: 9.5, marginBottom: 2.5 }}>
                <Text style={s.bold}>Day {d.dayNo}</Text> · {fmtDate(d.date)} — {d.type === 'arrival' ? `Arrive ${d.cityName}` : d.type === 'departure' ? `Depart ${d.cityName}` : d.cityName}
                {(['morning', 'afternoon', 'evening'] as const).map((sl) => (d as any)[sl] ? ` · ${(d as any)[sl].name}` : '').join('')}
              </Text>
            ))}
          </View>

          <Text style={s.note}>
            This voucher confirms your booking with {agency.name}. Individual supplier confirmations (hotel vouchers, flight PNRs, tour tickets) will be shared separately by our operations team. Please carry a copy of this voucher while travelling.
          </Text>

          <View style={s.contact}>
            <Text style={[s.bold, { color: primary, fontSize: 10 }]}>Need help with your booking?</Text>
            <Text style={{ fontSize: 9, color: '#475569', marginTop: 3 }}>
              Contact {agency.name}{agency.supportEmail ? `  ·  ${agency.supportEmail}` : ''}{agency.supportPhone ? `  ·  ${agency.supportPhone}` : ''}
            </Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>{agency.name} · Voucher {code}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
