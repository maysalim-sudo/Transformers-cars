import * as THREE from "three";
import type { GarageState } from "../timeline";
import type { RiggedCar } from "./car";

export type Effects = { apply(s: GarageState, car: RiggedCar, dt: number): void; dispose(): void };

function particles(scene: THREE.Scene, n: number, color: string, size: number, opacity: number) {
  const pos = new Float32Array(n * 3).fill(-999);
  const vel = new Float32Array(n * 3);
  const life = new Float32Array(n);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);
  let head = 0;
  return {
    mat,
    emit(at: THREE.Vector3, spread: number, up: number) {
      const k = head;
      head = (head + 1) % n;
      pos.set([at.x, at.y, at.z], k * 3);
      vel.set([(Math.random() - 0.5) * 3 * spread, Math.random() * up, (Math.random() - 0.5) * 3 * spread], k * 3);
      life[k] = 0.4 + Math.random() * 0.6;
    },
    step(dt: number, gravity: number) {
      let alive = false;
      for (let k = 0; k < n; k++) {
        if (life[k] <= 0) continue;
        life[k] -= dt;
        if (life[k] <= 0) {
          pos[k * 3 + 1] = -999;
          continue;
        }
        alive = true;
        vel[k * 3 + 1] += gravity * dt;
        for (let a = 0; a < 3; a++) pos[k * 3 + a] += vel[k * 3 + a] * dt;
        if (pos[k * 3 + 1] < 0.01) {
          pos[k * 3 + 1] = 0.01;
          vel[k * 3 + 1] *= -0.3;
        }
      }
      if (alive) geo.attributes.position.needsUpdate = true;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
      pts.removeFromParent();
    },
  };
}

/** Welding sparks in the kit bay, paint mist in the booth, and the tint scan beam that rides on the car. */
export function createEffects(scene: THREE.Scene, car: RiggedCar, reduced: boolean): Effects {
  const sparks = particles(scene, 700, "#ffb347", 0.035, 0.95);
  const mist = particles(scene, 900, "#f0b04e", 0.09, 0.18);
  const beamMat = new THREE.MeshBasicMaterial({ color: "#ffd696", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 1.1), beamMat);
  beam.rotation.y = Math.PI / 2;
  beam.scale.set(1, 1, 1);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.1), beamMat);
  glow.rotation.y = Math.PI / 2;
  beam.add(glow);
  car.group.add(beam);
  let last: GarageState | null = null;
  const at = new THREE.Vector3();

  return {
    apply(s, rig, dt) {
      const moved = last !== null && (s.kitOff !== last.kitOff || s.paintSweep !== last.paintSweep);
      if (!reduced && moved && s.sparks > 0) {
        for (let i = 0; i < 6; i++) {
          const side = Math.random() > 0.5 ? 1 : -1;
          at.set(side * rig.length * 0.47, 0.35 + Math.random() * 0.2, (Math.random() - 0.5) * 1.6);
          sparks.emit(rig.group.localToWorld(at), 1, 2.4);
        }
      }
      if (!reduced && moved && s.mist > 0.2) {
        for (let i = 0; i < 6; i++) {
          at.set((Math.random() - 0.5) * rig.length, 0.3 + Math.random() * 1.6, (Math.random() - 0.5) * 2.4);
          mist.emit(rig.group.localToWorld(at), 0.12, 0.25);
        }
      }
      mist.mat.opacity = 0.18 * s.mist;
      // tint beam: a thin bright line with a soft glow across the glasshouse, nose to tail
      const on = s.tintSweep > 0 && s.tintSweep < 1 ? 1 : 0;
      beam.position.set((-1.1 + 2.2 * s.tintSweep) * (rig.length / 2), 1.35, 0);
      beamMat.opacity = on * 0.55;
      sparks.step(dt, -9);
      mist.step(dt, 0.15);
      last = s;
    },
    dispose() {
      sparks.dispose();
      mist.dispose();
      beam.geometry.dispose();
      glow.geometry.dispose();
      beamMat.dispose();
      beam.removeFromParent();
    },
  };
}
