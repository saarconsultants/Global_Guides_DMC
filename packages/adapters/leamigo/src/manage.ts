// Leamigo after-sale calls: the partner's booking list, live booking details
// (status, driver, supplier contacts, vouchers), amendments and reschedules.

import { lmCall, LeamigoError } from './client';
import type { LeamigoAmendment } from './booking';

export type LeamigoProduct = 'transfer' | 'rental' | 'activity';

const detailPath: Record<LeamigoProduct, string> = {
  transfer: '/v1/transfers/bookings/',
  rental: '/v1/transfers/rental/bookings/',
  activity: '/v1/activities/bookings/',
};

export interface LeamigoBookingRow {
  reference: string; product: string; status: string; serviceStatus?: string;
  guest: string; email?: string; phone?: string;
  amountMinor: number; currency: string; createdAt?: string;
  travelDate?: string; travelTime?: string; from?: string; to?: string;
}

/** Every booking made on this API key, across all three products. */
export async function listLeamigoBookings(): Promise<LeamigoBookingRow[]> {
  const rows: LeamigoBookingRow[] = [];
  for (let page = 1; ; page++) {
    const res = await lmCall<any>('/v1/transfers/bookings', { query: { page: String(page), limit: '100' }, timeoutMs: 15_000 });
    for (const b of res?.data ?? []) {
      const leg = b.transfer ?? b.rental ?? b.activity ?? {};
      rows.push({
        reference: String(b.booking_reference), product: String(b.product_type ?? 'transfer'), status: String(b.status ?? ''),
        serviceStatus: leg.service_status ?? b.service_status ?? undefined,
        guest: [b.first_name, b.last_name].filter(Boolean).join(' '), email: b.email ?? undefined, phone: b.contact_number ?? undefined,
        amountMinor: Number(b.supplier_payable_amount ?? 0), currency: String(b.supplier_currency ?? ''), createdAt: b.created_at ?? undefined,
        travelDate: leg.pickup_date ?? leg.visit_date ?? undefined, travelTime: leg.pickup_time ? String(leg.pickup_time).slice(0, 5) : undefined,
        from: leg.pickup_address ?? undefined, to: leg.drop_address ?? undefined,
      });
    }
    const total = Number(res?.pagination?.total_pages ?? 1);
    if (page >= total) break;
  }
  return rows;
}

export interface LeamigoBookingLive {
  status: string; serviceStatus?: string; supplierReference?: string;
  confirmationType?: string; confirmationDeadline?: string;
  driver?: { name?: string; phone?: string; vehicle?: string; color?: string; plate?: string };
  supplier?: { name?: string; phone?: string; email?: string; emergency?: string; contact247?: string; reservations?: string };
  meetingPoints: string[];
  voucherUrl?: string; voucherCodes: string[];
  flightNumber?: string; addons: string[];
  from?: string; to?: string; travelDate?: string; travelTime?: string; passengers?: number;
  vehicle?: string; hours?: number; kmsIncluded?: number;
  tickets: Array<{ name: string; quantity: number }>;
  policies: string[];
}

const text = (v: any): string => (typeof v === 'string' ? v : v?.instructions ?? v?.description ?? v?.address ?? v?.name ?? v?.title ?? '');

export async function leamigoBookingLive(product: LeamigoProduct, reference: string): Promise<LeamigoBookingLive> {
  const d = await lmCall<any>(detailPath[product] + encodeURIComponent(reference), { timeoutMs: 15_000 });
  const dr = d?.assigned_driver, sp = d?.supplier, c = sp?.contact_details;
  return {
    status: String(d?.status ?? ''), serviceStatus: d?.service_status ?? undefined, supplierReference: d?.supplier_booking_ref ?? undefined,
    confirmationType: d?.confirmation_type ?? undefined, confirmationDeadline: d?.confirmation_deadline ?? undefined,
    driver: dr?.name || dr?.phone ? { name: dr.name ?? undefined, phone: dr.phone ?? undefined, vehicle: dr.vehicle?.name ?? undefined, color: dr.vehicle?.color ?? undefined, plate: dr.vehicle?.license_plate ?? undefined } : undefined,
    supplier: sp ? { name: sp.name ?? undefined, phone: sp.phone ?? undefined, email: sp.email ?? undefined, emergency: c?.emergency_number ?? undefined, contact247: c?.contact_24_7 ?? undefined, reservations: c?.reservation_contact ?? undefined } : undefined,
    meetingPoints: (d?.meeting_points ?? []).map(text).filter(Boolean),
    voucherUrl: d?.voucher_file_url ?? undefined,
    voucherCodes: (d?.voucher_codes ?? []).map((v: any) => (typeof v === 'string' ? v : v?.code ?? '')).filter(Boolean),
    flightNumber: d?.flight_number ?? undefined,
    addons: (d?.addons ?? []).map(text).filter(Boolean),
    from: d?.route?.pickup_address ?? d?.pickup?.address ?? undefined,
    to: d?.route?.drop_address ?? undefined,
    travelDate: d?.pickup_date ?? d?.pickup?.date ?? d?.visit_date ?? undefined,
    travelTime: String(d?.pickup_time ?? d?.pickup?.time ?? d?.timeslot ?? '').slice(0, 5) || undefined,
    passengers: d?.passengers ?? d?.rental?.passengers ?? d?.total_quantity ?? undefined,
    vehicle: d?.vehicle?.category ?? undefined,
    hours: d?.rental?.charged_hours ?? undefined,
    kmsIncluded: d?.rental?.kms_included ?? undefined,
    tickets: (d?.items ?? []).map((i: any) => ({ name: String(i.ticket_name ?? ''), quantity: Number(i.quantity ?? 0) })),
    policies: [...new Set<string>((Array.isArray(d?.policies) ? d.policies : d?.policies?.policies ?? []).map((p: any) => (p?.description && p.description !== p.title ? `${p.title}: ${p.description}` : String(p?.title ?? ''))).filter(Boolean))],
  };
}

export async function amendRentalBooking(reference: string, a: LeamigoAmendment): Promise<void> {
  const body: Record<string, string> = {};
  if (a.salutation) body.salutation = a.salutation;
  if (a.firstName) body.first_name = a.firstName;
  if (a.lastName) body.last_name = a.lastName;
  if (a.email) body.email = a.email;
  if (a.phone) body.contact_number = a.phone;
  if (a.specialRequirements) body.special_requirements = a.specialRequirements;
  await lmCall<any>(`/v1/transfers/rental/bookings/${encodeURIComponent(reference)}/amend`, { method: 'PATCH', body, timeoutMs: 30_000 });
}

/** Headout products only; Leamigo answers asynchronously, so read the details afterwards. */
export async function rescheduleActivityBooking(reference: string, req: { startDateTime: string; endDateTime: string; comment?: string }): Promise<void> {
  const res = await lmCall<any>(`/v1/activities/bookings/${encodeURIComponent(reference)}/reschedule`, { method: 'POST', body: req, timeoutMs: 30_000 });
  if (res?.status === false) throw new LeamigoError(res?.message ?? 'Leamigo refused the reschedule.', 409, undefined, false);
}
