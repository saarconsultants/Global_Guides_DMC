'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Headphones, Pencil, Wallet, ChevronDown, LogOut, ShieldCheck, Settings, User, MessageCircle, Mail, Phone, AlertTriangle, X } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

interface Actor {
  name: string;
  role: string;
  agencyName: string;
  logoUrl: string | null;
}

export function NavUtilityStrip({ actor, walletLabel }: { actor: Actor; walletLabel: string }) {
  const [contactOpen, setContactOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const contactRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (contactRef.current && !contactRef.current.contains(e.target as Node)) setContactOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function openWriteToUs() {
    // Programmatically open the BugReport modal via the same keyboard shortcut
    const event = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, shiftKey: true, metaKey: true });
    window.dispatchEvent(event);
  }

  return (
    <>
      {/* Contact dropdown */}
      <div ref={contactRef} className="relative">
        <button
          onClick={() => { setContactOpen(!contactOpen); setProfileOpen(false); }}
          className="inline-flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
        >
          <Headphones className="w-3.5 h-3.5" /> Contact <ChevronDown className="w-3 h-3" />
        </button>
        {contactOpen && (
          <div className="absolute right-0 top-full mt-2 w-64 bg-surface text-navy-900 rounded-md shadow-xl border border-border-subtle z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle bg-surface-2">
              <p className="text-xs uppercase tracking-widest text-[rgb(var(--text-secondary))] font-bold">Platform support</p>
              <p className="text-sm font-semibold mt-0.5">Global Guides DMC ops</p>
            </div>
            <a href="mailto:travel@globalguidesdmc.com" className="flex items-center gap-2 px-4 py-2.5 hover:bg-surface-2 transition-colors text-sm">
              <Mail className="w-4 h-4 text-crimson-700" />
              <div>
                <p className="font-medium">Email</p>
                <p className="text-xs text-[rgb(var(--text-secondary))] font-mono">travel@globalguidesdmc.com</p>
              </div>
            </a>
            <a href="https://wa.me/918378073375" target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2.5 hover:bg-surface-2 transition-colors text-sm">
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <div>
                <p className="font-medium">WhatsApp</p>
                <p className="text-xs text-[rgb(var(--text-secondary))] font-mono">+91 83780 73375</p>
              </div>
            </a>
            <a href="tel:+918378073375" className="flex items-center gap-2 px-4 py-2.5 hover:bg-surface-2 transition-colors text-sm">
              <Phone className="w-4 h-4 text-action-500" />
              <div>
                <p className="font-medium">Call</p>
                <p className="text-xs text-[rgb(var(--text-secondary))] font-mono">+91 83780 73375</p>
              </div>
            </a>
            <div className="px-4 py-2 border-t border-border-subtle bg-surface-2 text-[10px] text-[rgb(var(--text-tertiary))]">
              Mon–Sat · 9 AM – 7 PM IST
            </div>
          </div>
        )}
      </div>

      {/* Write to us — triggers the BugReport modal */}
      <button onClick={openWriteToUs} className="inline-flex items-center gap-1.5 text-white/70 hover:text-white transition-colors">
        <Pencil className="w-3.5 h-3.5" /> Write to us
      </button>

      {/* Escalate — high-severity bug report shortcut */}
      <button
        onClick={() => setEscalateOpen(true)}
        className="px-2.5 py-0.5 rounded-full bg-amber-500 text-crimson-900 font-semibold hover:bg-amber-300 transition-colors"
      >
        Escalate
      </button>

      {/* Recharge */}
      <button
        onClick={() => setRechargeOpen(true)}
        className="inline-flex items-center gap-1.5 text-white/70 hover:text-white transition-colors"
      >
        <Wallet className="w-3.5 h-3.5" /> Recharge {walletLabel} <ChevronDown className="w-3 h-3" />
      </button>

      {/* Admin shortcut (super-admins only) */}
      {actor.role === 'SUPER_ADMIN' && (
        <Link href="/admin" className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white text-crimson-900 font-semibold hover:bg-amber-300 transition-colors">
          <ShieldCheck className="w-3.5 h-3.5" /> Admin
        </Link>
      )}

      {/* Profile dropdown */}
      <div ref={profileRef} className="relative">
        <button
          onClick={() => { setProfileOpen(!profileOpen); setContactOpen(false); }}
          className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors"
        >
          {actor.logoUrl
            ? <img src={actor.logoUrl} alt="" className="w-5 h-5 rounded-full object-cover bg-white" />
            : <span className="w-5 h-5 rounded-full bg-white/15 inline-flex items-center justify-center text-[10px] font-bold">{(actor.name || '?')[0]}</span>}
          {actor.name} <ChevronDown className="w-3 h-3" />
        </button>
        {profileOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 bg-surface text-navy-900 rounded-md shadow-xl border border-border-subtle z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-border-subtle bg-surface-2">
              <p className="text-sm font-semibold">{actor.name}</p>
              <p className="text-[11px] text-[rgb(var(--text-secondary))] mt-0.5 truncate">{actor.agencyName}</p>
              <p className="text-[10px] uppercase tracking-widest font-bold text-crimson-700 mt-1">{actor.role.replace('_', ' ')}</p>
            </div>
            <Link href="/settings" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 hover:bg-surface-2 transition-colors text-sm">
              <Settings className="w-4 h-4 text-[rgb(var(--text-secondary))]" /> Agency settings
            </Link>
            <Link href="/settings/team" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 hover:bg-surface-2 transition-colors text-sm">
              <User className="w-4 h-4 text-[rgb(var(--text-secondary))]" /> Team
            </Link>
            {actor.role === 'SUPER_ADMIN' && (
              <Link href="/admin" onClick={() => setProfileOpen(false)} className="flex items-center gap-2 px-4 py-2.5 hover:bg-surface-2 transition-colors text-sm">
                <ShieldCheck className="w-4 h-4 text-crimson-700" /> Platform admin
              </Link>
            )}
            <a href="/logout" className="flex items-center gap-2 px-4 py-2.5 hover:bg-danger-100 hover:text-danger-500 transition-colors text-sm border-t border-border-subtle">
              <LogOut className="w-4 h-4" /> Sign out
            </a>
          </div>
        )}
      </div>

      {/* Recharge modal */}
      <Dialog open={rechargeOpen} onClose={() => setRechargeOpen(false)} title="Recharge wallet" size="sm">
        <div className="space-y-4">
          <div className="rounded-md bg-amber-500/15 border border-amber-500/30 px-4 py-3 text-sm">
            <p className="font-semibold text-amber-700 mb-1">🚧 Razorpay integration — Phase 2</p>
            <p className="text-[rgb(var(--text-primary))]">Online wallet recharge will go live once we wire Razorpay (planned for next milestone).</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-navy-900 mb-2">For now — credit your wallet manually:</p>
            <ol className="text-sm text-[rgb(var(--text-primary))] space-y-1.5 list-decimal list-inside">
              <li>NEFT/IMPS the amount to Global Guides DMC:
                <div className="ml-6 mt-1 font-mono text-xs bg-surface-2 p-2 rounded">
                  A/c: 924020014711<br />
                  IFSC: AXIS0001234<br />
                  Name: Global Guides DMC LLP
                </div>
              </li>
              <li>WhatsApp the transfer screenshot + your agency code to <a href="https://wa.me/918378073375" className="text-crimson-700 font-medium hover:underline">+91 83780 73375</a></li>
              <li>Wallet credited within 1 business hour</li>
            </ol>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
            <Link href="/statement"><Button variant="secondary" onClick={() => setRechargeOpen(false)}>View statement</Button></Link>
            <Button variant="ghost" onClick={() => setRechargeOpen(false)}>Close</Button>
          </div>
        </div>
      </Dialog>

      {/* Escalate modal */}
      <Dialog open={escalateOpen} onClose={() => setEscalateOpen(false)} title="Escalate an issue" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[rgb(var(--text-primary))]">
            Use Escalate when something blocks a booking <strong>right now</strong> — payment stuck, customer waiting on the phone, API error during a live demo, etc. We pick these up within 15 minutes during business hours.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a href="https://wa.me/918378073375?text=ESCALATE%3A%20" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 h-11 rounded-md bg-[#25D366] text-white font-semibold hover:bg-[#1ebe57] transition-colors">
              <MessageCircle className="w-4 h-4" /> WhatsApp now
            </a>
            <a href="tel:+918378073375" className="inline-flex items-center justify-center gap-2 h-11 rounded-md bg-crimson-900 text-white font-semibold hover:bg-crimson-700 transition-colors">
              <Phone className="w-4 h-4" /> Call now
            </a>
          </div>
          <div className="rounded-md bg-surface-2 border border-border-subtle px-3 py-2 text-xs text-[rgb(var(--text-secondary))]">
            For non-urgent feedback or bug reports, use the floating <strong>Report</strong> button at the bottom-right instead (or press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] font-mono">⌘⇧B</kbd>).
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => setEscalateOpen(false)}>Close</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
