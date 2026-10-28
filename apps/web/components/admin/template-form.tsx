'use client';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button, ButtonLink } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { saveTemplateRedirectAction, deleteTemplateRedirectAction } from '@/app/actions/admin';
import { CityCombobox } from '@/components/ui/city-combobox';
import { findCity } from '@/lib/cities';
import { Sparkles, Eye, Save, Trash2, Plus, MapPin, AlertTriangle, Check } from 'lucide-react';
import { statusLabel } from '@/lib/labels';
import { Disclosure } from '@/components/admin/admin-ui';

interface DestRow { cityCode: string; nights: number }
function parseDestRows(json?: string): DestRow[] {
  try {
    const arr = JSON.parse(json ?? '[]');
    if (Array.isArray(arr)) {
      const rows = arr.map((d: any) => ({ cityCode: String(d?.cityCode ?? '').toUpperCase(), nights: Number(d?.nights) || 1 })).filter((d: DestRow) => d.cityCode);
      if (rows.length) return rows;
    }
  } catch { /* fall through */ }
  return [{ cityCode: 'PAR', nights: 3 }];
}

const REGIONS    = ['EUROPE', 'SE_ASIA', 'MIDDLE_EAST', 'INDIAN_SUB', 'OCEANIA', 'AFRICA', 'AMERICAS'];
const CATEGORIES = ['LEISURE', 'HONEYMOON', 'FAMILY', 'LUXURY', 'ADVENTURE', 'GROUP'];
const REGION_LABELS: Record<string, string> = {
  EUROPE: 'Europe', SE_ASIA: 'South-East Asia', MIDDLE_EAST: 'Middle East', INDIAN_SUB: 'Indian subcontinent',
  OCEANIA: 'Oceania', AFRICA: 'Africa', AMERICAS: 'Americas',
};
const regionLabel = (r: string) => REGION_LABELS[r] ?? statusLabel(r);

export interface TemplateFormValues {
  id?: string;
  code?: string;
  title?: string;
  hero?: string | null;
  region?: string;
  category?: string;
  totalNights?: number;
  startingPriceRupees?: number;
  blurb?: string;
  destinations?: string;
  daysJson?: string;
  visaJson?: string;
  insuranceJson?: string;
  published?: boolean;
}

