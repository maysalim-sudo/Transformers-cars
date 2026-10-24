import { readFileSync } from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { describe, expect, it } from "vitest";
import { heroCar } from "../heroCar";
import { stateAt } from "../timeline";
import { rigCar, sweepAmount } from "./car";

async function rig() {
  const buf = readFileSync(path.resolve(__dirname, "../../../public", heroCar.url.slice(1)));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const scene = (await new GLTFLoader().parseAsync(ab, "")).scene;
  const car = rigCar(scene);
  const node = (id: string) => {
    let found: THREE.Object3D | undefined;
    car.group.traverse((o) => (found ??= o.userData.partId === id ? o : undefined));
    return found!;
  };
  const paintHex = (id: string) => {
    let hex = "";
    node(id).traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (!hex && m?.name.startsWith("paint")) hex = m.color.getHexString();
    });
    return hex;
  };
  const centre = (id: string) => {
    car.group.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(node(id)).getCenter(new THREE.Vector3());
  };
  return { car, node, paintHex, centre };
}
const hex = (c: string) => new THREE.Color(c).getHexString();
const still = /^(wheel|brake|caliper|spring)/;

describe("sweepAmount", () => {
  it("is 0 before the beam starts and 1 after it ends, wherever the part is", () => {
    for (const c of [-1, -0.3, 0.4, 1]) {
      expect(sweepAmount(c, 0)).toBe(0);
      expect(sweepAmount(c, 1)).toBe(1);
    }
  });
  it("switches the parts the beam has passed and leaves the others", () => {
    expect(sweepAmount(-0.6, 0.5)).toBe(1);
    expect(sweepAmount(0.6, 0.5)).toBe(0);
  });
});

describe("rigCar", () => {
  it("paints from the nose back: hood first, trunk last", async () => {
    const { car, paintHex } = await rig();
    car.apply(stateAt(0.65));
    expect(paintHex("hood")).toBe(hex(heroCar.tuned.paint));
    expect(paintHex("trunk")).toBe(hex(heroCar.stock.paint));
    car.apply(stateAt(0.74));
    expect(paintHex("trunk")).toBe(hex(heroCar.tuned.paint));
    car.dispose();
  });

  it("lowers the body 45 mm and leaves the wheels where they are", async () => {
    const { car, centre } = await rig();
    const body: [THREE.Object3D, number][] = [];
    car.group.traverse((o) => {
      if (typeof o.userData.partId === "string" && !still.test(o.userData.partId)) body.push([o, o.position.y]);
    });
    const wheel = centre("wheel_front_left");
    car.apply(stateAt(0.4));
    for (const [n, y] of body) expect(n.position.y, n.name).toBeCloseTo(y - 0.045, 6);
    expect(centre("wheel_front_left").distanceTo(wheel)).toBeLessThan(1e-6);
    car.dispose();
  });

  it("drops every body part by exactly 45 mm in the world, never twice", async () => {
    const { car, centre } = await rig();
    const ids = ["hood", "roof", "door_front_left", "bumper_front", "side_windows_left", "headlight_left"];
    const before = ids.map((id) => centre(id).y);
    car.apply(stateAt(0.4));
    ids.forEach((id, i) => expect(centre(id).y, id).toBeCloseTo(before[i] - 0.045, 6));
    car.dispose();
  });

  it("slides the wheels off outward on both sides", async () => {
    const { car, centre } = await rig();
    const left = centre("wheel_front_left").z;
    const right = centre("wheel_front_right").z;
    car.apply(stateAt(0.2));
    expect(centre("wheel_front_left").z).toBeGreaterThan(left + 0.1);
    expect(centre("wheel_front_right").z).toBeLessThan(right - 0.1);
    car.dispose();
  });

  it("puts everything back when scrolling up to the start", async () => {
    const { car, node, paintHex, centre } = await rig();
    const hood = node("hood").position.clone();
    const bumper = node("bumper_front").position.clone();
    const wheel = centre("wheel_rear_left");
    car.apply(stateAt(1));
    car.apply(stateAt(0));
    expect(node("hood").position.distanceTo(hood)).toBeLessThan(1e-9);
    expect(node("bumper_front").position.distanceTo(bumper)).toBeLessThan(1e-9);
    expect(centre("wheel_rear_left").distanceTo(wheel)).toBeLessThan(1e-6);
    expect(paintHex("hood")).toBe(hex(heroCar.stock.paint));
    car.dispose();
  });

  it("shows the skirt lips only once the kit is on", async () => {
    const { car } = await rig();
    const lips: THREE.Object3D[] = [];
    car.group.traverse((o) => heroCar.lipNodes.test(o.name) && lips.push(o));
    expect(lips.length).toBeGreaterThan(0);
    car.apply(stateAt(0.3));
    expect(lips.every((l) => !l.visible)).toBe(true);
    car.apply(stateAt(0.6));
    expect(lips.every((l) => l.visible)).toBe(true);
    car.dispose();
  });
});
