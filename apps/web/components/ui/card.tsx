import * as React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Escape hatch: single-layer card (no bezel). Use for gradient-background
   * heroes and for cards containing absolutely-positioned dropdowns that must
   * overflow the card bounds.
   */
  plain?: boolean;
}

// Double-bezel card: an outer machined "tray" (warm tint + hairline) holding an
// inner surface with a top light-catch — reads as physical hardware, not a flat
// bordered box. className lands on the OUTER shell (grid spans, lift, h-full).
export function Card({ className, plain, children, ...props }: CardProps) {
  if (plain) {
    return (
      <div className={cn('rounded-xl bg-surface border border-border-subtle elevate transition-shadow', className)} {...props}>
        {children}
      </div>
    );
  }
  return (
    <div
      className={cn(
        'rounded-[1.25rem] bg-ink/[0.045] p-[5px] transition-shadow',
        'shadow-[0_1px_1px_rgba(33,28,23,0.03),0_16px_40px_-18px_rgba(33,28,23,0.16)]',
        className,
      )}
      {...props}
    >
      <div className="h-full overflow-hidden rounded-[calc(1.25rem-5px)] bg-surface ring-1 ring-ink/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        {children}
      </div>
    </div>
  );
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pt-6 pb-3', className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('font-display text-lg font-semibold tracking-tight text-ink', className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 pb-6', className)} {...props} />;
}
