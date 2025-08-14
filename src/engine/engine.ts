import type { Player, GameState, TableCfg, Score } from "./types";
import { makeDeck, shuffle, cardLabel } from "./deck";
import { evaluateBest7, compareScores, describeScore, bestFive } from "./eval";
import { norm, eq } from "./util";

// ---------------- helpers ----------------

const nextIdx = (st: GameState, i: number) => (i + 1) % st.players.length;

export function maxBet(st: GameState) {
  return Math.max(...st.players.map((p) => p.bet));
}

export function toCall(st: GameState, i: number) {
  // clamp tiny float drift and keep integer chips
  const diff = maxBet(st) - st.players[i].bet;
  return diff <= 0 ? 0 : Math.max(0, Math.round(diff));
}

function firstToActPreflop(st: GameState) {
  const sbIdx = nextIdx(st, st.button);
  const bbIdx = nextIdx(st, sbIdx);
  return nextIdx(st, bbIdx);
}
function firstToActPostflop(st: GameState) {
  return nextIdx(st, st.button);
}

function allBetsSettled(st: GameState) {
  const mx = maxBet(st);
  for (let i = 0; i < st.players.length; i++) {
    const p = st.players[i];
    if (!p.folded && !p.allIn) {
      if (!eq(p.bet, mx)) return false;
      if (!p.acted) return false;
    }
  }
  return true;
}

export function countEligible(st: GameState) {
  // also exclude zero-stack seats for safety
  return st.players.filter((p) => !p.folded && !p.allIn && p.stack > 0).length;
}

function nextEligibleFrom(st: GameState, start: number) {
  let i = start;
  for (let k = 0; k < st.players.length; k++) {
    const p = st.players[i];
    if (!p.folded && !p.allIn && p.stack > 0) return i;
    i = nextIdx(st, i);
  }
  return start;
}

// ---------------- hand init / streets ----------------

function initPlayers(n: number): Player[] {
  const ps: Player[] = [];
  for (let i = 0; i < n; i++)
    ps.push({
      id: String(i),
      name: i === 0 ? "You" : `Bot ${i}`,
      isHuman: i === 0,
      stack: 1000,
      bet: 0,
      folded: false,
      allIn: false,
      acted: false,
      cards: [],
    });
  return ps;
}

function postBlind(st: GameState, i: number, amt: number) {
  const p = st.players[i];
  const pay = norm(Math.min(amt, p.stack));
  p.stack = norm(p.stack - pay);
  p.bet = norm(p.bet + pay);
  st.contrib[i] = norm(st.contrib[i] + pay);

  // IMPORTANT: busted blind is all-in (prevents check loops)
  if (p.stack <= 0) {
    p.stack = 0;
    p.allIn = true;
  }

  st.handHistory.push(`${p.name} posts ${amt === st.sb ? "SB" : "BB"} ${pay}`);
}
function burn(st: GameState) {
  st.deck.pop();
}
function dealHole(st: GameState) {
  let i = nextIdx(st, st.button);
  for (let r = 0; r < 2; r++) {
    for (let k = 0; k < st.players.length; k++) {
      const p = st.players[i];
      if (!p.folded) p.cards.push(st.deck.pop()!);
      i = nextIdx(st, i);
    }
  }
}

export function startHand(
  prev?: GameState,
  seats: number = 6,
  _table?: TableCfg,
  _personaBySeat?: Record<number, unknown>
): GameState {
  const deck = shuffle(makeDeck());
  const sb = 5;
  const bb = 10;
  const button = prev ? nextIdx(prev, prev.button) : 0;

  const players = prev
    ? prev.players.map((p) => {
        const q: Player = {
          ...p,
          bet: 0,
          folded: false,
          allIn: false,
          acted: false,
          cards: [],
        };
        // table-stakes: sit out if you're busto (UI may offer rebuy between hands)
        if (q.stack <= 0) q.folded = true;
        q.stack = norm(q.stack);
        return q;
      })
    : initPlayers(seats);

  const st: GameState = {
    deck,
    board: [],
    players,
    button,
    street: "preflop",
    sb,
    bb,
    potCommitted: 0,
    contrib: new Array(players.length).fill(0),
    current: 0,
    lastRaiseSize: bb,
    handHistory: [],
    handEnded: false,
    preflopAggressor: null,
    aggressor: null,
    prevAggressor: null,
  };

  const sbIdx = nextIdx(st, button);
  const bbIdx = nextIdx(st, sbIdx);
  postBlind(st, sbIdx, sb);
  postBlind(st, bbIdx, bb);

  // paranoia: if a blind busted, ensure allIn=true
  [sbIdx, bbIdx].forEach((i) => {
    const p = st.players[i];
    if (p.stack <= 0) {
      p.stack = 0;
      p.allIn = true;
    }
  });

  dealHole(st);
  st.current = nextEligibleFrom(st, firstToActPreflop(st));
  st.players.forEach((p) => (p.acted = false));
  st.handHistory.push(
    `➡️ PREFLOP — BTN: ${st.players[button].name} | SB: ${st.players[sbIdx].name} | BB: ${st.players[bbIdx].name}`
  );
  return st;
}

