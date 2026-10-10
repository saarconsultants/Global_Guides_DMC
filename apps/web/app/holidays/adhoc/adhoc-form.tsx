'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Mail } from 'lucide-react';
import { Input, Label } from '@/components/ui/input';
import { Button, ButtonLink } from '@/components/ui/button';
import { submitAdhocGroupAction, type AdhocGroupState } from '@/app/actions/adhoc-group';

const initial: AdhocGroupState = { ok: false };

export function AdhocGroupForm() {
  const [state, formAction, pending] = useActionState(submitAdhocGroupAction, initial);

  if (state.ok) {
    return (
      <div className="text-center py-6 space-y-3" role="status">
        <CheckCircle2 className="w-10 h-10 mx-auto text-success-500" />
        <h2 className="text-lg font-bold text-ink">Request sent to ops</h2>
        <p className="text-sm text-[rgb(var(--text-secondary))] max-w-md mx-auto">
          We've saved this as a lead so you can track it. Our ops team will come back with net rates within 48 hours on your registered email and WhatsApp.
        </p>
        <div className="flex items-center justify-center gap-2 pt-2">
          {state.leadId && <ButtonLink href={`/leads/${state.leadId}`} size="sm">Open the lead</ButtonLink>}
          <ButtonLink href="/holidays" size="sm" variant="ghost">Back to holidays</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <fieldset disabled={pending} className="contents">
        {state.error && (
          <p role="alert" className="rounded-md bg-danger-100 border border-danger-500/30 px-3 py-2 text-sm text-danger-500 font-medium">{state.error}</p>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="adhoc-destinations" required>Destination(s)</Label>
            <Input id="adhoc-destinations" name="destinations" placeholder="Bali, Phuket, Dubai…" required />
          </div>
          <div>
            <Label htmlFor="adhoc-pax" required>Approx. group size</Label>
            <Input id="adhoc-pax" name="paxCount" type="number" min={15} max={500} placeholder="e.g. 35" required />
          </div>
        </div>
        <div>
          <Label htmlFor="adhoc-name">Client or group name</Label>
          <Input id="adhoc-name" name="groupName" placeholder="e.g. Infosys Pune offsite" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="adhoc-from">Travel from</Label>
            <Input id="adhoc-from" name="fromDate" type="date" />
          </div>
          <div>
            <Label htmlFor="adhoc-to">Travel to</Label>
            <Input id="adhoc-to" name="toDate" type="date" />
          </div>
          <div>
            <Label htmlFor="adhoc-nights">Nights</Label>
            <Input id="adhoc-nights" name="nights" type="number" min={1} max={30} placeholder="6" />
          </div>
        </div>
        <div>
          <Label htmlFor="adhoc-type">Group type</Label>
          <select id="adhoc-type" name="groupType" className="control">
            <option>Corporate offsite</option>
            <option>Wedding / family event</option>
            <option>College / school tour</option>
            <option>MICE / conference</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <Label htmlFor="adhoc-brief">Brief / special requirements</Label>
          <textarea id="adhoc-brief" name="brief" rows={4} className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm" placeholder="Dietary preferences, accessibility, must-see activities, budget per head…" />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
          <p className="text-xs text-[rgb(var(--text-secondary))]">We'll reply on your registered email and WhatsApp.</p>
          <Button type="submit" className="gap-1.5"><Mail className="w-4 h-4" />{pending ? 'Sending…' : 'Send to ops'}</Button>
        </div>
      </fieldset>
    </form>
  );
}
