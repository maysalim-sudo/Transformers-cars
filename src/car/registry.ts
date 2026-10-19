import type { Localized } from "@/i18n/config";

export type PartGroup =
  | "body"
  | "glass"
  | "lighting"
  | "aero"
  | "chassis"
  | "drivetrain"
  | "interior"
  | "brakes"
  | "suspension";

export type VehiclePart = {
  /** stable id, shared by the hero, the diagnosis tool, Blender object names and the object-ID pass */
  id: string;
  label: Localized;
  group: PartGroup;

  /** assembled depth in the stage (viewBox units, + towards the viewer) */
  z: number;
  /** offset when fully exploded (viewBox units of the 1200×480 side view) */
  explode: { dx: number; dy: number; dz: number; rot?: number };
  /** label point in the side-view viewBox */
  anchor: [number, number];
  /** set on the few parts that get a callout in the exploded hero */
  labelSide?: "left" | "right" | "up" | "down";
  /** short callout text for the exploded hero (falls back to label) */
  callout?: Localized;

  /** window on the master 0–1 timeline */
  start: number;
  end: number;

  selectable: boolean;
  paintable?: boolean;
  serviceId?: string;

  meshNames?: { hero?: string[]; configurator?: string[] };
};

type Def = Omit<VehiclePart, "selectable"> & { selectable?: boolean };

const L = (en: string, fr: string, ar: string): Localized => ({ en, fr, ar });

