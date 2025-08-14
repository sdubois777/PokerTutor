import { type TableCfg } from "../engine/types";
import { chipsFromBB } from "../engine/util";

export default function BankrollPanel({
  table, bb, meStack, handEnded, onRebuy, onTopUpTo
}:{
  table: TableCfg;
  bb: number;
  meStack: number;
  handEnded: boolean;
  onRebuy: (amount: number) => void;
  onTopUpTo: (targetStack: number) => void;
}) {
  if (!handEnded) return null;

  const minBuy = chipsFromBB(table.minBuyBB, bb);
  const maxBuy = chipsFromBB(table.maxBuyBB, bb);
  const startBuy = chipsFromBB(table.startBB, bb);

  return (
    <div className="rounded-3xl p-3 bg-neutral-800/80 ring-1 ring-neutral-700 shadow-xl">
      <div className="text-xs uppercase tracking-wide text-neutral-300">Bankroll</div>

      {table.mode === "cash" ? (
        <>
          {meStack === 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button onClick={()=> onRebuy(minBuy)}  className="rounded-xl px-2 py-1 text-xs bg-neutral-700 hover:bg-neutral-600">Rebuy {minBuy}</button>
              <button onClick={()=> onRebuy(startBuy)} className="rounded-xl px-2 py-1 text-xs bg-neutral-700 hover:bg-neutral-600">Rebuy {startBuy}</button>
              <button onClick={()=> onRebuy(maxBuy)}   className="rounded-xl px-2 py-1 text-xs bg-neutral-700 hover:bg-neutral-600">Rebuy {maxBuy}</button>
            </div>
          )}
          {meStack > 0 && meStack < maxBuy && (
            <div className="mt-2">
              <button onClick={()=> onTopUpTo(maxBuy)} className="rounded-xl px-3 py-2 text-sm bg-neutral-700 hover:bg-neutral-600">
                Top-up to {maxBuy}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {meStack === 0 && (table.rebuyHandsLeft > 0 ? (
            <div className="mt-2">
              <button onClick={()=> onRebuy(startBuy)} className="rounded-xl px-3 py-2 text-sm bg-neutral-700 hover:bg-neutral-600">
                Tournament Rebuy {startBuy}
              </button>
            </div>
          ) : (
            <div className="mt-2 text-xs text-rose-300">Eliminated (rebuy closed)</div>
          ))}
        </>
      )}

      <div className="mt-2 text-[11px] text-neutral-400">Rebuys/top-ups are only allowed between hands (table-stakes rule).</div>
    </div>
  );
}
