// Room offers for one hotel: POST starts the search, the SSE stream delivers offers
// supplier by supplier until `done` (the API caps a search at 45 seconds).

import { baseUrl, headers, inrPaise, usCall, UnifyError } from './client';
import type { UnifyRoomRequest } from './hotels';

export interface UnifyRequirement {
  requirementId: string; code: string; scope: string; required: boolean;
  allowedValues: string[]; roomAllocationIds: string[];
}

export interface UnifyOfferRoom {
  allocationId: string;
  name: string;
  bedSummary?: string;
  maxGuests?: number;
  meal: { code: string; label: string };
  adults: number;
  childAges: number[];
}

export interface UnifyOffer {
  offerId: string;
  bookingToken: string;
  provider: string;
  expiresAt: string;
  rooms: UnifyOfferRoom[];
  /** What the agency pays through the supplier, INR paise. */
  payablePaise: number;
  /** What the guest pays at the hotel (city tax and similar), INR paise. */
  atPropertyPaise: number;
  refundability: 'REFUNDABLE' | 'PARTIALLY_REFUNDABLE' | 'NON_REFUNDABLE' | 'UNKNOWN';
  freeCancellationUntil: { local: string; timezone: string; utc: string } | null;
  /** Fee windows, `from` in hotel local time; amount when the supplier gave one in INR. */
  penalties: Array<{ from: string; amountPaise: number | null; percentage: number | null }>;
  policyText?: string;
  /** Notices the supplier says must be shown before payment. */
  notices: string[];
  promotions: string[];
  requirements: UnifyRequirement[];
}

const displayTotals = (o: any) => {
  const ledger = o?.pricing?.display_ledger;
  const t = (ledger?.totals ?? []).find((x: any) => x?.currency === 'INR') ?? null;
  return t ? { payable: inrPaise(t.payable_to_supplier), atProperty: inrPaise(t.payable_at_property) ?? 0 } : null;
};

/** A penalty in INR. Penalties come in the supplier's currency, so scale by the offer's own conversion. */
function penaltyPaise(o: any, p: any, payablePaise: number): number | null {
  const amt = p?.native_amount;
  if (amt && Number.isFinite(amt.amount_minor)) {
    const native = (o?.pricing?.native_ledger?.totals ?? []).find((t: any) => t?.currency === amt.currency)?.payable_to_supplier;
    if (native?.amount_minor > 0) return Math.round(payablePaise * (amt.amount_minor / native.amount_minor));
  }
  return Number.isFinite(p?.percentage) ? Math.round(payablePaise * p.percentage / 100) : null;
}

export function normalizeOffer(o: any): UnifyOffer | null {
  const totals = displayTotals(o);
  if (!totals || totals.payable === null || !o?.booking_token) return null;   // never guess a price
  const c = o.cancellation ?? {};
  return {
    offerId: String(o.offer_id), bookingToken: String(o.booking_token), provider: String(o.provider_code ?? ''),
    expiresAt: String(o.lifecycle?.expires_at ?? ''),
    rooms: (o.rooms ?? []).map((r: any) => ({
      allocationId: String(r.room_allocation_id),
      name: String(r.provider_room?.name ?? r.provider_room?.supplier_name ?? 'Room'),
      bedSummary: r.provider_room?.bed_summary ?? undefined,
      maxGuests: r.provider_room?.occupancy?.max_allowed?.total ?? undefined,
      meal: { code: String(r.meal_plan?.code ?? 'UNKNOWN'), label: String(r.meal_plan?.label ?? 'Room only') },
      adults: Number(r.occupancy?.adults ?? 0), childAges: (r.occupancy?.child_ages ?? []).map(Number),
    })),
    payablePaise: totals.payable, atPropertyPaise: totals.atProperty,
    refundability: c.refundability ?? 'UNKNOWN',
    freeCancellationUntil: c.free_cancellation_until ? { local: c.free_cancellation_until.local_datetime, timezone: c.free_cancellation_until.timezone, utc: c.free_cancellation_until.utc_datetime } : null,
    penalties: (c.penalties ?? []).map((p: any) => ({
      from: String(p.from?.local_datetime ?? ''),
      amountPaise: penaltyPaise(o, p, totals.payable!),
      percentage: Number.isFinite(p.percentage) ? p.percentage : null,
    })),
    policyText: c.policy_text ?? undefined,
    notices: (o.notices ?? []).filter((n: any) => n?.must_display && n.text).map((n: any) => String(n.text)),
    promotions: (o.promotions ?? []).map((p: any) => String(p.title ?? p.code ?? '')).filter(Boolean),
    requirements: (o.booking_requirements ?? []).map((b: any) => ({
      requirementId: String(b.requirement_id), code: String(b.code), scope: String(b.scope), required: !!b.required,
      allowedValues: b.allowed_values ?? [], roomAllocationIds: b.room_allocation_ids ?? [],
    })),
  };
}

