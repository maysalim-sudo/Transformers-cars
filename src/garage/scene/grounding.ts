/**
 * What sits the car on the floor. The car moves, so it is in no bake: without this it floats.
 * - a soft contact shadow under it (every device): fades and spreads as the lift raises the car
 * - a workshop key light that follows it and casts real shadows (desktop; the showroom has its own rig)
 */
import * as THREE from "three";
import layout from "../layout.json";
import type { GarageState } from "../timeline";
import type { RiggedCar } from "./car";

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** signed distance from (u, v) in 0..1 to a rounded box centred in the texture (negative inside) */
function box(u: number, v: number, hx: number, hy: number, r: number) {
  const x = Math.abs(u * 2 - 1) - hx + r;
  const y = Math.abs(v * 2 - 1) - hy + r;
  return Math.hypot(Math.max(x, 0), Math.max(y, 0)) + Math.min(Math.max(x, y), 0) - r;
}

/** shadow density at a texel: a dark core under the body inside a wide soft falloff, 0 at the texture edge */
export function shadowAlpha(u: number, v: number): number {
  const core = 1 - smoothstep(0, 0.12, box(u, v, 0.72, 0.5, 0.2));
  const wide = 1 - smoothstep(0, 0.38, box(u, v, 0.6, 0.35, 0.3));
  return 0.55 * core + 0.45 * wide;
}

/** with the car up on the lift the shadow lightens and widens */
export function shadowAt(lift: number): { opacity: number; spread: number } {
  return { opacity: 0.85 * (1 - 0.65 * lift), spread: 1 + 0.35 * lift };
}

export type Grounding = { apply(s: GarageState): void; dispose(): void };

const KEY_POWER = 34;

export function createGrounding(scene: THREE.Scene, car: RiggedCar, phone: boolean): Grounding {
  const W = 128;
  const H = 64;
  const data = new Uint8Array(W * H * 4);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) data[(j * W + i) * 4 + 3] = Math.round(255 * shadowAlpha((i + 0.5) / W, (j + 0.5) / H));
  const tex = new THREE.DataTexture(data, W, H);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;

  const footprint = new THREE.Box3().setFromObject(car.group).getSize(new THREE.Vector3());
  const material = new THREE.MeshBasicMaterial({ map: tex, color: 0x000000, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const geometry = new THREE.PlaneGeometry(footprint.x * 1.3, footprint.z * 1.7);
  geometry.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(geometry, material);
  shadow.position.y = 0.004;
  shadow.renderOrder = 1;
  scene.add(shadow);

  // key light over the car while it is in the workshop (indoors, before the showroom's own rig)
  const key = phone ? null : new THREE.SpotLight("#fff6ea", 0, 14, 0.62, 0.75, 1.2);
  if (key) {
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0003;
    key.shadow.normalBias = 0.02;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 12;
    scene.add(key, key.target);
  }

  return {
    apply(s) {
      const { opacity, spread } = shadowAt(s.lift);
      shadow.position.x = s.carX;
      shadow.rotation.y = s.tableTurn;
      shadow.scale.setScalar(spread);
      material.opacity = opacity * (1 - s.transition);
      if (key) {
        const indoors = s.carX < layout.door && s.bay < 6;
        key.intensity = indoors ? KEY_POWER * (1 - s.transition) : 0;
        key.position.set(s.carX + 1.2, 5.6, 1.8);
        key.target.position.set(s.carX, 0.4, 0);
      }
    },
    dispose() {
      shadow.removeFromParent();
      geometry.dispose();
      material.dispose();
      tex.dispose();
      key?.shadow.map?.dispose();
      key?.removeFromParent();
      key?.target.removeFromParent();
    },
  };
}
