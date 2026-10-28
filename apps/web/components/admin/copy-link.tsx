'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/** A link shown as plain text with a Copy button beside it. */
export function CopyLink({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the text stays selectable */
    }
  }

  return (
    <div className="flex items-stretch gap-2">
      <input
        readOnly
        value={value}
        aria-label={label}
        onFocus={(e) => e.currentTarget.select()}
        className="control min-w-0 flex-1 text-[14px] font-medium"
      />
      <button
        type="button"
        onClick={copy}
        className="shrink-0 inline-flex items-center gap-1.5 h-11 px-4 rounded-md border border-border bg-surface text-sm font-bold text-ink hover:border-border-strong transition-colors"
      >
        {copied ? <Check className="w-4 h-4 text-success-500" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <span role="status" aria-live="polite" className="sr-only">{copied ? 'Link copied' : ''}</span>
    </div>
  );
}
