export type Party = { adults: number; children: number; infants: number };

export const MAX_SEATS = 9;

/** Passengers who occupy a seat (infants sit on an adult's lap). */
export const seatCount = (p: Party) => p.adults + p.children;
export const totalPassengers = (p: Party) => p.adults + p.children + p.infants;

export function partySummary(p: Party) {
  const parts = [`${p.adults} người lớn`];
  if (p.children > 0) parts.push(`${p.children} trẻ em`);
  if (p.infants > 0) parts.push(`${p.infants} em bé`);
  return parts.join(', ');
}
