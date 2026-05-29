import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors ease-standard duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
  {
    variants: {
      variant: {
        // PLATFORM-BRAND primary — deep crimson + white text.
        primary: 'bg-crimson-900 text-white hover:bg-crimson-700 active:bg-crimson-500 shadow-sm',
        // High-emphasis accent — vibrant amber with crimson text. Use sparingly (KPI hero / sales CTA).
        accent:  'bg-amber-500 text-crimson-900 hover:bg-amber-300 hover:text-crimson-900 shadow-sm',
        // Neutrals
        secondary: 'bg-surface-2 text-navy-900 hover:bg-navy-50 border border-border',
        outline:   'bg-transparent text-crimson-900 border border-crimson-900 hover:bg-crimson-50',
        ghost:     'bg-transparent text-navy-700 hover:bg-navy-50',
        destructive: 'bg-danger-500 text-white hover:bg-danger-500/90',
        // Legacy alias — kept so older "brick" call-outs keep working but now matches brand.
        brick: 'bg-crimson-700 text-white hover:bg-crimson-900',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  ),
);
Button.displayName = 'Button';