/** Read the SSE stream until `done` or the deadline. Reconnects with Last-Event-ID if it drops. */
async function readStream(path: string, deadline: number, onOffers: (options: any[]) => void): Promise<'done' | 'timeout'> {
  let lastId = '0';
  for (let attempt = 0; attempt < 3 && Date.now() < deadline; attempt++) {
    const res = await fetch(baseUrl() + path, {
      headers: headers({ Accept: 'text/event-stream', 'Last-Event-ID': lastId }),
      signal: AbortSignal.timeout(Math.max(1_000, deadline - Date.now())),
    }).catch((e) => { if (e?.name === 'TimeoutError') return null; throw e; });
    if (!res) return 'timeout';
    if (res.status === 409 || res.status === 404) throw new UnifyError('The room search expired. Search the rooms again.', res.status, 'ROOM_STREAM_GONE', true);
    if (!res.ok || !res.body) throw new UnifyError(`Room stream failed (${res.status}).`, res.status, 'ROOM_STREAM_FAILED', true);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;   // dropped: reconnect from lastId
        buffer += decoder.decode(value, { stream: true });
        let end: number;
        while ((end = buffer.indexOf('\n\n')) >= 0) {
          const frame = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          let id = '', event = 'message', data = '';
          for (const line of frame.split('\n')) {
            if (line.startsWith('id:')) id = line.slice(3).trim();
            else if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) data += line.slice(5).trim();
          }
          if (id) lastId = id;
          if (!data) continue;
          const body = JSON.parse(data);
          if (event === 'provider_options') onOffers(body.options ?? []);
          if (event === 'done') { await reader.cancel().catch(() => {}); return 'done'; }
        }
      }
    } catch (e: any) {
      if (e?.name === 'TimeoutError' || e?.name === 'AbortError') return 'timeout';
      throw e;
    }
  }
  return 'timeout';
}

/** Every offer for these dates and rooms, cheapest first. Partial when the deadline ends the stream first. */
export async function getRoomOffers(hotelId: string, input: {
  checkIn: string; checkOut: string; rooms: UnifyRoomRequest[]; nationality?: string; maxWaitMs?: number;
}): Promise<{ offers: UnifyOffer[]; partial: boolean; unpriced: number }> {
  const r = await usCall<any>(`/hotels/${encodeURIComponent(hotelId)}/rooms`, {
    method: 'POST',
    body: {
      check_in: input.checkIn, check_out: input.checkOut, nationality: (input.nationality ?? 'IN').toUpperCase(),
      rooms: input.rooms.map((x) => ({ adults: Math.min(5, Math.max(1, x.adults)), child_ages: x.childAges })),
    },
  });
  const url: string | undefined = r?.data?.sse_stream_url;
  if (!url) return { offers: [], partial: false, unpriced: 0 };
  const byId = new Map<string, any>();
  const end = await readStream(url.startsWith('http') ? new URL(url).pathname : url, Date.now() + (input.maxWaitMs ?? 25_000), (opts) => {
    for (const o of opts) byId.set(String(o.offer_id), o);   // idempotent across replays
  });
  const offers = [...byId.values()].map(normalizeOffer).filter((o): o is UnifyOffer => !!o).sort((a, b) => a.payablePaise - b.payablePaise);
  return { offers, partial: end !== 'done', unpriced: byId.size - offers.length };
}
