import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { heroCar } from "./heroCar";

/** the JSON chunk of a binary glTF */
function glbJson(file: string): { extensionsUsed?: string[]; nodes?: { name?: string; extras?: { partId?: string } }[] } {
  const buf = readFileSync(file);
  const length = buf.readUInt32LE(12);
  return JSON.parse(buf.subarray(20, 20 + length).toString("utf8"));
}

describe("garage assets", () => {
  const glb = join(process.cwd(), "public", "garage", "garage.glb");

  it("garage.glb fits its 3 MB budget and declares meshopt", () => {
    expect(readFileSync(glb).length).toBeLessThanOrEqual(3 * 1024 * 1024);
    expect(glbJson(glb).extensionsUsed ?? []).toContain("EXT_meshopt_compression");
  });

  it("the hero car is a meshopt copy for the garage, light enough for phones, with every part the rig needs", () => {
    const file = join(process.cwd(), "public", heroCar.url);
    expect(heroCar.url.startsWith("/garage/")).toBe(true); // the diagnose page keeps its own uncompressed model
    expect(readFileSync(file).length).toBeLessThanOrEqual(800 * 1024);
    const json = glbJson(file);
    expect(json.extensionsUsed ?? []).toContain("EXT_meshopt_compression");
    const parts = new Set((json.nodes ?? []).map((n) => n.extras?.partId).filter(Boolean));
    const needed = [...Object.values(heroCar.anchors).map((a) => a.partId), ...heroCar.kitParts.map((k) => k.id), "wheel_front_left", "wheel_front_right", "wheel_rear_left", "wheel_rear_right"];
    for (const id of needed) expect(parts.has(id), id).toBe(true);
  });
});