const defs: Def[] = [
  // ---- structure & mechanicals (behind the body) ----
  {
    id: "chassis_floor",
    label: L("Floor & subframes", "Plancher et berceaux", "الأرضية والهيكل السفلي"),
    group: "chassis",
    z: -4,
    explode: { dx: 0, dy: 70, dz: -70 },
    anchor: [600, 372],
    start: 0.3,
    end: 1,
    selectable: false,
    serviceId: "performance",
  },
  {
    id: "engine",
    label: L("Engine", "Moteur", "المحرك"),
    group: "drivetrain",
    z: -2,
    explode: { dx: -30, dy: 175, dz: -10 },
    anchor: [300, 262],
    labelSide: "down",
    callout: L("Engine", "Moteur", "المحرك"),
    start: 0.32,
    end: 1,
    selectable: true,
    serviceId: "performance",
  },
  {
    id: "transmission",
    label: L("Transmission", "Transmission", "ناقل الحركة"),
    group: "drivetrain",
    z: -2.5,
    explode: { dx: 30, dy: 150, dz: -40 },
    anchor: [560, 328],
    start: 0.38,
    end: 1,
    selectable: true,
    serviceId: "performance",
  },
  {
    id: "exhaust",
    label: L("Exhaust", "Échappement", "العادم"),
    group: "drivetrain",
    z: -3,
    explode: { dx: 60, dy: 120, dz: -90 },
    anchor: [960, 366],
    labelSide: "down",
    callout: L("Exhaust", "Échappement", "العادم"),
    start: 0.42,
    end: 1,
    selectable: true,
    serviceId: "performance",
  },
  {
    id: "body_shell",
    label: L("Body structure", "Structure de caisse", "هيكل السيارة"),
    group: "body",
    z: 0,
    explode: { dx: 0, dy: 0, dz: 0 },
    anchor: [600, 250],
    start: 0,
    end: 1,
    selectable: false,
    serviceId: "styling",
  },
  {
    id: "spring_front",
    label: L("Front suspension", "Suspension avant", "التعليق الأمامي"),
    group: "suspension",
    z: 0.4,
    explode: { dx: 0, dy: -125, dz: 80 },
    anchor: [300, 262],
    labelSide: "up",
    callout: L("Suspension", "Suspension", "التعليق"),
    start: 0.3,
    end: 0.95,
    selectable: true,
    serviceId: "wheels",
  },
  {
    id: "spring_rear",
    label: L("Rear suspension", "Suspension arrière", "التعليق الخلفي"),
    group: "suspension",
    z: 0.4,
    explode: { dx: 0, dy: -125, dz: 80 },
    anchor: [915, 262],
    start: 0.32,
    end: 0.97,
    selectable: true,
    serviceId: "wheels",
  },
  {
    id: "brake_disc_front",
    label: L("Front brake disc", "Disque de frein avant", "قرص الفرامل الأمامي"),
    group: "brakes",
    z: 0.6,
    explode: { dx: 0, dy: 10, dz: 130 },
    anchor: [300, 332],
    start: 0.25,
    end: 0.9,
    selectable: true,
    serviceId: "wheels",
  },
  {
    id: "caliper_front",
    label: L("Front caliper", "Étrier avant", "كاليبر الفرامل الأمامي"),
    group: "brakes",
    z: 0.8,
    explode: { dx: 10, dy: -10, dz: 165 },
    anchor: [348, 318],
    start: 0.25,
    end: 0.9,
    selectable: true,
    serviceId: "wheels",
  },
  {
    id: "brake_disc_rear",
    label: L("Rear brake disc", "Disque de frein arrière", "قرص الفرامل الخلفي"),
    group: "brakes",
    z: 0.6,
    explode: { dx: 0, dy: 10, dz: 130 },
    anchor: [866, 346],
    labelSide: "down",
    callout: L("Brakes", "Freinage", "الفرامل"),
    start: 0.28,
    end: 0.92,
    selectable: true,
    serviceId: "wheels",
  },
  {
    id: "caliper_rear",
    label: L("Rear caliper", "Étrier arrière", "كاليبر الفرامل الخلفي"),
    group: "brakes",
    z: 0.8,
    explode: { dx: 10, dy: -10, dz: 165 },
    anchor: [960, 318],
    start: 0.28,
    end: 0.92,
    selectable: true,
    serviceId: "wheels",
  },

  // ---- body panels ----
  {
    id: "roof",
    label: L("Roof", "Toit", "السقف"),
    group: "body",
    z: 1,
    explode: { dx: 0, dy: -170, dz: 0 },
    anchor: [760, 132],
    start: 0.12,
    end: 0.75,
    paintable: true,
    serviceId: "styling",
  },
  {
    id: "hood",
    label: L("Hood", "Capot", "غطاء المحرك"),
    group: "body",
    z: 1,
    explode: { dx: -30, dy: -140, dz: 20, rot: -4 },
    anchor: [300, 228],
    start: 0.08,
    end: 0.7,
    paintable: true,
    serviceId: "styling",
  },
  {
    id: "trunk",
    label: L("Trunk lid", "Coffre", "غطاء الصندوق الخلفي"),
    group: "body",
    z: 1,
    explode: { dx: 60, dy: -120, dz: 10, rot: 5 },
    anchor: [1050, 210],
    start: 0.1,
    end: 0.72,
    paintable: true,
    serviceId: "styling",
  },
  {
    id: "bumper_front",
    label: L("Front bumper", "Pare-chocs avant", "الصدام الأمامي"),
    group: "body",
    z: 1.6,
    explode: { dx: -190, dy: 10, dz: 40 },
    anchor: [110, 330],
    start: 0.02,
    end: 0.6,
    paintable: true,
    serviceId: "styling",
  },
  {
    id: "bumper_rear",
    label: L("Rear bumper", "Pare-chocs arrière", "الصدام الخلفي"),
    group: "body",
    z: 1.6,
    explode: { dx: 190, dy: 10, dz: 40 },
    anchor: [1090, 310],
    start: 0.02,
    end: 0.6,
    paintable: true,
    serviceId: "styling",
  },
  {
    id: "fender_front_left",
    label: L("Front fender (left)", "Aile avant gauche", "الرفرف الأمامي الأيسر"),
    group: "body",
    z: 1.8,
    explode: { dx: -70, dy: -10, dz: 120 },
    anchor: [400, 262],
    start: 0.06,
    end: 0.68,
    paintable: true,
    serviceId: "styling",
  },
  {
    id: "fender_front_right",
    label: L("Front fender (right)", "Aile avant droite", "الرفرف الأمامي الأيمن"),
    group: "body",
    z: -1,
    explode: { dx: -70, dy: -10, dz: -120 },
    anchor: [400, 262],
    start: 0.06,
    end: 0.68,
    paintable: true,
    serviceId: "styling",
  },
  {
    id: "door_front_left",
    label: L("Front door (left)", "Porte avant gauche", "الباب الأمامي الأيسر"),
    group: "body",
    z: 1.8,
    explode: { dx: -20, dy: 20, dz: 160 },
    anchor: [590, 290],
    labelSide: "up",
    callout: L("Bodywork", "Carrosserie", "الهيكل"),
    start: 0.1,
    end: 0.72,
    paintable: true,
    serviceId: "styling",
  },
  {
    id: "door_rear_left",
    label: L("Rear door (left)", "Porte arrière gauche", "الباب الخلفي الأيسر"),
    group: "body",
    z: 1.8,
    explode: { dx: 25, dy: 20, dz: 160 },
    anchor: [790, 285],
    start: 0.12,
    end: 0.74,
    paintable: true,
    serviceId: "styling",
  },
  {
    id: "door_front_right",
    label: L("Front door (right)", "Porte avant droite", "الباب الأمامي الأيمن"),
    group: "body",
    z: -1,
    explode: { dx: -20, dy: 20, dz: -160 },
    anchor: [590, 290],
    start: 0.1,
    end: 0.72,
    paintable: true,
    serviceId: "styling",
  },
  {
    id: "door_rear_right",
    label: L("Rear door (right)", "Porte arrière droite", "الباب الخلفي الأيمن"),
    group: "body",
    z: -1,
    explode: { dx: 25, dy: 20, dz: -160 },
    anchor: [790, 285],
    start: 0.12,
    end: 0.74,
    paintable: true,
    serviceId: "styling",
  },
  {
    id: "fender_rear_left",
    label: L("Rear quarter panel (left)", "Aile arrière gauche", "الرفرف الخلفي الأيسر"),
    group: "body",
    z: 1.8,
    explode: { dx: 85, dy: -10, dz: 120 },
    anchor: [960, 262],
    start: 0.08,
    end: 0.7,
    paintable: true,
    serviceId: "styling",
  },
  {
    id: "fender_rear_right",
    label: L("Rear quarter panel (right)", "Aile arrière droite", "الرفرف الخلفي الأيمن"),
    group: "body",
    z: -1,
    explode: { dx: 85, dy: -10, dz: -120 },
    anchor: [960, 262],
    start: 0.08,
    end: 0.7,
    paintable: true,
    serviceId: "styling",
  },
  {
    id: "mirror_left",
    label: L("Mirror (left)", "Rétroviseur gauche", "المرآة الجانبية اليسرى"),
    group: "body",
    z: 2.4,
    explode: { dx: -20, dy: -80, dz: 150 },
    anchor: [525, 200],
    start: 0.1,
    end: 0.66,
    paintable: true,
    serviceId: "styling",
  },
  {
    id: "mirror_right",
    label: L("Mirror (right)", "Rétroviseur droit", "المرآة الجانبية اليمنى"),
    group: "body",
    z: -1.5,
    explode: { dx: -20, dy: -80, dz: -150 },
    anchor: [525, 200],
    start: 0.1,
    end: 0.66,
    paintable: true,
    serviceId: "styling",
  },
  {
    id: "diffuser",
    label: L("Rear diffuser", "Diffuseur arrière", "الناشر الخلفي"),
    group: "aero",
    z: 2,
    explode: { dx: 200, dy: 70, dz: 30 },
    anchor: [1050, 368],
    start: 0.05,
    end: 0.62,
    serviceId: "styling",
  },

  // ---- glass ----
  {
    id: "windshield",
    label: L("Windshield", "Pare-brise", "الزجاج الأمامي"),
    group: "glass",
    z: 1.2,
    explode: { dx: -50, dy: -95, dz: 40 },
    anchor: [565, 172],
    start: 0.14,
    end: 0.76,
    serviceId: "styling",
  },
  {
    id: "rear_window",
    label: L("Rear window", "Lunette arrière", "الزجاج الخلفي"),
    group: "glass",
    z: 1.2,
    explode: { dx: 55, dy: -95, dz: 40 },
    anchor: [940, 168],
    start: 0.14,
    end: 0.76,
    serviceId: "styling",
  },
  {
    id: "side_windows_left",
    label: L("Side windows (left)", "Vitres latérales gauches", "النوافذ الجانبية اليسرى"),
    group: "glass",
    z: 2.2,
    explode: { dx: 0, dy: -70, dz: 110 },
    anchor: [720, 168],
    start: 0.14,
    end: 0.76,
    serviceId: "styling",
  },
  {
    id: "side_windows_right",
    label: L("Side windows (right)", "Vitres latérales droites", "النوافذ الجانبية اليمنى"),
    group: "glass",
    z: -1.2,
    explode: { dx: 0, dy: -70, dz: -110 },
    anchor: [720, 168],
    start: 0.14,
    end: 0.76,
    serviceId: "styling",
  },

  // ---- lighting ----
  {
    id: "headlight_left",
    label: L("Headlight (left)", "Phare gauche", "المصباح الأمامي الأيسر"),
    group: "lighting",
    z: 2.6,
    explode: { dx: -170, dy: -60, dz: 90 },
    anchor: [140, 262],
    labelSide: "up",
    callout: L("Lighting", "Éclairage", "الإضاءة"),
    start: 0.04,
    end: 0.6,
    serviceId: "styling",
  },
  {
    id: "headlight_right",
    label: L("Headlight (right)", "Phare droit", "المصباح الأمامي الأيمن"),
    group: "lighting",
    z: -1.6,
    explode: { dx: -170, dy: -60, dz: -90 },
    anchor: [140, 262],
    start: 0.04,
    end: 0.6,
    serviceId: "styling",
  },
  {
    id: "taillight_left",
    label: L("Taillight (left)", "Feu arrière gauche", "المصباح الخلفي الأيسر"),
    group: "lighting",
    z: 2.6,
    explode: { dx: 170, dy: -60, dz: 90 },
    anchor: [1085, 238],
    start: 0.04,
    end: 0.6,
    serviceId: "styling",
  },
  {
    id: "taillight_right",
    label: L("Taillight (right)", "Feu arrière droit", "المصباح الخلفي الأيمن"),
    group: "lighting",
    z: -1.6,
    explode: { dx: 170, dy: -60, dz: -90 },
    anchor: [1085, 238],
    start: 0.04,
    end: 0.6,
    serviceId: "styling",
  },

  // ---- wheels (outermost) ----
  {
    id: "wheel_front_left",
    label: L("Wheel, front left", "Roue avant gauche", "العجلة الأمامية اليسرى"),
    group: "chassis",
    z: 4,
    explode: { dx: -20, dy: 30, dz: 250 },
    anchor: [300, 332],
    start: 0.2,
    end: 0.85,
    serviceId: "wheels",
  },
  {
    id: "wheel_rear_left",
    label: L("Wheel, rear left", "Roue arrière gauche", "العجلة الخلفية اليسرى"),
    group: "chassis",
    z: 4,
    explode: { dx: 20, dy: 30, dz: 250 },
    anchor: [915, 332],
    start: 0.22,
    end: 0.87,
    serviceId: "wheels",
  },
  {
    id: "wheel_front_right",
    label: L("Wheel, front right", "Roue avant droite", "العجلة الأمامية اليمنى"),
    group: "chassis",
    z: -6,
    explode: { dx: -20, dy: 20, dz: -110 },
    anchor: [300, 332],
    start: 0.2,
    end: 0.85,
    serviceId: "wheels",
  },
  {
    id: "wheel_rear_right",
    label: L("Wheel, rear right", "Roue arrière droite", "العجلة الخلفية اليمنى"),
    group: "chassis",
    z: -6,
    explode: { dx: 20, dy: 20, dz: -110 },
    anchor: [915, 332],
    start: 0.22,
    end: 0.87,
    serviceId: "wheels",
  },
];

/** The single part list. Every experience reads from here. */
export const parts: readonly VehiclePart[] = defs.map((d) => ({
  selectable: true,
  ...d,
  meshNames: d.meshNames ?? { hero: [d.id], configurator: [d.id] },
}));

export type PartId = (typeof defs)[number]["id"];

const byId = new Map(parts.map((p) => [p.id, p]));

export function getPart(id: string): VehiclePart {
  const p = byId.get(id);
  if (!p) throw new Error(`Unknown part: ${id}`);
  return p;
}

/** Maps a left-side id to the right side (and back), for mirrored views. */
export function mirrorPartId(id: string): string {
  if (id.endsWith("_left")) return id.replace(/_left$/, "_right");
  if (id.endsWith("_right")) return id.replace(/_right$/, "_left");
  return id;
}
