import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { carModels, modelIds } from "../models";
import { getPart } from "../registry";
import { buildCar, MODEL_UNITS_PER_METRE } from "./buildCar";

const finish = { paint: "graphite", wheel: "split" as const, tint: "none" };

const always = [
  "bumper_front", "bumper_rear", "hood", "trunk", "roof", "windshield", "rear_window",
  "side_windows_left", "side_windows_right", "door_front_left", "door_front_right",
  "fender_front_left", "fender_front_right", "fender_rear_left", "fender_rear_right",
  "headlight_left", "headlight_right", "taillight_left", "taillight_right",
  "mirror_left", "mirror_right", "diffuser",
  "wheel_front_left", "wheel_front_right", "wheel_rear_left", "wheel_rear_right",
  "brake_disc_front", "brake_disc_rear", "caliper_front", "caliper_rear",
  "spring_front", "spring_rear", "engine", "transmission", "exhaust",
];

describe("buildCar", () => {
  for (const id of modelIds) {
    it(`builds every inspectable part of the ${id} as its own mesh`, () => {
      const car = buildCar(carModels[id], finish);
      const twoDoor = carModels[id].missing.has("door_rear_left");
      const expected = twoDoor ? always : [...always, "door_rear_left", "door_rear_right"];
      for (const pid of expected) expect(car.parts.get(pid)?.length, pid).toBeGreaterThan(0);
      if (twoDoor) expect(car.parts.has("door_rear_left")).toBe(false);
    });
  }

  for (const id of ["pickup", "doublecab", "offroad", "desert"] as const) {
    it(`leaves the ${id} bed open down to its floor`, () => {
      const car = buildCar(carModels[id], finish);
      car.group.updateMatrixWorld(true);
      const bed = carModels[id].side.bed!;
      const mid = (bed.x0 + bed.x1) / 2 - 600; // model x is centred on 600
      const height = new THREE.Box3().setFromObject(car.group).max.y;
      let top = 0;
      const v = new THREE.Vector3();
      for (const root of car.parts.get("body_shell")!) {
        root.traverse((o) => {
          const pos = (o as THREE.Mesh).geometry?.getAttribute("position");
          if (!pos) return;
          for (let i = 0; i < pos.count; i++) {
            v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
            if (Math.abs(v.x - mid) < 60 && Math.abs(v.z) < 120) top = Math.max(top, v.y);
          }
        });
      }
      expect(top).toBeGreaterThan(0);
      expect(top).toBeLessThan(height * 0.5);
    });
  }

  it("mounts the trail 4x4 spare wheel on the tailgate, behind the body", () => {
    const car = buildCar(carModels.trail, finish);
    const tailgate = new THREE.Box3();
    for (const root of car.parts.get("trunk")!) tailgate.expandByObject(root);
    const body = new THREE.Box3();
    for (const root of car.parts.get("body_shell")!) body.expandByObject(root);
    expect(tailgate.max.x).toBeGreaterThan(body.max.x + 30);
  });

  it("shows the racing stripes only with the livery on, each piece on a real panel", () => {
    const visibleStripes = (car: ReturnType<typeof buildCar>) => {
      let n = 0;
      car.group.traverse((o) => {
        const mat = (o as THREE.Mesh).material as THREE.Material | undefined;
        if (mat?.name === "livery" && o.visible) n++;
      });
      return n;
    };
    const car = buildCar(carModels.coupe, finish);
    expect(visibleStripes(car)).toBe(0);
    car.setFinish({ paint: "graphite", tint: "none", livery: "stripes" });
    expect(visibleStripes(car)).toBeGreaterThan(8);
    car.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) expect(() => getPart(o.userData.partId)).not.toThrow();
    });
  });

  it("brings a class drawn smaller than life back to true size", () => {
    const car = buildCar(carModels.desert, finish);
    const length = new THREE.Box3().setFromObject(car.group).getSize(new THREE.Vector3()).x / MODEL_UNITS_PER_METRE;
    expect(length).toBeGreaterThan(5.7);
    expect(length).toBeLessThan(6.1);
  });

  it("tags every mesh with a real registry part", () => {
    const car = buildCar(carModels.sedan, finish);
    car.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) expect(() => getPart(o.userData.partId)).not.toThrow();
    });
  });

  it("puts the left side towards +z and sits the tyres on the ground", () => {
    const car = buildCar(carModels.sedan, finish);
    const left = new THREE.Box3().setFromObject(car.parts.get("door_front_left")![0]);
    const right = new THREE.Box3().setFromObject(car.parts.get("door_front_right")![0]);
    expect(left.min.z).toBeGreaterThan(0);
    expect(right.max.z).toBeLessThan(0);
    const all = new THREE.Box3().setFromObject(car.group);
    expect(all.min.y).toBeCloseTo(0, 0);
    expect(all.max.x - all.min.x).toBeGreaterThan(1000);
  });

  it("moves parts out along their explode vectors and back", () => {
    const car = buildCar(carModels.sedan, finish);
    const hood = car.parts.get("hood")![0];
    const y0 = hood.position.y;
    car.setExplode(1);
    expect(hood.position.y).toBeGreaterThan(y0 + 50);
    car.setExplode(0);
    expect(hood.position.y).toBeCloseTo(y0, 5);
  });
});
