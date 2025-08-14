// FILE: src/App.tsx
import React, { useEffect, useMemo, useState } from "react";

import { type GameState, type Persona, type RangeCfg, type TableCfg } from "./engine/types";
import { startHand, step, minRaiseTarget, maxBet, toCall, countEligible } from "./engine/engine";
import { RANGES, personaToRange, posIndexFromButton } from "./engine/personas";
import { botAction } from "./engine/bot";
import { coachHint } from "./engine/coach";
import { clone, chipsFromBB } from "./engine/util";

import CardPip from "./components/CardPip";
import Seat from "./components/Seat";
import GlossaryModal from "./components/GlossaryModal";
import GameTypePanel from "./components/GameTypePanel";
import BankrollPanel from "./components/BankrollPanel";

export default function App(){
  // Table config
  const [table, setTable] = useState<TableCfg>({
    mode: "cash",
    minBuyBB: 50,
    maxBuyBB: 200,
    startBB: 100,
    rebuyHandsLeft: 0,
  });

  // Personas for seats 1..5 (human is seat 0)
  const [personaBySeat, setPersonaBySeat] =
    useState<Record<number, Persona>>({1:"TAG",2:"NIT",3:"TAG",4:"LAG",5:"TAG"});

  // Engine state
  const [state, setState] = useState<GameState>(() =>
    startHand(undefined, 6, table, personaBySeat)
  );

  // Coach (human) range mode
  const [mode, setMode] = useState<"loose"|"standard"|"tight">("loose");
  const coachCfg: RangeCfg = RANGES[mode];

  // Glossary
  const [showGlossary, setShowGlossary] = useState(false);

  // --- Bot autoplay ---
  useEffect(()=>{
    const st = state; if (st.handEnded) return;
    const cur = st.current; const p = st.players[cur];
    if (!p.isHuman && !p.folded && !p.allIn){
      const persona = personaBySeat[cur] ?? "TAG";
      const cfg = RANGES[personaToRange(persona)];
      const act = botAction(st, cur, cfg, persona);
      const t = setTimeout(()=> setState(s=> step(clone(s), act)), 350 + Math.random()*400);
      return () => clearTimeout(t);
    }
  }, [state, personaBySeat]);

  // Safety: if it's a dead seat's turn, rotate
  useEffect(()=>{
    const p = state.players[state.current];
    if (!state.handEnded && (p.folded || p.allIn || p.stack <= 0)) {
      setState(s=>{
        const t = clone(s);
        // small inline rotate to next live
        const next = (i:number)=> (i+1)%t.players.length;
        let i = next(t.current);
        for (let k=0;k<t.players.length;k++){
          const q = t.players[i];
          if (!q.folded && !q.allIn) { t.current = i; break; }
          i = next(i);
        }
        return t;
      });
    }
  }, [state.current, state.handEnded, state.players]);

  // Computed
  const me = state.players[0];
  const myTurn = state.current===0 && !me.folded && !me.allIn && !state.handEnded;
  const need = toCall(state, 0);
  const potNow = state.potCommitted + state.players.reduce((a,p)=>a+p.bet,0);
  const hint = useMemo(()=> coachHint(state, 0, coachCfg), [state, mode]);
  const eligCount = countEligible(state);
  const canCover = me.stack >= need;
  const callLabel = need === 0 ? "Check" : (canCover ? `Call ${need}` : `All-in ${me.stack}`);
  const halfTarget = Math.max(minRaiseTarget(state), maxBet(state) + Math.floor(potNow*0.5));
  const sevTarget  = Math.max(minRaiseTarget(state), maxBet(state) + Math.floor(potNow*0.75));
  const allInTarget = me.bet + me.stack;

  const labels = (i:number)=> ["BTN","SB","BB","UTG","HJ","CO"][posIndexFromButton(state,i)] ?? "";

  // reveal logic (hide opponents until showdown, reveal lone winner if others folded)
  const alive = state.players.filter(p => !p.folded);
  const revealFor = (i:number) => {
    if (i === 0) return true; // human
    const p = state.players[i];
    if (p.folded) return false;
    if (state.handEnded && state.street === "showdown") return true;
    if (state.handEnded && alive.length === 1 && !p.folded) return true; // everyone else folded
    return false;
  };

  function onNewHand(){
    setState(s=> startHand(s, s.players.length, table, personaBySeat));
    if (table.mode === "tournament" && table.rebuyHandsLeft > 0) {
      setTable(t => ({ ...t, rebuyHandsLeft: t.rebuyHandsLeft - 1 }));
    }
  }

  // Human rebuy/top-up handlers (between hands only)
  function humanRebuy(amount: number){
    if (!state.handEnded || amount <= 0) return;
    setState(s=> { const t = clone(s); t.players[0].stack = Math.round(t.players[0].stack + amount); return t; });
  }
  function topUpToMax(targetStack: number){
    const need = Math.max(0, targetStack - me.stack);
    if (need > 0) humanRebuy(need);
  }

  return (
    <div className="min-h-screen w-full bg-neutral-900 text-neutral-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-12 gap-4">
        {/* Table */}
        <div className="col-span-12 lg:col-span-8">
          <div className="rounded-3xl p-4 bg-gradient-to-b from-emerald-900/40 to-neutral-800 ring-1 ring-neutral-700 shadow-xl">
            <div className="flex items-center justify-between text-sm text-neutral-300">
              <div>Blinds: {state.sb}/{state.bb}</div>
              <div>Street: <span className="font-semibold text-neutral-100 uppercase">{state.street}</span></div>
              <div>Pot: <span className="font-semibold">{potNow}</span></div>
            </div>

            {/* Board */}
            <div className="flex flex-col items-center justify-center py-4 gap-2">
              <div className="flex items-center gap-2">{state.board.map((c,i)=>(<CardPip key={i} c={c}/>))}</div>
              {state.street==="showdown" && <div className="text-xs text-neutral-300">Showdown complete.</div>}
            </div>

            {/* Seats */}
            <div className="grid grid-cols-3 gap-3">
              {state.players.map((p,i)=>(
                <Seat
                  key={i}
                  player={{ name:p.name, cards:p.cards, folded:p.folded, allIn:p.allIn, stack:p.stack, bet:p.bet }}
                  label={labels(i)}
                  isBtn={i===state.button}
                  isActing={i===state.current && !state.handEnded && !p.folded && !p.allIn}
                  reveal={revealFor(i)}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm text-neutral-300">
                <div>To call: <span className="font-semibold text-neutral-100">{need}</span></div>
                <div>Your stack: <span className="font-semibold text-neutral-100">{me.stack}</span></div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button disabled={!myTurn} onClick={()=> setState(s=> step(clone(s), {type:"fold"}))} className="rounded-2xl px-3 py-2 bg-rose-600/80 hover:bg-rose-600 disabled:opacity-40">Fold</button>
                <button disabled={!myTurn} onClick={()=> setState(s=> step(clone(s), {type:"call"}))} className="rounded-2xl px-3 py-2 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-40">{callLabel}</button>
                <button disabled={!myTurn || eligCount<=1} onClick={()=> setState(s=> step(clone(s), {type:"raise", to: halfTarget}))} className="rounded-2xl px-3 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40">Bet 1/2 Pot</button>
                <button disabled={!myTurn || eligCount<=1} onClick={()=> setState(s=> step(clone(s), {type:"raise", to: sevTarget}))} className="rounded-2xl px-3 py-2 bg-emerald-700/90 hover:bg-emerald-600 disabled:opacity-40">Bet 3/4 Pot</button>
                <button disabled={!myTurn || eligCount<=1 || (need>0 && me.stack<=need)} onClick={()=> setState(s=> step(clone(s), {type:"raise", to: allInTarget}))} className="col-span-4 rounded-2xl px-3 py-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40">All-in</button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <button onClick={onNewHand} className="text-xs px-2 py-1 rounded-xl bg-neutral-700 hover:bg-neutral-600">New Hand</button>
                <div className="text-xs text-neutral-400">Button: {state.players[state.button].name}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          {/* Game type toggle */}
          <GameTypePanel
            table={table}
            onSetMode={(mode)=>{
              setTable(t => ({
                ...t,
                mode,
                // tournament gets a 30-hand rebuy window
                rebuyHandsLeft: mode==="tournament" ? 30 : 0
              }));
            }}
          />

          {/* Coach mode */}
          <div className="rounded-3xl p-3 bg-neutral-800/80 ring-1 ring-neutral-700 shadow-xl">
            <div className="text-xs uppercase tracking-wide text-neutral-300">Range Mode (Coach)</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["loose","standard","tight"] as const).map(m => (
                <button key={m} onClick={()=> setMode(m)} className={`rounded-xl px-2 py-1 text-xs ${mode===m?"bg-emerald-600 text-white":"bg-neutral-700 text-neutral-200 hover:bg-neutral-600"}`}>{m}</button>
              ))}
            </div>
          </div>

          {/* Glossary */}
          <div className="rounded-3xl p-3 bg-neutral-800/80 ring-1 ring-neutral-700 shadow-xl">
            <div className="text-xs uppercase tracking-wide text-neutral-300">Glossary & Quick Guide</div>
            <div className="mt-2">
              <button onClick={()=> setShowGlossary(true)} className="rounded-xl px-3 py-2 text-sm bg-neutral-700 hover:bg-neutral-600">Open</button>
            </div>
          </div>

          {/* Coach Suggestion */}
          <div className="rounded-3xl p-4 bg-neutral-800/80 ring-1 ring-neutral-700 shadow-xl">
            <div className="text-sm uppercase tracking-wide text-neutral-300 mb-1">Coach Suggestion</div>
            <div className="text-lg font-semibold mb-1">{hint.action}</div>
            <div className="text-sm text-neutral-300">{hint.reason}</div>
            <div className="mt-3 text-xs text-neutral-400">Tip: Late position (CO/BTN) can open wider; early (UTG/HJ) tighter.</div>
          </div>

          {/* Bot Personalities */}
          <div className="rounded-3xl p-3 bg-neutral-800/80 ring-1 ring-neutral-700 shadow-xl">
            <div className="text-xs uppercase tracking-wide text-neutral-300">Bot Personalities</div>
            <div className="mt-2 space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="text-xs text-neutral-300">{state.players[i]?.name || `Seat ${i}`}</div>
                  <div className="grid grid-cols-3 gap-1">
                    {(["NIT","TAG","LAG"] as const).map(p => (
                      <button key={p} onClick={()=> setPersonaBySeat(x=>({...x, [i]:p}))} className={`rounded-md px-2 py-1 text-[11px] ${personaBySeat[i]===p?"bg-emerald-600 text-white":"bg-neutral-700 text-neutral-200 hover:bg-neutral-600"}`}>{p}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bankroll (rebuy/top-up) */}
          <BankrollPanel
            table={table}
            bb={state.bb}
            meStack={me.stack}
            handEnded={state.handEnded}
            onRebuy={(amt)=> humanRebuy(amt)}
            onTopUpTo={(target)=> topUpToMax(target)}
          />

          {/* Hand Log */}
          <div className="rounded-3xl p-4 bg-neutral-800/60 ring-1 ring-neutral-700 shadow-xl max-h-[50vh] overflow-auto">
            <div className="text-sm uppercase tracking-wide text-neutral-300 mb-2">Hand Log</div>
            <ul className="space-y-1 text-xs text-neutral-300">
              {state.handHistory.map((h,i)=>(<li key={i} className="whitespace-pre-wrap">{h}</li>))}
            </ul>
          </div>

          <div className="rounded-2xl p-3 bg-neutral-800/60 ring-1 ring-neutral-700 text-xs text-neutral-400">
            MVP: bots w/ personas, cash & tournament rebuys, basic side-pots, integer chips.
          </div>
        </div>
      </div>

      {showGlossary && <GlossaryModal onClose={()=> setShowGlossary(false)} />}
    </div>
  );
}
