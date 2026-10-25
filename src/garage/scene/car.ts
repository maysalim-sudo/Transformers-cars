import * as THREE from "three";
import { type AnchorId, heroCar } from "../heroCar";
import { type GarageState, stateAt } from "../timeline";

export type RiggedCar = {
  /** placed and turned by the scene; everything inside is car-local */
  group: THREE.Group;
  wheelRadius: number;
  /** nose to tail, metres */
  length: number;
  apply(s: GarageState): void;
  anchorWorld(id: AnchorId, out: THREE.Vector3): THREE.Vector3;
  /** fades a motion-blurred disc over each rim (0 … 1, from rimBlurAmount) */
  blurRims(amount: number): void;
  dispose(): void;
};

const LIFT_HEIGHT = 0.55;
const WHEEL_SLIDE = 0.75;
/** beam travel past each end, and how soft its edge is (in −1…1 car lengths) */
const BEAM_START = -1.1;
const BEAM_SPAN = 2.2;
const BEAM_EDGE = 0.15;
const STILL = /^(wheel|brake|caliper|spring)/;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** How far a part at centreN (−1 nose … 1 tail) has switched once the beam has swept `sweep` (0…1) of its travel. */
export function sweepAmount(centreN: number, sweep: number): number {
  if (sweep <= 0) return 0;
  if (sweep >= 1) return 1;
  return clamp01((BEAM_START + BEAM_SPAN * sweep - centreN) / BEAM_EDGE + 0.5);
}

type Kind = "paint" | "glass" | "rim" | "cal";
const kindOf = (partId: string, matName: string): Kind | "led" | null => {
  if (partId.startsWith("caliper")) return "cal";
  const n = matName.split(".")[0];
  if (n === "paint") return "paint";
  if (n === "glass") return "glass";
  if (n === "rim" || n === "machined") return "rim";
  if (n === "led") return "led";
  return null;
};