export function TemplateForm({ initial }: { initial: TemplateFormValues }) {
  const isEdit = !!initial.id;
  const [title, setTitle]               = useState(initial.title ?? '');
  const [code, setCode]                 = useState(initial.code ?? '');
  const [hero, setHero]                 = useState(initial.hero ?? '');
  const [region, setRegion]             = useState(initial.region ?? 'EUROPE');
  const [category, setCategory]         = useState(initial.category ?? 'LEISURE');
  const [destRows, setDestRows]         = useState<DestRow[]>(parseDestRows(initial.destinations));
  // New templates follow the destinations' nights until the admin types their own number.
  const [nightsTouched, setNightsTouched] = useState(initial.totalNights != null);
  const [totalNightsInput, setTotalNights] = useState(String(initial.totalNights ?? ''));
  const [priceRupees, setPriceRupees]   = useState(initial.startingPriceRupees != null ? String(initial.startingPriceRupees) : '');
  const [blurb, setBlurb]               = useState(initial.blurb ?? '');
  const [daysJson, setDaysJson]         = useState(initial.daysJson ?? '[]');
  const [visaJson, setVisaJson]         = useState(initial.visaJson ?? '[]');
  const [insuranceJson, setInsuranceJson] = useState(initial.insuranceJson ?? '{}');
  const [published, setPublished]       = useState(initial.published ?? true);
  const [destError, setDestError]       = useState<string | null>(null);

  // Friendly rows -> JSON for the hidden field + live preview.
  const destinationsJson = JSON.stringify(destRows.filter((r) => r.cityCode).map((r) => {
    const c = findCity(r.cityCode);
    return { cityCode: r.cityCode, cityName: c?.name ?? r.cityCode, countryCode: c?.countryCode ?? '', nights: r.nights };
  }));
  const parsedDestinations = destRows.filter((r) => r.cityCode).map((r) => ({ cityName: findCity(r.cityCode)?.name ?? r.cityCode, nights: r.nights }));
  const destNights = parsedDestinations.reduce((s, d) => s + (d.nights || 0), 0);
  const totalNights = nightsTouched ? totalNightsInput : String(destNights || '');
  const nightsMismatch = parsedDestinations.length > 0 && totalNights !== '' && parseInt(totalNights, 10) !== destNights;

  const setRow = (i: number, patch: Partial<DestRow>) => setDestRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRow = () => setDestRows((rs) => [...rs, { cityCode: '', nights: 2 }]);
  const removeRow = (i: number) => setDestRows((rs) => rs.filter((_, j) => j !== i));

  function validate(e: React.FormEvent<HTMLFormElement>) {
    setDestError(null);
    // The Delete button submits this form with its own action; don't validate for it.
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    if (submitter?.hasAttribute('data-skip-validate')) return;
    const rows = destRows.filter((r) => r.cityCode);
    if (rows.length === 0) { setDestError('Add at least one destination'); e.preventDefault(); return; }
    if (nightsMismatch) {
      if (!confirm(`The destinations add up to ${destNights} nights, but Total nights is ${totalNights}. Save anyway?`)) e.preventDefault();
    }
  }

  return (
    <form action={saveTemplateRedirectAction} onSubmit={validate} className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_360px] lg:items-start">
      {isEdit && <input type="hidden" name="id" value={initial.id} />}

      {/* display:contents on mobile so the preview can be ordered between the cards */}
      <div className="contents lg:block lg:space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-[17px] font-bold text-ink tracking-[-0.01em]">Basics</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label required>Title</Label>
                <Input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Best of Italy 9N" />
              </div>
              <div>
                <Label>Code</Label>
                <Input name="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder={isEdit ? '' : 'Auto-generated if blank'} className="font-mono" />
              </div>
              <div>
                <Label>Hero image URL</Label>
                <Input name="hero" value={hero ?? ''} onChange={(e) => setHero(e.target.value)} placeholder="https://… (optional)" />
              </div>
              <div>
                <Label required>Region</Label>
                <select name="region" value={region} onChange={(e) => setRegion(e.target.value)} className="control">
                  {REGIONS.map((r) => <option key={r} value={r}>{regionLabel(r)}</option>)}
                </select>
              </div>
              <div>
                <Label required>Category</Label>
                <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} className="control">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{statusLabel(c)}</option>)}
                </select>
              </div>
              <div>
                <Label required>Total nights</Label>
                <Input name="totalNights" type="number" min={1} max={60} value={totalNights} onChange={(e) => { setNightsTouched(true); setTotalNights(e.target.value); }} required />
                {nightsMismatch ? (
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    Destinations add up to {destNights} nights.
                    <button type="button" onClick={() => { setNightsTouched(false); setTotalNights(''); }} className="font-semibold underline underline-offset-2 hover:text-ink">Use {destNights}</button>
                  </p>
                ) : !nightsTouched ? (
                  <p className="mt-1.5 text-[12.5px] text-[rgb(var(--text-secondary))]">Follows the destinations below.</p>
                ) : null}
              </div>
              <div>
                <Label required>Starting price (₹)</Label>
                <Input name="startingPriceRupees" type="number" min={1} step={500} value={priceRupees} onChange={(e) => setPriceRupees(e.target.value)} required placeholder="e.g. 85000" className="money" />
              </div>
              <div className="sm:col-span-2">
                <Label required>One-line pitch</Label>
                <textarea name="blurb" value={blurb} onChange={(e) => setBlurb(e.target.value)} required maxLength={200} className="h-20 w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-[15px] text-ink hover:border-border-strong focus:border-crimson-700 focus:outline-none focus:ring-2 focus:ring-crimson-700/15" placeholder="Paris romance, Amsterdam canals, Zurich Alps — a sampler perfect for first-timers." />
                <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">{blurb.length}/200 characters</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <h2 className="text-[17px] font-bold text-ink tracking-[-0.01em] inline-flex items-center gap-2"><MapPin className="w-4 h-4 text-crimson-700" />Destinations</h2>
            <p className="text-xs text-[rgb(var(--text-secondary))]">Add the cities this trip visits and the nights in each, just like the itinerary builder.</p>
            <input type="hidden" name="destinations" value={destinationsJson} />

            <div className="space-y-2">
              {destRows.map((r, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1 min-w-0">
                    {i === 0 && <Label>City</Label>}
                    <CityCombobox
                      value={r.cityCode}
                      onChange={(code) => setRow(i, { cityCode: code })}
                      placeholder="Search a city…"
                      disabledCodes={destRows.filter((_, j) => j !== i).map((x) => x.cityCode)}
                    />
                  </div>
                  <div className="w-24 flex-shrink-0">
                    {i === 0 && <Label>Nights</Label>}
                    <Input type="number" min={1} max={30} value={r.nights} onChange={(e) => setRow(i, { nights: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    disabled={destRows.length === 1}
                    aria-label="Remove destination"
                    className="h-10 w-10 inline-flex items-center justify-center rounded-md text-danger-500 hover:bg-danger-100 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={addRow} className="inline-flex items-center gap-1.5 text-sm font-medium text-crimson-700 hover:underline">
                <Plus className="w-4 h-4" /> Add destination
              </button>
              <span className="text-xs text-[rgb(var(--text-tertiary))]">{destNights} nights across {parsedDestinations.length} {parsedDestinations.length === 1 ? 'city' : 'cities'}</span>
            </div>

            {destError && <div className="rounded-md bg-danger-100 text-danger-500 px-3 py-2 text-sm">{destError}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <Disclosure summary="Advanced">
              <p className="text-[12.5px] text-[rgb(var(--text-secondary))] mb-3">Day-by-day plan, visa and insurance details in raw form. Leave as they are unless you know the format.</p>
              <div className="space-y-3">
                <div><Label>Day-by-day plan</Label><textarea name="daysJson" value={daysJson} onChange={(e) => setDaysJson(e.target.value)} spellCheck={false} className="h-28 w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs font-mono" /></div>
                <div><Label>Visa</Label><textarea name="visaJson" value={visaJson} onChange={(e) => setVisaJson(e.target.value)} spellCheck={false} className="h-20 w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs font-mono" /></div>
                <div><Label>Insurance</Label><textarea name="insuranceJson" value={insuranceJson} onChange={(e) => setInsuranceJson(e.target.value)} spellCheck={false} className="h-20 w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-xs font-mono" /></div>
              </div>
            </Disclosure>
          </CardContent>
        </Card>

        {/* On mobile the preview (order-1) sits above these actions (order-2). */}
        <Card className="order-2 lg:order-none">
          <CardContent className="pt-5 flex items-center justify-between flex-wrap gap-3">
            <label className="inline-flex items-center gap-2.5 min-h-11 text-sm font-semibold text-ink cursor-pointer select-none">
              <input name="published" type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="peer sr-only" />
              <span aria-hidden className="w-5 h-5 shrink-0 rounded-[5px] border border-border-strong bg-surface inline-flex items-center justify-center text-white transition-colors peer-checked:bg-crimson-700 peer-checked:border-crimson-700 peer-focus-visible:ring-2 peer-focus-visible:ring-crimson-500 peer-focus-visible:ring-offset-2 [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100">
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </span>
              Published: agencies see it in Suggested
            </label>
            <div className="flex items-center gap-2">
              {isEdit && (
                // formAction, not a nested <form> (forms can't nest; the old inner form was dropped by the browser).
                <Button
                  type="submit"
                  formAction={deleteTemplateRedirectAction.bind(null, initial.id!)}
                  formNoValidate
                  data-skip-validate=""
                  onClick={(e) => { if (!confirm("Delete this template? This can't be undone.")) e.preventDefault(); }}
                  variant="ghost"
                  className="text-danger-500 gap-1.5"
                ><Trash2 className="w-4 h-4" />Delete</Button>
              )}
              <ButtonLink href="/admin/templates" variant="ghost">Cancel</ButtonLink>
              <SubmitButton isEdit={isEdit} />
            </div>
          </CardContent>
        </Card>
      </div>

      <aside aria-label="Card preview" className="order-1 lg:order-none space-y-3 lg:sticky lg:top-6 lg:self-start">
        <p className="label">Card preview</p>
        <Card className="overflow-hidden">
          <div className="relative h-32 bg-ink">
            {hero ? <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover" /> : null}
            <div className="absolute top-3 left-3 flex gap-1.5">
              <Pill variant="neutral">{regionLabel(region)}</Pill>
              <Pill variant="neutral">{statusLabel(category)}</Pill>
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
              <span className="text-xs font-semibold bg-ink/70 px-2 py-1 rounded-md">{totalNights || '—'} nights</span>
            </div>
          </div>
          <CardContent className="pt-4">
            <p className="font-semibold text-ink">{title || 'Template title'}</p>
            <p className="text-xs text-[rgb(var(--text-secondary))] mt-1 line-clamp-2">{blurb || 'Your one-line pitch will appear here.'}</p>
            <p className="text-xs text-[rgb(var(--text-secondary))] mt-2">{parsedDestinations.map((d) => d.cityName).filter(Boolean).join(' → ') || '—'}</p>
            <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
              <div>
                <p className="label">From</p>
                {/* INR on purpose: platform admins enter template prices in INR (the canonical currency). */}
                <p className="money text-ink">{priceRupees ? `₹${Number(priceRupees).toLocaleString('en-IN')}` : '—'}</p>
              </div>
              <span className="text-xs text-crimson-700 font-semibold inline-flex items-center gap-1"><Sparkles className="w-3 h-3" />Use this</span>
            </div>
          </CardContent>
        </Card>
        <p className="text-xs text-[rgb(var(--text-secondary))] inline-flex items-center gap-1"><Eye className="w-3 h-3" />Live preview: updates as you type.</p>
      </aside>
    </form>
  );
}

// Disables itself while the server action runs — prevents double-publish on slow saves.
function SubmitButton({ isEdit }: { isEdit: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="gap-1.5">
      <Save className="w-4 h-4" />
      {pending ? 'Saving…' : isEdit ? 'Save changes' : 'Publish template'}
    </Button>
  );
}
