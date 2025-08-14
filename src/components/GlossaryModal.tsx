import { useMemo, useState } from "react";

type Gloss = { term: string; def: string };

const POS_GUIDE: { pos: string; tip: string }[] = [
  { pos: "UTG", tip: "Tight. Raise strong broadways (AK,AQ,AJ), pairs 77+, suited A5–A2. Rarely limp." },
  { pos: "HJ",  tip: "Wider. Add KQ,KJ,QJ, ATs+, T9s–76s, small pairs. Still value-heavy." },
  { pos: "CO",  tip: "Wide. Any pair, most aces, many suited kings/queens, suited connectors/gappers." },
  { pos: "BTN", tip: "Widest. Raise most suited hands, broadways, connectors/gappers. Pressure blinds." },
  { pos: "SB",  tip: "Tight. OOP postflop. Mostly raise-or-fold; complete selectively." },
  { pos: "BB",  tip: "Defend wide vs small opens; raise strong value & good bluffs. Check when free." },
];

const GLOSSARY: Gloss[] = [
  { term: "Button (BTN)", def: "Dealer position; acts last postflop. Most profitable seat." },
  { term: "Cutoff (CO)", def: "Right of the button. Can open wide and 3-bet light vs late opens." },
  { term: "Hijack (HJ)", def: "Two to the right of the button. Medium-wide opens." },
  { term: "UTG", def: "Under the Gun; first to act preflop after blinds. Tightest opens." },
  { term: "Small Blind (SB)", def: "Posts SB; out of position postflop. Play tighter; avoid lots of limps." },
  { term: "Big Blind (BB)", def: "Posts BB; last to act preflop. Defends wider (1 BB invested)." },
  { term: "Open-raise", def: "First raise in an unopened pot (preflop)." },
  { term: "Limp", def: "Enter the pot by calling preflop instead of raising." },
  { term: "Limper", def: "A player who limps." },
  { term: "Iso-raise", def: "Raise over one or more limpers to isolate and take initiative." },
  { term: "Squeeze", def: "Re-raise (3-bet) after a raise and at least one call." },
  { term: "Call", def: "Match the current bet." },
  { term: "Check", def: "Decline to bet when no bet is facing you." },
  { term: "Bet", def: "First wager on a street when no bet exists." },
  { term: "Raise / 3-bet / 4-bet", def: "Increase an existing bet. 3-bet = re-raise; 4-bet = raise the 3-bet." },
  { term: "C-bet (Continuation bet)", def: "Preflop raiser bets again on the flop (barrels on later streets)." },
  { term: "Barrel", def: "Follow-up bet on a later street after betting the previous street." },
  { term: "Check-raise", def: "Check, then raise after someone bets." },
  { term: "Donk bet", def: "Out-of-position bet into the preflop aggressor." },
  { term: "Range", def: "The set of hands a player could have given their actions." },
  { term: "Tight / Loose", def: "Tight = few hands; Loose = many hands." },
  { term: "NIT / TAG / LAG", def: "NIT=tight-passive; TAG=tight-aggressive; LAG=loose-aggressive." },
  { term: "Kicker", def: "Side card that breaks ties when primary ranks match." },
  { term: "Nuts", def: "The best possible hand at the moment." },
  { term: "Draw", def: "FD = Flush Draw, OESD = open-ended straight draw, Gutshot = inside straight draw." },
  { term: "Pot odds", def: "Call/(pot+call). Call when this ≤ your equity." },
  { term: "Equity", def: "Your chance to win at showdown if all cards are dealt." },
  { term: "SPR", def: "Stack-to-Pot Ratio: effective stack ÷ pot; low SPR favors big made hands." },
  { term: "Side pot", def: "Extra pot when players are all-in for different amounts." },
  { term: "Showdown", def: "After the river, remaining players reveal; best 5-card hand wins each pot." },
];

export default function GlossaryModal({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => GLOSSARY.filter(g =>
      g.term.toLowerCase().includes(q.toLowerCase()) ||
      g.def.toLowerCase().includes(q.toLowerCase())),
    [q]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-3xl bg-neutral-900 ring-1 ring-neutral-700 shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-neutral-700">
          <div className="text-lg font-semibold">Glossary & Quick Guide</div>
          <button onClick={onClose} className="text-sm px-2 py-1 rounded-lg bg-neutral-700 hover:bg-neutral-600">Close</button>
        </div>
        <div className="p-4 space-y-5 overflow-auto max-h-[70vh]">
          <section>
            <div className="text-xs uppercase tracking-wide text-neutral-300 mb-1">Position Quick Tips (6-max)</div>
            <div className="grid grid-cols-1 gap-1 text-sm">
              {POS_GUIDE.map((r) => (
                <div key={r.pos} className="flex items-start gap-2">
                  <span className="w-12 font-mono text-neutral-200">{r.pos}</span>
                  <span className="text-neutral-300">{r.tip}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search terms…"
                className="w-full rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm"
              />
            </div>
            <ul className="space-y-2 text-sm">
              {filtered.map((g) => (
                <li key={g.term}>
                  <div className="font-medium text-neutral-100">{g.term}</div>
                  <div className="text-neutral-300">{g.def}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
