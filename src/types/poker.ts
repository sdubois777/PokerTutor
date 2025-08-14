export type Suit = '♠' | '♥' | '♦' | '♣';
export type Card = { rank: number; suit: Suit };
export const rankLabel = (r: number) =>
  r <= 10 ? String(r) : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : 'A';
