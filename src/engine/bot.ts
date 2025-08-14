import { type GameState, type Persona, type RangeCfg } from "./types";
import { minRaiseTarget, maxBet, toCall, countEligible } from "./engine";
import { AGGR, isLimpedPreflop, isPreflopUnraised, posIndexFromButton, preflopRating } from "./personas";
import { evaluateBest7, hasFlushDraw, hasOpenEnder } from "./eval";

export function botAction(
  st: GameState,
  i: number,
  cfg: RangeCfg,
  persona: Persona
): { type: "fold" | "call" | "raise"; to?: number } {
  const p = st.players[i]; if (p.folded || p.allIn) return { type: "call" };
  const need = toCall(st, i);
  const potLike = st.potCommitted + st.players.reduce((a, q) => a + q.bet, 0);
  const ag = AGGR[persona];

  if (st.street !== "preflop" && countEligible(st) <= 1) return { type: "call" };

  if (st.street === "preflop") {
    const r = preflopRating(p.cards[0], p.cards[1]);
    const pos = posIndexFromButton(st, i);
    const unraised = isPreflopUnraised(st);
    const limped = isLimpedPreflop(st);
    const { OPEN, CALL, ISO, THREE_BET } = cfg;

    if (unraised) {
      if (pos === 2) {
        if (need === 0) { if (r >= ISO[pos]) return { type: "raise", to: Math.max(minRaiseTarget(st), Math.round(st.bb * 3)) }; return { type: "call" }; }
      } else {
        if (r >= OPEN[pos]) return { type: "raise", to: Math.max(Math.round(st.bb * 2.5), minRaiseTarget(st)) };
        if (r >= CALL[pos]) return { type: "call" };
        return { type: "fold" };
      }
    }

    if (limped) {
      if (pos === 2 && need === 0) { if (r >= ISO[pos]) return { type: "raise", to: Math.max(minRaiseTarget(st), Math.round(st.bb * 3)) }; return { type: "call" }; }
      if (r >= ISO[pos]) return { type: "raise", to: Math.max(minRaiseTarget(st), maxBet(st) + Math.max(st.bb * 2, need * 2)) };
      if (r >= CALL[pos]) return { type: "call" };
      return { type: "fold" };
    }

    if (r >= THREE_BET) return { type: "raise", to: Math.max(minRaiseTarget(st), maxBet(st) + Math.max(Math.round(need * 2.5), st.bb * 2)) };
    const priced = need <= Math.max(st.bb * 3, Math.floor(potLike * 0.4));
    if (r >= CALL[pos] && priced) return { type: "call" };
    return { type: "fold" };
  }

  const myScore = evaluateBest7([...p.cards, ...st.board]);
  const madeStrong = myScore[0] >= 1 && (myScore[0] >= 3 || myScore[1] >= 11);
  const drawy = hasFlushDraw([...p.cards, ...st.board]) || hasOpenEnder([...p.cards, ...st.board]);

  if (need === 0) {
    if (madeStrong) return { type: "raise", to: Math.max(minRaiseTarget(st), maxBet(st) + Math.round(potLike * 0.5)) };
    if (st.street === "flop" && st.prevAggressor === i && Math.random() < ag.cbetFlop) return { type: "raise", to: Math.max(minRaiseTarget(st), maxBet(st) + Math.round(potLike * 0.5)) };
    if (st.street === "turn" && st.prevAggressor === i && Math.random() < ag.cbetTurn) return { type: "raise", to: Math.max(minRaiseTarget(st), maxBet(st) + Math.round(potLike * 0.5)) };
    if (drawy && Math.random() < ag.bluff) return { type: "raise", to: Math.max(minRaiseTarget(st), maxBet(st) + Math.round(potLike * 0.4)) };
    return { type: "call" };
  } else {
    if (madeStrong) return { type: "call" };
    const priced = need <= Math.max(st.bb * 3, Math.floor(potLike * 0.35));
    if (drawy && priced) return { type: "call" };
    return { type: "fold" };
  }
}
