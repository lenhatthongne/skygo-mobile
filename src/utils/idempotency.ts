import { randomUUID } from 'expo-crypto';

/** A fresh Idempotency-Key for a new payment attempt. */
export const newIdempotencyKey = () => randomUUID();
