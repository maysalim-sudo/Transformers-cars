import { readFileSync } from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { describe, expect, it } from "vitest";
import { carModels, modelIds } from "../models";
import { getPart } from "../registry";
import { MODEL_UNITS_PER_METRE } from "./buildCar";
import { wrapHdCar } from "./hdCar";

const finish = { paint: "graphite", tint: "none" };

async function load(id: string) {
  const buf = readFileSync(path.resolve(__dirname, `../../../public/models/hd/${id}.glb`));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const gltf = await new GLTFLoader().parseAsync(ab, "");
  return wrapHdCar(gltf.scene, finish);
}

describe("HD cars from Blender", () => {
  it.each(modelIds)("%s: every mesh belongs to a registry part, on the ground, at true size", async (id) => {
    const car = await load(id);
    const model = carModels[id];
    car.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) expect(() => getPart(o.userData.partId)).not.toThrow();
    });
    for (const p of ["hood", "roof", "windshield", "wheel_front_left", "wheel_rear_right", "door_front_left", "body_shell"]) {
      expect(car.parts.has(p), p).toBe(true);
    }
    for (const p of model.missing) expect(car.parts.has(p), p).toBe(false);
    const box = new THREE.Box3().setFromObject(car.group);
    expect(box.min.y).toBeCloseTo(0, 3);
    const length = (box.max.x - box.min.x) / MODEL_UNITS_PER_METRE;
    expect(length).toBeGreaterThan(3.9);
    expect(length).toBeLessThan(6.2);
    car.dispose();
  });

  it("recolours the paint and lights only the chosen part", async () => {
    const car = await load("suv");
    car.setFinish({ paint: "amber", tint: "dark" });
    const hood = car.parts.get("hood")![0];
    const roof = car.parts.get("roof")![0];
    const firstMat = (g: THREE.Object3D) => {
      let m: THREE.MeshStandardMaterial | undefined;
      g.traverse((o) => (m ??= (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined));
      return m!;
    };
    car.setHighlight("hood", "selected");
    expect(firstMat(hood).emissiveIntensity).toBeCloseTo(0.95);
    expect(firstMat(roof).emissiveIntensity).not.toBeCloseTo(0.95);
    car.setExplode(1);
    expect(hood.position.length()).toBeGreaterThan(0);
    car.dispose();
  });
});
