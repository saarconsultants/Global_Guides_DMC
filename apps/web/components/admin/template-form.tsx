'use client';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { saveTemplateRedirectAction, deleteTemplateAction } from '@/app/actions/admin';
import { Sparkles, Eye, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';

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
  const [destinations, setDestinations] = useState(initial.destinations ?? '[\n  { "cityCode": "PAR", "cityName": "Paris", "countryCode": "FR", "nights": 3 }\n]');
  const [daysJson, setDaysJson]         = useState(initial.daysJson ?? '[]');
  const [visaJson, setVisaJson]         = useState(initial.visaJson ?? '[]');
  const [insuranceJson, setInsuranceJson] = useState(initial.insuranceJson ?? '{}');
  const [published, setPublished]       = useState(initial.published ?? true);
  const [destError, setDestError]       = useState<string | null>(null);

  // Parse destinations live for preview
  let parsedDestinations: { cityName?: string; nights?: number }[] = [];
  try { parsedDestinations = JSON.parse(destinations); if (!Array.isArray(parsedDestinations)) parsedDestinations = []; }
  catch { /* silent */ }

  function validate(e: React.FormEvent<HTMLFormElement>) {
    setDestError(null);
    try {
      const v = JSON.parse(destinations);
      if (!Array.isArray(v) || v.length === 0) { setDestError('Need at least one destination'); e.preventDefault(); return; }
      const nights = v.reduce((s: number, d: any) => s + (Number(d?.nights) || 0), 0);
      if (nights !== parseInt(totalNights, 10)) {
        if (!confirm(`Sum of destination nights = ${nights} but Total nights = ${totalNights}. Save anyway?`)) e.preventDefault();
      }
    } catch (err: any) {
      setDestError('Destinations JSON is invalid: ' + err.message);
      e.preventDefault();
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
            <h2 className="text-lg font-semibold text-navy-900">Destinations</h2>
            <p className="text-xs text-[rgb(var(--text-secondary))]">JSON array of cities. Use IATA-style city codes from the supported set (PAR, AMS, LON, ROM, ZRH, DXB, BKK, SIN, ISL, MLE).</p>
            <textarea
              name="destinations"
              value={destinations}
              onChange={(e) => setDestinations(e.target.value)}
              required
              className="h-40 w-full rounded-sm border border-border bg-surface-2 px-3 py-2 text-xs font-mono"
            />
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
              <Button type="submit" className="gap-1.5"><Save className="w-4 h-4" />{isEdit ? 'Save changes' : 'Publish template'}</Button>
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
