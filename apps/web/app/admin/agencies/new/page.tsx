import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button, ButtonLink } from '@/components/ui/button';
import { createAgencyManualAction } from '@/app/actions/admin';
import { Info, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { AdminPage } from '@/components/admin/admin-ui';
import { CopyLink } from '@/components/admin/copy-link';

export default function NewAgencyPage() {
  return (
    <AdminPage narrow>
      <Link href="/admin/agencies" className="inline-flex items-center gap-1.5 min-h-8 text-sm text-[rgb(var(--text-secondary))] hover:text-crimson-700"><ArrowLeft className="w-4 h-4" /> Back to agencies</Link>
      <PageHeader
        title="Onboard an agency"
        description="Set up an agency yourself, for example after speaking to them offline. Or send them the signup link below."
      />
      <Card>
        <CardContent className="pt-6">
          <form action={createAgencyManualAction} className="space-y-5">
            <div className="flex items-start gap-3 rounded-md border border-border-subtle bg-surface-2 px-4 py-3">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-ink-soft" aria-hidden />
              <p className="text-[13.5px] text-ink-soft leading-relaxed">
                The owner signs in with the email below. They&apos;ll need a password, so send them a reset link or share a temporary one.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label required>Agency name</Label>
                <Input name="name" required placeholder="e.g. Wandermark Travels Pvt Ltd" />
              </div>
              <div>
                <Label required>Owner email</Label>
                <Input name="email" type="email" required placeholder="owner@wandermark.in" />
              </div>
              <div>
                <Label>Contact phone</Label>
                <Input name="contact" placeholder="9XXXXXXXXX" />
              </div>
              <div>
                <Label>Default markup %</Label>
                <Input name="markupPct" type="number" step="0.5" min="0" max="100" defaultValue="15" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <ButtonLink href="/admin/agencies" variant="ghost">Cancel</ButtonLink>
              <Button type="submit">Create agency</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h2 className="text-[17px] font-bold text-ink tracking-[-0.01em]">Or share the signup link</h2>
          <p className="text-[13.5px] text-[rgb(var(--text-secondary))] mt-1 mb-4">The owner sets up their own account, brand and password.</p>
          <CopyLink value="https://app.globalguides.com/signup" label="Public signup link" />
        </CardContent>
      </Card>
    </AdminPage>
  );
}
