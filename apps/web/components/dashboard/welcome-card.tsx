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
    <Card plain className="relative overflow-hidden bg-gradient-to-br from-crimson-500 via-crimson-700 to-crimson-900 text-white border-0">
      <div className="absolute -top-12 -right-12 w-72 h-72 rounded-full bg-amber-500/25 blur-3xl" />
      <div className="absolute -bottom-12 -left-12 w-60 h-60 rounded-full bg-amber-300/15 blur-3xl" />
      <button
        type="button"
        aria-label="Dismiss welcome"
        onClick={dismiss}
        className="absolute top-3 right-3 z-10 w-8 h-8 inline-flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        disabled={pending}
      >
        <X className="w-4 h-4" />
      </button>

      <CardContent className="relative pt-6 pb-7">
        <div className="grid lg:grid-cols-[1fr_auto] items-start gap-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-300 font-bold inline-flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" />Welcome to Global Guides</p>
            <h2 className="mt-2 text-2xl lg:text-3xl font-bold leading-tight">
              Hi {firstName}, let's <span className="font-display italic text-amber-300">ship your first quote.</span>
            </h2>
            <p className="text-white/80 text-sm mt-2 max-w-lg">Five quick steps to get you running. You can come back to this checklist any time from your dashboard.</p>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 max-w-xs h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-mono text-amber-300 font-semibold">{completed} / {total}</span>
            </div>
          </div>

          <button type="button" onClick={dismiss} disabled={pending} className="text-xs text-white/70 hover:text-white underline underline-offset-2 transition-colors hidden lg:inline">Dismiss for good</button>
        </div>

        <ol className="mt-6 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {steps.map((s, i) => (
            <li key={i} className={`relative rounded-lg p-3 border ${s.done ? 'border-amber-300/40 bg-white/10' : 'border-white/15 bg-white/5'} hover:bg-white/15 transition-colors`}>
              <div className="flex items-center gap-2 mb-1.5">
                {s.done ? (
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-crimson-900 inline-flex items-center justify-center"><Check className="w-3 h-3" /></span>
                ) : (
                  <span className="w-5 h-5 rounded-full border border-white/40 text-white/70 inline-flex items-center justify-center text-[10px] font-bold">{i + 1}</span>
                )}
                <p className={`text-sm font-semibold ${s.done ? 'text-white/70 line-through' : 'text-white'}`}>{s.title}</p>
              </div>
              <p className="text-xs text-white/65 leading-snug mb-2">{s.body}</p>
              <Link href={s.cta.href as any} className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 hover:text-amber-100 transition-colors">
                {s.cta.label} <ArrowRight className="w-3 h-3" />
              </Link>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
