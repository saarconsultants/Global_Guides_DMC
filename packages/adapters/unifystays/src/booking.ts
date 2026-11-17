// Prebook → book → status → cancel. Bookings are not confirmed instantly:
// they come back PROCESSING (or AWAITING_REVIEW) and are polled to a final state.

import { inrPaise, usCall } from './client';
import { normalizeOffer, type UnifyOffer } from './rooms';

export type UnifyBookingStatus = 'AWAITING_REVIEW' | 'PROCESSING' | 'CONFIRMED' | 'ON_HOLD' | 'FAILED' | 'CANCELLATION_PENDING' | 'CANCELLED';

export interface UnifyPrebook {
  decision: 'READY_TO_BOOK' | 'RECONFIRMATION_REQUIRED' | 'NOT_BOOKABLE';
  prebookingId: string | null;
  offer: UnifyOffer | null;
  changes: string[];
}

export async function prebook(hotelId: string, bookingToken: string): Promise<UnifyPrebook> {
  const r = await usCall<any>('/hotels/prebook', { method: 'POST', body: { hotel_id: hotelId, booking_token: bookingToken }, timeoutMs: 45_000 });
  const d = r?.data ?? {};
  return {
    decision: d.revalidation?.decision ?? (d.prebooking_id ? 'READY_TO_BOOK' : 'NOT_BOOKABLE'),
    prebookingId: d.prebooking_id ?? null,
    offer: d.offer ? normalizeOffer(d.offer) : null,
    changes: (d.revalidation?.changes ?? []).map((c: any) => String(c.description ?? c.code)).filter(Boolean),
  };
}

export interface UnifyGuest { type: 'ADULT' | 'CHILD' | 'INFANT'; lead: boolean; answers: Array<{ requirementId: string; value: string }> }

export interface UnifyStatus {
  bookingId: string;
  status: UnifyBookingStatus;
  isTerminal: boolean;
  providerReference: string | null;
  hotelConfirmationNumber: string | null;
  hotelPhone: string | null;
  canCancel: boolean;
  nextPollMs: number | null;
  reason: string | null;
  message?: string;
}

const toStatus = (r: any): UnifyStatus => {
  const d = r?.data ?? {};
  return {
    bookingId: String(d.booking_id ?? ''), status: d.status, isTerminal: !!d.is_terminal,
    providerReference: d.provider?.booking_id ?? d.provider?.booking_code ?? null,
    hotelConfirmationNumber: d.provider?.hotel_confirmation_number ?? null,
    hotelPhone: d.provider?.hotel_contact_phone ?? null,
    canCancel: (d.available_actions ?? []).includes('CANCEL'),
    nextPollMs: d.next_poll_after_ms ?? null, reason: d.processing_reason ?? null, message: r?.message,
  };
};

/** Create the booking. Same key + same body is safe to resend after a timeout. */
export async function createBooking(args: {
  idempotencyKey: string; prebookingId: string; offerId: string; endUserIp?: string;
  rooms: Array<{ allocationId: string; guests: UnifyGuest[] }>;
}): Promise<UnifyStatus> {
  const body = {
    prebooking_id: args.prebookingId, accepted_offer_id: args.offerId, booking_mode: 'INSTANT',
    rooms: args.rooms.map((room, ri) => ({
      room_allocation_id: room.allocationId,
      guests: room.guests.map((g, gi) => ({
        guest_id: `r${ri + 1}g${gi + 1}`, guest_type: g.type, is_lead_guest: g.lead,
        answers: g.answers.map((a) => ({ requirement_id: a.requirementId, value: a.value })),
      })),
    })),
  };
  return toStatus(await usCall<any>('/hotels/book', {
    method: 'POST', body, timeoutMs: 60_000,
    headers: { 'Idempotency-Key': args.idempotencyKey, ...(args.endUserIp ? { 'X-Unifystays-End-User-IP': args.endUserIp } : {}) },
  }));
}

export const bookingStatus = async (bookingId: string) => toStatus(await usCall<any>(`/hotels/book/${encodeURIComponent(bookingId)}`));

/** The booking a key created, when a create call's answer was lost. */
export async function bookingByIdempotencyKey(key: string): Promise<UnifyStatus | null> {
  try { return toStatus(await usCall<any>('/hotels/book/by-idempotency-key', { headers: { 'Idempotency-Key': key } })); }
  catch (e: any) { if (e?.status === 404) return null; throw e; }
}

/** Poll until a final state or the deadline, honouring the API's own pacing. */
export async function waitForBooking(bookingId: string, deadlineMs: number): Promise<UnifyStatus> {
  let s = await bookingStatus(bookingId);
  while (!s.isTerminal && s.status !== 'AWAITING_REVIEW' && Date.now() < deadlineMs) {
    await new Promise((r) => setTimeout(r, Math.min(Math.max(s.nextPollMs ?? 3_000, 2_000), 8_000)));
    s = await bookingStatus(bookingId);
  }
  return s;
}

export async function bookingDetails(bookingId: string): Promise<any> {
  return (await usCall<any>(`/hotels/book/${encodeURIComponent(bookingId)}/details`))?.data ?? null;
}

export interface UnifyCancelQuote { quoteId: string; cancellable: boolean; penaltyPaise: number | null; penaltyStatus: string; policyText?: string }

export async function cancellationQuote(bookingId: string): Promise<UnifyCancelQuote> {
  const d = (await usCall<any>(`/hotels/book/${encodeURIComponent(bookingId)}/cancellation-quote`, { method: 'POST' }))?.data ?? {};
  return {
    quoteId: String(d.quote_id ?? ''), cancellable: !!d.cancellable, penaltyStatus: String(d.penalty_status ?? 'UNKNOWN'),
    // UNKNOWN is never zero.
    penaltyPaise: d.penalty_status === 'UNKNOWN' ? null : inrPaise(d.display_penalty) ?? inrPaise(d.penalty),
    policyText: d.cancellation?.policy_text ?? undefined,
  };
}

export async function cancelBooking(bookingId: string, quoteId: string, idempotencyKey: string): Promise<UnifyStatus> {
  return toStatus(await usCall<any>(`/hotels/book/${encodeURIComponent(bookingId)}/cancel`, {
    method: 'POST', body: { cancellation_quote_id: quoteId }, timeoutMs: 45_000, headers: { 'Idempotency-Key': idempotencyKey },
  }));
}
