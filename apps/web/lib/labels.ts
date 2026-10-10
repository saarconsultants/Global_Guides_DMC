// Friendly display labels for status values stored as UPPER_CASE strings
// (leads, proposals, bookings, supplier items, agencies). The stored value
// never changes; only what agents see does.

const STATUS_LABELS: Record<string, string> = {
  // Leads
  NEW: 'New',
  QUOTED: 'Quoted',
  FOLLOWUP: 'Follow-up',
  BOOKED: 'Booked',
  LOST: 'Lost',
  // Proposals
  DRAFT: 'Draft',
  SENT: 'Sent',
  VIEWED: 'Viewed',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  SUPERSEDED: 'Replaced by newer version',
  // Bookings / supplier items
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
  // Agencies
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
};

/** "FOLLOWUP" → "Follow-up". Unknown values fall back to sentence case. */
export function statusLabel(status: string | null | undefined): string {
  if (!status) return '';
  const known = STATUS_LABELS[status.toUpperCase()];
  if (known) return known;
  const words = status.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
