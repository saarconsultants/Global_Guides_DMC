'use server';
import { searchTransfers, type HotelbedsTransfer } from '@gg/hotelbeds';
import type { Transfer, TransferVehicle } from '@/lib/itinerary/types';

interface Input {
  fromType: 'IATA' | 'ATLAS';
  fromCode: string;
  toType: 'IATA' | 'ATLAS';
  toCode: string;
  pickupDate: string;
  adults: number;
  children?: number;
  // Friendly names so we can rebuild a normalized Transfer
  fromName: string;
  toName: string;
  kind: 'arrival' | 'departure' | 'inter-city';
}

interface Output {
  ok: true;
  transfer?: Transfer;       // Top pick, if any
  alternatives: Transfer[];  // All options (for a future "Change transfer" modal)
  source: 'live' | 'mock';
  warning?: string;
}
interface ErrOutput { ok: false; error: string }

export async function searchTransfersAction(input: Input): Promise<Output | ErrOutput> {
  try {
    const res = await searchTransfers({
      fromType: input.fromType,
      fromCode: input.fromCode,
      toType: input.toType,
      toCode: input.toCode,
      pickupDate: input.pickupDate,
      adults: input.adults,
      children: input.children ?? 0,
      infants: 0,
    });
    const all = res.transfers.map((t) => hbTransferToApp(t, input));
    // Pick the cheapest "Private" option as the default (matches the platform's
    // baseline expectation of a private transfer with bags).
    const privateOnly = all.filter((t) => t.vehicle !== 'SHARED');
    const sorted = (privateOnly.length > 0 ? privateOnly : all).sort((a, b) => a.pricePaise - b.pricePaise);
    return {
      ok: true,
      transfer: sorted[0],
      alternatives: all,
      source: res.source,
      warning: res.warning,
    };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

function hbTransferToApp(t: HotelbedsTransfer, ctx: Input): Transfer {
  return {
    id: t.id,
    kind: ctx.kind,
    fromName: ctx.fromName,
    toName: ctx.toName,
    vehicle: mapVehicle(t.vehicleKind),
    bagsAllowed: t.maxPax >= 4 ? 4 : t.maxPax,
    pricePaise: t.pricePaise,
  };
}

function mapVehicle(kind: HotelbedsTransfer['vehicleKind']): TransferVehicle {
  if (kind === 'PRIVATE_PREMIUM' || kind === 'LUXURY') return 'PRIVATE_PREMIUM';
  if (kind === 'PRIVATE' || kind === 'MINIBUS') return 'PRIVATE';
  return 'SHARED';
}