/** Rigs a loaded glTF scene of the hero car (metres, y up, nose −x) for the garage timeline. */
export function rigCar(scene: THREE.Object3D): RiggedCar {
  const group = new THREE.Group();
  const lift = new THREE.Group();
  group.add(lift);
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  scene.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  lift.add(scene);
  group.updateMatrixWorld(true);

  const colour = (hex: string) => new THREE.Color(hex);
  const C = {
    paint: [colour(heroCar.stock.paint), colour(heroCar.tuned.paint)],
    rim: [colour(heroCar.stock.rim), colour(heroCar.tuned.rim)],
    cal: [colour(heroCar.stock.caliper), colour(heroCar.tuned.caliper)],
    glass: [colour(heroCar.stock.glass), colour(heroCar.tuned.glass)],
  } as const;

  const nodes = new Map<string, THREE.Object3D[]>();
  scene.traverse((o) => {
    if (typeof o.userData.partId === "string") nodes.set(o.userData.partId, [...(nodes.get(o.userData.partId) ?? []), o]);
  });

  // per-part material clones, so a beam can switch the car panel by panel
  const swaps: { mat: THREE.MeshStandardMaterial; kind: Kind; centreN: number }[] = [];
  const leds: { mat: THREE.MeshStandardMaterial; base: number }[] = [];
  const owned: THREE.Material[] = [];
  for (const [partId, list] of nodes) {
    for (const node of list) {
      const c = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
      const centreN = ((lift.worldToLocal(c).x + size.x / 2) / size.x) * 2 - 1;
      const cache = new Map<THREE.Material, THREE.MeshStandardMaterial>();
      node.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const src = mesh.material as THREE.MeshStandardMaterial;
        const kind = kindOf(partId, src.name ?? "");
        if (!kind) return;
        if (!cache.has(src)) {
          const m = src.clone();
          owned.push(m);
          cache.set(src, m);
          if (kind === "led") leds.push({ mat: m, base: m.emissiveIntensity });
          else {
            if (kind === "glass") m.transparent = true;
            swaps.push({ mat: m, kind, centreN });
          }
        }
        mesh.material = cache.get(src)!;
      });
    }
  }

  // wheels spin and slide about their own centres
  const wheels = ["wheel_front_left", "wheel_front_right", "wheel_rear_left", "wheel_rear_right"].map((id) => {
    const w = nodes.get(id)![0];
    const pivot = new THREE.Group();
    pivot.position.copy(lift.worldToLocal(new THREE.Box3().setFromObject(w).getCenter(new THREE.Vector3())));
    lift.add(pivot);
    pivot.updateMatrixWorld(true);
    pivot.attach(w);
    return { pivot, rest: pivot.position.clone(), side: id.includes("left") ? 1 : -1 };
  });
  const wheelBox = new THREE.Box3().setFromObject(wheels[0].pivot);
  const wheelRadius = (wheelBox.max.y - wheelBox.min.y) / 2;

  // a spinning rim seen on film: the spokes smear into a disc, darker at the hub, brighter at the lip
  const BLUR_N = 64;
  const blurData = new Uint8Array(BLUR_N * BLUR_N * 4);
  for (let j = 0; j < BLUR_N; j++) {
    for (let i = 0; i < BLUR_N; i++) {
      const r = Math.hypot((i + 0.5) / BLUR_N - 0.5, (j + 0.5) / BLUR_N - 0.5) * 2;
      const k = (j * BLUR_N + i) * 4;
      const shade = r < 0.22 ? 0.55 : 0.75 + 0.25 * Math.min(1, (r - 0.22) / 0.7);
      blurData.set([255 * shade, 255 * shade, 255 * shade, r < 0.96 ? 255 * Math.min(1, (0.96 - r) / 0.04) : 0], k);
    }
  }
  const blurTex = new THREE.DataTexture(blurData, BLUR_N, BLUR_N);
  blurTex.magFilter = THREE.LinearFilter;
  blurTex.needsUpdate = true;
  const blurMat = new THREE.MeshStandardMaterial({ map: blurTex, transparent: true, opacity: 0, metalness: 0.6, roughness: 0.45, depthWrite: false });
  owned.push(blurMat);
  const wheelWidth = wheelBox.max.z - wheelBox.min.z;
  const blurGeo = new THREE.CircleGeometry(wheelRadius * 0.78, 32);
  const blurDiscs = wheels.map((w) => {
    const disc = new THREE.Mesh(blurGeo, blurMat);
    disc.position.z = w.side * (wheelWidth / 2 + 0.004);
    if (w.side < 0) disc.rotation.y = Math.PI; // face outward on the right side too
    disc.visible = false;
    w.pivot.add(disc);
    return disc;
  });

  const body: { node: THREE.Object3D; rest: THREE.Vector3; out: THREE.Vector3 }[] = [];
  for (const [partId, list] of nodes) {
    if (STILL.test(partId)) continue;
    const out = new THREE.Vector3(...(heroCar.kitParts.find((k) => k.id === partId)?.out ?? [0, 0, 0]));
    for (const node of list) body.push({ node, rest: node.position.clone(), out });
  }
  const lips: THREE.Object3D[] = [];
  scene.traverse((o) => heroCar.lipNodes.test(o.name) && lips.push(o));

  // callout anchors, stored in their part's own space so they follow it
  group.updateMatrixWorld(true);
  const anchors = Object.fromEntries(
    (Object.entries(heroCar.anchors) as [AnchorId, (typeof heroCar.anchors)[AnchorId]][]).map(([id, a]) => {
      const node = nodes.get(a.partId)![0];
      const p = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3()).add(new THREE.Vector3(...a.offset));
      return [id, { node, local: node.worldToLocal(p) }];
    }),
  ) as Record<AnchorId, { node: THREE.Object3D; local: THREE.Vector3 }>;

  const apply = (s: GarageState) => {
    lift.position.y = s.lift * LIFT_HEIGHT;
    for (const w of wheels) {
      w.pivot.position.set(w.rest.x, w.rest.y, w.rest.z + w.side * s.wheelsOff * WHEEL_SLIDE);
      w.pivot.rotation.z = s.wheelSpin;
    }
    for (const b of body) b.node.position.copy(b.rest).addScaledVector(b.out, s.kitOff).setY(b.rest.y + b.out.y * s.kitOff - s.drop);
    for (const l of lips) l.visible = s.lipsVisible;
    for (const { mat, kind, centreN } of swaps) {
      const k =
        kind === "paint" ? sweepAmount(centreN, s.paintSweep) : kind === "glass" ? sweepAmount(centreN, s.tintSweep) : s.wheelFinish;
      mat.color.lerpColors(C[kind][0], C[kind][1], k);
      if (kind === "glass") mat.opacity = heroCar.stock.glassOpacity + (heroCar.tuned.glassOpacity - heroCar.stock.glassOpacity) * k;
    }
    for (const l of leds) l.mat.emissiveIntensity = l.base * (0.6 + s.headlights * 1.2);
    blurMat.color.lerpColors(C.rim[0], C.rim[1], s.wheelFinish);
  };

  apply(stateAt(0));
  return {
    group,
    wheelRadius,
    length: size.x,
    apply,
    anchorWorld(id, out) {
      const a = anchors[id];
      a.node.updateWorldMatrix(true, false);
      return a.node.localToWorld(out.copy(a.local));
    },
    blurRims(amount) {
      blurMat.opacity = amount * 0.9;
      blurDiscs.forEach((d) => (d.visible = amount > 0));
    },
    dispose() {
      group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      owned.forEach((m) => m.dispose());
      blurTex.dispose();
    },
  };
}
