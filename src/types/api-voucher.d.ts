declare namespace Api {
  /** A voucher the signed-in customer can use now. */
  interface Voucher {
    code: string;
    title: string;
    /** Exactly one of `percentOff` and `amountOff` is set. */
    percentOff: number | null;
    amountOff: number | null;
    maxDiscount: number | null;
    minOrder: number;
    /** ISO-8601 UTC, or null when it does not expire. */
    expiresAt: string | null;
    status: 'AVAILABLE' | 'USED' | 'EXPIRED';
  }
}
