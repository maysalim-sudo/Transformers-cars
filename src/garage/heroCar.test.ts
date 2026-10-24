import { readFileSync } from "node:fs";
import path from "node:path";
import type * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { describe, expect, it } from "vitest";
import { getPart } from "../car/registry";
import { heroCar } from "./heroCar";

async function loadHero() {
  const buf = readFileSync(path.resolve(__dirname, "../../public", heroCar.url.slice(1)));
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return (await new GLTFLoader().parseAsync(ab, "")).scene;
}

describe("hero car config", () => {
  const ids = [...Object.values(heroCar.anchors).map((a) => a.partId), ...heroCar.kitParts.map((k) => k.id)];

  it("names only parts the registry knows", () => {
    for (const id of ids) expect(() => getPart(id), id).not.toThrow();
  });

  it("names parts and lip meshes that exist in the hero model", async () => {
    const scene = await loadHero();
    const partIds = new Set<string>();
    let lips = 0;
    scene.traverse((o: THREE.Object3D) => {
      if (typeof o.userData.partId === "string") partIds.add(o.userData.partId);
      if (heroCar.lipNodes.test(o.name)) lips++;
    });
    for (const id of ids) expect(partIds.has(id), id).toBe(true);
    expect(lips).toBeGreaterThan(0);
  });
});
