// FILE: src/engine/deck.ts
import { type Card, type Suit } from "./types";

export const SUITS: Suit[] = ["♠", "♥", "♦", "♣"];
export const RANKS = [2,3,4,5,6,7,8,9,10,11,12,13,14] as const;

export const rankLabel = (r: number) =>
  r <= 10 ? String(r) : r === 11 ? "J" : r === 12 ? "Q" : r === 13 ? "K" : "A";

export const cardLabel = (c: Card) => `${rankLabel(c.rank)}${c.suit}`;

export function makeDeck(): Card[] {
  const d: Card[] = [];
  for (const s of SUITS) for (const r of RANKS) d.push({ rank: r, suit: s });
  return d;
}

export function shuffle<T>(a: T[], rng: () => number = Math.random) {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}
