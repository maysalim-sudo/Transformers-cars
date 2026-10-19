import * as THREE from "three";
import type { CarModel } from "../models";
import type { SideGeometry } from "../models/sideGeometry";
import { type Livery, liveryColor, paints, tints, type WheelStyle } from "../palette";
import { getPart } from "../registry";
import { bounds, intersect, type Polygon, pathToPolygons } from "./path";
import polygonClipping from "polygon-clipping";
import { carTextures } from "./textures";
import { TessellateModifier } from "three/examples/jsm/modifiers/TessellateModifier.js";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/**
 * Builds a 3D car from the same side-view geometry the 2D artwork uses: panels are the
 * side shapes extruded across the body (hood, roof, bumpers…) or as thin skins on each side
 * (doors, fenders). Every part is its own group tagged with its registry id, so picking a
 * mesh flags the same part as tapping it in 2D. SVG units: x along the car, y up, z across
 * (+z = the car's left side, the side the 2D "left" view shows).
 */

export type Finish = { paint: string; wheel: WheelStyle["id"]; tint: string; livery?: Livery["id"] };
export type Highlight = "none" | "hover" | "selected";

export type BuiltCar = {
  group: THREE.Group;
  /** registry id → part roots (two for parts drawn on both sides) */
  parts: Map<string, THREE.Group[]>;
  setExplode: (k: number) => void;
  setFinish: (f: Pick<Finish, "paint" | "tint" | "livery">) => void;
  setHighlight: (partId: string, h: Highlight) => void;
  dispose: () => void;
};

const HALF_W = 205; // half body width: 410 wide on a ~1040 long car
const GREEN_W = 160; // half width of the greenhouse (tumblehome)
const SKIN = 7; // side panel thickness
export const EXPLODE_SCALE = 1.5;
const X0 = 600; // centre the car on x
const GROUND = 420;
/** model units in a metre: the ~1040-unit sedan comes out about 4.7 m long in Blender and the GLB */
export const MODEL_UNITS_PER_METRE = 220;

const toShape = (p: Polygon) => new THREE.Shape(p.map(([x, y]) => new THREE.Vector2(x - X0, GROUND - y)));

/** where a mesh sits, so its vertices can follow the body's curvature */
export type Sculpt = {
  zone: "lower" | "green" | "none";
  z: number;
  belt: number;
  roof: number;
  /** distance from the car's centre to the nose and to the tail */
  front: number;
  rear: number;
  /** wheel centres along x */
  wheels: number[];
};

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Bends flat extrusions into a car. In plan view the body tapers gently towards the ends and
 * then turns a round corner at the nose and tail. In section the sides are widest at the shoulder
 * line, roll in towards the waist and tuck under at the sill, the body swells over each wheel and
 * draws in along the doors, and the greenhouse leans inwards (tumblehome).
 */
function sculpt(g: THREE.BufferGeometry, o: Sculpt) {
  if (o.zone === "none") return;
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const shoulder = o.belt * 0.62;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const zw = pos.getZ(i) + o.z;
    const nose = x < 0;
    const t = nose ? -x / o.front : x / o.rear;
    // corner radius: 20% of the half-length at the nose, 15% at the tail, as a quarter circle
    const r = nose ? 0.2 : 0.15;
    const u = Math.min(1, Math.max(0, (t - (1 - r)) / r));
    let f = (1 - 0.08 * smooth(0.5, 1, t) ** 2) * (1 - (nose ? 0.43 : 0.33) * (1 - Math.sqrt(1 - u * u)));
    if (o.zone === "lower") {
      const up = Math.min(1, Math.max(0, (y - shoulder) / (o.belt + 4 - shoulder)));
      const down = Math.min(1, Math.max(0, (shoulder - y) / (shoulder - 40)));
      f *= 1 - 0.08 * up * up - 0.06 * down * down;
      let near = 0;
      for (const w of o.wheels) near = Math.max(near, Math.exp(-(((x - w) / 125) ** 2)));
      f *= 1 - 0.022 * (1 - near) * smooth(40, shoulder, y);
    } else {
      f *= 1 - 0.14 * smooth(o.belt, o.roof, y); // tumblehome
    }
    pos.setZ(i, zw * f - o.z);
  }
}

