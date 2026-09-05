'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Headphones, Wallet, ChevronDown, LogOut, ShieldCheck, Settings, Users, MessageCircle, Mail, Phone, Pencil, AlertTriangle } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Actor {
  name: string;
  role: string;
  agencyName: string;
  logoUrl: string | null;
}

/** Wallet stub, support menu and account menu for the top bar (white ground). */
export function NavAccount({ actor, walletLabel, compact }: { actor: Actor; walletLabel: string; compact?: boolean }) {
  const [supportOpen, setSupportOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const supportRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (supportRef.current && !supportRef.current.contains(e.target as Node)) setSupportOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function openWriteToUs() {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, shiftKey: true, metaKey: true }));
  }

  const menu = 'absolute right-0 top-full mt-2 w-64 bg-surface text-ink rounded-lg shadow-xl border border-border-subtle z-50 overflow-hidden';
  const item = 'flex items-center gap-2.5 px-4 py-2.5 hover:bg-surface-2 transition-colors text-sm';

  return (
    <div className={cn('flex items-center', compact ? 'gap-2' : 'gap-2.5')}>
      {/* Wallet stub */}
      <button
        type="button"
        onClick={() => setRechargeOpen(true)}
        className="hidden sm:inline-flex items-center gap-2 h-9 rounded-md border border-dashed border-border px-3 hover:border-border-strong hover:bg-surface-2 transition-colors"
        aria-label={`Wallet ${walletLabel}. Recharge`}
      >
        <span className="label">Wallet</span>
        <span className="money text-[13px] text-ink">{walletLabel}</span>
        <span className="text-[12px] font-bold text-crimson-700">Recharge</span>
      </button>

      {/* Support */}
      <div ref={supportRef} className="relative">
        <button
          type="button"
          onClick={() => { setSupportOpen(!supportOpen); setProfileOpen(false); }}
          className="inline-flex items-center justify-center w-9 h-9 rounded-md text-navy-700 hover:bg-navy-50 hover:text-ink transition-colors"
          aria-label="Support"
          aria-expanded={supportOpen}
        >
          <Headphones className="w-[18px] h-[18px]" />
        </button>
        {supportOpen && (
          <div className={menu}>
            <div className="px-4 py-3 border-b border-border-subtle bg-surface-2">
              <p className="label">Platform support</p>
              <p className="text-sm font-bold mt-0.5">Global Guides DMC ops</p>
              <p className="text-[11px] text-[rgb(var(--text-tertiary))] mt-0.5">Mon–Sat · 9 AM – 7 PM IST</p>
            </div>
            <a href="https://wa.me/918378073375" target="_blank" rel="noreferrer" className={item}><MessageCircle className="w-4 h-4 text-[#25D366]" /><span><span className="block font-semibold">WhatsApp</span><span className="block text-xs text-[rgb(var(--text-secondary))] font-mono">+91 83780 73375</span></span></a>
            <a href="tel:+918378073375" className={item}><Phone className="w-4 h-4 text-action-500" /><span><span className="block font-semibold">Call</span><span className="block text-xs text-[rgb(var(--text-secondary))] font-mono">+91 83780 73375</span></span></a>
            <a href="mailto:travel@globalguidesdmc.com" className={item}><Mail className="w-4 h-4 text-crimson-700" /><span><span className="block font-semibold">Email</span><span className="block text-xs text-[rgb(var(--text-secondary))] font-mono">travel@globalguidesdmc.com</span></span></a>
            <button type="button" onClick={() => { setSupportOpen(false); openWriteToUs(); }} className={cn(item, 'w-full text-left border-t border-border-subtle')}><Pencil className="w-4 h-4 text-navy-500" /><span className="font-semibold">Write to us</span></button>
            <button type="button" onClick={() => { setSupportOpen(false); setEscalateOpen(true); }} className={cn(item, 'w-full text-left bg-amber-50 hover:bg-amber-100')}><AlertTriangle className="w-4 h-4 text-amber-700" /><span className="font-semibold">Escalate a live issue</span></button>
          </div>
        )}
      </div>

      {/* Account */}
      <div ref={profileRef} className="relative">
        <button
          type="button"
          onClick={() => { setProfileOpen(!profileOpen); setSupportOpen(false); }}
          className="inline-flex items-center gap-2 h-9 pl-1 pr-2 rounded-md hover:bg-navy-50 transition-colors"
          aria-label="Account menu"
          aria-expanded={profileOpen}
        >
          <span className="w-7 h-7 rounded-full bg-crimson-700 text-white inline-flex items-center justify-center text-[12px] font-bold">{(actor.name || '?')[0]?.toUpperCase()}</span>
          <ChevronDown className="w-3.5 h-3.5 text-navy-500" />
        </button>
        {profileOpen && (
          <div className={cn(menu, 'w-60')}>
            <div className="px-4 py-3 border-b border-border-subtle bg-surface-2">
              {actor.logoUrl && <img src={actor.logoUrl} alt="" className="h-7 w-auto max-w-[120px] object-contain mb-2 rounded-sm bg-ink/90 p-1" />}
              <p className="text-sm font-bold truncate">{actor.name}</p>
              <p className="text-[12px] text-[rgb(var(--text-secondary))] mt-0.5 truncate">{actor.agencyName}</p>
              <p className="label mt-1.5 text-crimson-700">{actor.role.replace('_', ' ')}</p>
            </div>
            <Link href="/settings" onClick={() => setProfileOpen(false)} className={item}><Settings className="w-4 h-4 text-navy-500" /> Agency settings</Link>
            <Link href="/settings/team" onClick={() => setProfileOpen(false)} className={item}><Users className="w-4 h-4 text-navy-500" /> Team</Link>
            <Link href="/statement" onClick={() => setProfileOpen(false)} className={item}><Wallet className="w-4 h-4 text-navy-500" /> Wallet &amp; statement</Link>
            {actor.role === 'SUPER_ADMIN' && (
              <Link href="/admin" onClick={() => setProfileOpen(false)} className={item}><ShieldCheck className="w-4 h-4 text-crimson-700" /> Platform admin</Link>
            )}
            <a href="/logout" className={cn(item, 'border-t border-border-subtle hover:bg-danger-100 hover:text-danger-500')}><LogOut className="w-4 h-4" /> Sign out</a>
          </div>
        )}
      </div>

      {/* Recharge */}
      <Dialog open={rechargeOpen} onClose={() => setRechargeOpen(false)} title="Recharge wallet" size="sm">
        <div className="space-y-4">
          <div className="rounded-md bg-amber-50 border border-amber-100 px-4 py-3 text-sm">
            <p className="font-bold text-amber-900 mb-1">Online recharge is coming in Phase 2</p>
            <p className="text-ink">Razorpay is planned for the next milestone. Until then, credit your wallet by bank transfer.</p>
          </div>
          <div>
            <p className="label mb-2">Credit your wallet manually</p>
            <ol className="text-sm text-ink space-y-2 list-decimal list-inside">
              <li>NEFT/IMPS the amount to Global Guides DMC:
                <div className="ml-5 mt-1.5 font-mono text-xs bg-surface-2 border border-border-subtle p-2.5 rounded-md leading-relaxed">
                  A/c: 924020014711<br />
                  IFSC: AXIS0001234<br />
                  Name: Global Guides DMC LLP
                </div>
              </li>
              <li>WhatsApp the transfer screenshot and your agency code to <a href="https://wa.me/918378073375" className="text-crimson-700 font-semibold hover:underline">+91 83780 73375</a></li>
              <li>Wallet credited within 1 business hour</li>
            </ol>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
            <Link href="/statement"><Button variant="secondary" onClick={() => setRechargeOpen(false)}>View statement</Button></Link>
            <Button variant="ghost" onClick={() => setRechargeOpen(false)}>Close</Button>
          </div>
        </div>
      </Dialog>

      {/* Escalate */}
      <Dialog open={escalateOpen} onClose={() => setEscalateOpen(false)} title="Escalate a live issue" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-ink">Use this when something blocks a booking <strong>right now</strong>: payment stuck, customer waiting on the phone, API error during a live demo. We pick these up within 15 minutes in business hours.</p>
          <div className="grid grid-cols-2 gap-2">
            <a href="https://wa.me/918378073375?text=ESCALATE%3A%20" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 h-11 rounded-md bg-[#25D366] text-white font-bold hover:bg-[#1ebe57] transition-colors"><MessageCircle className="w-4 h-4" /> WhatsApp now</a>
            <a href="tel:+918378073375" className="inline-flex items-center justify-center gap-2 h-11 rounded-md bg-crimson-700 text-white font-bold hover:bg-crimson-900 transition-colors"><Phone className="w-4 h-4" /> Call now</a>
          </div>
          <p className="rounded-md bg-surface-2 border border-border-subtle px-3 py-2 text-xs text-[rgb(var(--text-secondary))]">For non-urgent feedback, use the <strong>Report</strong> button at the bottom right, or press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] font-mono">⌘⇧B</kbd>.</p>
          <div className="flex justify-end"><Button variant="ghost" onClick={() => setEscalateOpen(false)}>Close</Button></div>
        </div>
      </Dialog>
    </div>
  );
}
