// Hotel options shared with a customer: the snapshot stored with each share.
export interface SharedHotel {
  name: string;
  stars: number;
  address: string;
  thumb?: string;
  room: string;
  board: string;
  refundable: boolean;
  /** Customer price (agency markup included), INR paise. */
  perNightPaise: number;
  totalPaise: number;
  /** Not a live supplier rate. Shown to the agent only. */
  sample: boolean;
}

export const MAX_SHARED_HOTELS = 4;
