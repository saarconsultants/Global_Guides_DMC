// Keeps Hotelbeds Content API data in the database. Registered at server start.
import type { HotelContentStore } from '@gg/hotelbeds';
import { db } from '@/lib/db/client';

const REFRESH_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export const hotelContentStore: HotelContentStore = {
  async read(kind, codes) {
    const rows = await db.hotelContent.findMany({
      where: { kind, code: { in: codes }, fetchedAt: { gte: new Date(Date.now() - REFRESH_AFTER_MS) } },
    });
    return new Map(rows.map((r) => [r.code, JSON.parse(r.data) as unknown]));
  },
  async write(kind, rows) {
    await Promise.all(rows.map(({ code, data }) => db.hotelContent.upsert({
      where: { code_kind: { code, kind } },
      update: { data: JSON.stringify(data), fetchedAt: new Date() },
      create: { code, kind, data: JSON.stringify(data) },
    })));
  },
};
