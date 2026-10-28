import type { Metadata } from 'next';
import { Pass, PassMain, PassStub, Perforation } from '@/components/ui/pass';
import { LinkIcon } from 'lucide-react';

export const metadata: Metadata = { title: 'Proposal link not valid' };

/**
 * Shown to a customer who opens /p/<token> with an unknown, expired or
 * withdrawn link. Customer-facing and white-label: no agent-app links, no
 * platform branding — just what happened and who to ask.
 */
export default function ProposalLinkNotFound() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12">
      <Pass className="w-full max-w-xl">
        <PassMain className="p-5 lg:p-6">
          <span aria-hidden className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-navy-50 text-navy-500 mb-4">
            <LinkIcon className="w-5 h-5" />
          </span>
          <h1 className="text-[24px] sm:text-[28px] font-extrabold tracking-[-0.02em] leading-[1.1] text-ink">This proposal link isn't valid</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[rgb(var(--text-secondary))]">
            It may have expired, been replaced by a newer version, or been typed incorrectly.
            Please contact your travel agent and ask them to send you a fresh link.
          </p>
        </PassMain>
        <Perforation />
        <PassStub tone="paper" className="lg:w-[160px] items-center">
          <span aria-hidden className="barcode h-8 w-20 text-navy-200" />
        </PassStub>
      </Pass>
    </div>
  );
}
