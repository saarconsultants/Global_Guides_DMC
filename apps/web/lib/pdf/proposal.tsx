// Branded itinerary PDF — consumer-friendly "holiday brochure" design modelled on
// the owner's reference (Pickyourtrail proposal): light brand-tinted cover with a
// personalised title + count chips + price-forward layout, a city-grouped
// itinerary with date pills, open hairline-separated hotel rows, and a dark
// trust footer on every page. White-label: the agency's primary/accent colours
// drive the whole scheme.
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
  shareUrl?: string;   // public accept link — renders the "View & accept online" button
  itinerary: Itinerary;
}

const pillDate = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const longDate = (s: string) => new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

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
// Readable text colour on an arbitrary brand accent.
function onColor(hex: string): string {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return INK;
  const n = parseInt(m[1]!, 16);
  const luma = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return luma > 150 ? INK : '#FFFFFF';
}

// ── City-grouped itinerary (reference layout) ──────────────────────────────
interface DayBlock { date: string; lines: Array<{ when: string; text: string }>; transfers: string[] }
interface CityGroup { city: string; blocks: DayBlock[]; bridge?: string } // bridge = inter-city transfer after this city

function groupByCity(days: Day[]): CityGroup[] {
  const groups: CityGroup[] = [];
  for (const day of days) {
    const transfers = day.inclusions.filter((i) => i.kind === 'transfer');
    // A transit day's inter-city transfer belongs to the END of the previous city.
    if (day.type === 'transit' && groups.length > 0 && transfers.length > 0) {
      const t: any = transfers[0];
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
      const text = (day.type === 'arrival' || day.type === 'departure' || day.type === 'transit') && day.narrative
        ? day.narrative
        : 'At leisure — add tours and experiences any time.';
      lines.push({ when: day.type === 'departure' ? 'Morning' : 'Full day', text });
    }
    const sameDayTransfers = day.type === 'transit'
      ? [] // already used as the bridge row
      : transfers.map((t: any) => `${t.transfer.fromName} – ${t.transfer.toName}`);
    g.blocks.push({ date: day.date, lines, transfers: sameDayTransfers });
  }
  return groups;
}

