// FILE: src/engine/coach.ts
import { type GameState, type RangeCfg } from "./types";
import { toCall } from "./engine";
import { preflopRating, posIndexFromButton, isLimpedPreflop, isPreflopUnraised } from "./personas";
import { evaluateBest7, describeScore } from "./eval";

export function coachHint(st: GameState, i: number, cfg: RangeCfg) {
  // Hand over?
  if (st.handEnded || st.street === "showdown") {
    return { action: "—", reason: "Showdown complete. Hand over." } as const;
  }

  const p = st.players[i];

  // ✅ Guard: if you’re busted (no cards because you’re sitting out), don’t crash
  if (p.folded || p.cards.length < 2) {
    return { action: "—", reason: "You’re out of chips / sitting out. Rebuy between hands to get cards." } as const;
  }

  const need = toCall(st, i);

  if (st.street === "preflop") {
    const r = preflopRating(p.cards[0], p.cards[1]);
    const pos = posIndexFromButton(st, i);
    const label = ["Button","Small Blind","Big Blind","UTG","Hijack","Cutoff"][pos] ?? "Pos";
    const unraised = isPreflopUnraised(st);
    const limped = isLimpedPreflop(st);
    const { OPEN, CALL, ISO, THREE_BET } = cfg;

    if (unraised) {
      if (pos === 2 && need === 0) {
        if (r >= ISO[pos]) return { action: "Raise", reason: `${label}. Raise your option.` } as const;
        return { action: "Check", reason: `${label}. Free flop.` } as const;
      }
      if (r >= OPEN[pos]) return { action: "Raise", reason: `${label}. Open (≈2.5×).` } as const;
      if (r >= CALL[pos]) return { action: "Call", reason: `${label}. Limp is fine here.` } as const;
      return { action: "Fold", reason: `${label}. Too weak to open.` } as const;
    }

    if (limped) {
      if (pos === 2 && need === 0) {
        if (r >= ISO[pos]) return { action: "Raise", reason: `${label}. Raise your option.` } as const;
        return { action: "Check", reason: `${label}. Free flop.` } as const;
      }
      if (r >= ISO[pos]) return { action: "Raise", reason: `${label}. Iso-raise over limpers.` } as const;
      if (r >= CALL[pos]) return { action: "Call", reason: `${label}. Over-limp okay.` } as const;
      return { action: "Fold", reason: `${label}. Skip.` } as const;
    }

    if (r >= THREE_BET) return { action: "Raise", reason: `${label}. 3-bet premium.` } as const;
    const potLike = st.potCommitted + st.players.reduce((a, q) => a + q.bet, 0);
    const priced = need <= Math.max(st.bb * 3, Math.floor(potLike * 0.4));
    if (r >= CALL[pos] && priced) return { action: "Call", reason: `${label}. Defend at this price.` } as const;
    return { action: "Fold", reason: `${label}. Weak or too expensive.` } as const;
  }

  // Postflop
  const s = evaluateBest7([...p.cards, ...st.board]);
  if (need === 0) return { action: "Check", reason: `${describeScore(s)}.` } as const;
  const decent = s[0] >= 3 || (s[0] === 1 && s[1] >= 12);
  if (decent) return { action: "Call", reason: `${describeScore(s)}.` } as const;
  return { action: "Fold", reason: `Weak vs bet.` } as const;
}
