'use client';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';

export function BlockSeatsButton({ code }: { code: string }) {
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() =>
        toast.info(
          'GIT inventory coming Phase 2',
          `Group departure ${code} is illustrative. Real GIT booking via Tripjack is on the next milestone — block-seat will go live then.`,
        )
      }
    >
      Block seats
    </Button>
  );
}
