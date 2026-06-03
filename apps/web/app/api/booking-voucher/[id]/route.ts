// GET /api/booking-voucher/[id] → branded booking voucher PDF.
// [id] is the PROPOSAL id (one booking per proposal). Agency-scoped.

import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { buildVoucherPdf } from '@/lib/pdf/voucher';
import { db } from '@/lib/db/client';
import { requireAgency } from '@/lib/auth/ctx';
import { proposalToItinerary } from '@/lib/db/proposals';
import { getDisplayRate } from '@/lib/fx-display';
import { pdfLogoUrl } from '@/lib/pdf/logo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await requireAgency();
  const { id } = await params;

  const booking = await db.booking.findFirst({
    where: { proposalId: id, agencyId: actor.agencyId },
    include: { proposal: { include: { lead: true } } },
  });
  if (!booking) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const itinerary = proposalToItinerary(booking.proposal);
  if (!itinerary) return NextResponse.json({ error: 'bad_proposal' }, { status: 422 });

  const agency = await db.agency.findUnique({ where: { id: actor.agencyId } });
  if (!agency) return NextResponse.json({ error: 'no_agency' }, { status: 404 });

  const origin = new URL(_req.url).origin;
  const logoUrl = pdfLogoUrl(agency.logoUrl, origin);
  const currency = agency.currency ?? 'INR';
  const rate = await getDisplayRate(currency);

  const stream = await renderToStream(buildVoucherPdf({
    agency: {
      name: agency.name, tagline: agency.tagline, logoUrl,
      primaryColor: agency.primaryColor, accentColor: agency.accentColor,
      supportEmail: agency.supportEmail ?? agency.email, supportPhone: agency.supportPhone ?? agency.contact,
      footerText: agency.footerText,
    },
    code: booking.proposal.code,
    bookedAt: booking.bookedAt.toISOString(),
    customerName: booking.proposal.lead?.customerName ?? null,
    currency,
    rate,
    itinerary,
  }));

  return new NextResponse(stream as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${booking.proposal.code}-voucher.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
