import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import Link from 'next/link';
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

export { buttonVariants };

/**
 * A link styled as a button. Use instead of nesting <Button> inside <Link>/<a>
 * (interactive-inside-interactive is invalid and confuses screen readers).
 * Internal hrefs go through next/link; external URLs render a plain <a>.
 */
export interface ButtonLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>,
    VariantProps<typeof buttonVariants> {
  href: string;
  external?: boolean;
}

export const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ className, variant, size, href, external, ...props }, ref) => {
    const cls = cn(buttonVariants({ variant, size }), className);
    if (external || /^(https?:|mailto:|tel:)/.test(href)) return <a ref={ref} href={href} className={cls} {...props} />;
    return <Link ref={ref} href={href as any} className={cls} {...props} />;
  },
);
ButtonLink.displayName = 'ButtonLink';
