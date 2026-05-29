import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface Props {
  step: 1 | 2 | 3;
  steps?: string[];
}

export function Stepper({ step, steps = ['Your Trip Details', 'Customize Your Trip', 'Save & Send'] }: Props) {
  return (
    <ol className="flex items-center gap-4 text-sm">
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = idx < step;
        const current = idx === step;
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold',
                done && 'bg-success-500 text-white',
                current && 'bg-crimson-900 text-white',
                !done && !current && 'bg-surface-2 text-[rgb(var(--text-tertiary))] border border-border',
              )}
            >
              {done ? <Check className="w-3.5 h-3.5" /> : idx}
            </span>
            <span className={cn('font-medium', current ? 'text-navy-900' : 'text-[rgb(var(--text-secondary))]')}>{label}</span>
            {idx < steps.length && <span className="hidden md:block w-12 h-px bg-border-subtle mx-2" />}
          </li>
        );
      })}
    </ol>
  );
}
