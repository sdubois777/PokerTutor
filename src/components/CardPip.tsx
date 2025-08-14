import { type Card } from "../engine/types";
import { rankLabel } from "../engine/deck";

export default function CardPip({ c, hidden = false }: { c: Card; hidden?: boolean }) {
  const red = c.suit === "♥" || c.suit === "♦";
  return (
    <div className={`w-9 h-13 rounded-lg border flex items-center justify-center text-base font-semibold shadow-sm select-none ${hidden ? "bg-neutral-700 border-neutral-600" : "bg-neutral-50 border-neutral-300"}`}>
      {hidden ? "" : <span className={red ? "text-red-600" : "text-neutral-900"}>{rankLabel(c.rank)}{c.suit}</span>}
    </div>
  );
}
