'use client';
import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WidgetSnippet({ slug, origin }: { slug: string; origin: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const url = `${origin}/widget/${slug}`;
  const iframe = `<iframe src="${url}" style="border:0;width:100%;max-width:480px;height:640px" loading="lazy" title="Plan your trip"></iframe>`;
  const link = url;

  function copy(label: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-secondary))]">Embed on your website (iframe)</label>
          <button onClick={() => copy('iframe', iframe)} className="inline-flex items-center gap-1 text-xs text-crimson-700 hover:underline">
            {copied === 'iframe' ? <><Check className="w-3 h-3" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
          </button>
        </div>
        <pre className="text-xs font-mono bg-surface-2 border border-border-subtle rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all text-navy-900">{iframe}</pre>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-secondary))]">Direct link (share on WhatsApp, bio, etc.)</label>
          <button onClick={() => copy('link', link)} className="inline-flex items-center gap-1 text-xs text-crimson-700 hover:underline">
            {copied === 'link' ? <><Check className="w-3 h-3" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
          </button>
        </div>
        <pre className="text-xs font-mono bg-surface-2 border border-border-subtle rounded-md p-3 overflow-x-auto text-navy-900">{link}</pre>
      </div>

      <div className="flex justify-end">
        <a href={link} target="_blank" rel="noreferrer" className="inline-flex"><Button variant="secondary" className="gap-1.5"><ExternalLink className="w-4 h-4" />Preview widget</Button></a>
      </div>
    </div>
  );
}
