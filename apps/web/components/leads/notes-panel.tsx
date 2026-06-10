'use client';
import { useState, useTransition, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { addLeadNoteAction, deleteLeadNoteAction } from '@/app/actions/leads';
import { Phone, Mail, MessageCircle, Pencil, Cog, Trash2 } from 'lucide-react';
import { ActionForm } from '@/components/ui/action-form';

type NoteKind = 'NOTE' | 'CALL' | 'EMAIL' | 'WHATSAPP' | 'SYSTEM';

interface NoteRow {
  id: string;
  body: string;
  kind: string;
  authorName: string | null;
  createdAt: string;
}

interface Props {
  leadId: string;
  notes: NoteRow[];
  currentUserId: string;
  isOwner: boolean;
}

const kindMeta: Record<NoteKind, { icon: React.ReactNode; label: string; pill: 'neutral' | 'info' | 'success' | 'warning' }> = {
  NOTE:     { icon: <Pencil className="w-3.5 h-3.5" />,        label: 'Note',     pill: 'neutral' },
  CALL:     { icon: <Phone className="w-3.5 h-3.5" />,         label: 'Call',     pill: 'info' },
  EMAIL:    { icon: <Mail className="w-3.5 h-3.5" />,          label: 'Email',    pill: 'info' },
  WHATSAPP: { icon: <MessageCircle className="w-3.5 h-3.5" />, label: 'WhatsApp', pill: 'success' },
  SYSTEM:   { icon: <Cog className="w-3.5 h-3.5" />,           label: 'System',   pill: 'warning' },
};

export function LeadNotesPanel({ leadId, notes, currentUserId, isOwner }: Props) {
  const [kind, setKind] = useState<NoteKind>('NOTE');
  const [body, setBody] = useState('');
  const [pending, start] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const fd = new FormData();
    fd.set('body', body);
    fd.set('kind', kind);
    start(async () => {
      try {
        await addLeadNoteAction(leadId, fd);
        setBody('');
        toast.success('Note added');
        ref.current?.focus();
      } catch (err: any) {
        toast.error('Could not save', err?.message);
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <h2 className="text-lg font-semibold text-navy-900">Notes &amp; activity</h2>

        <form onSubmit={submit} className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {(['NOTE','CALL','EMAIL','WHATSAPP'] as const).map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)} className={`px-3 h-8 inline-flex items-center gap-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${kind === k ? 'bg-navy-900 text-white border-navy-900' : 'bg-surface text-navy-700 border-border hover:bg-navy-50'}`}>
                {kindMeta[k].icon}{kindMeta[k].label}
              </button>
            ))}
          </div>
          <textarea
            ref={ref}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={kind === 'CALL' ? "What was discussed? e.g. Customer wants 4★ instead of 5★, July not June." : 'Add a quick note for the team…'}
            className="w-full h-24 rounded-sm border border-border bg-surface px-3 py-2 text-sm focus:border-crimson-500 focus:outline-none focus:ring-2 focus:ring-crimson-100 transition-colors"
            maxLength={2000}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-[rgb(var(--text-secondary))]">{body.length}/2000 · Visible only to your team</p>
            <Button type="submit" disabled={!body.trim() || pending} className="gap-2" size="sm">
              {pending ? <><Spinner size="sm" className="text-white" />Saving…</> : 'Add note'}
            </Button>
          </div>
        </form>

        <div className="space-y-3 pt-1 stagger">
          {notes.length === 0 && (
            <p className="text-sm text-[rgb(var(--text-secondary))] text-center py-8">No notes yet. Capture every call, email, or quick observation here so the whole team stays in sync.</p>
          )}
          {notes.map((n) => {
            const meta = kindMeta[(n.kind as NoteKind)] ?? kindMeta.NOTE;
            const canDelete = isOwner || true; // both owner + author can delete; author check on server side
            return (
              <div key={n.id} className="group flex gap-3 pb-3 border-b border-border-subtle last:border-0">
                <span className={`mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full ${n.kind === 'SYSTEM' ? 'bg-warning-100 text-warning-500' : 'bg-crimson-50 text-crimson-700'} flex-shrink-0`}>{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Pill variant={meta.pill}>{meta.label}</Pill>
                    <span className="text-xs text-[rgb(var(--text-secondary))]">{n.authorName ?? 'System'}</span>
                    <span className="text-xs text-[rgb(var(--text-tertiary))]">{new Date(n.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-sm text-[rgb(var(--text-primary))] mt-1 whitespace-pre-wrap leading-relaxed">{n.body}</p>
                </div>
                {n.kind !== 'SYSTEM' && canDelete && (
                  <ActionForm action={deleteLeadNoteAction.bind(null, n.id, leadId)} confirm="Delete this note?" success="Note deleted" className="self-start">
                    <button type="submit" aria-label="Delete note" className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity text-[rgb(var(--text-tertiary))] hover:text-danger-500 p-1 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </ActionForm>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
