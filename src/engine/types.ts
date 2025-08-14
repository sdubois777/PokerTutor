export type Suit = "♠" | "♥" | "♦" | "♣";

export type Card = { rank: number; suit: Suit };

// Hand score: [category, ...kickers]
// 8 SF, 7 Quads, 6 FH, 5 Flush, 4 Str, 3 Trips, 2 TwoPair, 1 Pair, 0 High
export type Score = number[];

export type Street = "preflop" | "flop" | "turn" | "river" | "showdown";

export type Player = {
  id: string;
  name: string;
  isHuman: boolean;
  stack: number;
  bet: number;
  folded: boolean;
  allIn: boolean;
  acted: boolean;
  cards: Card[];
};

export interface GameState {
  deck: Card[];
  board: Card[];
  players: Player[];
  button: number;
  street: Street;
  sb: number;
  bb: number;
  potCommitted: number;
  contrib: number[];
  current: number;
  lastRaiseSize: number;
  handHistory: string[];
  handEnded: boolean;
  preflopAggressor: number | null;
  aggressor: number | null;
  prevAggressor: number | null;
}

export type Persona = "NIT" | "TAG" | "LAG";

export type RangeCfg = {
  OPEN: number[];
  CALL: number[];
  ISO: number[];
  THREE_BET: number;
};

export type TableCfg = {
  mode: "cash" | "tournament";
  minBuyBB: number;   // e.g., 50
  maxBuyBB: number;   // e.g., 200
  startBB: number;    // e.g., 100
  rebuyHandsLeft: number; // tournament rebuy window (hands remaining)
};
