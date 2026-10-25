import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** the JSON chunk of a binary glTF */
function glbJson(file: string): { extensionsUsed?: string[] } {
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
});
