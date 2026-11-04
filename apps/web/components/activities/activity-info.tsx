'use client';
import { useEffect, useState } from 'react';
import { useMoney } from '@/components/providers/currency-provider';
import { Spinner } from '@/components/ui/spinner';
import { cancellationRulesText } from '@/lib/activities/format';
import type { Activity, ActivityOptionChoice } from '@/lib/itinerary/types';

interface Info {
  description?: string; included: string[]; excluded: string[]; knowBeforeYouGo?: string;
  operatingHours: Array<{ day: number; start: string; end: string; closed: boolean }>;
  blackoutDates: string[]; validFrom?: string; validTo?: string; productCode?: string;
  address?: string; pickupIncluded?: boolean; images: string[]; policies: string[];
  highlights: string[]; ticketUsage?: string; meetingPoint?: string; meetingInstructions?: string;
  options: Array<{ id: number; name: string; minTravellers?: number; maxTravellers?: number; terms?: string; howToUse?: string; included: string[]; excluded: string[]; eligibility: string[]; voucherType?: string }>;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div><p className="label mb-1.5">{title}</p><div className="text-sm text-ink leading-relaxed">{children}</div></div>;
}
const Paragraphs = ({ text }: { text: string }) => <p className="whitespace-pre-line max-w-[70ch]">{text}</p>;
const List = ({ items }: { items: string[] }) => <ul className="list-disc pl-5 space-y-0.5">{items.map((x) => <li key={x}>{x}</li>)}</ul>;

function ticketLabel(t: ActivityOptionChoice['tickets'][number]) {
  const range = t.rangeFrom !== null && t.rangeTo !== null && !t.name.includes(String(t.rangeTo)) ? ` (${t.rangeFrom}–${t.rangeTo})` : '';
  return `${t.name}${range}`;
}

const nice = (v: string) => { const t = v.replace(/_/g, ' ').replace(/\bqr\b/i, 'QR'); return t.charAt(0).toUpperCase() + t.slice(1); };

interface Availability { available: boolean; capacity?: number | null; questions?: string[]; times: Array<{ start: string; available: boolean; seatsLeft: number | null }> }

/** Places and start times for one option on the searched date. */
function OptionAvailability({ activityId, option, date }: { activityId: number; option: ActivityOptionChoice; date: string }) {
  const [av, setAv] = useState<Availability | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/api/activity-times', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activityId, optionId: option.optionId, ticketId: option.ticketId, quantity: option.quantity, lines: option.lines, date }) })
      .then((r) => r.json()).then((r) => { if (live && r.ok) setAv({ available: !!r.available, capacity: r.capacity, questions: r.questions, times: r.times ?? [] }); }).catch(() => {});
    return () => { live = false; };
  }, [activityId, option.optionId, option.ticketId, option.quantity, option.lines, date]);
  if (!av) return null;
  const day = new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  const open = av.times.filter((t) => t.available);
  return (
    <div className="mt-1 text-xs">
      {!av.available ? <p className="font-semibold text-danger-500">Sold out on {day}</p>
        : av.times.length > 0 ? <p className="text-ink">{day}: {open.length ? open.slice(0, 10).map((t) => `${t.start}${t.seatsLeft !== null ? ` (${t.seatsLeft} left)` : ''}`).join(', ') : 'no start times left'}{open.length > 10 ? ` and ${open.length - 10} more` : ''}</p>
        : <p className="text-ink">Available on {day}{av.capacity ? ` · ${av.capacity} places left` : ''}</p>}
      {av.questions && av.questions.length > 0 && <p className="text-[rgb(var(--text-secondary))]">Supplier asks for: {av.questions.join(', ')}</p>}
    </div>
  );
}

/** The option list. With `onChoose` an agent can switch option; without it, it reads as a price list. */
export function ActivityOptions({ a, chosenOptionId, onChoose, date }: { a: Activity; chosenOptionId?: number; onChoose?: (o: ActivityOptionChoice) => void; date?: string }) {
  const money = useMoney();
  const options = a.options ?? [];
  if (options.length === 0) return null;
  return (
    <div>
      <p className="label mb-2">{options.length} option{options.length !== 1 ? 's' : ''}</p>
      <div className="space-y-2">
        {options.map((o) => {
          const active = o.optionId === chosenOptionId;
          const Body = (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-ink">{o.name}</p>
                {o.description && o.description !== o.name && <p className="mt-0.5 text-xs text-[rgb(var(--text-secondary))] line-clamp-2">{o.description}</p>}
                <p className="mt-1 text-xs text-[rgb(var(--text-secondary))]">
                  {o.tickets.map((t) => `${ticketLabel(t)}: ${money(t.unitPaise)}`).join(' · ')}
                </p>
                <p className="mt-1 text-xs text-[rgb(var(--text-secondary))]">
                  {[o.instantConfirmation ? 'Instant confirmation' : 'Confirmed by supplier', o.voucherType && `${nice(o.voucherType)} voucher`, o.capacity ? `Up to ${o.capacity} guests` : null, o.freeCancellation ? 'Free cancellation' : 'Non-refundable', o.bookingType === 'date_time_required' ? 'Pick a start time' : o.bookingType === 'open_dated' ? 'Open date' : null].filter(Boolean).join(' · ')}
                </p>
                {!o.freeCancellation && cancellationRulesText(o.cancellationRules) && cancellationRulesText(o.cancellationRules) !== 'Non-refundable' && <p className="mt-1 text-xs text-[rgb(var(--text-secondary))]">Cancellation: {cancellationRulesText(o.cancellationRules)}</p>}
                {date && o.bookingType !== 'open_dated' && a.leamigo && <OptionAvailability activityId={a.leamigo.activityId} option={o} date={date} />}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="money text-[15px] text-ink">{money(o.pricePaise)}</p>
                <p className="text-[11px] text-[rgb(var(--text-secondary))] tnum">{o.lines.map((l) => `${l.quantity} × ${l.name}`).join(', ')}</p>
              </div>
            </div>
          );
          return onChoose ? (
            <button key={o.optionId} type="button" aria-pressed={active} onClick={() => onChoose(o)}
              className={`block w-full text-left rounded-md border p-3 transition-colors ${active ? 'border-crimson-500 bg-crimson-50/40' : 'border-border-subtle hover:border-crimson-300'}`}>{Body}</button>
          ) : (
            <div key={o.optionId} className="rounded-md border border-border-subtle p-3">{Body}</div>
          );
        })}
      </div>
    </div>
  );
}

