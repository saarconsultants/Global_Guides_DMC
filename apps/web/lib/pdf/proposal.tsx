// Branded itinerary PDF — faithful white-label copy of the owner's reference
// proposal design (Pickyourtrail). Heavy geometric sans (Archivo), light
// brand-tinted cover with a personalised uppercase title + outlined count chips
// + price-forward block, city-grouped itinerary with date pills, airy
// page-per-section layout (Hotels / Transfers / Others / How to Book), and a
// dark trust bar on every page. The agency's primary/accent colours drive the
// whole scheme.
//
// @react-pdf constraints handled here:
//  - Helvetica lacks ₹/→/✓ etc — money uses ISO codes, arrows use » (WinAnsi).
//  - <Image> cannot render SVG — non-raster logos fall back to a text wordmark.
//  - Emoji render via the registered twemoji source (fetched at render time).

import { Document, Page, View, Text, StyleSheet, Image, Font, Link } from '@react-pdf/renderer';
import { formatMoneyCode } from '@/lib/money';
import type { Itinerary, Day } from '@/lib/itinerary/types';

Font.registerEmojiSource({ format: 'png', url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/' });

// Hotel star rating is always gold (independent of the agency accent colour).
const STAR_GOLD = '#F5B301';
const INK = '#10182B';
const MUTE = '#64748B';
const BODY = '#475569';

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
  fonts?: boolean;     // use the Archivo display font (route falls back to built-ins)
  shareUrl?: string;   // public accept link — renders the "view & accept" actions
  itinerary: Itinerary;
}

const pillDate = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const longDate = (s: string | Date) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

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
// Readable text colour on an arbitrary brand colour.
function onColor(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return INK;
  const n = parseInt(m[1]!, 16);
  const luma = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return luma > 150 ? INK : '#FFFFFF';
}

// ── City-grouped itinerary (reference layout) ──────────────────────────────
interface DayBlock { date: string; lines: Array<{ when: string; text: string }> }
interface CityGroup { city: string; blocks: DayBlock[]; bridge?: string }
interface TransferItem { date: string; from: string; to: string; vehicle?: string; kind?: string }

function groupByCity(days: Day[]): { groups: CityGroup[]; transfers: TransferItem[] } {
  const groups: CityGroup[] = [];
  const transfers: TransferItem[] = [];
  for (const day of days) {
    const dayTransfers = day.inclusions.filter((i) => i.kind === 'transfer') as any[];
    for (const t of dayTransfers) {
      transfers.push({ date: day.date, from: t.transfer.fromName, to: t.transfer.toName, vehicle: t.transfer.vehicle, kind: t.transfer.kind });
    }
    // A transit day's inter-city transfer reads as the bridge after the previous city.
    if (day.type === 'transit' && groups.length > 0 && dayTransfers.length > 0) {
      const t = dayTransfers[0]!;
      groups[groups.length - 1]!.bridge = `${t.transfer.fromName} to ${t.transfer.toName}`;
    }
    let g = groups[groups.length - 1];
    if (!g || g.city !== day.cityName) {
      g = { city: day.cityName, blocks: [] };
      groups.push(g);
    }
    const lines: DayBlock['lines'] = [];
    for (const slot of ['morning', 'afternoon', 'evening'] as const) {
      const a = day[slot];
      if (a) lines.push({ when: slot[0]!.toUpperCase() + slot.slice(1), text: a.name });
    }
    if (lines.length === 0) {
      const text = (day.type !== 'stay' && day.narrative) ? day.narrative : 'At Leisure';
      lines.push({ when: day.type === 'departure' ? 'Morning' : 'Full day', text });
    }
    g.blocks.push({ date: day.date, lines });
  }
  return { groups, transfers };
}

const styles = (primary: string, accent: string, fonts: boolean) => {
  const heavy = fonts
    ? ({ fontFamily: 'Archivo', fontWeight: 800 as const })
    : ({ fontFamily: 'Helvetica-Bold' });
  const semi = fonts
    ? ({ fontFamily: 'Archivo', fontWeight: 600 as const })
    : ({ fontFamily: 'Helvetica-Bold' });
  return StyleSheet.create({
    // ── Cover ──
    coverPage: { padding: 0, fontFamily: 'Helvetica' },
    cover: { backgroundColor: `${primary}0F`, width: '100%', height: '100%', paddingTop: 46, paddingBottom: 60, paddingHorizontal: 44, alignItems: 'center' },
    logoImg: { height: 34, maxWidth: 220, objectFit: 'contain' },
    wordmark: { ...heavy, color: primary, fontSize: 15 },
    coverTagline: { fontSize: 8, color: MUTE, marginTop: 4 },
    coverTitle: { ...heavy, fontSize: 26, color: INK, textAlign: 'center', marginTop: 36, lineHeight: 1.22, maxWidth: 480, textTransform: 'uppercase' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 24, maxWidth: 470 },
    chip: { flexDirection: 'row', alignItems: 'center', border: '1.2 solid #2A3245', borderRadius: 18, paddingVertical: 6, paddingHorizontal: 13, marginHorizontal: 4, marginBottom: 8 },
    chipText: { ...semi, fontSize: 9.5, color: INK },
    metaRow: { flexDirection: 'row', marginTop: 26, width: 420, justifyContent: 'space-between' },
    metaCol: { alignItems: 'center', maxWidth: 150 },
    metaLabel: { fontSize: 9.5, color: BODY },
    metaValue: { ...heavy, fontSize: 13, color: INK, marginTop: 5, textAlign: 'center' },
    travellingLabel: { fontSize: 9.5, color: BODY, marginTop: 24 },
    travellingValue: { ...heavy, fontSize: 13, color: INK, marginTop: 5, textAlign: 'center', maxWidth: 460 },
    dashRule: { borderBottom: '1.2 dashed #B9C3D0', width: '100%', marginTop: 28, marginBottom: 24 },
    priceRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
    priceLabel: { fontSize: 9.5, color: '#334155' },
    priceHighlight: { backgroundColor: accent, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 9, marginTop: 7, borderRadius: 3 },
    priceText: { ...heavy, fontSize: 25, color: onColor(accent) },
    blackTag: { marginTop: 9, backgroundColor: '#0B0F1A', alignSelf: 'flex-start', borderRadius: 4, paddingVertical: 5, paddingHorizontal: 9, color: '#FFFFFF', fontSize: 8.5, textDecoration: 'none', ...semi },
    priceSub: { fontSize: 8, color: MUTE, marginTop: 8 },
    curatedBy: { alignItems: 'flex-end' },
    curatedLabel: { fontSize: 9.5, color: BODY },
    curatedName: { ...heavy, fontSize: 12, color: INK, marginTop: 4 },
    curatedLine: { fontSize: 9.5, color: '#334155', marginTop: 4 },

    // ── Content ──
    page: { paddingTop: 44, paddingBottom: 60, paddingHorizontal: 48, fontFamily: 'Helvetica', fontSize: 10, color: INK },
    h1: { ...heavy, fontSize: 17, color: INK, marginBottom: 6 },
    cityHead: { ...heavy, fontSize: 12.5, color: INK, marginTop: 14 },
    section: { marginBottom: 24 },

    // itinerary timeline
    dayRow: { flexDirection: 'row', marginTop: 10 },
    pillCol: { width: 56, alignItems: 'flex-start' },
    datePill: { backgroundColor: `${primary}14`, borderRadius: 10, paddingVertical: 3.5, paddingHorizontal: 8 },
    datePillText: { ...semi, fontSize: 8, color: primary },
    connector: { width: 1, flexGrow: 1, backgroundColor: '#E5E9F0', marginLeft: 23, marginTop: 4 },
    dayLines: { flex: 1, paddingLeft: 8 },
    lineText: { fontSize: 9.5, lineHeight: 1.55, marginBottom: 3 },
    lineWhen: { ...semi, color: primary },
    lineBody: { color: BODY },
    bridgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    bridgePill: { backgroundColor: `${primary}14`, borderRadius: 10, paddingVertical: 3.5, paddingHorizontal: 9, marginRight: 10 },
    bridgeText: { ...semi, fontSize: 9.5, color: INK },

    // hotels
    hotelRow: { flexDirection: 'row', marginTop: 14, paddingBottom: 14, borderBottom: '1 solid #EEF2F6' },
    hotelInfo: { flex: 1, paddingRight: 12 },
    hotelKicker: { fontSize: 7.5, letterSpacing: 1.2, color: '#94A3B8', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    hotelName: { ...heavy, fontSize: 12, color: INK },
    hotelMeta: { fontSize: 9, color: BODY, marginTop: 4 },
    hotelPhoto: { width: 100, height: 74, borderRadius: 10, overflow: 'hidden' },
    hotelImg: { width: '100%', height: '100%', objectFit: 'cover' },
    ctaBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: `${primary}10`, borderRadius: 10, padding: 14, marginTop: 18 },
    ctaTitle: { ...semi, fontSize: 10, color: INK },
    ctaSub: { fontSize: 8.5, color: BODY, marginTop: 3 },
    ctaBtn: { backgroundColor: primary, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14, color: onColor(primary), fontSize: 9.5, textDecoration: 'none', ...semi },

    // transfers
    xferBlock: { marginTop: 14, paddingBottom: 14, borderBottom: '1 solid #EEF2F6' },
    xferHead: { flexDirection: 'row', alignItems: 'center' },
    xferIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: `${primary}12`, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    xferEmoji: { fontSize: 13 },
    xferTitle: { ...heavy, fontSize: 11.5, color: INK },
    xferSub: { fontSize: 9, color: BODY, marginTop: 3 },
    flightCols: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingHorizontal: 4 },
    flightCol: { maxWidth: 170 },
    flightDate: { fontSize: 8.5, color: BODY },
    flightTime: { ...heavy, fontSize: 13, color: INK, marginTop: 2 },
    flightAirport: { fontSize: 8.5, color: BODY, marginTop: 2 },
    flightMid: { alignItems: 'center' },
    flightMidText: { fontSize: 9, color: MUTE },
    flightPrice: { ...heavy, fontSize: 11, color: primary },

    // others / docs
    docName: { ...semi, fontSize: 10.5, color: INK, marginTop: 12 },
    docBullet: { flexDirection: 'row', marginTop: 5, paddingRight: 8 },
    bulletDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: BODY, marginTop: 5, marginRight: 7 },
    docText: { fontSize: 9.5, color: BODY, lineHeight: 1.5, flex: 1 },
    pillOn: { borderRadius: 8, backgroundColor: `${accent}2E`, paddingVertical: 2.5, paddingHorizontal: 8, alignSelf: 'flex-start', marginTop: 6 },
    pillOnText: { fontSize: 7, color: '#1F2937', fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
    pillOff: { borderRadius: 8, backgroundColor: '#F1F5F9', paddingVertical: 2.5, paddingHorizontal: 8, alignSelf: 'flex-start', marginTop: 6 },
    pillOffText: { fontSize: 7, color: MUTE, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },

    // how to book
    payRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottom: '1 solid #EEF2F6' },
    payLabel: { fontSize: 10, color: '#334155' },
    payValue: { ...semi, fontSize: 10.5, color: INK },
    payTotalLabel: { ...heavy, fontSize: 11, color: INK },
    payTotalValue: { ...heavy, fontSize: 12, color: INK },
    btnRow: { flexDirection: 'row', marginTop: 18 },
    btnOutline: { border: `1.2 solid ${primary}`, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 16, color: primary, fontSize: 10, textDecoration: 'none', marginRight: 10, ...semi },
    btnSolid: { backgroundColor: primary, borderRadius: 6, paddingVertical: 9, paddingHorizontal: 16, color: onColor(primary), fontSize: 10, textDecoration: 'none', ...semi },
    note: { fontSize: 8.5, color: MUTE, marginTop: 16, lineHeight: 1.5 },

    // dark trust footer (fixed, every page)
    footerBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, backgroundColor: '#0B0F1A', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
    footerCenter: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 28, backgroundColor: '#0B0F1A', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    footerText: { fontSize: 8, color: '#FFFFFF' },
    footerDim: { fontSize: 8, color: '#5B6478', marginHorizontal: 9 },
    footerBold: { fontSize: 8, color: '#FFFFFF', fontFamily: 'Helvetica-Bold' },
  });
};

