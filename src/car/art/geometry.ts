/** Shared geometry of the generic four-door GT, side view, viewBox 1200×480. Ground at y=420. */

export const VIEWBOX = { w: 1200, h: 480 } as const;

export const WHEEL = { front: 300, rear: 915, cy: 332, tire: 88, rim: 64, arch: 98 } as const;

/** Full side silhouette (front to the left). Arches are cut out. */
export const SIL =
  "M96 262 C190 232 330 214 480 204 C545 175 600 140 650 128 C720 118 800 120 870 136 C960 158 1035 196 1096 222 C1108 236 1114 262 1112 290 C1110 325 1104 350 1094 364 L1006 368 A98 98 0 0 0 824 368 L391 368 A98 98 0 0 0 209 368 L100 366 C86 358 76 340 74 318 C73 296 80 274 96 262 Z";

/** Day-light opening (side glass). */
export const DLO =
  "M506 210 C560 182 604 152 652 141 C720 131 790 132 846 146 C880 156 912 172 940 192 L506 210 Z";

/** Panel regions. They are clipped by SIL, so outer edges can overshoot. */
export const PANELS = {
  bumper_front: "M0 0 L132 0 L132 256 C140 286 165 322 212 372 L212 480 L0 480 Z",
  hood: "M132 0 L486 0 L486 214 C380 222 250 238 132 256 Z",
  fender_front: "M132 256 C250 238 380 222 486 214 C482 260 484 320 490 356 L212 356 L212 372 C165 322 140 286 132 256 Z",
  door_front: "M486 211 L700 202 L703 356 L490 356 C484 320 482 260 486 214 Z",
  door_rear: "M703 202 L884 194 C876 260 850 320 830 356 L706 356 Z",
  fender_rear:
    "M884 194 L940 192 C912 172 880 156 846 146 L880 152 L1000 196 L1110 236 C1080 300 1040 330 1006 372 L1006 356 L830 356 C850 320 876 260 884 194 Z",
  roof: "M645 0 L875 0 L875 152 L846 146 C790 132 720 131 652 141 L645 143 Z",
  windshield: "M470 0 L645 0 L645 134 C600 146 556 172 498 206 L470 206 Z",
  rear_window: "M875 0 L1010 0 L1000 196 L880 152 L875 152 Z",
  trunk: "M1004 0 L1200 0 L1200 238 L1110 236 L1000 196 Z",
  bumper_rear: "M1110 236 L1200 238 L1200 480 L1006 480 L1006 372 C1040 330 1080 300 1110 236 Z",
} as const;

/** Sculpted lines that run across several panels. */
export const CREASES = {
  shoulder: "M150 266 C380 248 700 236 1084 238",
  lower: "M232 334 C450 330 700 326 1000 322",
} as const;

/** Polar helper: point on a circle, angle in degrees (0 = right, clockwise). */
export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  // rounded so server and client print the same attribute (full doubles can differ in the last digit)
  const round = (v: number) => Math.round(v * 1000) / 1000;
  return [round(cx + r * Math.cos(a)), round(cy + r * Math.sin(a))];
}

/** Annular sector path between radii r0 and r1 from a0 to a1 degrees. */
export function sector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number): string {
  const [x0, y0] = polar(cx, cy, r1, a0);
  const [x1, y1] = polar(cx, cy, r1, a1);
  const [x2, y2] = polar(cx, cy, r0, a1);
  const [x3, y3] = polar(cx, cy, r0, a0);
  const large = a1 - a0 > 180 ? 1 : 0;
  const f = (n: number) => n.toFixed(2);
  return `M${f(x0)} ${f(y0)} A${r1} ${r1} 0 ${large} 1 ${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)} A${r0} ${r0} 0 ${large} 0 ${f(x3)} ${f(y3)} Z`;
}
