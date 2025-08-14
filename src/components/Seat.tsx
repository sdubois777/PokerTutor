// FILE: src/components/Seat.tsx
import React from "react";
import CardPip from "./CardPip";
import Chip from "./Chip";

type PlayerView = {
  name: string;
  cards: { rank: number; suit: "♠" | "♥" | "♦" | "♣" }[];
  folded: boolean;
  allIn: boolean;
  stack: number;
  bet: number;
};

export default function Seat({
  player, label, isBtn, isActing, reveal
}:{
  player: PlayerView;
  label: string;
  isBtn: boolean;
  isActing: boolean;
  reveal: boolean;
}) {
  const p = player;
  return (
    <div className={`flex flex-col items-center gap-1 p-2 rounded-2xl ${isActing ? "ring-2 ring-emerald-400" : ""}`}>
      <div className="text-xs text-neutral-300 flex items-center gap-1">
        {label} {isBtn && <Chip>BTN</Chip>}
      </div>
      <div className="text-sm font-semibold text-neutral-100">{p.name}</div>
      <div className="flex gap-1">{p.cards.map((c, i) => (<CardPip key={i} c={c} hidden={!reveal} />))}</div>
      <div className="text-xs text-neutral-300">Stack: {p.stack} • Bet: {p.bet}</div>
      {p.folded && <div className="text-xs text-rose-400">FOLDED</div>}
      {p.allIn && !p.folded && <div className="text-xs text-indigo-400">ALL-IN</div>}
    </div>
  );
}
