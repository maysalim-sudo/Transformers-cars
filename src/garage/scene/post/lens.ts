/**
 * The pure parts of the film effects: where the lens focuses, how wide it opens, how much the camera smears,
 * and when the wheels' rims blur. The passes (lensPass.ts, flares.ts) and the car rig use these.
 */
import type { GarageState, Vec3 } from "../../timeline";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ss = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** metres from the camera to what is in focus: the part being worked on, or the car when that is out of view */
export function focusDistance(camera: Vec3, focus: Vec3, fallback: Vec3, inView: boolean): number {
  const d = dist(camera, focus);
  return inView && Number.isFinite(d) ? d : dist(camera, fallback);
}

/** how wide the lens opens (0 … 1): wide at the bays, where the work is the subject; stopped down on the drives */
export function apertureAt(s: GarageState): number {
  return 1 - 0.8 * clamp01(s.carSpeed);
}

/** how far a rim has turned into a blurred disc (0 … 1), from the wheel's spin in rad/s */
export function rimBlurAmount(spinSpeed: number): number {
  return ss(6, 30, Math.abs(spinSpeed));
}

/** the motion blur's shutter (0 … 0.5, a 180° shutter at most): none on a jump, none for a camera barely moving */
export function blurStrength(cameraDelta: number, jumped: boolean): number {
  return jumped ? 0 : 0.5 * ss(0.002, 0.02, cameraDelta);
}
