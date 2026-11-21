// Self-check for the payment signature checks. Run: npx tsx apps/web/lib/payments/razorpay.check.ts
import assert from 'node:assert';
import { createHmac } from 'node:crypto';

process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = 'rzp_test_x';
process.env.RAZORPAY_KEY_SECRET = 'secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'whsecret';

(async () => {
  const { validPaymentSignature, validWebhookSignature } = await import('./razorpay');
  const sig = createHmac('sha256', 'secret').update('order_1|pay_1').digest('hex');
  assert.equal(validPaymentSignature('order_1', 'pay_1', sig), true);
  assert.equal(validPaymentSignature('order_2', 'pay_1', sig), false, 'a signature must not carry over to another order');
  assert.equal(validPaymentSignature('order_1', 'pay_1', ''), false);
  const body = '{"event":"payment.captured"}';
  assert.equal(validWebhookSignature(body, createHmac('sha256', 'whsecret').update(body).digest('hex')), true);
  assert.equal(validWebhookSignature(body + ' ', createHmac('sha256', 'whsecret').update(body).digest('hex')), false, 'any change to the body must fail');
  assert.equal(validWebhookSignature(body, null), false);
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  assert.equal(validWebhookSignature(body, createHmac('sha256', '').update(body).digest('hex')), false, 'no secret configured means nothing is accepted');
  console.log('razorpay signature checks passed');
})();
