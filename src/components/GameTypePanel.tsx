// FILE: src/components/GameTypePanel.tsx
import React from "react";
import { type TableCfg } from "../engine/types";

export default function GameTypePanel({
  table, onSetMode
}:{
  table: TableCfg;
  onSetMode: (mode: "cash" | "tournament") => void;
}) {
  return (
    <div className="rounded-3xl p-3 bg-neutral-800/80 ring-1 ring-neutral-700 shadow-xl">
      <div className="text-xs uppercase tracking-wide text-neutral-300">Game Type</div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          className={`rounded-xl px-2 py-1 text-xs ${table.mode==="cash"?"bg-emerald-600 text-white":"bg-neutral-700 text-neutral-200 hover:bg-neutral-600"}`}
          onClick={()=> onSetMode("cash")}
        >Cash</button>
        <button
          className={`rounded-xl px-2 py-1 text-xs ${table.mode==="tournament"?"bg-emerald-600 text-white":"bg-neutral-700 text-neutral-200 hover:bg-neutral-600"}`}
          onClick={()=> onSetMode("tournament")}
        >Tournament</button>
      </div>
      <div className="mt-2 text-xs text-neutral-300">
        Buy-ins: min {table.minBuyBB}BB • start {table.startBB}BB • max {table.maxBuyBB}BB
        {table.mode==="tournament" && <span> • Rebuy window: {table.rebuyHandsLeft} hands</span>}
      </div>
    </div>
  );
}
