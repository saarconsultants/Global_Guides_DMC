'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * A native <select> that submits its parent <form> as soon as the value
 * changes. Lets a plain GET filter form (rendered by a server component) work
 * without a separate "Filter" button.
 */
export function AutoSubmitSelect({ className, onChange, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      onChange={(e) => {
        onChange?.(e);
        e.currentTarget.form?.requestSubmit();
      }}
      className={cn('control', className)}
    />
  );
}
