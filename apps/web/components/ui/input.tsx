'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Field — pairs a <Label> with its control so screen readers announce the
 * label. Inside a <Field>, <Label> gets `htmlFor` and <Input> gets `id`
 * automatically (shared React useId). For native <select>/<textarea>, read
 * the id with `useFieldId()` or pass `id` yourself.
 *
 *   <Field><Label>Email</Label><Input type="email" /></Field>
 */
const FieldContext = React.createContext<string | null>(null);

export function Field({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  const auto = React.useId();
  return (
    <FieldContext.Provider value={id ?? auto}>
      <div className={className}>{children}</div>
    </FieldContext.Provider>
  );
}

export function useFieldId() {
  return React.useContext(FieldContext);
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<InputProps extends never ? never : HTMLInputElement, InputProps>(({ className, id, ...props }, ref) => {
  const fieldId = React.useContext(FieldContext);
  return (
    <input
      ref={ref}
      id={id ?? fieldId ?? undefined}
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
  );
});
Input.displayName = 'Input';

const CONTROL = 'input:not([type="hidden"]), select, textarea';

function isUnlabelled(el: Element): el is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  const c = el as HTMLInputElement;
  return (!c.labels || c.labels.length === 0) && !c.hasAttribute('aria-label') && !c.hasAttribute('aria-labelledby');
}

/** First unlabelled form control that follows `start` in document order,
 *  searching its following siblings, then its parent's, up to 3 levels. */
function findControlAfter(start: Element): HTMLElement | null {
  let node: Element | null = start;
  for (let level = 0; node && level < 3; level++) {
    for (let sib = node.nextElementSibling; sib; sib = sib.nextElementSibling) {
      if (sib.tagName === 'LABEL') return null; // the next field's label — stop
      if (sib.matches(CONTROL)) return isUnlabelled(sib) ? (sib as HTMLElement) : null;
      const inner = sib.querySelector(CONTROL);
      if (inner) return isUnlabelled(inner) ? (inner as HTMLElement) : null;
    }
    node = node.parentElement;
  }
  return null;
}

/** Field label in the pass vocabulary: caps, letterspaced, quiet.
 *  Association, in order: explicit `htmlFor` → enclosing <Field> → the next
 *  unlabelled control after the label in the DOM (so legacy
 *  `<Label/><Input/>` sibling markup is still announced correctly). */
export function Label({ children, htmlFor, required, className, id }: { children: React.ReactNode; htmlFor?: string; required?: boolean; className?: string; id?: string }) {
  const fieldId = React.useContext(FieldContext);
  const autoId = React.useId();
  const ref = React.useRef<HTMLLabelElement>(null);
  const target = htmlFor ?? fieldId ?? undefined;

  React.useEffect(() => {
    const label = ref.current;
    if (!label || target) return;
    const control = findControlAfter(label);
    if (!control) return;
    if (!control.id) control.id = `f${autoId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    label.htmlFor = control.id;
  }, [target, autoId]);

  return (
    <label ref={ref} id={id} htmlFor={target} className={cn('label block mb-1.5', className)}>
      {children}{required && <span className="text-crimson-700 ml-0.5" aria-hidden>*</span>}
    </label>
  );
}
