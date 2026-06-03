'use client';
import { useState } from 'react';
import { summarize } from '@/lib/text';

interface Props {
  text: string;
  maxChars?: number;
  className?: string;
}

// Shows a concise summary by default with a Read more / Read less toggle.
export function ExpandableText({ text, maxChars = 320, className }: Props) {
  const [open, setOpen] = useState(false);
  const { short, truncated } = summarize(text, maxChars);
  return (
    <div className={className}>
      <p className="whitespace-pre-line leading-relaxed">{open || !truncated ? text : short}</p>
      {truncated && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-1.5 text-xs font-semibold text-crimson-700 hover:underline"
        >
          {open ? 'Show less' : 'Read full description'}
        </button>
      )}
    </div>
  );
}
