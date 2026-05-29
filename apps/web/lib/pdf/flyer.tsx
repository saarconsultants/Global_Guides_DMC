// One-page branded flyer for a template. Returns a renderable <Document>.
// We render with @react-pdf/renderer on the server, stream as application/pdf.

import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer';

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

interface FlyerInput {
  agency: AgencyBrand;
  template: {
    code: string;
    title: string;
    blurb: string;
    region: string;
    category: string;
    totalNights: number;
    startingPricePaise: bigint | number;
    destinations: { cityCode: string; cityName: string; nights: number }[];
    hero?: string | null;
  };
}

const styles = (primary: string, accent: string) =>
  StyleSheet.create({
    page: { padding: 0, fontFamily: 'Helvetica', color: '#0F172A' },
    hero: { backgroundColor: primary, color: '#FFFFFF', padding: 36, paddingBottom: 28 },
    eyebrow: { color: accent, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'Helvetica-Bold' },
    title: { fontSize: 32, fontFamily: 'Helvetica-Bold', marginTop: 8, lineHeight: 1.1 },
    italic: { fontStyle: 'italic', color: accent, marginTop: 4, fontSize: 12 },
    tagsRow: { flexDirection: 'row', gap: 6, marginTop: 16 },
    tag: { fontSize: 8, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 99, color: '#0F172A', backgroundColor: accent, fontFamily: 'Helvetica-Bold' },
    body: { padding: 36, paddingTop: 24, flexGrow: 1 },
    sectionLabel: { color: primary, fontSize: 8, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: 'Helvetica-Bold', marginBottom: 6 },
    blurb: { fontSize: 12, lineHeight: 1.55, color: '#1F2937', marginBottom: 18 },
    citiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
    cityChip: { borderLeft: `3 solid ${primary}`, paddingLeft: 8, paddingVertical: 4, paddingRight: 12 },
    cityName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#0F172A' },
    cityMeta: { fontSize: 9, color: '#64748B', marginTop: 1 },
    priceBox: { marginTop: 'auto', padding: 18, borderRadius: 10, backgroundColor: '#F8FAFC', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    priceLabel: { fontSize: 8, color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, fontFamily: 'Helvetica-Bold' },
    price: { fontSize: 26, color: primary, fontFamily: 'Helvetica-Bold', marginTop: 2 },
    cta: { backgroundColor: primary, color: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 6, fontSize: 11, fontFamily: 'Helvetica-Bold' },
    footer: { padding: 24, paddingTop: 14, paddingBottom: 18, backgroundColor: '#0F172A', color: '#E5E9F0', fontSize: 9, lineHeight: 1.5 },
    footerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
    footerName: { color: '#FFFFFF', fontSize: 12, fontFamily: 'Helvetica-Bold' },
    logo: { height: 30, width: 'auto' },
  });

// Convenience builder so route handlers (route.ts) don't need JSX
export function buildFlyer(input: FlyerInput) {
  return <FlyerPdf {...input} />;
}

export function FlyerPdf({ agency, template }: FlyerInput) {
  const primary = agency.primaryColor || '#630909';
  const accent  = agency.accentColor  || '#FFBA06';
  const s = styles(primary, accent);
  const priceRupees = Math.round(Number(template.startingPricePaise) / 100);

  return (
    <Document author={agency.name} title={`${template.title} · ${agency.name}`}>
      <Page size="A4" style={s.page}>
        <View style={s.hero}>
          {agency.logoUrl ? (
            <View style={{ marginBottom: 14 }}>
              <Image src={agency.logoUrl} style={s.logo} />
            </View>
          ) : null}
          <Text style={s.eyebrow}>Curated trip · {template.code}</Text>
          <Text style={s.title}>{template.title}</Text>
          {agency.tagline ? <Text style={s.italic}>{agency.tagline}</Text> : null}
          <View style={s.tagsRow}>
            <Text style={s.tag}>{template.region.replace('_', ' ')}</Text>
            <Text style={s.tag}>{template.category}</Text>
            <Text style={s.tag}>{template.totalNights} nights</Text>
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.sectionLabel}>Why this trip</Text>
          <Text style={s.blurb}>{template.blurb}</Text>

          <Text style={s.sectionLabel}>Where you'll go</Text>
          <View style={s.citiesRow}>
            {template.destinations.map((d, i) => (
              <View key={i} style={s.cityChip}>
                <Text style={s.cityName}>{d.cityName}</Text>
                <Text style={s.cityMeta}>{d.nights} night{d.nights !== 1 ? 's' : ''}{d.cityCode ? `  ·  ${d.cityCode}` : ''}</Text>
              </View>
            ))}
          </View>

          <View style={s.priceBox}>
            <View>
              <Text style={s.priceLabel}>Starting from</Text>
              <Text style={s.price}>₹ {priceRupees.toLocaleString('en-IN')}</Text>
              <Text style={{ fontSize: 9, color: '#64748B', marginTop: 2 }}>per person · twin sharing · ex-India</Text>
            </View>
            <Text style={s.cta}>Talk to us today</Text>
          </View>
        </View>

        <View style={s.footer}>
          <View style={s.footerBrand}><Text style={s.footerName}>{agency.name}</Text></View>
          {agency.supportEmail || agency.supportPhone ? (
            <Text>{[agency.supportEmail, agency.supportPhone].filter(Boolean).join('  ·  ')}</Text>
          ) : null}
          {agency.footerText ? <Text style={{ marginTop: 4 }}>{agency.footerText}</Text> : null}
        </View>
      </Page>
    </Document>
  );
}
