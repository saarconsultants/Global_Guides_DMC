import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<InputProps extends never ? never : HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-11 w-full rounded-md border border-border bg-surface px-3.5 text-[15px] font-medium text-ink tnum',
      'placeholder:text-[rgb(var(--text-tertiary))] placeholder:font-normal',
      'transition-colors duration-150 ease-standard hover:border-border-strong',
      'focus:border-crimson-700 focus:outline-none focus:ring-2 focus:ring-crimson-700/15',
      'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:hover:border-border',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

/** Field label in the pass vocabulary: caps, letterspaced, quiet. */
export function Label({ children, htmlFor, required, className }: { children: React.ReactNode; htmlFor?: string; required?: boolean; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cn('label block mb-1.5', className)}>
      {children}{required && <span className="text-crimson-700 ml-0.5">*</span>}
    </label>
  );
}
