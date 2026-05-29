'use client';
import { useState, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { BrandingPreview } from './branding-preview';
import { saveAgencyBrandingAction } from '@/app/actions/branding';
import { Eye, Copy } from 'lucide-react';

interface Props {
  initial: {
    name: string;
    tagline: string | null;
    logoUrl: string | null;
    primaryColor: string | null;
    accentColor: string | null;
    footerText: string | null;
    supportEmail: string | null;
    supportPhone: string | null;
    markupPct: number;
  };
}

export function BrandingForm({ initial }: Props) {
  // Controlled fields so the live preview updates as you type.
  const [name, setName] = useState(initial.name);
  const [tagline, setTagline] = useState(initial.tagline ?? '');
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? '');
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor ?? '#0369A1');
  const [accentColor, setAccentColor] = useState(initial.accentColor ?? '#C9A24A');
  const [footerText, setFooterText] = useState(initial.footerText ?? '');
  const [supportEmail, setSupportEmail] = useState(initial.supportEmail ?? '');
  const [supportPhone, setSupportPhone] = useState(initial.supportPhone ?? '');
  const [markupPct, setMarkupPct] = useState(String(initial.markupPct));
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.set('name', name); fd.set('tagline', tagline); fd.set('logoUrl', logoUrl);
    fd.set('primaryColor', primaryColor); fd.set('accentColor', accentColor);
    fd.set('footerText', footerText); fd.set('supportEmail', supportEmail); fd.set('supportPhone', supportPhone);
    fd.set('markupPct', markupPct);
    start(async () => {
      try {
        await saveAgencyBrandingAction(fd);
        toast.success('Settings saved', 'Your branding will appear on every new proposal share link.');
      } catch (e: any) {
        toast.error('Save failed', e?.message ?? 'Try again');
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-navy-900">Agency profile</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><Label required>Agency name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div><Label>Tagline</Label><Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Smarter outbound trips, faster." /></div>
              <div><Label>Support email</Label><Input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} /></div>
              <div><Label>Support phone</Label><Input value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Footer text (shown on customer proposal)</Label><Input value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Powered by Global Guides · GST 27XXXXXX" /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-navy-900">White-label branding</h2>
            <p className="text-xs text-[rgb(var(--text-secondary))]">Your logo and colours show on every customer-facing proposal page. The platform brand disappears from your customer's view.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Logo URL</Label>
                <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
                <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">Square PNG/SVG, 256×256+ recommended. File upload coming next — for now paste a URL (imgbb, Cloudinary, etc.).</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <ColorField label="Primary colour" value={primaryColor} onChange={setPrimaryColor} />
                <ColorField label="Accent colour"  value={accentColor}  onChange={setAccentColor} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-navy-900">Markup default</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label>Default markup %</Label>
                <Input value={markupPct} onChange={(e) => setMarkupPct(e.target.value)} type="number" step="0.1" min="0" max="100" />
                <p className="text-xs text-[rgb(var(--text-secondary))] mt-1">Applied automatically over net cost. You can override per proposal at save time.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => window.open('/p/preview', '_blank')} className="gap-1.5"><Eye className="w-4 h-4" />Preview as customer</Button>
          <Button type="submit" disabled={pending} className="gap-2">
            {pending ? <><Spinner size="sm" className="text-white" />Saving…</> : 'Save settings'}
          </Button>
        </div>
      </div>

      <aside className="space-y-4">
        <BrandingPreview agency={{ name, tagline, logoUrl, primaryColor, accentColor }} />
      </aside>
    </form>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 rounded border border-border cursor-pointer" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" />
        <button type="button" onClick={() => navigator.clipboard.writeText(value).then(() => toast.success('Copied', value))} className="h-10 w-10 inline-flex items-center justify-center rounded-md hover:bg-navy-50 cursor-pointer text-[rgb(var(--text-tertiary))]" aria-label="Copy hex">
          <Copy className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
