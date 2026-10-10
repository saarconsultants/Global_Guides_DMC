'use client';
import { Input } from '@/components/ui/input';

/** Read-only text box that selects its whole value when clicked, so it's easy to copy. */
export function SelectOnFocusInput({ value, className, ...rest }: { value: string; className?: string; 'aria-label'?: string }) {
  return <Input readOnly value={value} className={className} onFocus={(e) => e.currentTarget.select()} {...rest} />;
}
