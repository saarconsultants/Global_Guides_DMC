'use client';
import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

// The response panel lives at the end of the proposal (#respond). These two
// shortcuts — one in the top price stub, one pinned to the bottom of a phone
// screen — scroll there and open the accept confirmation straight away.
export const ACCEPT_EVENT = 'proposal:accept';

function goAccept(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  document.getElementById('respond')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  window.dispatchEvent(new Event(ACCEPT_EVENT));
}

export function AcceptButton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <a href="#respond" onClick={goAccept} style={style} className={`inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-md text-sm font-bold whitespace-nowrap hover:opacity-90 transition-opacity ${className ?? ''}`}>
      <Check className="w-4 h-4" aria-hidden />Accept proposal
    </a>
  );
}

/** Phone-only bar: total + Accept, hidden once the response panel is on screen. */
export function StickyAcceptBar({ total, primary }: { total: string; primary: string }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const el = document.getElementById('respond');
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setHidden(!!entry?.isIntersecting), { threshold: 0.1 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      className={`sm:hidden fixed inset-x-0 bottom-0 z-40 bg-surface border-t border-border-subtle shadow-[0_-4px_16px_-8px_rgb(16_24_40/0.18)] px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] flex items-center justify-between gap-3 transition-[transform,visibility] duration-300 ease-drawer ${hidden ? 'translate-y-full invisible' : ''}`}
    >
      <div className="min-w-0">
        <div className="label">Trip total</div>
        <div className="money text-[20px] text-ink leading-tight">{total}</div>
      </div>
      <AcceptButton style={{ background: primary, color: '#fff' }} className="h-11 px-5" />
    </div>
  );
}
