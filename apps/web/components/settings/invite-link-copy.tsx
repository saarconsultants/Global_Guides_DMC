'use client';
import { Copy } from 'lucide-react';
import { toast } from '@/components/ui/toast';

export function InviteLinkCopyButton({ path }: { path: string }) {
  const url = typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(url); toast.success('Invite link copied', 'Paste it into WhatsApp / email to share.'); }}
      className="inline-flex items-center gap-1.5 text-xs text-crimson-700 hover:underline cursor-pointer"
    >
      <Copy className="w-3 h-3" />Copy link
    </button>
  );
}
