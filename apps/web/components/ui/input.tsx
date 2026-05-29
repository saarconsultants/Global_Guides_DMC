import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-[rgb(var(--text-primary))]',
      'placeholder:text-[rgb(var(--text-tertiary))]',
      'transition-colors duration-200 ease-standard',
      'focus:border-crimson-500 focus:outline-none focus:ring-2 focus:ring-crimson-100',
      'disabled:cursor-not-allowed disabled:bg-surface-2',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export function Label({ children, htmlFor, required, className }: { children: React.ReactNode; htmlFor?: string; required?: boolean; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={`block text-sm font-medium text-[rgb(var(--text-secondary))] mb-1.5 ${className ?? ''}`}>
      {children} {required && <span className="text-danger-500">*</span>}
    </label>
  );
}
