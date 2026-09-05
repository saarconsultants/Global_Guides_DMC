import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

// Status cell: fixed caps, letterspaced, small radius — the pass's BOARDING / GATE cell.
const pillVariants = cva('inline-flex items-center gap-1 rounded-[5px] px-2 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.1em] whitespace-nowrap leading-none', {
  variants: {
    variant: {
      neutral: 'bg-navy-100 text-navy-700',
      success: 'bg-success-100 text-success-600',
      warning: 'bg-amber-100 text-amber-900',
      danger: 'bg-danger-100 text-danger-500',
      info: 'bg-action-100 text-action-600',
      gold: 'bg-amber-500 text-ink',
      live: 'bg-amber-500 text-ink',
      ink: 'bg-ink text-white',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof pillVariants> {}

export function Pill({ className, variant, ...props }: PillProps) {
  return <span className={cn(pillVariants({ variant }), className)} {...props} />;
}
