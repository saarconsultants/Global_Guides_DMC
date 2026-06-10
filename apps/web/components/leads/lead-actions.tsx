'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { updateLeadAction } from '@/app/actions/leads';
import { Eye, FileDown, Pencil } from 'lucide-react';

interface Lead {
  id: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  status: string;
}

const STATUSES = ['NEW', 'QUOTED', 'FOLLOWUP', 'BOOKED', 'LOST'];

export function LeadActions({ lead, latestProposalId }: { lead: Lead; latestProposalId?: string | null }) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, start] = useTransition();

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await updateLeadAction(lead.id, fd);
        toast.success('Lead updated');
        setEditOpen(false);
      } catch (err: any) {
        toast.error('Update failed', err?.message ?? 'Try again');
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Link href={`/leads/${lead.id}` as any} title="View lead" className="w-10 h-10 inline-flex items-center justify-center rounded-md text-[rgb(var(--text-secondary))] hover:bg-surface-2 hover:text-navy-900">
        <Eye className="w-4 h-4" />
      </Link>
      {latestProposalId ? (
        <a href={`/api/proposal-pdf/${latestProposalId}`} target="_blank" rel="noreferrer" title="Download latest proposal PDF" className="w-10 h-10 inline-flex items-center justify-center rounded-md text-[rgb(var(--text-secondary))] hover:bg-surface-2 hover:text-navy-900">
          <FileDown className="w-4 h-4" />
        </a>
      ) : (
        <span title="No proposal yet" className="w-10 h-10 inline-flex items-center justify-center rounded-md text-[rgb(var(--text-tertiary))] opacity-40 cursor-not-allowed">
          <FileDown className="w-4 h-4" />
        </span>
      )}
      <button type="button" onClick={() => setEditOpen(true)} title="Edit lead" className="w-10 h-10 inline-flex items-center justify-center rounded-md text-[rgb(var(--text-secondary))] hover:bg-surface-2 hover:text-navy-900">
        <Pencil className="w-4 h-4" />
      </button>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Edit lead" size="sm">
        <form onSubmit={save} className="space-y-4">
          <div>
            <Label required>Customer name</Label>
            <Input name="customerName" defaultValue={lead.customerName} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Email</Label><Input name="customerEmail" type="email" defaultValue={lead.customerEmail ?? ''} /></div>
            <div><Label>Phone</Label><Input name="customerPhone" defaultValue={lead.customerPhone ?? ''} /></div>
          </div>
          <div>
            <Label>Status</Label>
            <select name="status" defaultValue={lead.status} className="h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save lead'}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
