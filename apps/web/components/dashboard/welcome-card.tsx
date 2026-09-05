'use client';
import { useState, useTransition } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
    <Card className="relative overflow-hidden">
      <button
        type="button"
        aria-label="Dismiss welcome"
        onClick={dismiss}
        className="absolute top-3 right-3 z-10 w-8 h-8 inline-flex items-center justify-center rounded-md text-navy-500 hover:text-ink hover:bg-navy-50 transition-colors cursor-pointer"
        disabled={pending}
      >
        <X className="w-4 h-4" />
      </button>

      <CardContent className="relative pt-6 pb-7">
        <div className="grid lg:grid-cols-[1fr_auto] items-start gap-6">
          <div>
            <h2 className="text-[22px] lg:text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-ink inline-flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-crimson-700" />Hi {firstName}, let's ship your first quote.
            </h2>
            <p className="text-[rgb(var(--text-secondary))] text-sm mt-1.5 max-w-lg">Five quick steps to get you running. This checklist stays on your home page until you dismiss it.</p>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 max-w-xs h-1.5 rounded-full bg-navy-100 overflow-hidden">
                <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-mono text-ink font-bold tnum">{completed} / {total}</span>
            </div>
          </div>

          <button type="button" onClick={dismiss} disabled={pending} className="text-xs text-navy-500 hover:text-ink underline underline-offset-2 transition-colors hidden lg:inline mr-8">Dismiss for good</button>
        </div>

        <ol className="mt-6 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {steps.map((s, i) => (
            <li key={i} className={`relative rounded-md p-3 border ${s.done ? 'border-amber-100 bg-amber-50' : 'border-border-subtle bg-surface-2'} transition-colors`}>
              <div className="flex items-center gap-2 mb-1.5">
                {s.done ? (
                  <span className="w-5 h-5 rounded-[5px] bg-amber-500 text-ink inline-flex items-center justify-center"><Check className="w-3 h-3" /></span>
                ) : (
                  <span className="w-5 h-5 rounded-[5px] border border-border text-navy-500 bg-surface inline-flex items-center justify-center text-[10px] font-bold tnum">{i + 1}</span>
                )}
                <p className={`text-sm font-bold ${s.done ? 'text-navy-500 line-through' : 'text-ink'}`}>{s.title}</p>
              </div>
              <p className="text-xs text-[rgb(var(--text-secondary))] leading-snug mb-2">{s.body}</p>
              <Link href={s.cta.href as any} className="inline-flex items-center gap-1 text-xs font-bold text-crimson-700 hover:underline">
                {s.cta.label} <ArrowRight className="w-3 h-3" />
              </Link>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