// long, thin triangles across a panel face have no vertices to bend: split them first
const tessellate = new TessellateModifier(36, 6);

function extrude(polys: Polygon[], depth: number, bevel = 0, shape?: Sculpt): THREE.BufferGeometry | null {
  const shapes = polys.filter((p) => p.length >= 3).map(toShape);
  if (!shapes.length) return null;
  let g: THREE.BufferGeometry = new THREE.ExtrudeGeometry(shapes, {
    depth,
    curveSegments: 4,
    steps: shape && shape.zone !== "none" && depth > 60 ? 8 : 1, // slices along z so the taper can bend the slab
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 4,
  });
  g.translate(0, 0, -depth / 2);
  if (shape && shape.zone !== "none") {
    g = tessellate.modify(g);
    sculpt(g, shape);
  }
  // smooth the sampled curves, keep real edges crisp
  g = toCreasedNormals(g, Math.PI / 4.5);
  return g;
}

const ring = (p: Polygon): [number, number][][] => [p.map(([x, y]) => [x, y] as [number, number])];
function union(polys: Polygon[]): Polygon[] {
  if (!polys.length) return [];
  const [first, ...rest] = polys.map(ring);
  return polygonClipping.union(first, ...rest).map((mp) => mp[0].slice(0, -1) as Polygon);
}
function difference(a: Polygon[], cut: Polygon[]): Polygon[] {
  if (!a.length) return [];
  const out = polygonClipping.difference(a.map(ring), ...cut.map(ring));
  return out.map((mp) => mp[0].slice(0, -1) as Polygon).filter((p) => p.length >= 3);
}
const rect = (x0: number, y0: number, x1: number, y1: number): Polygon => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
];
const clipTo = (d: string, region: Polygon[]) => pathToPolygons(d).flatMap((p) => region.flatMap((r) => intersect(p, r)));

export function makeMaterials(finish: Pick<Finish, "paint" | "tint">) {
  const tex = carTextures();
  // metallic flake under a clear coat with a faint orange peel; the colour itself stays a plain value
  const paint = new THREE.MeshPhysicalMaterial({
    metalness: 0.35,
    roughness: 0.38,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    normalMap: tex.flake,
    normalScale: new THREE.Vector2(0.06, 0.06),
    clearcoatNormalMap: tex.orangePeel,
    clearcoatNormalScale: new THREE.Vector2(0.08, 0.08),
  });
  const livery = new THREE.MeshPhysicalMaterial({ metalness: 0.2, roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.06 });
  const glass = new THREE.MeshPhysicalMaterial({ metalness: 0, roughness: 0.08, clearcoat: 0.6, envMapIntensity: 0.45, transparent: true });
  const apply = (f: Pick<Finish, "paint" | "tint">) => {
    const p = paints.find((x) => x.id === f.paint) ?? paints[0];
    paint.color.set(p.tones[1]);
    paint.sheenColor = new THREE.Color(p.tones[0]);
    const level = (tints.find((x) => x.id === f.tint) ?? tints[0]).level;
    glass.color.set(new THREE.Color("#2b3542").lerp(new THREE.Color("#050608"), 0.35 + level * 0.65));
    glass.opacity = 0.82 + level * 0.18;
    livery.color.set(liveryColor(p.id));
  };
  apply(finish);
  const named = {
    paint,
    glass,
    trim: new THREE.MeshStandardMaterial({ color: "#0b0d10", metalness: 0.4, roughness: 0.45 }),
    cabin: new THREE.MeshStandardMaterial({ color: "#050607", roughness: 0.9 }),
    rubber: new THREE.MeshStandardMaterial({ color: "#101114", roughness: 0.85 }),
    tread: new THREE.MeshStandardMaterial({ map: tex.tread, bumpMap: tex.tread, bumpScale: 2.5, roughness: 0.92 }),
    sidewall: new THREE.MeshStandardMaterial({ map: tex.sidewall, bumpMap: tex.sidewall, bumpScale: 1.2, roughness: 0.8 }),
    discFace: new THREE.MeshStandardMaterial({ map: tex.discFace, metalness: 0.85, roughness: 0.42 }),
    grille: new THREE.MeshStandardMaterial({ map: tex.honeycomb, metalness: 0.3, roughness: 0.55 }),
    carbon: new THREE.MeshPhysicalMaterial({ map: tex.carbon, metalness: 0.2, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 }),
    livery,
    chrome: new THREE.MeshStandardMaterial({ color: "#d9dde3", metalness: 1, roughness: 0.18 }),
    darkMetal: new THREE.MeshStandardMaterial({ color: "#2a2e34", metalness: 0.8, roughness: 0.35 }),
    disc: new THREE.MeshStandardMaterial({ color: "#8d939c", metalness: 0.9, roughness: 0.4 }),
    accent: new THREE.MeshStandardMaterial({ color: "#d38c22", metalness: 0.5, roughness: 0.35 }),
    led: new THREE.MeshStandardMaterial({ color: "#dfe9ff", map: tex.lens, emissive: "#eef4ff", emissiveMap: tex.lens, emissiveIntensity: 1.6, roughness: 0.2 }),
    tail: new THREE.MeshStandardMaterial({ color: "#ff3347", map: tex.lens, emissive: "#ff2a3c", emissiveMap: tex.lens, emissiveIntensity: 2 }),
    lens: new THREE.MeshPhysicalMaterial({ color: "#0b0e12", metalness: 0.3, roughness: 0.05, clearcoat: 1 }),
  };
  // the role name survives cloning and a round trip through Blender, so a loaded model can be re-skinned
  for (const [name, mat] of Object.entries(named)) mat.name = name;
  return { ...named, apply };
}

