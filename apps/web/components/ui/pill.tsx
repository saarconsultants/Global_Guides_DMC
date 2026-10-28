import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

/**
 * Status cell: fixed caps, letterspaced, small radius — the pass's BOARDING / GATE cell.
 *
 * Colour semantics (DESIGN.md — one meaning per colour, used the same way on every screen):
 *   neutral  grey      default / inactive / draft / closed — anything with no urgency
 *   success  green     done and good: confirmed, accepted, paid, active
 *   warning  amber wash needs attention or is a sample/estimate: pending review, sample rate, expiring
 *   danger   red       failed, rejected, cancelled, overdue
 *   info     blue      informational, in progress: sent, viewed, new
 *   live     solid amber — ONLY for something live or waiting right now (live rate, unattended count).
 *                        Never decoration. A screen with nothing urgent has no `live` pill.
 *   ink      solid ink  a neutral badge that must stand out on white (e.g. a code tag)
 *
 * Deprecated alias (kept so existing pages compile):
 *   gold → renders as the amber wash (`warning` look) so decorative region/total tags stop
 *          spending the live-amber voice. Use `neutral` or `ink` for labels, `live` for live things.
 */
const pillVariants = cva('inline-flex items-center gap-1 rounded-[5px] px-2 py-[3px] text-[10.5px] font-bold uppercase tracking-[0.1em] whitespace-nowrap leading-none', {
  variants: {
    variant: {
      neutral: 'bg-navy-100 text-navy-700',
      success: 'bg-success-100 text-success-600',
      warning: 'bg-amber-100 text-amber-900',
      danger: 'bg-danger-100 text-danger-500',
      info: 'bg-action-100 text-action-600',
      live: 'bg-amber-500 text-ink',
      ink: 'bg-ink text-white',
      /** @deprecated decorative amber; renders as the amber-wash `warning` look. */
      gold: 'bg-amber-100 text-amber-900',
    },
  },
  defaultVariants: { variant: 'neutral' },
});

export type PillVariant = NonNullable<VariantProps<typeof pillVariants>['variant']>;

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof pillVariants> {}

export function Pill({ className, variant, ...props }: PillProps) {
  return <span className={cn(pillVariants({ variant }), className)} {...props} />;
}

export { pillVariants };
