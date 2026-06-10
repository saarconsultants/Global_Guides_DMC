'use client';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { saveTemplateRedirectAction, deleteTemplateAction } from '@/app/actions/admin';
import { CityCombobox } from '@/components/ui/city-combobox';
import { findCity } from '@/lib/cities';
import { Sparkles, Eye, Save, Trash2, Plus, MapPin } from 'lucide-react';
import Link from 'next/link';

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
  const [totalNights, setTotalNights]   = useState(String(initial.totalNights ?? 7));
  const [priceRupees, setPriceRupees]   = useState(String(initial.startingPriceRupees ?? 0));
  const [blurb, setBlurb]               = useState(initial.blurb ?? '');
  const [destRows, setDestRows]         = useState<DestRow[]>(parseDestRows(initial.destinations));
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

  const setRow = (i: number, patch: Partial<DestRow>) => setDestRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRow = () => setDestRows((rs) => [...rs, { cityCode: '', nights: 2 }]);
  const removeRow = (i: number) => setDestRows((rs) => rs.filter((_, j) => j !== i));

  function validate(e: React.FormEvent<HTMLFormElement>) {
    setDestError(null);
    const rows = destRows.filter((r) => r.cityCode);
    if (rows.length === 0) { setDestError('Add at least one destination'); e.preventDefault(); return; }
    const nights = rows.reduce((s, d) => s + (Number(d.nights) || 0), 0);
    if (nights !== parseInt(totalNights, 10)) {
      if (!confirm(`Destination nights total ${nights}, but Total nights = ${totalNights}. Save anyway?`)) e.preventDefault();
    }
  }

  return (
    <form action={saveTemplateRedirectAction} onSubmit={validate} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {isEdit && <input type="hidden" name="id" value={initial.id} />}

      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-navy-900">Basics</h2>
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
                <select name="region" value={region} onChange={(e) => setRegion(e.target.value)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
                  {REGIONS.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <Label required>Category</Label>
                <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label required>Total nights</Label>
                <Input name="totalNights" type="number" min={1} max={60} value={totalNights} onChange={(e) => setTotalNights(e.target.value)} required />
              </div>
              <div>
                <Label required>Starting price (₹)</Label>
                <Input name="startingPriceRupees" type="number" min={0} step={500} value={priceRupees} onChange={(e) => setPriceRupees(e.target.value)} required />
              </div>
              <div className="sm:col-span-2">
                <Label required>One-line pitch</Label>
                <textarea name="blurb" value={blurb} onChange={(e) => setBlurb(e.target.value)} required maxLength={200} className="h-20 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm" placeholder="Paris romance, Amsterdam canals, Zurich Alps — a sampler perfect for first-timers." />
                <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">{blurb.length}/200 characters</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <h2 className="text-lg font-semibold text-navy-900 inline-flex items-center gap-2"><MapPin className="w-4 h-4 text-crimson-700" />Destinations</h2>
            <p className="text-xs text-[rgb(var(--text-secondary))]">Add the cities this trip visits and the nights in each — just like the itinerary builder. <span className="font-medium">LIVE</span> cities have real hotel &amp; activity inventory.</p>
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
              <span className="text-xs text-[rgb(var(--text-tertiary))]">{parsedDestinations.reduce((s, d) => s + (d.nights || 0), 0)} nights across {parsedDestinations.length} {parsedDestinations.length === 1 ? 'city' : 'cities'}</span>
            </div>

            {destError && <div className="rounded-md bg-danger-100 text-danger-500 px-3 py-2 text-sm">{destError}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-3">
            <details>
              <summary className="cursor-pointer text-sm font-semibold text-navy-900">Advanced JSON (daysJson, visaJson, insuranceJson)</summary>
              <div className="mt-3 space-y-3">
                <div><Label>Days</Label><textarea name="daysJson" value={daysJson} onChange={(e) => setDaysJson(e.target.value)} className="h-24 w-full rounded-sm border border-border bg-surface-2 px-3 py-2 text-xs font-mono" /></div>
                <div><Label>Visa</Label><textarea name="visaJson" value={visaJson} onChange={(e) => setVisaJson(e.target.value)} className="h-16 w-full rounded-sm border border-border bg-surface-2 px-3 py-2 text-xs font-mono" /></div>
                <div><Label>Insurance</Label><textarea name="insuranceJson" value={insuranceJson} onChange={(e) => setInsuranceJson(e.target.value)} className="h-16 w-full rounded-sm border border-border bg-surface-2 px-3 py-2 text-xs font-mono" /></div>
              </div>
            </details>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 flex items-center justify-between flex-wrap gap-3">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input name="published" type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              Published &mdash; visible in agency Suggested page
            </label>
            <div className="flex items-center gap-2">
              {isEdit && (
                <form action={deleteTemplateAction.bind(null, initial.id!)} onSubmit={(e) => { if (!confirm('Delete this template? Cannot be undone.')) e.preventDefault(); }}>
                  <Button type="submit" variant="ghost" className="text-danger-500 gap-1.5"><Trash2 className="w-4 h-4" />Delete</Button>
                </form>
              )}
              <Link href="/admin/templates"><Button type="button" variant="ghost">Cancel</Button></Link>
              <SubmitButton isEdit={isEdit} />
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="space-y-3 sticky top-24 self-start">
        <p className="text-[11px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Card preview</p>
        <Card className="lift overflow-hidden">
          <div className="relative h-32 bg-gradient-to-br from-crimson-500 to-crimson-900">
            {hero ? <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover" /> : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <div className="absolute top-3 left-3 flex gap-1.5">
              <Pill variant="gold">{region.replace('_', ' ')}</Pill>
              <Pill variant="info">{category}</Pill>
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between text-white">
              <span className="text-xs font-medium bg-black/30 backdrop-blur px-2 py-1 rounded-md">{totalNights} nights</span>
            </div>
          </div>
          <CardContent className="pt-4">
            <p className="font-semibold text-navy-900">{title || 'Template title'}</p>
            <p className="text-xs text-[rgb(var(--text-secondary))] mt-1 line-clamp-2">{blurb || 'Your one-line pitch will appear here.'}</p>
            <p className="text-xs text-[rgb(var(--text-secondary))] mt-2">{parsedDestinations.map((d) => d.cityName).filter(Boolean).join(' → ') || '—'}</p>
            <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">From</p>
                <p className="font-mono font-bold text-navy-900">₹ {Number(priceRupees).toLocaleString('en-IN')}</p>
              </div>
              <span className="text-xs text-crimson-700 font-semibold inline-flex items-center gap-1"><Sparkles className="w-3 h-3" />Use this</span>
            </div>
          </CardContent>
        </Card>
        <p className="text-xs text-[rgb(var(--text-secondary))] inline-flex items-center gap-1"><Eye className="w-3 h-3" />Live preview &mdash; updates as you type.</p>
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
