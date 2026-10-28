import type { Metadata } from 'next';
import { ButtonLink } from '@/components/ui/button';
import { Pass, PassMain, PassStub, Perforation, Field } from '@/components/ui/pass';
import { getActor } from '@/lib/auth/ctx';

export const metadata: Metadata = { title: 'Page not found — Global Guides DMC' };

/**
 * App-wide 404. Signed-in people get "Back to dashboard"; signed-out visitors
 * (middleware lets unknown URLs through to here) get "Go to sign in".
 */
export default async function NotFound() {
  const actor = await getActor().catch(() => null);
  const home = actor ? (actor.role === 'SUPER_ADMIN' ? '/admin' : '/dashboard') : '/login';
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      {!actor && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/brand/ggdmc-logo.svg" alt="Global Guides DMC" className="h-10 w-auto mb-8" />
      )}
      <Pass className="w-full max-w-2xl">
        <PassMain className="p-5 lg:p-6">
          <h1 className="text-[28px] font-extrabold tracking-[-0.02em] leading-[1.1] text-ink">We can't find that page.</h1>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[rgb(var(--text-secondary))] max-w-md">
            The link may be mistyped or out of date. Check the address, or head back and pick up where you left off.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2.5 max-w-xs">
            <Field label="Status" value="Not found" />
            <Field label="Code" value="404" mono />
          </div>
        </PassMain>
        <Perforation />
        <PassStub tone="paper" className="lg:w-[220px] flex flex-col justify-center gap-2">
          <ButtonLink href={home} className="w-full">{actor ? 'Back to dashboard' : 'Go to sign in'}</ButtonLink>
          <span aria-hidden className="barcode mx-auto mt-2 h-7 w-24 text-navy-200" />
        </PassStub>
      </Pass>
    </div>
  );
}
