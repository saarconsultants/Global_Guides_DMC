// GET /api/proposal-pdf/[id] → full branded itinerary PDF for a saved proposal.
// Agency-scoped (an agent can only export their own agency's proposals).

import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { buildProposalPdf } from '@/lib/pdf/proposal';
import { db } from '@/lib/db/client';
import { requireAgency } from '@/lib/auth/ctx';
import { getProposal, proposalToItinerary } from '@/lib/db/proposals';
import { getDisplayRate } from '@/lib/fx-display';
import { pdfLogoUrl } from '@/lib/pdf/logo';
import { embedItineraryImages } from '@/lib/pdf/embed-images';
import { registerPdfDisplayFont } from '@/lib/pdf/fonts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAgency();
  const { id } = await params;

  const p = await getProposal(id);
  if (!p || p.agencyId !== actor.agencyId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const itinerary = proposalToItinerary(p);
  if (!itinerary) return NextResponse.json({ error: 'bad_proposal' }, { status: 422 });

  const agency = await db.agency.findUnique({ where: { id: actor.agencyId } });
  if (!agency) return NextResponse.json({ error: 'no_agency' }, { status: 404 });

  const origin = new URL(req.url).origin;
  const logoUrl = pdfLogoUrl(agency.logoUrl, origin);

  const currency = agency.currency ?? 'INR';
  const rate = await getDisplayRate(currency);

  // Display font (Fraunces) — registered once per instance; fetched at render.
  registerPdfDisplayFont();

  // Pre-fetch + inline hotel-card photos as data URLs (failures dropped) so the
  // render is reliable and fetch-free.
  const itineraryForPdf = await embedItineraryImages(itinerary, { perImageMs: 3000, max: 12 });

  const base = {
    agency: {
      name: agency.name,
      tagline: agency.tagline,
      logoUrl,
      primaryColor: agency.primaryColor,
      accentColor: agency.accentColor,
      supportEmail: agency.supportEmail ?? agency.email,
      supportPhone: agency.supportPhone ?? agency.contact,
      footerText: agency.footerText,
    },
    code: p.code,
    version: (p as any).version ?? 1,
    customerName: p.lead?.customerName ?? null,
    currency,
    rate,
    itinerary: itineraryForPdf,
  };

  // Render with remote hotel/activity photos, but never let a slow or broken image
  // fail (or hang past Vercel's 10s cap) the customer's PDF: race against a 6s
  // budget and, on timeout OR error, re-render the fast image-less version.
  const withTimeout = <T,>(promise: Promise<T>, ms: number) =>
    Promise.race([promise, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('pdf-image-timeout')), ms))]);

  let buffer: Buffer;
  try {
    buffer = await withTimeout(renderToBuffer(buildProposalPdf({ ...base, images: true, fonts: true })), 6_000);
  } catch (e) {
    console.error('[proposal-pdf] rich render failed/timed out — falling back to plain:', (e as any)?.message ?? e);
    // Plain fallback: no remote photos, no remote display font — cannot fail on a fetch.
    buffer = await renderToBuffer(buildProposalPdf({ ...base, images: false, fonts: false }));
  }

  return new NextResponse(buffer as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${p.code}-itinerary.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
