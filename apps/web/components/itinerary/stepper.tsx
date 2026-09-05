import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Props {
  step: 1 | 2 | 3;
  steps?: string[];
}

/** Three-step flight strip: numbered squares, the current one filled. */
export function Stepper({ step, steps = ['Trip details', 'Customise', 'Save & send'] }: Props) {
  return (
    <ol className="flex items-center gap-3 text-[13px]">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < step;
        const current = idx === step;
        return (
          <li key={label} className="flex items-center gap-2">
            <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-[5px] text-[11px] font-bold tnum', done && 'bg-success-100 text-success-600', current && 'bg-crimson-700 text-white', !done && !current && 'bg-surface border border-border text-[rgb(var(--text-tertiary))]')}>
              {done ? <Check className="w-3.5 h-3.5" /> : idx}
            </span>
            <span className={cn('font-bold whitespace-nowrap', current ? 'text-ink' : 'text-[rgb(var(--text-tertiary))] hidden sm:inline')}>{label}</span>
            {idx < steps.length && <span className="hidden md:block w-8 border-t-2 border-dashed border-border mx-1" />}
          </li>
        );
      })}
    </ol>
  );
}
