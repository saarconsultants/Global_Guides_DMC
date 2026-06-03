import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const pillVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ring-black/[0.05] whitespace-nowrap', {
  variants: {
    variant: {
      neutral: 'bg-navy-50 text-navy-700',
      success: 'bg-success-100 text-success-500',
      warning: 'bg-warning-100 text-warning-500',
      danger: 'bg-danger-100 text-danger-500',
      info: 'bg-action-100 text-action-500',
      gold: 'bg-gold-300 text-gold-700',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof pillVariants> {}

export function Pill({ className, variant, ...props }: PillProps) {
  return <span className={cn(pillVariants({ variant }), className)} {...props} />;
}
