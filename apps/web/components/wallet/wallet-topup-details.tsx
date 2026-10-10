import { MessageCircle } from 'lucide-react';

// Bank details for wallet top-ups. Set these in the hosting environment:
// NEXT_PUBLIC_WALLET_BANK_NAME, NEXT_PUBLIC_WALLET_ACCOUNT_NO,
// NEXT_PUBLIC_WALLET_IFSC, NEXT_PUBLIC_WALLET_ACCOUNT_NAME.
// IFSC deliberately has no default: a wrong IFSC sends money to the wrong branch.
const BANK_NAME = process.env.NEXT_PUBLIC_WALLET_BANK_NAME || '';
const ACCOUNT_NO = process.env.NEXT_PUBLIC_WALLET_ACCOUNT_NO || '924020014711';
const IFSC = process.env.NEXT_PUBLIC_WALLET_IFSC || '';
const ACCOUNT_NAME = process.env.NEXT_PUBLIC_WALLET_ACCOUNT_NAME || 'Global Guides DMC LLP';

export const WALLET_WHATSAPP_DISPLAY = '+91 83780 73375';
export const WALLET_WHATSAPP_LINK =
  'https://wa.me/918378073375?text=Wallet%20recharge%20%E2%80%94%20transfer%20done%2C%20screenshot%20attached.';

/** The one set of "how to top up your wallet" instructions, shared by every Recharge wallet dialog. */
export function WalletTopupDetails() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink">Top up your wallet by bank transfer. Bookings confirm instantly against your wallet balance.</p>
      <ol className="text-sm text-ink space-y-2 list-decimal list-inside">
        <li>Send the amount by NEFT/IMPS to Global Guides DMC:
          <div className="ml-5 mt-1.5 font-mono text-xs bg-surface-2 border border-border-subtle p-2.5 rounded-md leading-relaxed">
            {BANK_NAME && <>Bank: {BANK_NAME}<br /></>}
            A/c: {ACCOUNT_NO}<br />
            IFSC: {IFSC || <span className="font-sans">ask your account manager</span>}<br />
            Name: {ACCOUNT_NAME}
          </div>
        </li>
        <li>
          WhatsApp the transfer screenshot and your agency code to{' '}
          <a href={WALLET_WHATSAPP_LINK} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-crimson-700 font-semibold hover:underline">
            <MessageCircle className="w-3.5 h-3.5" />{WALLET_WHATSAPP_DISPLAY}
          </a>
        </li>
        <li>Your wallet is credited within 1 business hour.</li>
      </ol>
    </div>
  );
}
