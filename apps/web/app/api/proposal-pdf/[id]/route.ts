// GET /api/proposal-pdf/[id] → full branded itinerary PDF for a saved proposal.
// Agency-scoped (an agent can only export their own agency's proposals).

import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { buildProposalPdf } from '@/lib/pdf/proposal';
import { db } from '@/lib/db/client';
import { requireAgency } from '@/lib/auth/ctx';
import { getProposal, proposalToItinerary } from '@/lib/db/proposals';
import { getDisplayRate } from '@/lib/fx-display';

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
  const logoUrl = agency.logoUrl
    ? (agency.logoUrl.startsWith('/') ? `${origin}${agency.logoUrl}` : agency.logoUrl)
    : null;

  const currency = agency.currency ?? 'INR';
  const rate = await getDisplayRate(currency);

  const stream = await renderToStream(buildProposalPdf({
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
    itinerary,
  }));

  return new NextResponse(stream as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${p.code}-itinerary.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
