// Self-check against the stand-in (test/stub.js running): duplicate-safe booking and INR money handling.
// Run: UNIFYSTAYS_API_KEY=test-key UNIFYSTAYS_BASE_URL=http://localhost:4013 npx tsx packages/adapters/unifystays/test/check.ts
import { createBooking, bookingByIdempotencyKey, prebook, searchHotels } from '../src/index';
import assert from 'node:assert';
(async()=>{
  const pb = await prebook('1400001', 'bq7.a1');
  assert.equal(pb.decision, 'READY_TO_BOOK'); assert.ok(pb.prebookingId && pb.offer);
  const args = { idempotencyKey: 'test-dup-1', prebookingId: pb.prebookingId!, offerId: pb.offer!.offerId, rooms: [{ allocationId: pb.offer!.rooms[0]!.allocationId, guests: [{ type: 'ADULT' as const, lead: true, answers: [] }] }] };
  const a = await createBooking(args), b = await createBooking(args);
  assert.equal(a.bookingId, b.bookingId, 'same key must return the same booking');
  const c = await bookingByIdempotencyKey('test-dup-1'); assert.equal(c?.bookingId, a.bookingId);
  assert.equal(await bookingByIdempotencyKey('never-used'), null);
  // payable from the INR display ledger; penalty scaled from the native USD amount
  assert.equal(pb.offer!.payablePaise, 5100000); assert.equal(pb.offer!.atPropertyPaise, 75000); assert.equal(pb.offer!.penalties[0]!.amountPaise, 5100000);
  // "Check price": a retryable unpriced hotel is offered; sold out and not_mapped never are
  const s = await searchHotels({ cityName: 'Dubai', countryCode: 'AE', checkIn: '2026-12-20', checkOut: '2026-12-23', rooms: [{ adults: 2, childAges: [] }], waitMs: 3000 });
  assert.deepEqual(s.checkable.map((h) => h.hotelId), ['1400004']); assert.equal(s.checkable[0]!.totalPaise, 0);
  assert.ok(!s.hotels.some((h) => h.hotelId === '1400004'), 'unpriced hotel must not get a price');
  console.log('idempotency + money + check-price checks passed:', a.bookingId);
})().catch((e)=>{ console.error('FAILED', e.message); process.exit(1); });
