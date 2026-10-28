'use client';
import { useRef } from 'react';

function submitForm(el: HTMLElement | null) {
  const form = (el as HTMLInputElement | null)?.form;
  if (form) form.requestSubmit();
}

export function AutoSubmitSelect({
  name, defaultValue, options, className, ariaLabel,
}: { name: string; defaultValue: string; options: (string | { value: string; label: string })[]; className?: string; ariaLabel?: string }) {
  return (
    <select
      name={name}
      aria-label={ariaLabel ?? name}
      defaultValue={defaultValue}
      className={className ?? 'h-9 rounded-md border border-border bg-surface px-2 text-[13px] font-medium text-ink'}
      onChange={(e) => submitForm(e.currentTarget)}
    >
      {options.map((p) => {
        const o = typeof p === 'string' ? { value: p, label: p } : p;
        return <option key={o.value} value={o.value}>{o.label}</option>;
      })}
    </select>
  );
}

export function AutoSubmitNumber({
  name, defaultValue, step, className, placeholder, ariaLabel,
}: { name: string; defaultValue: string | number | null; step?: string; className?: string; placeholder?: string; ariaLabel?: string }) {
  const last = useRef<string>(String(defaultValue ?? ''));
  return (
    <input
      name={name}
      aria-label={ariaLabel ?? placeholder ?? name}
      type="number"
      defaultValue={defaultValue ?? ''}
      step={step}
      placeholder={placeholder}
      className={className ?? 'money h-9 w-20 rounded-md border border-border bg-surface px-2 text-[14px] text-ink text-right'}
      onBlur={(e) => {
        if (e.currentTarget.value !== last.current) {
          last.current = e.currentTarget.value;
          submitForm(e.currentTarget);
        }
      }}
    />
  );
}
