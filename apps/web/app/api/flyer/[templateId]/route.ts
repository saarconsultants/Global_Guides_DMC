// GET /api/flyer/[templateId] → returns a branded PDF using the logged-in
// agency's brand + the given template's content. Auth required (middleware).

import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { buildFlyer } from '@/lib/pdf/flyer';
import { db } from '@/lib/db/client';
import { requireAgency } from '@/lib/auth/ctx';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const actor = await requireAgency();
  const { templateId } = await params;

  const [t, agency] = await Promise.all([
    db.itineraryTemplate.findUnique({ where: { id: templateId } }),
    db.agency.findUnique({ where: { id: actor.agencyId } }),
  ]);
  if (!t || !agency) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  let destinations: { cityCode: string; cityName: string; nights: number }[] = [];
  try { destinations = JSON.parse(t.destinations); } catch { destinations = []; }

  const origin = new URL(req.url).origin;
  const logoUrl = agency.logoUrl
    ? (agency.logoUrl.startsWith('/') ? `${origin}${agency.logoUrl}` : agency.logoUrl)
    : null;

  const stream = await renderToStream(buildFlyer({
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
    template: {
      code: t.code,
      title: t.title,
      blurb: t.blurb,
      region: t.region,
      category: t.category,
      totalNights: t.totalNights,
      startingPricePaise: t.startingPricePaise,
      destinations,
      hero: t.hero,
    },
  }));

  return new NextResponse(stream as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${t.code}-${agency.code}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
