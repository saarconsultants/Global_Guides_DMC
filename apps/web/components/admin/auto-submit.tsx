'use client';
import { useRef } from 'react';

function submitForm(el: HTMLElement | null) {
  const form = (el as HTMLInputElement | null)?.form;
  if (form) form.requestSubmit();
}

export function AutoSubmitSelect({
  name, defaultValue, options, className,
}: { name: string; defaultValue: string; options: string[]; className?: string }) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className={className ?? 'h-8 rounded-sm border border-border bg-surface px-2 text-xs font-mono'}
      onChange={(e) => submitForm(e.currentTarget)}
    >
      {options.map((p) => <option key={p}>{p}</option>)}
    </select>
  );
}

export function AutoSubmitNumber({
  name, defaultValue, step, className, placeholder,
}: { name: string; defaultValue: string | number | null; step?: string; className?: string; placeholder?: string }) {
  const last = useRef<string>(String(defaultValue ?? ''));
  return (
    <input
      name={name}
      type="number"
      defaultValue={defaultValue ?? ''}
      step={step}
      placeholder={placeholder}
      className={className ?? 'h-8 w-20 rounded-sm border border-border bg-surface px-2 text-xs font-mono text-right'}
      onBlur={(e) => {
        if (e.currentTarget.value !== last.current) {
          last.current = e.currentTarget.value;
          submitForm(e.currentTarget);
        }
      }}
    />
  );
}
