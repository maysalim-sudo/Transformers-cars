/**
 * The working tools' motion between their cart and their part (GarageState.tools). Scroll-driven, no time:
 * scrolling back plays it backwards, and reduced motion changes nothing.
 */
type Vec3 = [number, number, number];

/** how high a tool lifts on its way, so it clears the car's flank and the cart's edge */
const ARC = 0.6;
/** turns the impact wrench and rivet gun make as they seat on the part */
const TURNS = 2.5;

/** where a tool is at t (0 on the cart … 1 on the part): a straight line, lifted into an arc */
export function toolAt(rest: Vec3, work: Vec3, t: number): Vec3 {
  return [rest[0] + (work[0] - rest[0]) * t, rest[1] + (work[1] - rest[1]) * t + ARC * Math.sin(Math.PI * t), rest[2] + (work[2] - rest[2]) * t];
}

/** a spinning tool's angle about its own axis (rad): it turns only over the last tenth of the way in */
export function toolSpin(t: number): number {
  return Math.max(0, (t - 0.9) / 0.1) * TURNS * 2 * Math.PI;
}
