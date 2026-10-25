/**
 * Handheld breathing: while the scroll rests, the camera drifts a little (at most 2 cm and 0.3°, at about
 * 0.2 Hz), as if an operator were holding it. It is time-based, so it lives in the scene and not in the pure
 * timeline. It settles quickly whenever the camera moves fast, and is off under reduced motion.
 */
type Vec3 = [number, number, number];
export type Sway = { offset: Vec3; yaw: number; pitch: number };
export type Handheld = { frame(now: number, pos: Vec3): Sway };

const REACH = 0.02;
const ANGLE = 0.3;
/** the camera counts as moving above 5 cm a frame */
const MOVING = 0.05;
const SETTLE_S = 0.15;
const RETURN_S = 1.5;

/** smooth noise in −1…1: three slow sines whose periods never line up */
const noise = (t: number, phase: number) =>
  (Math.sin(2 * Math.PI * 0.17 * t + phase) + 0.6 * Math.sin(2 * Math.PI * 0.23 * t + 1.3 + phase * 1.7) + 0.3 * Math.sin(2 * Math.PI * 0.31 * t + 2.1 + phase * 2.3)) / 1.9;

const STILL: Sway = { offset: [0, 0, 0], yaw: 0, pitch: 0 };

export function createHandheld(reduced: boolean): Handheld {
  let amount = 0;
  let last: Vec3 | null = null;
  let lastNow = 0;
  return {
    frame(now, pos) {
      if (reduced) return STILL;
      const dt = lastNow ? Math.min((now - lastNow) / 1000, 0.1) : 0;
      const moved = last ? Math.hypot(pos[0] - last[0], pos[1] - last[1], pos[2] - last[2]) : 0;
      last = [...pos];
      lastNow = now;
      const moving = moved > MOVING;
      amount += ((moving ? 0 : 1) - amount) * (1 - Math.exp(-dt / (moving ? SETTLE_S : RETURN_S)));
      const t = now / 1000;
      const r = (REACH / Math.sqrt(3)) * amount;
      return {
        offset: [noise(t, 0) * r, noise(t, 2.4) * r, noise(t, 4.1) * r],
        yaw: noise(t, 1.1) * ANGLE * amount,
        pitch: noise(t, 3.3) * ANGLE * amount,
      };
    },
  };
}
