import { type Persona, type RangeCfg, type GameState, type Card } from "./types";

export const RANGES: Record<"loose" | "standard" | "tight", RangeCfg> = {
  loose:    { OPEN: [20,26,999,22,20,18], CALL: [18,20,18,18,16,14], ISO: [24,28,999,24,22,20], THREE_BET: 48 },
  standard: { OPEN: [24,28,999,24,22,18], CALL: [20,22,18,20,18,16], ISO: [28,30,999,26,24,22], THREE_BET: 50 },
  tight:    { OPEN: [28,32,999,26,24,20], CALL: [22,24,20,22,20,18], ISO: [32,34,999,30,28,24], THREE_BET: 54 },
};

export const personaToRange = (p: Persona) =>
  p === "NIT" ? "tight" : p === "LAG" ? "loose" : "standard" as const;

export const AGGR: Record<Persona, { cbetFlop: number; cbetTurn: number; bluff: number }> = {
  NIT: { cbetFlop: 0.45, cbetTurn: 0.25, bluff: 0.08 },
  TAG: { cbetFlop: 0.62, cbetTurn: 0.38, bluff: 0.12 },
  LAG: { cbetFlop: 0.75, cbetTurn: 0.50, bluff: 0.22 },
};

export function preflopRating(a: Card, b: Card) {
  const [hi, lo] = a.rank >= b.rank ? [a, b] : [b, a];
  const pair = a.rank === b.rank ? 40 + a.rank * 2 : 0;
  const suited = a.suit === b.suit ? 3 : 0;
  const broad = (hi.rank >= 11 ? 6 : 0) + (lo.rank >= 11 ? 3 : 0);
  const conn = Math.abs(a.rank - b.rank) <= 1 ? 2 : Math.abs(a.rank - b.rank) === 2 ? 1 : 0;
  const high = hi.rank + lo.rank / 10;
  return pair + suited + broad + conn + high;
}

// seat index relative to button: 0 BTN,1 SB,2 BB,3 UTG,4 HJ,5 CO
export const posIndexFromButton = (st: GameState, i: number) =>
  (i - st.button + st.players.length) % st.players.length;

export function isPreflopUnraised(st: GameState) {
  if (st.street !== "preflop") return false;
  const mx = Math.max(...st.players.map(p => p.bet));
  if (mx > st.bb) return false;
  let posted = 0; for (const p of st.players) if (p.bet > 0) posted++;
  return posted <= 2;
}

export function isLimpedPreflop(st: GameState) {
  if (st.street !== "preflop") return false;
  const mx = Math.max(...st.players.map(p => p.bet));
  if (mx !== st.bb) return false;
  let posted = 0; for (const p of st.players) if (p.bet > 0) posted++;
  return posted > 2;
}
