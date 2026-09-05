import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Stub geometry: firm rectangle, 10px radius, bold label. Press = 2% scale.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-bold tracking-[-0.005em] transition-[background-color,color,box-shadow,transform] duration-150 ease-standard active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-500 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
  {
    variants: {
      variant: {
        primary: 'bg-crimson-700 text-white hover:bg-crimson-900 shadow-sm',
        accent:  'bg-amber-500 text-ink hover:bg-amber-300 shadow-sm',
        secondary: 'bg-surface text-ink border border-border hover:border-border-strong hover:bg-surface-2',
        outline:   'bg-transparent text-crimson-700 border border-crimson-700 hover:bg-crimson-50',
        ghost:     'bg-transparent text-navy-700 hover:bg-navy-50 hover:text-ink',
        destructive: 'bg-danger-500 text-white hover:bg-danger-500/90',
        brick: 'bg-crimson-700 text-white hover:bg-crimson-900',
      },
      size: {
        sm: 'h-9 px-3.5 text-[13px]',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-[15px]',
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
