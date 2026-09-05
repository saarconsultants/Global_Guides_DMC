'use client';
import { useState, useTransition } from 'react';
import { dismissWelcomeAction } from '@/app/actions/onboarding';
import { Sparkles, Check, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Step {
  done: boolean;
  title: string;
  body: string;
  cta: { label: string; href: string };
}

interface Props {
  firstName: string;
  steps: Step[];
}

export function WelcomeCard({ firstName, steps }: Props) {
  const [hidden, setHidden] = useState(false);
  const [pending, start] = useTransition();
  if (hidden) return null;

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = Math.round((completed / total) * 100);

  function dismiss() {
    setHidden(true);
    start(() => dismissWelcomeAction());
  }

  return (
    <div className="relative rounded-lg bg-surface border border-border-subtle shadow-sm overflow-hidden">
      <button
        type="button"
        aria-label="Dismiss welcome"
        onClick={dismiss}
        className="absolute top-3 right-3 z-10 w-8 h-8 inline-flex items-center justify-center rounded-md text-navy-500 hover:text-ink hover:bg-navy-50 transition-colors cursor-pointer"
        disabled={pending}
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col lg:flex-row">
        <div className="flex-1 min-w-0 p-5 lg:p-6">
          <h2 className="text-[20px] lg:text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-ink inline-flex items-center gap-2 pr-8">
            <Sparkles className="w-5 h-5 text-crimson-700 shrink-0" />Hi {firstName}, let&apos;s ship your first quote.
          </h2>
          <ol className="mt-4 divide-y divide-dashed divide-border-subtle">
            {steps.map((s, i) => (
              <li key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-1.5 py-2.5">
                {s.done ? (
                  <span className="w-6 h-6 rounded-[5px] bg-success-100 text-success-600 inline-flex items-center justify-center shrink-0"><Check className="w-3.5 h-3.5" /></span>
                ) : (
                  <span className="w-6 h-6 rounded-[5px] bg-navy-50 text-navy-500 font-mono text-[11px] font-bold inline-flex items-center justify-center shrink-0 tnum">{i + 1}</span>
                )}
                <span className="min-w-0 flex-1 basis-[calc(100%-2.25rem)] sm:basis-auto">
                  <span className={`block text-[14px] font-bold ${s.done ? 'text-navy-500 line-through' : 'text-ink'}`}>{s.title}</span>
                  <span className="block text-[12.5px] text-[rgb(var(--text-secondary))] line-clamp-2 sm:truncate">{s.body}</span>
                </span>
                <Link href={s.cta.href as any} className="shrink-0 inline-flex items-center gap-1 text-[12.5px] font-bold text-crimson-700 hover:underline">
                  {s.cta.label}<ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </li>
            ))}
          </ol>
        </div>

        <div aria-hidden className="lg:hidden perf-x mx-5" />
        <div aria-hidden className="hidden lg:block perf-y self-stretch" />

        <div className="lg:w-[230px] shrink-0 p-5 lg:p-6 flex flex-col justify-center gap-3">
          <div className="label">Setup progress</div>
          <div className="money text-[34px] text-ink leading-none">{completed}<span className="text-[rgb(var(--text-tertiary))] text-[22px]">/{total}</span></div>
          <div className="h-1.5 rounded-full bg-navy-100 overflow-hidden">
            <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <button type="button" onClick={dismiss} disabled={pending} className="text-left text-[12px] font-bold text-navy-500 hover:text-ink underline underline-offset-2 transition-colors">Dismiss for good</button>
        </div>
      </div>
    </div>
  );
}