type Materials = ReturnType<typeof makeMaterials>;

function wheelGroup(style: WheelStyle["id"], scale: number, m: Materials, outward: 1 | -1) {
  const g = new THREE.Group();
  const r = 88 * scale;
  // the tread wraps the open cylinder; each sidewall is its own disc so it takes the sidewall texture
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 70, 48, 1, true), m.tread);
  tire.rotation.x = Math.PI / 2;
  g.add(tire);
  for (const s of [1, -1]) {
    const wall = new THREE.Mesh(new THREE.CircleGeometry(r, 48), m.sidewall);
    wall.position.z = s * 35;
    if (s < 0) wall.rotation.y = Math.PI;
    g.add(wall);
  }
  const rimR = (style === "stock" ? 54 : 64) * scale;
  const face = new THREE.Mesh(new THREE.CylinderGeometry(rimR, rimR, 6, 40), style === "aero" ? m.darkMetal : m.trim);
  face.rotation.x = Math.PI / 2;
  face.position.z = outward * 33;
  g.add(face);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(rimR, 2.6 * scale, 8, 48), m.chrome);
  lip.position.z = outward * 36;
  g.add(lip);
  const spokes = { split: 10, mesh: 16, aero: 7, stock: 5 }[style];
  const width = { split: 6, mesh: 3, aero: 14, stock: 14 }[style] * scale;
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 + (style === "split" && i % 2 ? 0.12 : 0);
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(width, rimR - 14 * scale, 5), style === "aero" ? m.trim : m.chrome);
    spoke.position.set(Math.sin(a) * (rimR / 2 + 6), Math.cos(a) * (rimR / 2 + 6), outward * 37);
    spoke.rotation.z = -a;
    g.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(14 * scale, 14 * scale, 8, 24), m.chrome);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = outward * 38;
  g.add(hub);
  return g;
}

function springGeometry(height: number) {
  const pts: THREE.Vector3[] = [];
  const turns = 6;
  for (let i = 0; i <= turns * 24; i++) {
    const t = i / (turns * 24);
    const a = t * turns * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * 16, t * height, Math.sin(a) * 16));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 220, 2.6, 6);
}


