// FILE: src/engine/eval.ts
import { type Card, type Score } from "./types";

function countBy<T extends string | number>(vals: T[]) {
  const m = new Map<T, number>();
  for (const v of vals) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

function isStraight(sortedDesc: number[]): number | null {
  const uniq = Array.from(new Set(sortedDesc));
  if (uniq[0] === 14) uniq.push(1);
  let run = 1;
  for (let i = 0; i < uniq.length - 1; i++) {
    if (uniq[i] - 1 === uniq[i + 1]) {
      run++;
      if (run >= 5) return uniq[i - 3];
    } else run = 1;
  }
  return null;
}

// Pick the single best 5-card hand out of 7
export function bestFive(cards7: Card[]): { score: Score; five: Card[] } {
    let best: { score: Score; five: Card[] } | null = null;
    for (const f of combos5(cards7)) {
      const s = evaluate5(f);
      if (!best || compareScores(s, best.score) > 0) {
        best = { score: s, five: f };
      }
    }
    return best!;
  }

export function evaluate5(cards: Card[]): Score {
  const ranks = cards.map(c => c.rank).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);
  const rc = Array.from(countBy(ranks)).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const sc = Array.from(countBy(suits)).sort((a, b) => (b[1] - a[1]) as number);
  const flushSuit = sc[0]?.[1] >= 5 ? sc[0][0] : null;
  const straightHigh = isStraight(ranks);

  if (flushSuit) {
    const fr = cards.filter(c => c.suit === flushSuit).map(c => c.rank).sort((a, b) => b - a);
    const sf = isStraight(fr);
    if (sf !== null) return [8, sf];
  }
  if (rc[0]?.[1] === 4) { const k = rc.find(([, n]) => n === 1)![0]; return [7, rc[0][0], k]; }
  if (rc[0]?.[1] === 3 && rc[1]?.[1] >= 2) return [6, rc[0][0], rc[1][0]];
  if (flushSuit) {
    const top5 = cards.filter(c => c.suit === flushSuit).map(c => c.rank).sort((a, b) => b - a).slice(0, 5);
    return [5, ...top5];
  }
  if (straightHigh !== null) return [4, straightHigh];
  if (rc[0]?.[1] === 3) {
    const ks = rc.filter(([, n]) => n === 1).map(([r]) => r).sort((a, b) => b - a).slice(0, 2);
    return [3, rc[0][0], ...ks];
  }
  if (rc[0]?.[1] === 2 && rc[1]?.[1] === 2) {
    const hi = Math.max(rc[0][0], rc[1][0]);
    const lo = Math.min(rc[0][0], rc[1][0]);
    const k = rc.find(([, n]) => n === 1)![0];
    return [2, hi, lo, k];
  }
  if (rc[0]?.[1] === 2) {
    const ks = rc.filter(([, n]) => n === 1).map(([r]) => r).sort((a, b) => b - a).slice(0, 3);
    return [1, rc[0][0], ...ks];
  }
  return [0, ...ranks.slice(0, 5)];
}

function* combos5<T>(arr: T[]): Generator<T[]> {
  const n = arr.length;
  for (let a = 0; a < n - 4; a++)
    for (let b = a + 1; b < n - 3; b++)
      for (let c = b + 1; c < n - 2; c++)
        for (let d = c + 1; d < n - 1; d++)
          for (let e = d + 1; e < n; e++)
            yield [arr[a], arr[b], arr[c], arr[d], arr[e]];
}

export function evaluateBest7(cards7: Card[]): Score {
  let best: Score | undefined;
  for (const f of combos5(cards7)) {
    const s = evaluate5(f);
    if (!best) { best = s; continue; }
    const L = Math.max(best.length, s.length);
    for (let i = 0; i < L; i++) {
      const A = best[i] ?? 0, B = s[i] ?? 0;
      if (B !== A) { if (B > A) best = s; break; }
    }
  }
  return best ?? [0, 0, 0, 0, 0, 0];
}

export function compareScores(a: Score, b: Score) {
  const L = Math.max(a.length, b.length);
  for (let i = 0; i < L; i++) {
    const x = a[i] ?? 0, y = b[i] ?? 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

export function describeScore(s: Score) {
  return ["High Card","One Pair","Two Pair","Three of a Kind","Straight","Flush","Full House","Four of a Kind","Straight Flush"][s[0]];
}

export function hasFlushDraw(cards: Card[], minBoard = 3) {
  const bySuit = new Map<string, number>();
  for (const c of cards) bySuit.set(c.suit, (bySuit.get(c.suit) ?? 0) + 1);
  return Array.from(bySuit.values()).some(n => n >= 4) && cards.length - 2 >= minBoard;
}

export function hasOpenEnder(cards: Card[], minBoard = 3) {
  const ranks = Array.from(new Set(cards.map(c => c.rank))).sort((a, b) => b - a);
  if (ranks[0] === 14) ranks.push(1);
  let run = 1;
  for (let i = 0; i < ranks.length - 1; i++) {
    if (ranks[i] - 1 === ranks[i + 1]) { run++; if (run >= 4) return cards.length - 2 >= minBoard; }
    else run = 1;
  }
  return false;
}
