/**
 * Master timeline of the hero, as fractions of the scroll track (0 = top of the hero, 1 = last panel).
 * The track has 8 panels of 100svh: hero, 01 … 07. Pure functions, unit-tested.
 */
export const SEQUENCE = {
  explodeStart: 0.03,
  explodeFull: 0.27,
  reassembleStart: 0.58,
  reassembleEnd: 0.76,
  transformStart: 0.79,
  transformEnd: 0.93,
} as const;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** Track progress → explosion amount (0 assembled … 1 fully exploded). */
export function explodeAt(p: number): number {
  const s = SEQUENCE;
  if (p <= s.explodeStart) return 0;
  if (p < s.explodeFull) return smoothstep((p - s.explodeStart) / (s.explodeFull - s.explodeStart));
  if (p <= s.reassembleStart) return 1;
  if (p < s.reassembleEnd) return 1 - smoothstep((p - s.reassembleStart) / (s.reassembleEnd - s.reassembleStart));
  return 0;
}

/** Track progress → transformation (0 stock … 1 tuned). Symmetric: scrolling back up un-transforms. */
export function transformAt(p: number): number {
  const s = SEQUENCE;
  return smoothstep(clamp01((p - s.transformStart) / (s.transformEnd - s.transformStart)));
}

/** Reduced motion: no wipe — the car is tuned for the whole transformation panel and after. */
export function reducedTransformAt(p: number): number {
  return transformAt(p) > 0 ? 1 : 0;
}

const EASE = 0.12;
const ease = (from: number, to: number) => {
  const next = from + (to - from) * EASE;
  return Math.abs(to - next) < 0.0005 ? to : next;
};

export type HeroState = { e: number; tx: number };
export type HeroStep = HeroState & { eGoal: number; txGoal: number; snapped: boolean };

/**
 * One frame of the hero. Eases towards the scroll targets while on screen; snaps straight
 * to them on the first frame, while off screen (deep links, jumps) and under reduced motion,
 * so nothing is left mid-ease to replay later and the loop can always settle.
 */
export function heroStep(prev: HeroState, p: number, o: { visible: boolean; reduced: boolean; first: boolean }): HeroStep {
  const eGoal = o.reduced ? (explodeAt(p) > 0.5 ? 1 : 0) : explodeAt(p);
  const txGoal = o.reduced ? reducedTransformAt(p) : transformAt(p);
  const snapped = o.reduced || o.first || !o.visible;
  if (snapped) return { e: eGoal, tx: txGoal, eGoal, txGoal, snapped };
  return { e: ease(prev.e, eGoal), tx: ease(prev.tx, txGoal), eGoal, txGoal, snapped };
}
