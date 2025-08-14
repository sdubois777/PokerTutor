// FILE: src/engine/util.ts
export const EPS = 1e-6;
export const eq = (a: number, b: number) => Math.abs(a - b) <= EPS;

// ✅ Keep chips as whole integers end-to-end
export const norm = (x: number) => Math.round(x);

export const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export const chipsFromBB = (bbCount: number, bbSize: number) =>
  Math.round(bbCount * bbSize);