function moveBetsToPot(st: GameState) {
  st.potCommitted = norm(
    st.potCommitted + st.players.reduce((a, p) => a + p.bet, 0)
  );
  st.players.forEach((p) => (p.bet = 0));
  st.lastRaiseSize = st.bb;
  st.players.forEach((p) => (p.acted = false));
}

function nextStreet(st: GameState) {
  if (st.street === "preflop") {
    burn(st);
    st.board.push(st.deck.pop()!, st.deck.pop()!, st.deck.pop()!);
    st.prevAggressor = st.preflopAggressor;
    st.aggressor = null;
    st.street = "flop";
    st.current = nextEligibleFrom(st, firstToActPostflop(st));
  } else if (st.street === "flop") {
    burn(st);
    st.board.push(st.deck.pop()!);
    st.prevAggressor = st.aggressor;
    st.aggressor = null;
    st.street = "turn";
    st.current = nextEligibleFrom(st, firstToActPostflop(st));
  } else if (st.street === "turn") {
    burn(st);
    st.board.push(st.deck.pop()!);
    st.prevAggressor = st.aggressor;
    st.aggressor = null;
    st.street = "river";
    st.current = nextEligibleFrom(st, firstToActPostflop(st));
  } else {
    st.street = "showdown";
    showdown(st);
    return;
  }
  st.handHistory.push(
    `➡️ ${st.street.toUpperCase()} ${st.board.map(cardLabel).join(" ")}`
  );
}

// ---------------- actions ----------------

function rotateToNext(st: GameState) {
  let i = nextIdx(st, st.current);
  for (let k = 0; k < st.players.length; k++) {
    const p = st.players[i];
    if (!p.folded && !p.allIn && p.stack > 0) {
      st.current = i;
      return;
    }
    i = nextIdx(st, i);
  }
  st.current = i;
}

function awardIfOnlyOne(st: GameState) {
  const alive = st.players.filter((p) => !p.folded);
  if (alive.length === 1) {
    const w = alive[0];
    const total = norm(
      st.potCommitted + st.players.reduce((a, p) => a + p.bet, 0)
    );
    w.stack = norm(w.stack + total);
    st.handHistory.push(`${w.name} wins ${total} (everyone else folded)`);
    st.handEnded = true;
    return true;
  }
  return false;
}

function foldAction(st: GameState, i: number) {
  const p = st.players[i];
  p.folded = true;
  p.acted = true;
  st.handHistory.push(`${p.name} folds`);
}
function callAction(st: GameState, i: number) {
  const need = toCall(st, i);
  const p = st.players[i];
  const pay = norm(Math.min(need, p.stack));
  p.stack = norm(p.stack - pay);
  p.bet = norm(p.bet + pay);
  st.contrib[i] = norm(st.contrib[i] + pay);
  if (eq(p.stack, 0)) {
    p.stack = 0;
    p.allIn = true;
  }
  p.acted = true;
  st.handHistory.push(need === 0 ? `${p.name} checks` : `${p.name} calls ${pay}`);
}
function raiseToAction(st: GameState, i: number, target: number) {
  target = norm(target);
  const p = st.players[i];
  const add = Math.max(0, target - p.bet);
  if (p.stack <= 0 || add <= 0) {
    callAction(st, i);
    return;
  }
  const put = norm(Math.min(add, p.stack));
  const beforeMax = maxBet(st);

  p.stack = norm(p.stack - put);
  p.bet = norm(p.bet + put);
  st.contrib[i] = norm(st.contrib[i] + put);
  if (eq(p.stack, 0)) {
    p.stack = 0;
    p.allIn = true;
  }

  const newMax = maxBet(st);
  const raiseSize = newMax - beforeMax;
  if (raiseSize >= st.lastRaiseSize) st.lastRaiseSize = raiseSize;

  st.players.forEach((q, qi) => {
    if (!q.folded && !q.allIn) q.acted = qi === i;
  });

  if (st.street === "preflop") st.preflopAggressor = i;
  else st.aggressor = i;

  st.handHistory.push(`${p.name} raises to ${p.bet}`);
}

export function minRaiseTarget(st: GameState) {
  const mx = maxBet(st);
  return mx + Math.max(st.lastRaiseSize, st.bb);
}

