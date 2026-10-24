/**
 * How the hero's progress follows the scroll. Ordinary scrolling eases (the car glides); a jump — the
 * first frame, End/Home, a scrollbar drag, an anchor link — snaps straight to the landing point, so the
 * scene never fast-forwards through the bays and fires no burst of sounds or sparks on the way.
 */
import { MAX_STEP } from "./sound/cues";

export function follow(p: number, target: number, prevTarget: number | null, dt: number, reduced: boolean): { p: number; jumped: boolean } {
  if (prevTarget === null || Math.abs(target - prevTarget) > MAX_STEP) return { p: target, jumped: true };
  if (reduced) return { p: target, jumped: false };
  const next = p + (target - p) * (1 - Math.pow(0.0015, dt));
  return { p: Math.abs(target - next) < 1e-5 ? target : next, jumped: false };
}
