/**
 * Master timeline of the garage hero: scroll progress p (0 = top of the track, 1 = end) → everything the scene
 * and the overlays show. Pure, unit-tested; no three.js. Positions come from layout.json, shared with the
 * Blender build. World units are metres; the car's nose points −x and it drives toward −x.
 */
import layout from "./layout.json";

export type Vec3 = [number, number, number];

export type GarageState = {
  bay: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  /** wheels, stance, kit, paint, tint, showroom */
  done: boolean[];
  carX: number;
  /** 0 parked … 1 fastest point of the drive */
  carSpeed: number;
  /** rad */
  wheelSpin: number;
  doorOpen: number;
  lift: number;
  wheelsOff: number;
  wheelFinish: number;
  /** metres the body sits lower */
  drop: number;
  kitOff: number;
  lipsVisible: boolean;
  sparks: number;
  boothLight: number;
  mist: number;
  /** 0 … 1: progress of the beam from nose to tail */
  paintSweep: number;
  tintSweep: number;
  transition: number;
  coverPull: number;
  /** the cover only exists once the car is parked under it, in the dark */
  coverVisible: boolean;
  showLights: number[];
  /** rad */
  tableTurn: number;
  headlights: number;
  camera: { pos: Vec3; look: Vec3 };
};

/** Start of bays 1–6 (wheels, stance, kit, paint, tint, reveal). Bay 0 is the arrival. */
export const BAYS = [0.08, 0.27, 0.42, 0.57, 0.74, 0.84] as const;
/** When showroom light i starts to come on. */
export const LIGHT_ON = (i: number) => 0.875 + 0.008 * i;

const BODY_DROP = 0.045;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const ss = (a: number, b: number, x: number) => smoothstep(clamp01((x - a) / (b - a)));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** up over [a, b], back down over [c, d] */
const visit = (a: number, b: number, c: number, d: number, p: number) => ss(a, b, p) * (1 - ss(c, d, p));

/** the darkest moment of the transition into the showroom: the car is parked and the cover appears */
const DARKEST = 0.855;

// car x along the hall: drive, hold in each bay, drive on
const B = layout.bays;
const route: [number, number][] = [
  [0, layout.start], [0.02, layout.start], [0.13, B.wheels], [0.26, B.wheels], [0.32, B.stance], [0.41, B.stance],
  [0.47, B.kit], [0.56, B.kit], [0.62, B.paint], [0.73, B.paint], [0.78, B.tint], [0.84, B.tint], [DARKEST, layout.show],
];
// peak speed of a smoothstep segment is 1.5 × its average
const maxSpeed = Math.max(...route.slice(1).map(([p1, x1], i) => (1.5 * Math.abs(x1 - route[i][1])) / (p1 - route[i][0])));

function drive(p: number): { x: number; speed: number } {
  for (let i = 1; i < route.length; i++) {
    const [p0, x0] = route[i - 1];
    const [p1, x1] = route[i];
    if (p <= p1) {
      const t = clamp01((p - p0) / (p1 - p0));
      const v = (Math.abs(x1 - x0) / (p1 - p0)) * 6 * t * (1 - t);
      return { x: lerp(x0, x1, smoothstep(t)), speed: v / maxSpeed };
    }
  }
  return { x: layout.show, speed: 0 };
}

// camera: [p, offset from the car, look target from the car]
type Key = [number, Vec3, Vec3];
const cams: Key[] = [
  [0.0, [10.5, 1.8, 3.5], [-6, 2.2, -3.2]],
  [0.06, [7, 1.8, 7], [-4, 1, 0]],
  [0.12, [4, 1.7, 6.5], [-1, 0.9, 0]],
  [0.16, [-5.6, 2.3, 4.6], [0, 1.1, 0]],
  [0.21, [-2.6, 1.1, 3.4], [-1.3, 1, 0.6]],
  [0.25, [-5.2, 2, 4.8], [0, 1, 0]],
  [0.3, [4, 2.2, 6.5], [-1, 0.8, 0]],
  [0.36, [-1.8, 0.35, 3.2], [-1.2, 0.5, 0.6]],
  [0.4, [-0.5, 0.45, 5.4], [0, 0.6, 0]],
  [0.45, [4, 2, 6.5], [-1, 0.8, 0]],
  [0.5, [-5.5, 1.3, 4.2], [-1.2, 0.6, 0]],
  [0.55, [4.8, 1.1, 3.8], [1.3, 0.6, 0]],
  [0.6, [3, 2.4, 6.5], [-1, 0.9, 0]],
  [0.66, [-4.2, 2.7, 5.2], [0, 0.8, 0]],
  [0.72, [-3, 1.6, 5.5], [0, 0.9, 0]],
  [0.77, [-1, 1.35, 4.4], [0, 1.25, 0]],
  [0.82, [-1.5, 1.3, 4.6], [0, 1.2, 0]],
  [0.86, [-6.5, 1.3, 2.2], [0, 0.9, 0]],
  [0.9, [5.5, 2.2, 6.5], [-1.5, 1.1, 0]],
  [1.0, [6.2, 1.5, 4.6], [-1.2, 1.2, -0.6]],
];
// tall screens: same shots from further back and a little higher, so the car still fits the width
const portraitCams: Key[] = cams.map(([p, o, l]) => [p, [o[0] * 1.45, o[1] * 1.15 + 0.3, o[2] * 1.45], l]);

