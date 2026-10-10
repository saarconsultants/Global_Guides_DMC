import { MessageCircle } from 'lucide-react';

const SUPPORT_WHATSAPP = '918378073375';

/**
 * Seats on group departures are held by our team on request, so this opens a
 * WhatsApp chat with the departure details already written out.
 */
export function BlockSeatsButton({ code, dest, date }: { code: string; dest: string; date: string }) {
  const text = `Hi, I'd like to request seats on the group departure ${code} (${dest}, ${date}). Number of travellers: `;
  return (
    <a
      href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-md text-[13px] font-bold bg-surface text-ink border border-border hover:border-border-strong hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-500 focus-visible:ring-offset-2"
    >
      <MessageCircle className="w-4 h-4 text-[#25D366]" aria-hidden />Request seats
    </a>
  );
}