export function buildCar(model: CarModel, finish: Finish): BuiltCar {
  const geo: SideGeometry = model.side;
  const m = makeMaterials(finish);
  const group = new THREE.Group();
  const parts = new Map<string, THREE.Group[]>();
  const roots: { root: THREE.Group; base: THREE.Vector3; vec: THREE.Vector3; start: number; end: number }[] = [];
  const owned: THREE.Material[] = [];

  /** a part root; materials are cloned per part so highlighting one part never lights another */
  const add = (partId: string, meshes: THREE.Object3D[], opts: { z?: number; mirror?: boolean } = {}) => {
    if (model.missing.has(partId)) return;
    const part = getPart(partId);
    const root = new THREE.Group();
    root.name = partId;
    root.userData.partId = partId;
    const cache = new Map<THREE.Material, THREE.Material>();
    for (const obj of meshes) {
      obj.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = mesh.material as THREE.Material;
        if (!cache.has(mat)) {
          const c = mat.clone();
          c.userData.source = mat;
          cache.set(mat, c);
          owned.push(c);
        }
        mesh.material = cache.get(mat)!;
        mesh.userData.partId = partId;
      });
      root.add(obj);
    }
    root.position.z = opts.z ?? 0;
    // parts shared by both sides (brakes, springs) fly out to their own side
    const side = opts.mirror ? -1 : 1;
    const vec = new THREE.Vector3(part.explode.dx, -part.explode.dy, part.explode.dz * side).multiplyScalar(EXPLODE_SCALE);
    roots.push({ root, base: root.position.clone(), vec, start: part.start, end: part.end });
    group.add(root);
    parts.set(partId, [...(parts.get(partId) ?? []), root]);
  };
  const mesh = (g: THREE.BufferGeometry | null, mat: THREE.Material) => (g ? [new THREE.Mesh(g, mat)] : []);

  // ---- regions of the silhouette ----
  const sil = pathToPolygons(geo.sil);
  const belt = bounds(pathToPolygons(geo.dlo)[0]).maxY;
  const lower = sil.flatMap((p) => intersect(p, rect(-100, belt - 1, 1400, 600)));
  const upper = sil.flatMap((p) => intersect(p, rect(-100, -100, 1400, belt + 1)));
  const P = geo.panels;
  const roofY = GROUND - bounds(sil[0]).minY;
  const beltY = GROUND - belt;
  const silBox = bounds(sil[0]);
  const ends = { front: X0 - silBox.minX + 2, rear: silBox.maxX - X0 + 2 };
  const wheels = [geo.wheel.front - X0, geo.wheel.rear - X0];
  const L = (z = 0): Sculpt => ({ zone: "lower", z, belt: beltY, roof: roofY, ...ends, wheels });
  const Gr = (z = 0): Sculpt => ({ zone: "green", z, belt: beltY, roof: roofY, ...ends, wheels });

  // full-width slabs
  const bumperF = clipTo(P.bumper_front, sil);
  const bumperR = clipTo(P.bumper_rear, sil);
  const hood = clipTo(P.hood, sil);
  const trunk = clipTo(P.trunk, sil);
  add("bumper_front", mesh(extrude(bumperF, HALF_W * 2, 9, L()), m.paint));
  add("bumper_rear", mesh(extrude(bumperR, HALF_W * 2, 9, L()), m.paint));
  add("hood", mesh(extrude(hood, HALF_W * 2 - 10, 5, L()), m.paint));
  add("trunk", mesh(extrude(trunk, HALF_W * 2 - 10, 5, L()), m.paint));

  // greenhouse: roof and glass slabs, cabin, pillars
  const roof = clipTo(P.roof, upper);
  const wind = clipTo(P.windshield, upper);
  const rearWin = clipTo(P.rear_window, upper);
  const dlo = pathToPolygons(geo.dlo);
  add("roof", mesh(extrude(roof, GREEN_W * 2 - 16, 6, Gr()), m.paint));
  add("windshield", mesh(extrude(wind, GREEN_W * 2 - 12, 4, Gr()), m.glass));
  add("rear_window", mesh(extrude(rearWin, GREEN_W * 2 - 12, 4, Gr()), m.glass));
  // everything above the waist that is not roof, glass, hood, bumpers or trunk: the dark pillars
  const pillars = difference(upper, union([...roof, ...wind, ...rearWin, ...dlo, ...hood, ...trunk, ...bumperF, ...bumperR]));

  // body core between the side skins: painted top shelf, dark cabin, pillars
  let core = difference(lower, union([...bumperF, ...bumperR, ...hood, ...trunk]));
  // pickups: the side skins and tailgate stay as the bed walls, the body between them drops to the bed floor
  if (geo.bed) core = difference(core, [rect(geo.bed.x0, -100, geo.bed.x1, geo.bed.floor)]);
  add("body_shell", [
    ...mesh(extrude(core, HALF_W * 2 - SKIN * 2, 0, L()), m.paint),
    ...mesh(extrude(dlo, GREEN_W * 2 - 20, 0, Gr()), m.cabin),
    ...mesh(extrude(pillars, GREEN_W * 2 - 6, 3, Gr()), m.trim),
  ]);

  // side skins and side glass, both sides
  for (const [side, z] of [
    ["left", HALF_W - SKIN / 2],
    ["right", -(HALF_W - SKIN / 2)],
  ] as const) {
    const skin = (d: string | undefined, id: string) =>
      d && add(`${id}_${side}`, mesh(extrude(clipTo(d, lower), SKIN, 2, L(z)), m.paint), { z });
    skin(P.fender_front, "fender_front");
    skin(P.door_front, "door_front");
    skin(P.door_rear, "door_rear");
    skin(P.fender_rear, "fender_rear");
    const gz = Math.sign(z) * (GREEN_W - 6);
    add(`side_windows_${side}`, mesh(extrude(dlo, 6, 1, Gr(gz)), m.glass), { z: gz });
    add(`mirror_${side}`, mesh(extrude(pathToPolygons(geo.mirror.body), 46, 4), m.paint), { z: Math.sign(z) * (GREEN_W + 28) });

    // the lens itself glows: a clean light signature at any angle
    const lamp = (lensD: string, glow: THREE.Material, id: string) => {
      const lz = Math.sign(z) * (HALF_W - 40);
      add(`${id}_${side}`, mesh(extrude(pathToPolygons(lensD), 72, 2, L(lz)), glow), { z: lz });
    };
    lamp(geo.headlight.lens, m.led, "headlight");
    lamp(geo.taillight.lens, m.tail, "taillight");

    // arch bands standing proud of the fenders, and a sill strip: black cladding on the SUV,
    // wider body-coloured widebody flares and side skirts on the muscle saloon
    if (geo.cladding || geo.flares) {
      const wide = !!geo.flares;
      const mat = wide ? m.paint : m.trim;
      const depth = wide ? 18 : 10;
      const cz = Math.sign(z) * (HALF_W + (wide ? 6 : 2));
      const { cy: wcy, scale } = geo.wheel;
      const band = (cx: number, rIn: number, rOut: number): Polygon => {
        const ring = (r: number) => {
          const tMax = Math.acos(Math.max(-1, Math.min(1, (wcy - 376) / r)));
          return Array.from({ length: 25 }, (_, i) => -tMax + (2 * tMax * i) / 24).map(
            (t) => [cx + r * Math.sin(t), wcy - r * Math.cos(t)] as [number, number],
          );
        };
        return [...ring(rOut), ...ring(rIn).reverse()];
      };
      const rIn = 88 * scale + 10;
      for (const [axle, cx] of [
        ["front", geo.wheel.front],
        ["rear", geo.wheel.rear],
      ] as const) {
        add(`fender_${axle}_${side}`, mesh(extrude([band(cx, rIn, rIn + (wide ? 24 : 16))], depth, wide ? 5 : 2, L(cz)), mat), { z: cz });
      }
      const sill = lower.flatMap((p) => intersect(p, rect(geo.wheel.front + rIn, wcy + 12, geo.wheel.rear - rIn, 390)));
      add("body_shell", mesh(extrude(sill, depth, wide ? 4 : 2, L(cz)), mat), { z: cz });
    }
  }
  add("diffuser", mesh(extrude(pathToPolygons(geo.diffuser.body), HALF_W * 1.3, 2), geo.flares ? m.carbon : m.trim));

  // honeycomb grille: a thin sliver of the nose between the headlights and the lower intake, standing
  // just proud of the bumper so it follows the nose in side and plan view
  {
    const lamp = bounds(pathToPolygons(geo.headlight.lens)[0]);
    const intake = bounds(pathToPolygons(geo.intake)[0]);
    const nose = silBox.minX;
    const band = rect(nose - 10, lamp.maxY + 4, nose + 16, intake.maxY);
    const sliver = sil.flatMap((p) => intersect(p, band)).map((p) => p.map(([x, y]) => [x - 1.5, y] as [number, number]));
    add("bumper_front", mesh(extrude(sliver, HALF_W * 0.95, 0, L()), m.grille));
  }

  // off-road: a tube roll cage over the bed (one hoop per side, joined across at the top corners)
  // and a roof light bar; both belong to the body
  if (geo.cage) {
    const pts = pathToPolygons(geo.cage)[0].map(([x, y]) => new THREE.Vector2(x - X0, GROUND - y));
    const cz = HALF_W - 30;
    const tubes: THREE.Object3D[] = [];
    for (const side of [1, -1]) {
      const path = new THREE.CurvePath<THREE.Vector3>();
      for (let i = 1; i < pts.length; i++) {
        path.add(new THREE.LineCurve3(new THREE.Vector3(pts[i - 1].x, pts[i - 1].y, side * cz), new THREE.Vector3(pts[i].x, pts[i].y, side * cz)));
      }
      tubes.push(new THREE.Mesh(new THREE.TubeGeometry(path, pts.length * 3, 5, 10, false), m.trim));
    }
    const top = Math.max(...pts.map((p) => p.y));
    const corners = pts.filter((p) => p.y > top - 2);
    for (const p of [corners[0], corners[corners.length - 1]]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, cz * 2, 10), m.trim);
      bar.rotation.x = Math.PI / 2;
      bar.position.set(p.x, p.y, 0);
      tubes.push(bar);
    }
    add("body_shell", tubes);
  }
  if (geo.spare) {
    const [sx, sy, sr] = geo.spare;
    const tyre = new THREE.Mesh(new THREE.CylinderGeometry(sr, sr, 58, 36), m.rubber);
    tyre.rotation.z = Math.PI / 2;
    tyre.position.set(sx - X0, GROUND - sy, 0);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(sr * 0.62, sr * 0.62, 60, 28), m.darkMetal);
    rim.rotation.z = Math.PI / 2;
    rim.position.copy(tyre.position);
    add("trunk", [tyre, rim]);
  }
  if (geo.lightBar) {
    const [lx, ly, len] = geo.lightBar;
    const housing = new THREE.Mesh(new THREE.BoxGeometry(len, 10, GREEN_W * 1.8), m.trim);
    housing.position.set(lx + len / 2 - X0, GROUND - ly + 3, 0);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(2, 6, GREEN_W * 1.7), m.led);
    lens.position.set(lx - X0 - 1, GROUND - ly + 3, 0);
    add("body_shell", [housing, lens]);
  }

  // racing stripes: a side stripe along each flank and twin stripes over the top, following this
  // car's outline; built always, shown only with the livery, each piece owned by the panel it sits on
  const liveryMeshes: THREE.Mesh[] = [];
  {
    const shift = (polys: Polygon[], dy: number) => polys.map((p) => p.map(([x, y]) => [x, y + dy] as [number, number]));
    const archTop = Math.min(geo.wheel.cy - 98 * geo.wheel.scale);
    const glass = union([...wind, ...rearWin, ...dlo]);
    const noBed = (polys: Polygon[]) => (geo.bed ? difference(polys, [rect(geo.bed.x0, -100, geo.bed.x1 + 12, 600)]) : polys);
    // the top-facing skin of the body: the outline lifted a hair, minus a copy dropped 10 units
    const topSkin = noBed(
      difference(
        difference(shift(sil, -1.5), shift(sil, 10)).flatMap((p) => intersect(p, rect(-100, -100, 1400, archTop - 6))),
        glass,
      ),
    );
    const sideBand = sil.flatMap((p) => intersect(p, rect(-100, belt + 30, 1400, belt + 44)));
    const stripe = (partId: string, polys: Polygon[], depth: number, zs: number[], shape: (z: number) => Sculpt) => {
      for (const z of zs) {
        const g = extrude(polys, depth, 0.6, shape(z));
        if (!g) continue;
        const piece = new THREE.Mesh(g, m.livery);
        add(partId, [piece], { z });
        liveryMeshes.push(piece);
      }
    };
    const panelsOf = (polys: Polygon[], ids: [string, string][]) => ids.map(([id, d]) => [id, polys.flatMap((p) => clipTo(d, [p]))] as const);
    // side stripe, on each flank panel and on the sides of the bumpers
    const sideIds: [string, string][] = [
      ["bumper_front", P.bumper_front],
      ["fender_front", P.fender_front],
      ["door_front", P.door_front],
      ...(P.door_rear ? ([["door_rear", P.door_rear]] as [string, string][]) : []),
      ["fender_rear", P.fender_rear],
      ["bumper_rear", P.bumper_rear],
    ];
    for (const [id, polys] of panelsOf(sideBand, sideIds)) {
      if (!polys.length) continue;
      for (const side of ["left", "right"] as const) {
        const zz = (side === "left" ? 1 : -1) * (HALF_W + 1.2);
        const pid = id.startsWith("bumper") ? id : `${id}_${side}`;
        stripe(pid, polys, 2, [zz], L);
      }
    }
    // twin stripes over the hood, roof and boot
    const topIds: [string, string][] = [
      ["hood", P.hood],
      ["roof", P.roof],
      ["trunk", P.trunk],
      ["bumper_front", P.bumper_front],
      ["bumper_rear", P.bumper_rear],
    ];
    for (const [id, polys] of panelsOf(topSkin, topIds)) {
      if (!polys.length) continue;
      const low = polys.flatMap((p) => intersect(p, rect(-100, belt - 1, 1400, 600)));
      const high = polys.flatMap((p) => intersect(p, rect(-100, -100, 1400, belt + 1)));
      stripe(id, low, 30, [26, -26], L);
      stripe(id, high, 30, [26, -26], Gr);
    }
  }
  const showLivery = (l: Finish["livery"]) => liveryMeshes.forEach((x) => (x.visible = l === "stripes"));
  showLivery(finish.livery);

  // wheels, brakes, springs, both sides
  const s = geo.wheel.scale;
  const cy = GROUND - geo.wheel.cy;
  for (const axle of ["front", "rear"] as const) {
    const cx = geo.wheel[axle] - X0;
    for (const side of ["left", "right"] as const) {
      const out: 1 | -1 = side === "left" ? 1 : -1;
      const wz = out * (HALF_W - 34);
      const wheel = wheelGroup(finish.wheel, s, m, out);
      wheel.position.set(cx, cy, 0);
      add(`wheel_${axle}_${side}`, [wheel], { z: wz });

      const disc = new THREE.Group();
      const edge = new THREE.Mesh(new THREE.CylinderGeometry(57 * s, 57 * s, 8, 40, 1, true), m.disc);
      edge.rotation.x = Math.PI / 2;
      disc.add(edge);
      for (const f of [1, -1]) {
        const face = new THREE.Mesh(new THREE.CircleGeometry(57 * s, 40), m.discFace);
        face.position.z = f * 4;
        if (f < 0) face.rotation.y = Math.PI;
        disc.add(face);
      }
      disc.position.set(cx, cy, 0);
      add(`brake_disc_${axle}`, [disc], { z: out * (HALF_W - 62), mirror: side === "right" });

      const a = (-27 * Math.PI) / 180;
      const caliper = new THREE.Mesh(new THREE.BoxGeometry(22 * s, 46 * s, 22), m.accent);
      caliper.position.set(cx + Math.cos(a) * 52 * s, cy - Math.sin(a) * 52 * s, 0);
      caliper.rotation.z = a + Math.PI / 2;
      add(`caliper_${axle}`, [caliper], { z: out * (HALF_W - 58), mirror: side === "right" });

      const spring = new THREE.Mesh(springGeometry(62 * s), m.accent);
      spring.position.set(cx, cy + 28 * s, 0);
      add(`spring_${axle}`, [spring], { z: out * (HALF_W - 82), mirror: side === "right" });
    }
  }

  // mechanicals, under the hood and the floor
  const block = (w: number, h: number, d: number, x: number, y: number, mat: THREE.Material) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(x - X0, GROUND - y, 0);
    return b;
  };
  const front = geo.wheel.front;
  add("engine", [block(220, 80, 260, front + 10, 300, m.darkMetal), block(200, 22, 230, front + 10, 252, m.accent)]);
  const shaftLen = geo.wheel.rear - front - 260;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, shaftLen, 12), m.chrome);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.set(front + 260 + shaftLen / 2 - X0, GROUND - 336, 0);
  add("transmission", [block(140, 50, 120, front + 190, 330, m.darkMetal), shaft]);
  const pipes = [-60, 60].map((pz) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, geo.wheel.rear - front + 120, 12), m.chrome);
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set((front + geo.wheel.rear) / 2 + 60 - X0, GROUND - 374, pz); // below the floor pan
    return pipe;
  });
  add("exhaust", pipes);
  // floor pan from behind the engine bay to the rear axle, so the engine and brakes show from below
  add("chassis_floor", [block(geo.wheel.rear - front - 80, 8, HALF_W * 2 - 110, (front + geo.wheel.rear) / 2 + 60, 352, m.darkMetal)]);

  // classes drawn smaller than life come back to true size, then the tyres go onto y = 0
  group.scale.setScalar(model.scale ?? 1);
  const box = new THREE.Box3().setFromObject(group);
  group.position.y = -box.min.y;

  const setExplode = (k: number) => {
    for (const r of roots) {
      const t = Math.min(1, Math.max(0, (k - r.start) / Math.max(0.01, r.end - r.start)));
      const e = t * t * (3 - 2 * t);
      r.root.position.copy(r.base).addScaledVector(r.vec, e);
    }
  };

  const setFinish = (f: Pick<Finish, "paint" | "tint" | "livery">) => {
    m.apply(f);
    showLivery(f.livery);
    for (const mat of owned) {
      const src = mat.userData.source as THREE.Material | undefined;
      if (src === m.paint || src === m.glass || src === m.livery) {
        const target = mat as THREE.MeshPhysicalMaterial;
        const from = src as THREE.MeshPhysicalMaterial;
        target.color.copy(from.color);
        target.opacity = from.opacity;
      }
    }
  };

  const setHighlight = (partId: string, h: Highlight) => {
    for (const root of parts.get(partId) ?? []) {
      root.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (!mat || !("emissive" in mat)) return;
        const src = mat.userData.source as THREE.MeshStandardMaterial | undefined;
        if (h === "none") {
          mat.emissive.copy(src?.emissive ?? new THREE.Color(0));
          mat.emissiveIntensity = src?.emissiveIntensity ?? 1;
        } else {
          mat.emissive.set(h === "selected" ? "#ffb347" : "#d38c22");
          mat.emissiveIntensity = h === "selected" ? 0.95 : 0.35;
        }
      });
    }
  };

  const dispose = () => {
    group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    owned.forEach((x) => x.dispose());
    Object.values(m).forEach((x) => x instanceof THREE.Material && x.dispose());
  };

  return { group, parts, setExplode, setFinish, setHighlight, dispose };
}
