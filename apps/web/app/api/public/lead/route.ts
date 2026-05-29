import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { emitNotification } from '@/lib/db/notifications';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  let body: any = {};
  try {
    const ct = req.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) body = await req.json();
    else {
      const fd = await req.formData();
      body = Object.fromEntries(fd.entries());
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400, headers: CORS_HEADERS });
  }

  // Honeypot: bots fill _hp; humans don't.
  if (body._hp) return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });

  const slug = String(body.slug ?? '').trim();
  const customerName = String(body.customerName ?? '').trim();
  const customerEmail = String(body.customerEmail ?? '').trim() || null;
  const customerPhone = String(body.customerPhone ?? '').trim() || null;
  const destinations = String(body.destinations ?? '').trim() || 'Unspecified';
  const originCity = String(body.originCity ?? '').trim() || null;
  const nightsRaw = parseInt(String(body.nights ?? ''), 10);
  const nights = Number.isFinite(nightsRaw) && nightsRaw > 0 ? nightsRaw : null;
  const travelDateStr = String(body.travelDate ?? '').trim();
  const travelDate = travelDateStr ? new Date(travelDateStr) : null;

  if (!slug || !customerName) {
    return NextResponse.json({ ok: false, error: 'Missing slug or name' }, { status: 400, headers: CORS_HEADERS });
  }
  if (!customerEmail && !customerPhone) {
    return NextResponse.json({ ok: false, error: 'Need email or phone' }, { status: 400, headers: CORS_HEADERS });
  }

  const agency = await db.agency.findUnique({ where: { slug } });
  if (!agency || agency.status !== 'ACTIVE') {
    return NextResponse.json({ ok: false, error: 'Agency not found' }, { status: 404, headers: CORS_HEADERS });
  }

  const lead = await db.lead.create({
    data: {
      agencyId: agency.id,
      customerName,
      customerEmail,
      customerPhone,
      destinations,
      originCity,
      nights,
      travelDate: travelDate && !isNaN(travelDate.getTime()) ? travelDate : null,
      source: 'widget',
      status: 'NEW',
    },
  });

  await emitNotification({
    agencyId: agency.id,
    kind: 'LEAD_NEW',
    title: `New lead — ${customerName}`,
    body: `${destinations}${nights ? ` · ${nights} nights` : ''} (via widget)`,
    href: `/leads/${lead.id}`,
  });

  return NextResponse.json({ ok: true, id: lead.id }, { headers: CORS_HEADERS });
}
