/**
 * Cue sheet of the garage hero's sound: one-shots that fire when the scroll crosses a point going forward,
 * and loops whose level follows the scene. Pure; files live in public/garage/audio/.
 */
import { type GarageState, LIGHT_ON } from "../timeline";

export type OneShot = { id: string; at: number; file: string; gain: number };
export type Loop = { id: string; file: string; gain(s: GarageState): number; rate?(s: GarageState): number };

/** A frame that moves further than this is a jump (deep link, Home/End, scrollbar drag): it fires nothing. */
export const MAX_STEP = 0.05;

export const oneShots: OneShot[] = [
  { id: "door_rattle", at: 0.01, file: "door_rattle.mp3", gain: 0.8 },
  { id: "engine_start", at: 0.02, file: "engine_start.mp3", gain: 0.9 },
  { id: "lift_up", at: 0.15, file: "lift.mp3", gain: 0.7 },
  { id: "wrench_off", at: 0.19, file: "wrench.mp3", gain: 0.8 },
  { id: "wrench_on", at: 0.22, file: "wrench.mp3", gain: 0.8 },
  { id: "lift_down", at: 0.25, file: "lift.mp3", gain: 0.6 },
  { id: "coil_settle", at: 0.37, file: "coil_settle.mp3", gain: 0.8 },
  { id: "panel_off", at: 0.49, file: "panel.mp3", gain: 0.7 },
  { id: "panel_on", at: 0.53, file: "panel.mp3", gain: 0.7 },
  { id: "weld_1", at: 0.535, file: "weld.mp3", gain: 0.6 },
  { id: "weld_2", at: 0.545, file: "weld.mp3", gain: 0.6 },
  { id: "weld_3", at: 0.555, file: "weld.mp3", gain: 0.6 },
  { id: "fan_spin", at: 0.6, file: "fan_spin.mp3", gain: 0.6 },
  ...[0.77, 0.79, 0.81, 0.83].map((at, i) => ({ id: `squeegee_${i + 1}`, at, file: "squeegee.mp3", gain: 0.6 })),
  { id: "whoosh_dark", at: 0.845, file: "whoosh.mp3", gain: 0.8 },
  { id: "cover_swoosh", at: 0.885, file: "cover_swoosh.mp3", gain: 0.9 },
  ...Array.from({ length: 8 }, (_, i) => ({ id: `spot_${i}`, at: LIGHT_ON(i), file: "spot.mp3", gain: 0.55 })),
  { id: "rev", at: 0.93, file: "rev.mp3", gain: 1 },
];

export const loops: Loop[] = [
  { id: "street", file: "street.mp3", gain: (s) => (s.bay === 0 ? 1 - s.doorOpen * 0.8 : 0) },
  // idles at the door, follows the car while it drives, off while it is parked in a bay (the engine loop
  // under the whole scroll read as a drone)
  { id: "engine", file: "engine_loop.mp3", gain: (s) => (s.carSpeed > 0 ? 0.25 + s.carSpeed * 0.75 : s.bay === 0 ? 0.25 : 0), rate: (s) => 0.8 + s.carSpeed * 0.5 },
  { id: "room", file: "room_tone.mp3", gain: (s) => (s.bay >= 1 && s.bay <= 5 ? 0.2 : 0) },
  { id: "spray", file: "spray.mp3", gain: (s) => (s.paintSweep > 0 && s.paintSweep < 1 ? 1 : 0) },
];

export const MUSIC = { bed: "music_bed.mp3", sting: "music_sting.mp3", stingAt: 0.93 } as const;

/** The one-shots whose moment lies in (prev, p], in order — forward, small steps only. */
export function cuesCrossed(prev: number | null, p: number): OneShot[] {
  if (prev === null || p <= prev || p - prev > MAX_STEP) return [];
  return oneShots.filter((c) => c.at > prev && c.at <= p).sort((a, b) => a.at - b.at);
}