/** Past the door, keep the camera half a metre inside the side walls (wider portrait offsets would pass them). */
const WALL_Z = layout.hall.halfWidth - 0.5;
const insideWalls = (x: number, z: number) => (x < layout.door ? Math.max(-WALL_Z, Math.min(WALL_Z, z)) : z);

function cameraAt(keys: Key[], p: number): { offset: Vec3; look: Vec3 } {
  let i = 1;
  while (i < keys.length - 1 && p > keys[i][0]) i++;
  const [p0, o0, l0] = keys[i - 1];
  const [p1, o1, l1] = keys[i];
  const t = ss(p0, p1, p);
  return { offset: o0.map((v, k) => lerp(v, o1[k], t)) as Vec3, look: l0.map((v, k) => lerp(v, l1[k], t)) as Vec3 };
}

const bayAt = (p: number): GarageState["bay"] => {
  let bay = 0;
  BAYS.forEach((start, i) => {
    if (p >= start) bay = i + 1;
  });
  return bay as GarageState["bay"];
};

/** Where each bay's work is finished (the showroom counts once the reveal has played). */
const DONE_AT = [BAYS[1], BAYS[2], BAYS[3], BAYS[4], BAYS[5], 0.97];

export function stateAt(p: number, opts: { portrait?: boolean; wheelRadius?: number } = {}): GarageState {
  const { portrait = false, wheelRadius = 0.36 } = opts;
  const { x: carX, speed } = drive(p);
  const lift = visit(0.15, 0.18, 0.245, 0.265, p);
  const cam = cameraAt(portrait ? portraitCams : cams, p);
  const flashing = p > 0.93 && p < 0.955;

  return {
    bay: bayAt(p),
    done: DONE_AT.map((d) => p >= d),
    carX,
    carSpeed: speed,
    wheelSpin: (layout.start - carX) / wheelRadius,
    doorOpen: ss(0, 0.05, p),
    lift,
    wheelsOff: visit(0.185, 0.205, 0.215, 0.235, p),
    wheelFinish: ss(0.205, 0.215, p),
    drop: ss(0.33, 0.39, p) * BODY_DROP,
    kitOff: visit(0.48, 0.505, 0.515, 0.54, p),
    lipsVisible: p >= 0.52,
    sparks: p >= 0.52 && p <= 0.545 ? 1 : 0,
    boothLight: visit(0.58, 0.61, 0.72, 0.74, p),
    mist: visit(0.6, 0.63, 0.71, 0.74, p),
    paintSweep: ss(0.6, 0.71, p),
    tintSweep: ss(0.76, 0.83, p),
    transition: visit(0.84, DARKEST, DARKEST, 0.87, p),
    coverPull: ss(0.88, 0.93, p),
    coverVisible: p >= DARKEST && p < 0.93,
    showLights: Array.from({ length: layout.rig.count }, (_, i) => ss(LIGHT_ON(i), LIGHT_ON(i) + 0.015, p)),
    tableTurn: Math.PI * ss(0.9, 1, p),
    headlights: flashing ? (Math.sin((p - 0.93) * 260) > 0 ? 1 : 0) : p >= 0.955 ? 1 : 0,
    camera: {
      pos: [carX + cam.offset[0], cam.offset[1] + lift * 0.3, insideWalls(carX + cam.offset[0], cam.offset[2])],
      look: [carX + cam.look[0], cam.look[1] + lift * 0.5, cam.look[2]],
    },
  };
}
