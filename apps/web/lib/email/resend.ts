// Server-only: transactional email through Resend (https://resend.com/docs/api-reference/emails/send-email).
// Env: RESEND_API_KEY, EMAIL_FROM (an address on a domain verified in Resend).

export const emailIsLive = () => !!process.env.RESEND_API_KEY;

const FROM = () => process.env.EMAIL_FROM || 'Global Guides DMC <login@globalguidesdmc.com>';

/** Sends one email. Throws when Resend refuses it; never logs the body (it can carry a sign-in code). */
export async function sendEmail(msg: { to: string; subject: string; text: string; html?: string }): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set.');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM(), to: [msg.to], subject: msg.subject, text: msg.text, ...(msg.html ? { html: msg.html } : {}) }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => null);
    console.error(`[email] Resend → ${res.status} ${j?.name ?? ''} ${j?.message ?? ''}`);
    throw new Error(`Email could not be sent (${res.status}).`);
  }
}
