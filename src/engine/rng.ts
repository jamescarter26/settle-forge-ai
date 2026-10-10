/** Seeded RNG (mulberry32). The state lives in `holder.rng` so it stays JSON-serialisable. */
export interface Rng {
  rng: number;
}
export function rand(h: Rng): number {
  let t = (h.rng = (h.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function randInt(h: Rng, n: number): number {
  return Math.floor(rand(h) * n);
}
export function shuffle<T>(h: Rng, arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(h, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
