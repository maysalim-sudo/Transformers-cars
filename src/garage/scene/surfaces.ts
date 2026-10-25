/**
 * Surface detail the glb does not carry (scripts/make-surface-maps.py): speckled, glossy epoxy that breaks
 * up the light strips' reflections, and relief on the acoustic wall panels. Applied to the world's own
 * (lightmapped) material clones; a map that fails to load leaves its material as it was.
 */
import * as THREE from "three";

const BASE = "/garage/";

async function load(name: string, color: boolean): Promise<THREE.Texture | null> {
  try {
    const t = await new THREE.TextureLoader().loadAsync(`${BASE}${name}.webp`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.flipY = false; // same UV convention as the glTF's own maps
    t.anisotropy = 8;
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  } catch {
    return null;
  }
}

/** Upgrade the floor and wall materials found under `root`; returns what it created, for disposal. */
export async function applySurfaces(root: THREE.Object3D): Promise<{ dispose(): void }> {
  const [albedo, rough, floorNormal, wallNormal] = await Promise.all([
    load("floor_albedo", true),
    load("floor_rough", false),
    load("floor_normal", false),
    load("wall_normal", false),
  ]);
  const made: THREE.Material[] = [];
  const swapped = new Map<THREE.Material, THREE.Material>();

  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const m = mesh.material as THREE.MeshStandardMaterial;
    if (m.name === "floor_epoxy") {
      if (!swapped.has(m)) {
        // epoxy is a clear coat over a speckled base: physical material, same lightmap and UVs
        const p = new THREE.MeshPhysicalMaterial({
          name: m.name,
          // a darker epoxy than the bake's base, for the moody workshop: the pools read on it without glaring
          color: m.color.clone().multiplyScalar(0.2),
          map: albedo ?? m.map,
          lightMap: m.lightMap,
          lightMapIntensity: m.lightMapIntensity,
          metalness: m.metalness,
          roughness: rough ? 1 : m.roughness,
          roughnessMap: rough,
          normalMap: floorNormal,
          normalScale: new THREE.Vector2(0.35, 0.35),
          clearcoat: 0.75,
          clearcoatRoughness: 0.14,
          envMapIntensity: 1.4,
        });
        made.push(p);
        swapped.set(m, p);
      }
      mesh.material = swapped.get(m)!;
    } else if (m.name === "wall_panel" && wallNormal && !m.normalMap) {
      m.normalMap = wallNormal;
      m.normalScale.set(0.8, 0.8);
      m.needsUpdate = true;
    }
  });

  return {
    dispose() {
      made.forEach((m) => m.dispose());
      [albedo, rough, floorNormal, wallNormal].forEach((t) => t?.dispose());
    },
  };
}
