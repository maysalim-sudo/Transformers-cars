import { describe, expect, it } from "vitest";
import { toolAt, toolSpin } from "./tools";

const rest: [number, number, number] = [12.75, 1.16, 1.5];
const work: [number, number, number] = [8.72, 0.36, 1.13];

describe("tool motion", () => {
  it("rests on the cart at 0 and sits on the part at 1", () => {
    expect(toolAt(rest, work, 0)).toEqual(rest);
    toolAt(rest, work, 1).forEach((v, i) => expect(v).toBeCloseTo(work[i], 9));
  });

  it("arcs up between them, clear of the car's flank", () => {
    const mid = toolAt(rest, work, 0.5);
    expect(mid[1]).toBeGreaterThanOrEqual(Math.max(rest[1], work[1]) + 0.2);
  });

  it("spins only in the last stretch into the part, a few turns", () => {
    expect(toolSpin(0.5)).toBe(0);
    expect(toolSpin(0.9)).toBe(0);
    expect(toolSpin(1)).toBeGreaterThanOrEqual(4 * Math.PI);
  });
});
