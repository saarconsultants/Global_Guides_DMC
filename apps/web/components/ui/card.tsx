import * as React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Kept for compatibility — every card is a single sheet of card stock now. */
  plain?: boolean;
}

// Card stock: white sheet, hairline edge, soft offset shadow. No bezels.
export function Card({ className, plain: _plain, children, ...props }: CardProps) {
  return (
    <div className={cn('rounded-lg bg-surface border border-border-subtle shadow-sm', className)} {...props}>
      {children}
    </div>
  );
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pt-5 pb-2', className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-[17px] font-bold tracking-[-0.01em] text-ink', className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5', className)} {...props} />;
}
