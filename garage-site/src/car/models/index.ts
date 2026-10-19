import { coupeSide, desertSide, doublecabSide, hatchbackSide, offroadSide, pickupSide, sedanSide, suvSide, trailSide, type SideGeometry } from "./sideGeometry";

export const modelIds = ["hatchback", "coupe", "suv", "sedan", "pickup", "doublecab", "offroad", "desert", "trail"] as const;
export type CarModelId = (typeof modelIds)[number];

type ViewName = "front" | "rear" | "top" | "underside";

export type CarModel = {
  id: CarModelId;
  side: SideGeometry;
  /** registry parts this class does not have (e.g. rear doors on a coupé) */
  missing: ReadonlySet<string>;
  /** parts drawn in a shared view that stand for another part on this class */
  alias: Readonly<Record<string, string>>;
  /** reshapes the shared front / rear / plan drawings to this body (SVG transform) */
  viewTransform: Partial<Record<ViewName, string>>;
  /** default finish for the vehicle picker and previews */
  paint: string;
  /** true size over drawn size, for classes drawn smaller to fit the 1200-unit side view (3D only) */
  scale?: number;
};

/** scale about the ground line (y=420) or the plan centre (600, 240) */
const ground = (sx: number, sy: number) => `translate(600 420) scale(${sx} ${sy}) translate(-600 -420)`;
const plan = (sx: number, sy: number) => `translate(600 240) scale(${sx} ${sy}) translate(-600 -240)`;

export const carModels: Record<CarModelId, CarModel> = {
  hatchback: {
    id: "hatchback",
    side: hatchbackSide,
    missing: new Set(),
    alias: {},
    // 1.78 m wide, 1.44 m tall, 4.06 m long against the 1.86 × 1.36 × 4.72 m saloon the shared views are drawn from
    viewTransform: { front: ground(0.96, 1.06), rear: ground(0.96, 1.06), top: plan(0.86, 0.96), underside: plan(0.86, 0.96) },
    paint: "midnight",
  },
  sedan: {
    id: "sedan",
    side: sedanSide,
    missing: new Set(),
    alias: {},
    // widebody: ~1.95 m wide, 1.39 m tall, 4.95 m long against the drawings' 1.86 × 1.36 × 4.72 m
    viewTransform: { front: ground(1.04, 1.02), rear: ground(1.04, 1.02), top: plan(1.05, 1.04), underside: plan(1.05, 1.04) },
    paint: "graphite",
  },
  coupe: {
    id: "coupe",
    side: coupeSide,
    missing: new Set(["door_rear_left", "door_rear_right"]),
    alias: { door_rear_left: "door_front_left", door_rear_right: "door_front_right" },
    // widebody: ~1.93 m wide, 1.36 m tall, 4.78 m long against the drawings' 1.86 × 1.36 × 4.72 m
    viewTransform: { front: ground(1.03, 1), rear: ground(1.03, 1), top: plan(1.01, 1.03), underside: plan(1.01, 1.03) },
    paint: "rosso",
  },
  suv: {
    id: "suv",
    side: suvSide,
    missing: new Set(),
    alias: {},
    // 1.84 m wide, 1.63 m tall, 4.43 m long against the saloon the shared views are drawn from
    viewTransform: { front: ground(0.99, 1.2), rear: ground(0.99, 1.2), top: plan(0.94, 0.99), underside: plan(0.94, 0.99) },
    paint: "glacier",
  },
  pickup: {
    id: "pickup",
    side: pickupSide,
    missing: new Set(["door_rear_left", "door_rear_right"]),
    alias: { door_rear_left: "door_front_left", door_rear_right: "door_front_right" },
    // 1.86 m wide, 1.80 m tall, 5.0 m long against the drawings' 1.86 x 1.36 x 4.72 m
    viewTransform: { front: ground(1, 1.32), rear: ground(1, 1.32), top: plan(1.06, 1), underside: plan(1.06, 1) },
    paint: "platinum",
  },
  doublecab: {
    id: "doublecab",
    side: doublecabSide,
    missing: new Set(),
    alias: {},
    viewTransform: { front: ground(1, 1.32), rear: ground(1, 1.32), top: plan(1.12, 1), underside: plan(1.12, 1) },
    paint: "obsidian",
  },
  offroad: {
    id: "offroad",
    side: offroadSide,
    missing: new Set(["door_rear_left", "door_rear_right"]),
    alias: { door_rear_left: "door_front_left", door_rear_right: "door_front_right" },
    // ~2.0 m wide over the flares, 1.77 m tall at the cab, 5.1 m long against the drawings' 1.86 x 1.36 x 4.72 m
    viewTransform: { front: ground(1.08, 1.3), rear: ground(1.08, 1.3), top: plan(1.08, 1.08), underside: plan(1.08, 1.08) },
    paint: "amber",
  },
  desert: {
    id: "desert",
    side: desertSide,
    missing: new Set(),
    alias: {},
    // drawn at 88%: ~2.2 m wide, 2.03 m tall, 5.89 m long against the drawings' 1.86 x 1.36 x 4.72 m
    viewTransform: { front: ground(1.04, 1.31), rear: ground(1.04, 1.31), top: plan(1.1, 1.04), underside: plan(1.1, 1.04) },
    paint: "graphite",
    scale: 1 / 0.88,
  },
  trail: {
    id: "trail",
    side: trailSide,
    missing: new Set(),
    alias: {},
    // ~1.89 m wide, 1.87 m tall, 4.79 m long against the drawings' 1.86 x 1.36 x 4.72 m
    viewTransform: { front: ground(1.02, 1.37), rear: ground(1.02, 1.37), top: plan(1.01, 1.02), underside: plan(1.01, 1.02) },
    paint: "racing-green",
  },
};