export function step(
  st: GameState,
  act: { type: "fold" | "call" | "raise"; to?: number }
) {
  if (st.handEnded) return st;

  // one player left before acting? end immediately
  if (awardIfOnlyOne(st)) return st;

  const i = st.current;

  if (act.type === "fold") {
    foldAction(st, i);
    if (awardIfOnlyOne(st)) return st;
    rotateToNext(st);
  } else if (act.type === "call") {
    callAction(st, i);
    if (awardIfOnlyOne(st)) return st;
    rotateToNext(st);
  } else {
    const tgt = Math.max(minRaiseTarget(st), act.to ?? maxBet(st));
    raiseToAction(st, i, tgt);
    if (awardIfOnlyOne(st)) return st;
    rotateToNext(st);
  }

  // if betting is locked (one eligible player), fast-forward streets
  while (!st.handEnded && countEligible(st) <= 1) {
    moveBetsToPot(st);
    if (st.street === "river") {
      st.street = "showdown";
      showdown(st);
      break;
    }
    nextStreet(st);
  }

  // end of a betting round?
  if (!st.handEnded && (countEligible(st) === 0 || allBetsSettled(st))) {
    moveBetsToPot(st);
    if (st.street === "river") {
      st.street = "showdown";
      showdown(st);
    } else {
      nextStreet(st);
    }
  }

  return st;
}

// ---------------- showdown (side pots + logs) ----------------

function showdown(st: GameState) {
  // if only one non-folded player remains
  const alive = st.players.filter((p) => !p.folded);
  if (alive.length === 1) {
    const w = alive[0];
    const total = norm(
      st.potCommitted + st.players.reduce((a, p) => a + p.bet, 0)
    );
    w.stack = norm(w.stack + total);
    st.handHistory.push(`Hand ends — all opponents folded. ${w.name} wins ${total}.`);
    st.handEnded = true;
    return;
  }

  // reset street bets (safety)
  st.players.forEach((p) => (p.bet = 0));

  // Build pot layers (main + side pots) from contributions.
  const contrib = st.contrib.slice();
  const segments: { amount: number; participants: number[] }[] = [];

  while (true) {
    const everyone = contrib.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0);
    if (everyone.length === 0) break;

    // single unmatched stack left => uncalled, refund it
    if (everyone.length === 1) {
      const i = everyone[0];
      if (!st.players[i].folded && contrib[i] > 0) {
        st.players[i].stack = norm(st.players[i].stack + contrib[i]);
        st.handHistory.push(`${st.players[i].name} gets back ${contrib[i]} uncalled.`);
      }
      contrib[i] = 0;
      continue;
    }

    // peel a layer the size of the minimum contribution still in
    let m = Infinity;
    for (const i of everyone) m = Math.min(m, contrib[i]);

    const amount = m * everyone.length; // folded chips still size the pot
    const participants = everyone.filter((i) => !st.players[i].folded); // only non-folded can win
    segments.push({ amount, participants });

    for (const i of everyone) contrib[i] = norm(contrib[i] - m);
  }

  // (Optional) coalesce adjacent segments with same participants (cleaner logs)
  const merged: { amount: number; participants: number[] }[] = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (
      last &&
      last.participants.length === seg.participants.length &&
      last.participants.every((v, i) => v === seg.participants[i])
    ) {
      last.amount = norm(last.amount + seg.amount);
    } else {
      merged.push({ amount: seg.amount, participants: seg.participants.slice() });
    }
  }

  // Precompute showdown scores
  const scores: Score[] = st.players.map((p) =>
    !p.folded ? evaluateBest7([...p.cards, ...st.board]) : [0, 0, 0, 0, 0, 0]
  );

  // Award merged pots
  let potNo = 1;
  for (const seg of merged) {
    if (seg.participants.length === 0) continue;

    const contestants = seg.participants;
    const contestantNames = contestants.map((i) => st.players[i].name).join(", ");
    st.handHistory.push(
      `Pot ${potNo} — contestants: ${contestantNames} (amount: ${seg.amount})`
    );

    // find winners among contestants
    let bestIdxs: number[] = [];
    let bestScore: Score | null = null;
    for (const i of contestants) {
      const s = scores[i];
      if (!bestScore) {
        bestScore = s;
        bestIdxs = [i];
      } else {
        const c = compareScores(s, bestScore);
        if (c > 0) {
          bestScore = s;
          bestIdxs = [i];
        } else if (c === 0) {
          bestIdxs.push(i);
        }
      }
    }

    // split this pot among winners
    const share = Math.floor(seg.amount / bestIdxs.length);
    let remainder = seg.amount - share * bestIdxs.length;
    for (const i of bestIdxs) {
      st.players[i].stack = norm(st.players[i].stack + share);
      if (remainder > 0) {
        st.players[i].stack = norm(st.players[i].stack + 1);
        remainder--;
      }
    }

    const winnerNames = bestIdxs.map((i) => st.players[i].name).join(" & ");
    st.handHistory.push(
      `→ ${winnerNames} win${bestIdxs.length > 1 ? "" : "s"} ${seg.amount} with ${describeScore(bestScore!)}.`
    );
    potNo++;
  }

  // Exact best five for every non-folded player (clarity)
  for (let i = 0; i < st.players.length; i++) {
    const p = st.players[i];
    if (p.folded) continue;
    const { score, five } = bestFive([...p.cards, ...st.board]);
    st.handHistory.push(
      `  • ${p.name}: ${describeScore(score)} — ${five.map(cardLabel).join(" ")}`
    );
  }

  st.handHistory.push(
    `Showdown complete. Board: ${st.board.map(cardLabel).join(" ")}`
  );
  st.handEnded = true;
}
