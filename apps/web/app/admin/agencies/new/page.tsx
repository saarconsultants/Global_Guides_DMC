import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { createAgencyManualAction } from '@/app/actions/admin';
import { Building2 } from 'lucide-react';

export default function NewAgencyPage() {
  return (
    <div className="p-8 space-y-6 max-w-2xl">
      <PageHeader
        eyebrow="Platform"
        title="Onboard agency manually"
        description="Skips the public signup. Useful when you've spoken to the agency offline. You can also send them the signup link instead."
      />
      <Card>
        <CardContent className="pt-6">
          <form action={createAgencyManualAction} className="space-y-4">
            <div className="inline-flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))] mb-2">
              <Building2 className="w-4 h-4 text-crimson-700" />
              The Agency Owner will use the email below to sign in. They'll need a password — send them a reset link or share temporary credentials.
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
              <Link href="/admin/agencies"><Button variant="ghost" type="button">Cancel</Button></Link>
              <Button type="submit">Create agency</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <h3 className="text-sm font-semibold text-navy-900 mb-2">Alternative · share the public signup link</h3>
          <p className="text-xs text-[rgb(var(--text-secondary))] mb-3">Let the agency owner set up their own account, brand, and password. Recommended for self-serve onboarding.</p>
          <div className="flex items-center gap-2">
            <Input readOnly value="https://app.globalguides.com/signup" className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