const styles = (primary: string, accent: string, fonts: boolean) => {
  const display = fonts ? 'Fraunces' : 'Helvetica-Bold';
  return StyleSheet.create({
    // ── Cover ──
    coverPage: { padding: 0, fontFamily: 'Helvetica' },
    cover: { backgroundColor: `${primary}0D`, width: '100%', height: '100%', paddingTop: 52, paddingBottom: 56, paddingHorizontal: 44, alignItems: 'center' },
    logoChip: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 9, border: '1 solid #EDF0F4' },
    logoImg: { height: 30, maxWidth: 200, objectFit: 'contain' },
    wordmark: { color: primary, fontFamily: 'Helvetica-Bold', fontSize: 13 },
    coverTitle: { fontFamily: display, fontSize: 30, color: INK, textAlign: 'center', marginTop: 34, lineHeight: 1.18, maxWidth: 460 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 22, maxWidth: 440 },
    chip: { flexDirection: 'row', alignItems: 'center', border: '1 solid #D8DEE7', borderRadius: 14, paddingVertical: 5, paddingHorizontal: 11, marginRight: 7, marginBottom: 7, backgroundColor: '#FFFFFF' },
    chipText: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#1F2937' },
    metaRow: { flexDirection: 'row', marginTop: 24, width: 400, justifyContent: 'space-between' },
    metaCol: { alignItems: 'center', maxWidth: 140 },
    metaLabel: { fontSize: 9, color: '#64748B' },
    metaValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: INK, marginTop: 4, textAlign: 'center' },
    travellingLabel: { fontSize: 9, color: '#64748B', marginTop: 22 },
    travellingValue: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: INK, marginTop: 4, textAlign: 'center', maxWidth: 440 },
    dashRule: { borderBottom: '1 dashed #C9D2DD', width: '100%', marginTop: 26, marginBottom: 22 },
    priceRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
    priceLabel: { fontSize: 9.5, color: '#334155' },
    priceHighlight: { backgroundColor: accent, alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, marginTop: 6, borderRadius: 3 },
    priceText: { fontFamily: display, fontSize: 26, color: onColor(accent) },
    priceSub: { fontSize: 8.5, color: '#64748B', marginTop: 7 },
    acceptBtn: { marginTop: 12, backgroundColor: primary, color: '#FFFFFF', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14, fontSize: 10, fontFamily: 'Helvetica-Bold', textDecoration: 'none', alignSelf: 'flex-start' },
    curatedBy: { alignItems: 'flex-end' },
    curatedLabel: { fontSize: 9, color: '#64748B' },
    curatedName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: INK, marginTop: 3 },
    curatedLine: { fontSize: 9, color: '#334155', marginTop: 3 },

    // ── Content pages ──
    page: { paddingTop: 44, paddingBottom: 58, paddingHorizontal: 48, fontFamily: 'Helvetica', fontSize: 10, color: INK },
    h1: { fontFamily: display, fontSize: 18, color: INK },
    cityHead: { fontFamily: display, fontSize: 13, color: primary, marginTop: 14 },
    section: { marginBottom: 22 },

    // itinerary timeline
    dayRow: { flexDirection: 'row', marginTop: 10 },
    pillCol: { width: 54, alignItems: 'flex-start' },
    datePill: { backgroundColor: `${primary}12`, borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8 },
    datePillText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: primary },
    connector: { width: 1, flexGrow: 1, backgroundColor: '#E5E9F0', marginLeft: 22, marginTop: 4 },
    dayLines: { flex: 1, paddingLeft: 8 },
    lineText: { fontSize: 9.5, lineHeight: 1.5, marginBottom: 3 },
    lineWhen: { fontFamily: 'Helvetica-Bold', color: primary },
    lineBody: { color: '#475569' },
    xferRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 2 },
    xferEmoji: { fontSize: 11, marginRight: 8 },
    xferText: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: INK },

    // flights (open layout)
    flightLeg: { paddingVertical: 10, borderBottom: '1 solid #EEF2F6' },
    flightHead: { flexDirection: 'row', justifyContent: 'space-between' },
    flightTitle: { fontFamily: display, fontSize: 11.5, color: INK },
    flightPrice: { fontFamily: display, fontSize: 11.5, color: primary },
    flightSeg: { fontSize: 9, color: '#475569', marginTop: 3 },

    // hotels (open rows)
    hotelRow: { flexDirection: 'row', marginTop: 12, paddingBottom: 12, borderBottom: '1 solid #EEF2F6' },
    hotelInfo: { flex: 1, paddingRight: 12 },
    hotelKicker: { fontSize: 7.5, letterSpacing: 1.2, color: '#94A3B8', fontFamily: 'Helvetica-Bold', textTransform: 'uppercase' },
    hotelName: { fontFamily: display, fontSize: 12, color: INK },
    hotelMeta: { fontSize: 9, color: '#475569', marginTop: 3 },
    hotelPriceLine: { fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: primary, marginTop: 4 },
    hotelPhoto: { width: 92, height: 68, borderRadius: 8, overflow: 'hidden' },
    hotelImg: { width: '100%', height: '100%', objectFit: 'cover' },

    // documents
    docRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 },
    pillOn: { borderRadius: 8, backgroundColor: `${accent}2E`, paddingVertical: 2.5, paddingHorizontal: 8 },
    pillOnText: { fontSize: 7, color: '#1F2937', fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
    pillOff: { borderRadius: 8, backgroundColor: '#F1F5F9', paddingVertical: 2.5, paddingHorizontal: 8 },
    pillOffText: { fontSize: 7, color: '#64748B', fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },

    // closing block
    closeTitle: { fontFamily: display, fontSize: 13, color: INK },
    closeLine: { fontSize: 9.5, color: '#475569', marginTop: 4 },

    // dark trust footer (fixed, every page)
    footerBar: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 26, backgroundColor: INK, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
    footerLeft: { fontSize: 7.5, color: 'rgba(255,255,255,0.8)' },
    footerRight: { fontSize: 7.5, color: '#FFFFFF', fontFamily: 'Helvetica-Bold' },
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
  const coverTitle = firstName
    ? `${firstName}'s ${it.days.length}-Day Trip to ${placeTitle}`
    : `Your ${it.days.length}-Day Trip to ${placeTitle}`;

  const activityCount = it.days.reduce((n, d) => n + (['morning', 'afternoon', 'evening'] as const).filter((slot) => (d as any)[slot]).length, 0);
  const transferCount = it.days.reduce((n, d) => n + d.inclusions.filter((i) => i.kind === 'transfer').length, 0);
  const hotelCount = it.destinations.filter((d) => d.stay).length;
  const visaIncluded = it.visa.some((v) => v.included);
  const hasDocs = it.visa.length > 0 || !!it.insurance;

  const chips: string[] = [];
  if (it.flights) chips.push(`✈️  ${it.flights.return ? 'Round-trip' : 'One-way'} Flights`);
  if (hotelCount > 0) chips.push(`🏨  ${hotelCount} Hotel${hotelCount !== 1 ? 's' : ''}`);
  if (activityCount > 0) chips.push(`🎟️  ${activityCount} Activit${activityCount !== 1 ? 'ies' : 'y'}`);
  if (transferCount > 0) chips.push(`🚗  ${transferCount} Transfer${transferCount !== 1 ? 's' : ''}`);
  if (visaIncluded) chips.push('🛂  Visa Assistance');
  if (it.insurance?.included) chips.push('🛡️  Insurance');

  const groups = groupByCity(it.days);
  const footerLeftText = agency.tagline ? `${agency.tagline} · ${agency.name}` : `Crafted by ${agency.name}`;

  return (
    <Document author={agency.name} title={`${coverTitle} · ${code}`}>
      {/* ── COVER ── */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.cover}>
          <View style={s.logoChip}>
            {isRasterLogo(agency.logoUrl)
              ? <Image src={agency.logoUrl!} style={s.logoImg} />
              : <Text style={s.wordmark}>{agency.name}</Text>}
          </View>

          <Text style={s.coverTitle}>{coverTitle}</Text>

          {chips.length > 0 && (
            <View style={s.chipRow}>
              {chips.map((c) => <View key={c} style={s.chip}><Text style={s.chipText}>{c}</Text></View>)}
            </View>
          )}

          <View style={s.metaRow}>
            <View style={s.metaCol}><Text style={s.metaLabel}>No of Pax</Text><Text style={s.metaValue}>{adults} Adult{adults !== 1 ? 's' : ''}{children ? ` · ${children} Child${children !== 1 ? 'ren' : ''}` : ''}</Text></View>
            <View style={s.metaCol}><Text style={s.metaLabel}>Duration</Text><Text style={s.metaValue}>{nights} Night{nights !== 1 ? 's' : ''}</Text></View>
            <View style={s.metaCol}><Text style={s.metaLabel}>Departure</Text><Text style={s.metaValue}>{longDate(it.intake.departureDate)}</Text></View>
          </View>

          <Text style={s.travellingLabel}>Travelling to</Text>
          <Text style={s.travellingValue}>{cities.join(', ')}</Text>

          <View style={s.dashRule} />

          <View style={s.priceRow}>
            <View>
              <Text style={s.priceLabel}>Total cost · all taxes included</Text>
              <View style={s.priceHighlight}><Text style={s.priceText}>{money(it.pricePaise)}</Text></View>
              <Text style={s.priceSub}>Per adult: {money(it.pricePerAdultPaise)} · {adults} adult{adults !== 1 ? 's' : ''}{children ? ` · ${children} child${children !== 1 ? 'ren' : ''}` : ''}</Text>
              {shareUrl ? <Link src={shareUrl} style={s.acceptBtn}>View & accept online »</Link> : null}
            </View>
            <View style={s.curatedBy}>
              <Text style={s.curatedLabel}>Itinerary curated by</Text>
              <Text style={s.curatedName}>{agency.name}</Text>
              {agency.supportPhone ? <Text style={s.curatedLine}>{agency.supportPhone}</Text> : null}
              {agency.supportEmail ? <Text style={s.curatedLine}>{agency.supportEmail}</Text> : null}
            </View>
          </View>
        </View>
        <View style={s.footerBar}>
          <Text style={s.footerLeft}>{footerLeftText}</Text>
          <Text style={s.footerRight}>{code}{version && version > 1 ? ` · v${version}` : ''}</Text>
        </View>
      </Page>

      {/* ── CONTENT ── */}
      <Page size="A4" style={s.page}>
        {/* Itinerary — grouped by city, date-pill timeline */}
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
                          <Text style={s.lineWhen}>{l.when} </Text>
                          <Text style={s.lineBody}>—  {l.text}</Text>
                        </Text>
                      ))}
                      {b.transfers.map((t, ti) => (
                        <View key={ti} style={s.xferRow}>
                          <Text style={s.xferEmoji}>🚗</Text>
                          <Text style={s.xferText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ))}
              {g.bridge && (
                <View style={s.xferRow} wrap={false}>
                  <Text style={s.xferEmoji}>🚗</Text>
                  <Text style={s.xferText}>{g.bridge}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Flights */}
        {it.flights && (
          <View style={s.section} wrap={false}>
            <Text style={s.h1}>Flights</Text>
            <FlightLeg s={s} label="Outbound" leg={it.flights} money={money} />
            {it.flights.return && <FlightLeg s={s} label="Return" leg={it.flights.return} money={money} />}
          </View>
        )}

        {/* Hotels */}
        {hotelCount > 0 && (
          <View style={s.section}>
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
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Text style={s.hotelName}>{d.stay.hotel.name}</Text>
                        {d.stay.hotel.stars > 0 && (
                          <View style={{ flexDirection: 'row', marginLeft: 6 }}>
                            {Array.from({ length: d.stay.hotel.stars }).map((_, k) => (
                              <View key={k} style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: STAR_GOLD, marginRight: 2 }} />
                            ))}
                          </View>
                        )}
                      </View>
                      <Text style={s.hotelMeta}>{d.stay.hotel.room.name} · {pillDate(d.stay.checkIn)} to {pillDate(d.stay.checkOut)}</Text>
                      <Text style={s.hotelMeta}>🍽️  {d.stay.hotel.mealPlan}{d.stay.hotel.refundable ? ' · Refundable' : ''}</Text>
                      <Text style={s.hotelPriceLine}>{money(d.stay.hotel.pricePerNightPaise * d.nights)} <Text style={{ color: '#94A3B8', fontFamily: 'Helvetica' }}>total stay</Text></Text>
                    </View>
                    {hThumb ? <View style={s.hotelPhoto}><Image src={hThumb} style={s.hotelImg} /></View> : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Documents & cover */}
        {hasDocs && (
          <View style={s.section} wrap={false}>
            <Text style={s.h1}>Documents &amp; cover</Text>
            {it.visa.map((v) => (
              <View key={v.countryCode} style={s.docRow}>
                <Text style={{ flex: 1, marginRight: 8, fontSize: 9.5 }}>{v.description}</Text>
                <View style={v.included ? s.pillOn : s.pillOff}><Text style={v.included ? s.pillOnText : s.pillOffText}>{v.included ? 'INCLUDED' : 'NOT INCLUDED'}</Text></View>
              </View>
            ))}
            {it.insurance && (
              <View style={s.docRow}>
                <Text style={{ flex: 1, marginRight: 8, fontSize: 9.5 }}>{it.insurance.description}</Text>
                <View style={it.insurance.included ? s.pillOn : s.pillOff}><Text style={it.insurance.included ? s.pillOnText : s.pillOffText}>{it.insurance.included ? 'INCLUDED' : 'NOT INCLUDED'}</Text></View>
              </View>
            )}
          </View>
        )}

        {/* Closing */}
        <View wrap={false} style={{ marginTop: 4 }}>
          <Text style={s.closeTitle}>Ready to book, or want changes?</Text>
          <Text style={s.closeLine}>
            Contact {agency.name}
            {agency.supportPhone ? `  ·  ${agency.supportPhone}` : ''}
            {agency.supportEmail ? `  ·  ${agency.supportEmail}` : ''}
          </Text>
          {shareUrl ? <Link src={shareUrl} style={[s.acceptBtn, { marginTop: 10 }]}>View & accept online »</Link> : null}
        </View>

        <View style={s.footerBar} fixed>
          <Text style={s.footerLeft}>{footerLeftText}</Text>
          {/* Cover is uncounted — content pages read Page 1..N. */}
          <Text style={s.footerRight} render={({ pageNumber }) => `Page ${pageNumber - 1}`} />
        </View>
      </Page>
    </Document>
  );
}

function FlightLeg({ s, label, leg, money }: { s: any; label: string; leg: { segments: Array<{ airlineName: string; airlineCode: string; flightNumber: string; fromIATA: string; toIATA: string; departureAt: string; arrivalAt: string }>; totalPaise: number }; money: (p: number | bigint) => string }) {
  return (
    <View style={s.flightLeg}>
      <View style={s.flightHead}>
        <Text style={s.flightTitle}>{label} · {leg.segments[0]!.airlineName}</Text>
        <Text style={s.flightPrice}>{money(leg.totalPaise)}</Text>
      </View>
      {leg.segments.map((seg, i) => (
        <Text key={i} style={s.flightSeg}>{seg.airlineCode} {seg.flightNumber} · {seg.fromIATA} {seg.departureAt.slice(11, 16)} – {seg.toIATA} {seg.arrivalAt.slice(11, 16)}</Text>
      ))}
    </View>
  );
}
