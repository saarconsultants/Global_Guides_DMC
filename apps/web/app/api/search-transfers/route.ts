// POST /api/search-transfers — see comment in search-activities/route.ts for why this isn't a server action.

import { NextResponse } from 'next/server';
import { searchTransfers, type HotelbedsTransfer } from '@gg/hotelbeds';
import type { Transfer, TransferVehicle } from '@/lib/itinerary/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  fromType: 'IATA' | 'ATLAS';
  fromCode: string;
  toType: 'IATA' | 'ATLAS';
  toCode: string;
  pickupDate: string;
  adults: number;
  children?: number;
  fromName: string;
  toName: string;
  kind: 'arrival' | 'departure' | 'inter-city';
}

export async function POST(req: Request) {
  let input: Body;
  try { input = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }); }

  try {
    const res = await searchTransfers({
      fromType: input.fromType, fromCode: input.fromCode,
      toType:   input.toType,   toCode:   input.toCode,
      pickupDate: input.pickupDate,
      adults: input.adults, children: input.children ?? 0, infants: 0,
    });
    const all = res.transfers.map((t) => toApp(t, input));
    const privateOnly = all.filter((t) => t.vehicle !== 'SHARED');
    const sorted = (privateOnly.length > 0 ? privateOnly : all).sort((a, b) => a.pricePaise - b.pricePaise);
    return NextResponse.json({
      ok: true,
      transfer: sorted[0],
      alternatives: all,
      source: res.source,
      warning: res.warning,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) });
  }
}

function toApp(t: HotelbedsTransfer, ctx: Body): Transfer {
  const v: TransferVehicle =
    t.vehicleKind === 'PRIVATE_PREMIUM' || t.vehicleKind === 'LUXURY' ? 'PRIVATE_PREMIUM' :
    t.vehicleKind === 'PRIVATE' || t.vehicleKind === 'MINIBUS' ? 'PRIVATE' : 'SHARED';
  return {
    id: t.id,
    kind: ctx.kind,
    fromName: ctx.fromName,
    toName: ctx.toName,
    vehicle: v,
    bagsAllowed: t.maxPax >= 4 ? 4 : t.maxPax,
    pricePaise: t.pricePaise,
  };
}
