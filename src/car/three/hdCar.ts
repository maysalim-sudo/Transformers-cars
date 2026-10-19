import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { CarModelId } from "../models";
import { getPart } from "../registry";
import { type BuiltCar, EXPLODE_SCALE, type Finish, MODEL_UNITS_PER_METRE, makeMaterials } from "./buildCar";

/** the Blender-built car for a class, exported by blender/hd/export_glb.py (metres, y up, nose −x, left side +z) */
export const hdModelUrl = (id: CarModelId) => `/models/hd/${id}.glb`;

/**
 * Wraps a loaded HD car scene in the same interface buildCar returns. Every part is a node carrying
 * userData.partId (glTF extras); its materials are cloned per part so highlighting stays local, and the
 * paint and glass are swapped for the site's own so the colour and tint pickers drive them.
 * The HD wheels are modelled per class, so the wheel style and the stripe livery do not apply here.
 */
export function wrapHdCar(scene: THREE.Object3D, finish: Pick<Finish, "paint" | "tint">): BuiltCar {
  const m = makeMaterials(finish);
  // the HD meshes carry no model-unit UVs, so the paint keeps its colour and clear coat but not the flake maps
  const paint = m.paint.clone();
  paint.normalMap = null;
  paint.clearcoatNormalMap = null;
  const swap: Record<string, THREE.Material> = { paint, glass: m.glass };

  const group = new THREE.Group();
  scene.scale.setScalar(MODEL_UNITS_PER_METRE);
  group.add(scene);
  const parts = new Map<string, THREE.Group[]>();
  const roots: { root: THREE.Object3D; base: THREE.Vector3; vec: THREE.Vector3; start: number; end: number }[] = [];
  const owned: THREE.Material[] = [];
  const imported = new Set<THREE.Material>();

  const partNodes: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (typeof o.userData.partId === "string") partNodes.push(o);
  });
  for (const node of partNodes) {
    const partId = node.userData.partId as string;
    const part = getPart(partId);
    const cache = new Map<THREE.Material, THREE.Material>();
    node.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.Material;
      imported.add(mat);
      if (!cache.has(mat)) {
        const src = swap[mat.name.split(".")[0]] ?? mat;
        const c = src.clone();
        c.userData.source = src;
        cache.set(mat, c);
        owned.push(c);
      }
      mesh.material = cache.get(mat)!;
      mesh.userData.partId = partId;
    });
    // inside the metre-scaled scene, so the model-unit explode offsets shrink by the same factor
    const side = node.userData.side === "right" ? -1 : 1;
    const vec = new THREE.Vector3(part.explode.dx, -part.explode.dy, part.explode.dz * side).multiplyScalar(EXPLODE_SCALE / MODEL_UNITS_PER_METRE);
    roots.push({ root: node, base: node.position.clone(), vec, start: part.start, end: part.end });
    parts.set(partId, [...(parts.get(partId) ?? []), node as THREE.Group]);
  }

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
    paint.color.copy(m.paint.color);
    for (const mat of owned) {
      const src = mat.userData.source as THREE.MeshPhysicalMaterial | undefined;
      if (src === paint || src === m.glass) {
        (mat as THREE.MeshPhysicalMaterial).color.copy(src.color);
        mat.opacity = src.opacity;
      }
    }
  };

  const setHighlight: BuiltCar["setHighlight"] = (partId, h) => {
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
    imported.forEach((x) => x.dispose());
    paint.dispose();
    Object.values(m).forEach((x) => x instanceof THREE.Material && x.dispose());
  };

  setFinish(finish);
  return { group, parts, setExplode, setFinish, setHighlight, dispose };
}

/** Fetches and wraps the HD car; rejects if the file is missing or broken, so the caller keeps buildCar. */
export async function loadHdCar(id: CarModelId, finish: Pick<Finish, "paint" | "tint">): Promise<BuiltCar> {
  const gltf = await new GLTFLoader().loadAsync(hdModelUrl(id));
  return wrapHdCar(gltf.scene, finish);
}
