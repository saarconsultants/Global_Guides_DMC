'use client';
import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, MessageCircle } from 'lucide-react';
import Link from 'next/link';

// Recharge wallet — until Razorpay is wired (Phase 2), this explains the
// NEFT + WhatsApp-confirmation flow. Mirrors the nav strip recharge modal.
export function RechargeButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className="gap-1.5" onClick={() => setOpen(true)}><Plus className="w-4 h-4" />Recharge wallet</Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Recharge wallet" size="sm">
        <div className="space-y-4">
          <div className="rounded-md bg-amber-500/15 border border-amber-500/30 px-4 py-3 text-sm">
            <p className="font-semibold text-amber-700 mb-1">🚧 Razorpay — Phase 2</p>
            <p className="text-[rgb(var(--text-primary))]">One-click online recharge lands next milestone. For now, top up via bank transfer:</p>
          </div>
          <ol className="text-sm text-[rgb(var(--text-primary))] space-y-1.5 list-decimal list-inside">
            <li>NEFT/IMPS to Global Guides DMC:
              <div className="ml-6 mt-1 font-mono text-xs bg-surface-2 p-2 rounded">
                A/c: 924020014711<br />IFSC: AXIS0001234<br />Name: Global Guides DMC LLP
              </div>
            </li>
            <li>WhatsApp the screenshot + your agency code to confirm</li>
            <li>Wallet credited within 1 business hour</li>
          </ol>
          <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
            <a href="https://wa.me/918378073375?text=Wallet%20recharge%20%E2%80%94%20transfer%20done%2C%20screenshot%20attached." target="_blank" rel="noreferrer">
              <Button variant="secondary" className="gap-1.5"><MessageCircle className="w-4 h-4" />Notify ops on WhatsApp</Button>
            </a>
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
