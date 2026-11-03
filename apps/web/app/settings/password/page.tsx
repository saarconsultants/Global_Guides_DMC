import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { SETTINGS_CONTAINER } from '@/components/settings/settings-tabs';
import { ChangePasswordForm } from '@/components/settings/change-password-form';
import { requireActor } from '@/lib/auth/ctx';

export const dynamic = 'force-dynamic';

export default async function ChangePasswordPage() {
  const actor = await requireActor();
  return (
    <div className={SETTINGS_CONTAINER}>
      <PageHeader title="Change password" description={`For your sign-in, ${actor.email}. Your new password works straight away.`} />
      <Card className="max-w-md">
        <CardContent className="pt-6">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
