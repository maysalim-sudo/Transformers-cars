import * as THREE from "three";
import type { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import layout from "../layout.json";
import type { GarageState } from "../timeline";

export type MovingNode = "door" | "lift_arms" | "gantry" | "turntable" | "cover";

export type World = {
  root: THREE.Object3D;
  nodes: Partial<Record<MovingNode, THREE.Object3D>>;
  /** car-local gantry placement is done by the scene, which knows the car's length */
  apply(s: GarageState, opts: { carX: number; carLength: number }): void;
  dispose(): void;
};

const BASE = "/garage/";
const DOOR_TRAVEL = 3.4;
const LIFT_HEIGHT = 0.55;
const SPOT_POWER = 260;

async function loadLightmap(name: string): Promise<THREE.Texture | null> {
  try {
    const tex = await new THREE.TextureLoader().loadAsync(`${BASE}lm_${name}.webp`);
    tex.channel = 1; // the baked UV set
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  } catch {
    return null; // not baked yet: live lights carry the scene
  }
}

/** Loads the atelier (garage.glb), its baked lightmaps and the live lights that change during the scroll. */
export async function loadWorld(loader: GLTFLoader, scene: THREE.Scene, phone: boolean): Promise<World> {
  const gltf = await loader.loadAsync(`${BASE}garage.glb`);
  const root = gltf.scene;
  scene.add(root);
  const [workshop, showroom] = await Promise.all([loadLightmap("workshop"), loadLightmap("showroom")]);
  const maps: Record<string, THREE.Texture | null> = { workshop, showroom };
  const baked = Boolean(workshop && showroom);

  const owned: THREE.Material[] = [];
  const clones = new Map<string, THREE.Material>();
  const byName = (name: string) => {
    const out: THREE.MeshStandardMaterial[] = [];
    root.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m?.name === name && !out.includes(m)) out.push(m);
    });
    return out;
  };

  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.receiveShadow = true;
    // extras land on the glTF node; the mesh may be that node or its child primitive
    const zone = (mesh.userData.lightmap ?? mesh.parent?.userData.lightmap) as string | undefined;
    const map = zone ? maps[zone] : null;
    if (!map) return;
    const src = mesh.material as THREE.MeshStandardMaterial;
    const key = `${src.uuid}:${zone}`;
    if (!clones.has(key)) {
      const m = src.clone();
      m.lightMap = map;
      m.lightMapIntensity = 1;
      owned.push(m);
      clones.set(key, m);
    }
    mesh.material = clones.get(key)!;
  });

  const nodes: World["nodes"] = {};
  for (const name of ["door", "lift_arms", "gantry", "turntable", "cover"] as const) {
    const n = root.getObjectByName(name);
    if (n) nodes[name] = n;
  }
  const rest = Object.fromEntries(Object.entries(nodes).map(([k, n]) => [k, n.position.clone()])) as Record<MovingNode, THREE.Vector3>;
  // the cover rides on the turntable
  if (nodes.cover && nodes.turntable) nodes.turntable.attach(nodes.cover);

  // live lights: soft fill, one key per bay (only while unbaked), booth flare, the showroom rig
  const lights: THREE.Light[] = [];
  const add = <T extends THREE.Light>(l: T) => (scene.add(l), lights.push(l), l);
  add(new THREE.HemisphereLight("#cfd6e2", "#2a2c30", baked ? 0.1 : 0.3));
  if (!baked) {
    for (const x of Object.values(layout.bays)) {
      const s = add(new THREE.SpotLight("#ffffff", 22, 12, 0.7, 0.6, 1.2));
      s.position.set(x, layout.hall.height - 0.3, 0);
      s.target.position.set(x, 0, 0);
      scene.add(s.target);
    }
  }
  const booth = add(new THREE.PointLight("#fff4e0", 0, 9, 1.4));
  booth.position.set(layout.bays.paint, 3, 0);
  const spots: THREE.SpotLight[] = [];
  for (let i = 0; i < layout.rig.count; i++) {
    const e = root.getObjectByName(`spot_${i}`);
    const s = add(new THREE.SpotLight("#fff1dc", 0, 18, 0.36, 0.55, 1.2));
    if (e) e.getWorldPosition(s.position);
    s.target.position.set(layout.show, 0.6, 0);
    scene.add(s.target);
    if (!phone && i % 3 === 0) {
      s.castShadow = true;
      s.shadow.mapSize.set(1024, 1024);
      s.shadow.bias = -0.0004;
    }
    spots.push(s);
  }
  // each lens gets its own material so the lights can come on one by one
  const lenses: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < layout.rig.count; i++) {
    const lens = root.getObjectByName(`lens_${i}`) as THREE.Mesh | undefined;
    if (!lens) continue;
    const m = (lens.material as THREE.MeshStandardMaterial).clone();
    m.emissive.set("#fff1d6");
    owned.push(m);
    lens.material = m;
    lenses[i] = m;
  }
  const boothPanels = byName("booth_light");
  const boothBase = boothPanels.map((m) => m.emissiveIntensity);

  return {
    root,
    nodes,
    apply(s, { carX, carLength }) {
      if (nodes.door) nodes.door.position.y = rest.door.y + s.doorOpen * DOOR_TRAVEL;
      if (nodes.lift_arms) nodes.lift_arms.position.y = rest.lift_arms.y + s.lift * LIFT_HEIGHT;
      // the spray gantry is the paint beam: nose to tail over the car
      // (only in the paint bay; elsewhere it waits at its end of the booth)
      if (nodes.gantry) nodes.gantry.position.x = s.bay === 4 ? carX + (-1.1 + 2.2 * s.paintSweep) * (carLength / 2) : rest.gantry.x;
      if (nodes.turntable) nodes.turntable.rotation.y = s.tableTurn;
      booth.intensity = s.boothLight * 30;
      boothPanels.forEach((m, i) => (m.emissiveIntensity = boothBase[i] * (1 + s.boothLight * 2.5)));
      spots.forEach((l, i) => (l.intensity = s.showLights[i] * SPOT_POWER));
      lenses.forEach((m, i) => m && (m.emissiveIntensity = s.showLights[i] * 8));
    },
    dispose() {
      root.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      owned.forEach((m) => m.dispose());
      lights.forEach((l) => l.removeFromParent());
      Object.values(maps).forEach((t) => t?.dispose());
    },
  };
}