/** Everything else the supplier publishes, fetched when the details open. */
export function ActivityInfo({ a, chosenOptionId }: { a: Activity; chosenOptionId?: number }) {
  const activityId = a.leamigo?.activityId ?? a.listOnly?.activityId;
  const [info, setInfo] = useState<Info | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!activityId) return;
    let live = true;
    setState('loading');
    fetch(`/api/activity-info?id=${activityId}`).then((r) => r.json())
      .then((r) => { if (!live) return; if (r.ok) { setInfo(r.info); setState('ready'); } else setState('error'); })
      .catch(() => { if (live) setState('error'); });
    return () => { live = false; };
  }, [activityId]);

  if (!activityId) return null;
  if (state === 'loading') return <p className="text-sm text-[rgb(var(--text-secondary))]"><Spinner size="sm" className="inline mr-2" />Loading full details…</p>;
  if (state === 'error' || !info) return <p role="status" className="text-sm text-[rgb(var(--text-secondary))]">Full details couldn&apos;t load. Reopen this activity to try again.</p>;

  const opt = info.options.find((o) => o.id === chosenOptionId) ?? info.options[0];
  const included = [...new Set([...info.included, ...(opt?.included ?? [])])];
  const excluded = [...new Set([...info.excluded, ...(opt?.excluded ?? [])])];
  const open = info.operatingHours.filter((h) => !h.closed);
  const extraImages = info.images.filter((src) => src !== a.thumb);
  const otherSizes = info.options.filter((x) => !a.options?.some((c) => c.optionId === x.id));

  return (
    <div className="space-y-4">
      {otherSizes.length > 0 && (
        <Section title="Other options, for different group sizes">
          <ul className="space-y-0.5">{otherSizes.map((x) => <li key={x.id}>{x.name}<span className="text-[rgb(var(--text-secondary))] tnum">{Number.isFinite(x.minTravellers) && x.maxTravellers ? ` · ${x.minTravellers}–${x.maxTravellers} travellers` : ''}</span></li>)}</ul>
        </Section>
      )}
      {info.description && <Section title="About this experience"><Paragraphs text={info.description} /></Section>}
      {info.highlights.length > 0 && <Section title="Highlights"><List items={info.highlights} /></Section>}
      {included.length > 0 && <Section title="Included"><List items={included} /></Section>}
      {excluded.length > 0 && <Section title="Not included"><List items={excluded} /></Section>}
      {opt?.eligibility.length ? <Section title="Who can join"><List items={opt.eligibility} /></Section> : null}
      {opt?.howToUse && <Section title="How to use"><Paragraphs text={opt.howToUse} /></Section>}
      {info.ticketUsage && <Section title="Using the ticket"><Paragraphs text={info.ticketUsage} /></Section>}
      {info.knowBeforeYouGo && <Section title="Know before you go"><Paragraphs text={info.knowBeforeYouGo} /></Section>}
      {open.length > 0 && (
        <Section title="Opening hours">
          <ul className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-0.5 tnum">{open.map((h) => <li key={h.day}>{DAYS[h.day]} {h.start}–{h.end}</li>)}</ul>
        </Section>
      )}
      {(info.address || info.pickupIncluded !== undefined) && (
        <Section title="Where">
          {info.address}{info.pickupIncluded !== undefined && <span className="block text-xs text-[rgb(var(--text-secondary))] mt-0.5">{info.pickupIncluded ? 'Pickup included' : 'Pickup not included'}</span>}
        </Section>
      )}
      {(info.meetingPoint || info.meetingInstructions) && (
        <Section title="Meeting point">{info.meetingPoint}{info.meetingInstructions && <span className="block text-xs text-[rgb(var(--text-secondary))] mt-0.5">{info.meetingInstructions}</span>}</Section>
      )}
      {info.blackoutDates.length > 0 && <Section title="Not available on"><p className="font-mono text-xs">{info.blackoutDates.join(', ')}</p></Section>}
      {opt?.terms && <Section title="Terms and conditions"><Paragraphs text={opt.terms} /></Section>}
      {info.policies.length > 0 && <Section title="Policies"><List items={info.policies} /></Section>}
      {extraImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {extraImages.map((src) => <img key={src} src={src} alt="" loading="lazy" className="w-full h-28 rounded-md object-cover bg-navy-50" />)}
        </div>
      )}
      {(info.productCode || info.validTo) && (
        <p className="text-xs text-[rgb(var(--text-tertiary))] tnum">
          {[a.supplierName && `Operator: ${a.supplierName}`, info.productCode && `Product ${info.productCode}`, info.validTo && `Valid until ${info.validTo}`].filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  );
}
