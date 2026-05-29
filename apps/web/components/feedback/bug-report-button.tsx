'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { Bug, Check } from 'lucide-react';

type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKER';
type Category = 'BUG' | 'UX' | 'DATA' | 'PERFORMANCE' | 'FEATURE_REQUEST' | 'OTHER';

const SEVERITIES: { v: Severity; label: string; hint: string }[] = [
  { v: 'LOW',     label: 'Low',     hint: 'cosmetic / nice-to-fix' },
  { v: 'MEDIUM',  label: 'Medium',  hint: 'annoying but I can work around it' },
  { v: 'HIGH',    label: 'High',    hint: 'blocks me from finishing a flow' },
  { v: 'BLOCKER', label: 'Blocker', hint: 'platform unusable for me right now' },
];

const CATEGORIES: { v: Category; label: string }[] = [
  { v: 'BUG',             label: 'Bug — something is broken' },
  { v: 'UX',              label: 'UX — confusing or hard to use' },
  { v: 'DATA',            label: 'Data — wrong info shown' },
  { v: 'PERFORMANCE',     label: 'Performance — too slow' },
  { v: 'FEATURE_REQUEST', label: 'Feature request' },
  { v: 'OTHER',           label: 'Other' },
];

export function BugReportButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [severity, setSeverity] = useState<Severity>('MEDIUM');
  const [category, setCategory] = useState<Category>('BUG');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    // Keyboard shortcut: Cmd/Ctrl + Shift + B
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function reset() {
    setOpen(false);
    setTimeout(() => { setBusy(false); setDone(false); setTitle(''); setBody(''); setSeverity('MEDIUM'); setCategory('BUG'); }, 300);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          severity, category, title, body,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        toast.error('Could not send report', j.error ?? 'Server error — try again');
        setBusy(false);
        return;
      }
      setDone(true);
      toast.success('Report sent', 'Thanks — the team will take a look.');
    } catch {
      toast.error('Network error', 'Please try again in a moment.');
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-navy-900 text-white text-sm font-semibold shadow-lg hover:bg-crimson-900 transition-colors"
        title="Report an issue (⌘⇧B)"
        aria-label="Report an issue"
      >
        <Bug className="w-4 h-4" />Report
      </button>

      <Dialog open={open} onClose={reset} title={done ? 'Report sent' : 'Report an issue'} size="md">
        {done ? (
          <div className="space-y-3 py-3 text-center">
            <div className="mx-auto w-10 h-10 rounded-full bg-success-100 text-success-500 inline-flex items-center justify-center">
              <Check className="w-5 h-5" />
            </div>
            <p className="text-sm text-[rgb(var(--text-primary))]">Thanks — saved to the bug log. The platform team triages every Monday & Thursday.</p>
            <Button variant="ghost" onClick={reset}>Close</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-xs text-[rgb(var(--text-secondary))]">
              You're on <span className="font-mono">{pathname}</span> — we'll capture the URL, your browser, and screen size automatically so you don't have to.
            </p>

            <div>
              <Label>Severity</Label>
              <div className="grid grid-cols-4 gap-2">
                {SEVERITIES.map((s) => (
                  <button type="button" key={s.v} onClick={() => setSeverity(s.v)}
                    className={`h-auto py-2 px-2 rounded-md border text-xs font-semibold transition-colors ${severity === s.v ? 'border-crimson-700 bg-crimson-50 text-crimson-900' : 'border-border bg-surface text-navy-700 hover:bg-surface-2'}`}
                    title={s.hint}>{s.label}</button>
                ))}
              </div>
            </div>

            <div>
              <Label>Category</Label>
              <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
                {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
              </select>
            </div>

            <div>
              <Label required>One-line summary</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 'Save proposal button does nothing on iPad'" maxLength={200} required />
            </div>

            <div>
              <Label required>What happened (step-by-step)</Label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm" placeholder="1. I went to ...&#10;2. I clicked ...&#10;3. I expected ... but instead ..." maxLength={4000} required />
              <p className="text-[10px] text-[rgb(var(--text-tertiary))] mt-1">Screenshots? Drop them in WhatsApp afterwards — we'll match them by timestamp.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={reset}>Cancel</Button>
              <Button type="submit" disabled={busy || !title.trim() || !body.trim()} className="gap-2">
                {busy ? <><Spinner size="sm" className="text-white" />Sending…</> : 'Send report'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
