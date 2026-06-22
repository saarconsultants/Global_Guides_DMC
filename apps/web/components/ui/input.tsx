import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'h-11 w-full rounded-md border border-border bg-[#FFFDFB] px-3.5 text-sm text-[rgb(var(--text-primary))]',
      'placeholder:text-[rgb(var(--text-tertiary))]',
      'transition-colors duration-200 ease-standard hover:border-border-strong',
      'focus:border-crimson-500 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-crimson-500/20',
      'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:hover:border-border',
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
