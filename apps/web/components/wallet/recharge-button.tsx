'use client';
import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, MessageCircle } from 'lucide-react';
import { WalletTopupDetails, WALLET_WHATSAPP_LINK } from '@/components/wallet/wallet-topup-details';

// Recharge wallet: explains the bank transfer + WhatsApp confirmation flow.
// Same details as the top-bar recharge dialog (shared WalletTopupDetails).
export function RechargeButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button className="gap-1.5" onClick={() => setOpen(true)}><Plus className="w-4 h-4" />Recharge wallet</Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Recharge wallet" size="sm">
        <div className="space-y-4">
          <WalletTopupDetails />
          <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
            <a href={WALLET_WHATSAPP_LINK} target="_blank" rel="noreferrer">
              <Button variant="secondary" className="gap-1.5"><MessageCircle className="w-4 h-4" />Notify ops on WhatsApp</Button>
            </a>
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
