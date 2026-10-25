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
  /** `focus`: the world point depth of field focuses on (the part being worked on); fov in degrees */
  camera: { pos: Vec3; look: Vec3; focus: Vec3; fov: number };
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

/**
 * A desktop camera shot, as a film crew frames it: an orbit round a point on the car. `look` is that point
 * (car-local metres, also the focus); azimuth is the bearing round it in degrees (0 = the car's left side,
 * +z; 90 = behind the tail, +x), elevation is degrees above it, distance is metres. Keys are authored
 * unwrapped (the end orbit runs to 320°), so interpolating the plain numbers never flips round the car.
 * `linear` eases the segment ending at that key at constant speed instead of in and out.
 */
export type Shot = { p: number; azimuth: number; elevation: number; distance: number; look: Vec3; fov: number; linear?: boolean };

// the parts each bay works on: centre of the part plus its callout offset (heroCar.anchors), measured from suv.glb
const AT = {
  wheel: [-1.282, 0.36, 0.924] as Vec3,
  fender: [-1.269, 0.277, 0.815] as Vec3,
  kit: [0.311, 0.323, 0.3] as Vec3,
  roof: [1.099, 1.393, 0] as Vec3,
  glass: [0.777, 1.274, 0.41] as Vec3,
  body: [0, 0.85, 0] as Vec3,
};
const shot = (p: number, azimuth: number, elevation: number, distance: number, look: Vec3, fov: number, linear?: boolean): Shot => ({ p, azimuth, elevation, distance, look, fov, linear });
/** alongside the car at wheel-arch height, slightly behind, on a long lens */
const track = (p: number) => shot(p, 19, 3, 7, AT.body, 30);
// each bay: the camera arrives as the car stops, then orbits its part while the work happens, the
// direction alternating bay to bay; the drives between are tracking shots
const shots: Shot[] = [
  shot(0, 67.9, -1.3, 17.8, [-6, 2.2, -3.2], 36), // arrival: the street, the facade and the sign
  shot(0.02, 67.9, -1.3, 17.8, [-6, 2.2, -3.2], 36),
  track(0.065),
  track(0.1025),
  shot(0.13, -55, 10, 4.2, AT.wheel, 34), // wheels
  shot(0.26, -20, 10, 4.2, AT.wheel, 34),
  track(0.29),
  shot(0.32, -15, 2, 3.4, AT.fender, 32), // stance, low at the arch
  shot(0.41, -50, 2, 3.4, AT.fender, 32),
  track(0.44),
  shot(0.47, 55, 10, 6, AT.kit, 34), // body kit, round the tail
  shot(0.56, 95, 10, 6, AT.kit, 34),
  track(0.59),
  shot(0.62, 0, 12, 6, AT.roof, 34), // paint booth, from outside its glass side
  shot(0.73, -35, 12, 6, AT.roof, 34),
  track(0.755),
  shot(0.78, -20, 5, 4, AT.glass, 32), // tint
  shot(0.84, 15, 5, 4, AT.glass, 32),
  shot(0.86, -71.3, 3.3, 6.9, [0, 0.9, 0], 36), // the dark showroom, the cover over the car
  // from the cover pull, one full turn round the car at constant speed, ending on the front three-quarter
  // a little before the end of the track, so the last stretch holds the final frame
  shot(0.9, -40, 8, 6, [0, 0.8, 0], 34),
  shot(0.99, 320, 8, 6, [0, 0.8, 0], 34, true),
  shot(1, 320, 8, 6, [0, 0.8, 0], 34),
];

/** How high the lift raises the car (the scene's car rig uses the same value). */
const LIFT_HEIGHT = 0.55;
const PORTRAIT_FOV = 52;

function shotAt(p: number): { offset: Vec3; look: Vec3; fov: number } {
  let i = 1;
  while (i < shots.length - 1 && p > shots[i].p) i++;
  const a = shots[i - 1];
  const b = shots[i];
  const t = b.linear ? clamp01((p - a.p) / (b.p - a.p)) : ss(a.p, b.p, p);
  const deg = Math.PI / 180;
  const az = lerp(a.azimuth, b.azimuth, t) * deg;
  const el = lerp(a.elevation, b.elevation, t) * deg;
  const d = lerp(a.distance, b.distance, t);
  const look = a.look.map((v, k) => lerp(v, b.look[k], t)) as Vec3;
  const offset: Vec3 = [look[0] + d * Math.sin(az) * Math.cos(el), look[1] + d * Math.sin(el), look[2] + d * Math.cos(az) * Math.cos(el)];
  return { offset, look, fov: lerp(a.fov, b.fov, t) };
}

// camera: [p, offset from the car, look target from the car]
type Key = [number, Vec3, Vec3];
// tall screens (phones): overhead while the car drives, so its length runs up the screen; a three-quarter
// view at each bay so the work shows; low for the reveal. Over the paint booth the camera stays under its
// 3.4 m roof, so it dips before the car goes in and rises only once it is out.
const OVER: [Vec3, Vec3] = [[1.4, 4.4, 0.3], [-0.4, 0, 0]];
const portraitCams: Key[] = [
  [0.0, [9, 4.5, 4.2], [-6, 1.6, -1]],
  [0.05, ...OVER],
  [0.125, ...OVER],
  [0.15, [-4.6, 3.2, 4.4], [0, 0.6, 0]], // wheels
  [0.255, [-4.6, 3.2, 4.4], [0, 0.6, 0]],
  [0.285, ...OVER],
  [0.31, ...OVER],
  [0.34, [-3.2, 2.2, 4.6], [-0.6, 0.4, 0]], // stance
  [0.405, [-3.2, 2.2, 4.6], [-0.6, 0.4, 0]],
  [0.435, ...OVER],
  [0.46, ...OVER],
  [0.49, [-5, 3, 4.0], [-1.2, 0.5, 0]], // body kit
  [0.555, [-5, 3, 4.0], [-1.2, 0.5, 0]],
  [0.565, ...OVER],
  [0.59, [-4.4, 2.9, 5.6], [0, 0.8, 0]], // paint booth
  [0.735, [-4.4, 2.9, 5.6], [0, 0.8, 0]],
  [0.765, ...OVER],
  [0.775, ...OVER],
  [0.79, [-1.6, 2.7, 4.6], [0, 1.1, 0]], // tint
  [0.835, [-1.6, 2.7, 4.6], [0, 1.1, 0]],
  [0.85, ...OVER],
  [0.9, [6.4, 2.6, 6.2], [-1.2, 1.0, 0]], // reveal
  [1.0, [6.6, 1.9, 5.4], [-1.2, 1.1, -0.4]],
];

/** Past the door, keep the camera half a metre inside the side walls. */
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
  const cam = portrait ? { ...cameraAt(portraitCams, p), fov: PORTRAIT_FOV } : shotAt(p);
  const look: Vec3 = [carX + cam.look[0], cam.look[1] + lift * (portrait ? 0.5 : LIFT_HEIGHT), cam.look[2]];
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
    // the turntable holds still: the camera's orbit is the motion
    tableTurn: 0,
    headlights: flashing ? (Math.sin((p - 0.93) * 260) > 0 ? 1 : 0) : p >= 0.955 ? 1 : 0,
    camera: {
      pos: [carX + cam.offset[0], cam.offset[1] + lift * (portrait ? 0.3 : LIFT_HEIGHT), insideWalls(carX + cam.offset[0], cam.offset[2])],
      look,
      focus: look,
      fov: cam.fov,
    },
  };
}