export function buildProposalPdf(input: ProposalPdfInput) {
  return <ProposalPdf {...input} />;
}

function ProposalPdf({ agency, code, version, customerName, currency = 'INR', rate = 1, images = true, fonts = true, shareUrl, itinerary: it }: ProposalPdfInput) {
  const primary = agency.primaryColor || '#630909';
  const accent = agency.accentColor || '#FFBA06';
  const money = (paise: number | bigint) => formatMoneyCode(paise, currency, rate);
  const s = styles(primary, accent, fonts);

  const cities = it.destinations.map((d) => d.cityName);
  const nights = it.destinations.reduce((sum, d) => sum + d.nights, 0);
  const placeTitle = cities.length === 1 ? cities[0]! : `${cities.slice(0, -1).join(', ')} & ${cities.at(-1)}`;
  const adults = it.intake.rooms.reduce((sum, r) => sum + r.adults, 0);
  const children = it.intake.rooms.reduce((sum, r) => sum + (r.children ?? 0), 0);
  const firstName = (customerName ?? '').trim().split(/\s+/)[0] ?? '';
  const coverTitle = `${firstName ? `${firstName}'s` : 'Your'} ${it.days.length} day trip to ${placeTitle}`;

  const activityCount = it.days.reduce((n, d) => n + (['morning', 'afternoon', 'evening'] as const).filter((slot) => (d as any)[slot]).length, 0);
  const hotelCount = it.destinations.filter((d) => d.stay).length;
  const visaIncluded = it.visa.some((v) => v.included);
  const hasDocs = it.visa.length > 0 || !!it.insurance;

  const { groups, transfers } = groupByCity(it.days);

  const chips: string[] = [];
  if (it.flights) chips.push(`✈️  ${it.flights.return ? 'Round-trip' : 'One-way'} Flights`);
  if (hotelCount > 0) chips.push(`🏨  ${hotelCount} Hotel${hotelCount !== 1 ? 's' : ''}`);
  if (activityCount > 0) chips.push(`🎟️  ${activityCount} Activit${activityCount !== 1 ? 'ies' : 'y'}`);
  if (transfers.length > 0) chips.push(`🚗  ${transfers.length} Transfer${transfers.length !== 1 ? 's' : ''}`);
  if (visaIncluded) chips.push('🛂  Visa');
  if (it.insurance?.included) chips.push('🛡️  Insurance');

  const footerLeftText = agency.footerText ?? agency.tagline ?? `Crafted by ${agency.name}`;
  const trust = [agency.tagline ?? `Crafted by ${agency.name}`, agency.supportEmail ?? agency.supportPhone, `${code}${version && version > 1 ? ` · v${version}` : ''}`].filter(Boolean) as string[];

  return (
    <Document author={agency.name} title={`${coverTitle} · ${code}`}>
      {/* ── COVER ── */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.cover}>
          {isRasterLogo(agency.logoUrl)
            ? <Image src={agency.logoUrl!} style={s.logoImg} />
            : <Text style={s.wordmark}>{agency.name}</Text>}
          {agency.tagline ? <Text style={s.coverTagline}>{agency.tagline}</Text> : null}

          <Text style={s.coverTitle}>{coverTitle}</Text>

          {chips.length > 0 && (
            <View style={s.chipRow}>
              {chips.map((c) => <View key={c} style={s.chip}><Text style={s.chipText}>{c}</Text></View>)}
            </View>
          )}

          <View style={s.metaRow}>
            <View style={s.metaCol}><Text style={s.metaLabel}>No of Pax</Text><Text style={s.metaValue}>{adults} Adult{adults !== 1 ? 's' : ''}{children ? ` · ${children} Child${children !== 1 ? 'ren' : ''}` : ''}</Text></View>
            <View style={s.metaCol}><Text style={s.metaLabel}>Duration</Text><Text style={s.metaValue}>{nights} Night{nights !== 1 ? 's' : ''}</Text></View>
            <View style={s.metaCol}><Text style={s.metaLabel}>Dept Date</Text><Text style={s.metaValue}>{longDate(it.intake.departureDate)}</Text></View>
          </View>

          <Text style={s.travellingLabel}>Travelling to</Text>
          <Text style={s.travellingValue}>{cities.join(', ')}</Text>

          <View style={s.dashRule} />

          <View style={s.priceRow}>
            <View>
              <Text style={s.priceLabel}>Total cost includes all taxes · dated on {longDate(new Date())}</Text>
              <View style={s.priceHighlight}><Text style={s.priceText}>{money(it.pricePaise)}</Text></View>
              {shareUrl ? <Link src={shareUrl} style={s.blackTag}>Tap to view &amp; accept this trip online »</Link> : null}
              <Text style={s.priceSub}>Per adult: {money(it.pricePerAdultPaise)} · prices subject to availability</Text>
            </View>
            <View style={s.curatedBy}>
              <Text style={s.curatedLabel}>Itinerary Curated by</Text>
              <Text style={s.curatedName}>{agency.name}</Text>
              {agency.supportPhone ? <Text style={s.curatedLine}>{agency.supportPhone}</Text> : null}
              {agency.supportEmail ? <Text style={s.curatedLine}>{agency.supportEmail}</Text> : null}
            </View>
          </View>
        </View>
        <View style={s.footerCenter}>
          {trust.map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
              {i > 0 && <Text style={s.footerDim}>•</Text>}
              <Text style={s.footerText}>{t}</Text>
            </View>
          ))}
        </View>
      </Page>

      {/* ── CONTENT ── */}
      <Page size="A4" style={s.page}>
        {/* Itinerary — city-grouped, date-pill timeline */}
        <View style={s.section}>
          {groups.map((g, gi) => (
            <View key={`${g.city}-${gi}`}>
              {g.blocks.map((b, bi) => (
                <View key={b.date} wrap={false}>
                  {gi === 0 && bi === 0 && <Text style={s.h1}>Itinerary</Text>}
                  {bi === 0 && <Text style={s.cityHead}>{g.city}</Text>}
                  <View style={s.dayRow}>
                    <View style={s.pillCol}>
                      <View style={s.datePill}><Text style={s.datePillText}>{pillDate(b.date)}</Text></View>
                      {bi < g.blocks.length - 1 && <View style={s.connector} />}
                    </View>
                    <View style={s.dayLines}>
                      {b.lines.map((l, li) => (
                        <Text key={li} style={s.lineText}>
                          <Text style={s.lineWhen}>{l.when}</Text>
                          <Text style={s.lineBody}> - {l.text}</Text>
                        </Text>
                      ))}
                    </View>
                  </View>
                </View>
              ))}
              {g.bridge && (
                <View style={s.bridgeRow} wrap={false}>
                  <View style={s.bridgePill}><Text style={{ fontSize: 10 }}>🚗</Text></View>
                  <Text style={s.bridgeText}>{g.bridge}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Hotels — own page, open rows, no per-hotel prices (price lives on cover + booking page) */}
        {hotelCount > 0 && (
          <View style={s.section} break>
            {it.destinations.map((d, i) => {
              if (!d.stay) return null;
              const hThumb = images ? pdfImg(d.stay.hotel.thumb) : null;
              const isFirstStay = it.destinations.findIndex((x) => x.stay) === i;
              return (
                <View key={d.cityCode} wrap={false}>
                  {isFirstStay && <Text style={s.h1}>Hotels</Text>}
                  <View style={s.hotelRow}>
                    <View style={s.hotelInfo}>
                      <Text style={s.hotelKicker}>{d.nights}N STAY IN {d.cityName.toUpperCase()}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                        <Text style={s.hotelName}>{d.stay.hotel.name}</Text>
                        {d.stay.hotel.stars > 0 && (
                          <View style={{ flexDirection: 'row', marginLeft: 7 }}>
                            {Array.from({ length: d.stay.hotel.stars }).map((_, k) => (
                              <View key={k} style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: STAR_GOLD, marginRight: 2 }} />
                            ))}
                          </View>
                        )}
                      </View>
                      <Text style={s.hotelMeta}>{d.stay.hotel.room.name} , {pillDate(d.stay.checkIn)} to {pillDate(d.stay.checkOut)}</Text>
                      <Text style={s.hotelMeta}>🍽️  {d.stay.hotel.mealPlan}{d.stay.hotel.refundable ? '   ·   Refundable' : ''}</Text>
                    </View>
                    {hThumb ? <View style={s.hotelPhoto}><Image src={hThumb} style={s.hotelImg} /></View> : null}
                  </View>
                </View>
              );
            })}
            <View style={s.ctaBanner} wrap={false}>
              <View>
                <Text style={s.ctaTitle}>Prices for these hotels fluctuate</Text>
                <Text style={s.ctaSub}>Accept this trip online to lock the quoted price.</Text>
              </View>
              {shareUrl ? <Link src={shareUrl} style={s.ctaBtn}>View Trip</Link> : null}
            </View>
          </View>
        )}

        {/* Transfers — own page: flights (if attached) + ground transfers */}
        {(it.flights || transfers.length > 0) && (
          <View style={s.section} break>
            <Text style={s.h1}>Transfers</Text>
            {it.flights && <FlightBlock s={s} leg={it.flights} money={money} label="Outbound flight" />}
            {it.flights?.return && <FlightBlock s={s} leg={it.flights.return} money={money} label="Return flight" />}
            {transfers.map((t, i) => (
              <View key={i} style={s.xferBlock} wrap={false}>
                <View style={s.xferHead}>
                  <View style={s.xferIcon}><Text style={s.xferEmoji}>🚗</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.xferTitle}>{t.from} to {t.to}</Text>
                    <Text style={s.xferSub}>{longDate(t.date)}{t.vehicle ? `  •  ${t.vehicle}` : ''}{t.kind ? `  •  ${t.kind} transfer` : ''}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Others — visa + insurance */}
        {hasDocs && (
          <View style={s.section} break>
            <Text style={s.h1}>Others</Text>
            {it.visa.map((v) => (
              <View key={v.countryCode} wrap={false}>
                <Text style={s.docName}>Visa — {v.country}</Text>
                <View style={s.docBullet}><View style={s.bulletDot} /><Text style={s.docText}>{v.description}</Text></View>
                <View style={v.included ? s.pillOn : s.pillOff}><Text style={v.included ? s.pillOnText : s.pillOffText}>{v.included ? 'INCLUDED' : 'NOT INCLUDED'}</Text></View>
              </View>
            ))}
            {it.insurance && (
              <View wrap={false}>
                <Text style={s.docName}>Travel Insurance</Text>
                <View style={s.docBullet}><View style={s.bulletDot} /><Text style={s.docText}>{it.insurance.description}</Text></View>
                <View style={it.insurance.included ? s.pillOn : s.pillOff}><Text style={it.insurance.included ? s.pillOnText : s.pillOffText}>{it.insurance.included ? 'INCLUDED' : 'NOT INCLUDED'}</Text></View>
              </View>
            )}
          </View>
        )}

        {/* How to Book */}
        <View style={s.section} break>
          <Text style={s.h1}>How to Book</Text>
          <View style={s.payRow}><Text style={s.payLabel}>Trip cost ({adults} adult{adults !== 1 ? 's' : ''}{children ? ` + ${children} child${children !== 1 ? 'ren' : ''}` : ''})</Text><Text style={s.payValue}>{money(it.pricePaise)}</Text></View>
          <View style={s.payRow}><Text style={s.payLabel}>Per adult</Text><Text style={s.payValue}>{money(it.pricePerAdultPaise)}</Text></View>
          <View style={[s.payRow, { borderBottom: 'none' }]}><Text style={s.payTotalLabel}>Total Amount</Text><Text style={s.payTotalValue}>{money(it.pricePaise)}</Text></View>
          <View style={s.btnRow}>
            {agency.supportEmail ? <Link src={`mailto:${agency.supportEmail}?subject=Trip ${code}`} style={s.btnOutline}>Talk to {agency.name}</Link> : null}
            {shareUrl ? <Link src={shareUrl} style={s.btnSolid}>View &amp; Accept Online</Link> : null}
          </View>
          <Text style={s.note}>
            Accepting online confirms your itinerary at the quoted price.
            {agency.supportPhone ? ` Questions? Call ${agency.supportPhone}.` : ''}
            {agency.footerText ? ` ${agency.footerText}` : ''}
          </Text>
        </View>

        <View style={s.footerBar} fixed>
          <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.85)' }}>{footerLeftText}</Text>
          {/* Cover is uncounted — content pages read Page 1..N. */}
          <Text style={s.footerBold} render={({ pageNumber }) => `Page ${pageNumber - 1}`} />
        </View>
      </Page>
    </Document>
  );
}

function FlightBlock({ s, leg, money, label }: { s: any; label: string; leg: { segments: Array<{ airlineName: string; airlineCode: string; flightNumber: string; fromIATA: string; toIATA: string; departureAt: string; arrivalAt: string }>; totalPaise: number }; money: (p: number | bigint) => string }) {
  const first = leg.segments[0]!;
  const last = leg.segments[leg.segments.length - 1]!;
  const stops = leg.segments.length - 1;
  return (
    <View style={s.xferBlock} wrap={false}>
      <View style={s.xferHead}>
        <View style={s.xferIcon}><Text style={s.xferEmoji}>✈️</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.xferTitle}>{first.fromIATA} to {last.toIATA}</Text>
          <Text style={s.xferSub}>{longDate(first.departureAt)}  •  {first.airlineName}  •  {stops === 0 ? 'Direct Flight' : `${stops} stop${stops > 1 ? 's' : ''}`}  •  {label}</Text>
        </View>
        <Text style={s.flightPrice}>{money(leg.totalPaise)}</Text>
      </View>
      <View style={s.flightCols}>
        <View style={s.flightCol}>
          <Text style={s.flightDate}>{longDate(first.departureAt)}</Text>
          <Text style={s.flightTime}>{first.fromIATA} {first.departureAt.slice(11, 16)}</Text>
          <Text style={s.flightAirport}>{first.airlineCode} {first.flightNumber}</Text>
        </View>
        <View style={s.flightMid}><Text style={s.flightMidText}>—  ✈️  —</Text></View>
        <View style={[s.flightCol, { alignItems: 'flex-end' }]}>
          <Text style={s.flightDate}>{longDate(last.arrivalAt)}</Text>
          <Text style={s.flightTime}>{last.toIATA} {last.arrivalAt.slice(11, 16)}</Text>
          <Text style={s.flightAirport}>{leg.segments.length} segment{leg.segments.length > 1 ? 's' : ''}</Text>
        </View>
      </View>
    </View>
  );
}
