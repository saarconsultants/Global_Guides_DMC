// Razorpay (UPI, cards, net banking) for wallet top-ups. Server-only.
//
// Off until NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set. The key id is
// public by design (the checkout needs it); the secret never leaves the server.
// RAZORPAY_WEBHOOK_SECRET verifies the webhook that credits a payment whose browser
// tab was closed before it reported back.

import { createHmac, timingSafeEqual } from 'node:crypto';

const base = () => (process.env.RAZORPAY_BASE_URL || 'https://api.razorpay.com').replace(/\/+$/, '');
export const keyId = () => process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '';
const secret = () => process.env.RAZORPAY_KEY_SECRET ?? '';
export const isEnabled = () => !!(keyId() && secret());

async function rz<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(base() + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Basic ${Buffer.from(`${keyId()}:${secret()}`).toString('base64')}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok) {
    console.error(`[razorpay] ${path.replace(/pay_\w+|order_\w+/g, '…')} → ${res.status} ${json?.error?.code ?? ''}`);
    throw new Error(json?.error?.description ?? `Payment gateway error ${res.status}`);
  }
  return json as T;
}

/** An order for exactly this amount. The checkout can only pay what the server asked for. */
export const createOrder = (amountPaise: number, receipt: string, notes: Record<string, string>) =>
  rz<{ id: string; amount: number; status: string }>('/v1/orders', { amount: amountPaise, currency: 'INR', receipt: receipt.slice(0, 40), notes });

export const fetchPayment = (paymentId: string) =>
  rz<{ id: string; order_id: string; amount: number; currency: string; status: string }>(`/v1/payments/${encodeURIComponent(paymentId)}`);

const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
const hmac = (data: string, key: string) => createHmac('sha256', key).update(data).digest('hex');

/** The checkout's proof that Razorpay made this payment for this order. */
export const validPaymentSignature = (orderId: string, paymentId: string, signature: string) =>
  !!secret() && same(hmac(`${orderId}|${paymentId}`, secret()), String(signature ?? ''));

/** The webhook's proof, over the raw request body. */
export function validWebhookSignature(rawBody: string, signature: string | null): boolean {
  const key = process.env.RAZORPAY_WEBHOOK_SECRET ?? '';
  return !!key && same(hmac(rawBody, key), String(signature ?? ''));
}
