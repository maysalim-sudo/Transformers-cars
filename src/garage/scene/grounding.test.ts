import { describe, expect, it } from "vitest";
import layout from "../layout.json";
import { poolKey, shadowAt, shadowAlpha } from "./grounding";

describe("contact shadow", () => {
  it("is darkest and tightest with the car on the floor", () => {
    const floor = shadowAt(0);
    const lifted = shadowAt(1);
    expect(floor.opacity).toBeGreaterThan(lifted.opacity);
    expect(lifted.spread).toBeGreaterThan(floor.spread);
  });

  it("fades and spreads steadily as the lift rises", () => {
    let prev = shadowAt(0);
    for (let l = 0.1; l <= 1.0001; l += 0.1) {
      const s = shadowAt(l);
      expect(s.opacity).toBeLessThan(prev.opacity);
      expect(s.spread).toBeGreaterThan(prev.spread);
      prev = s;
    }
  });

  it("is dense under the car and gone at the edge of its texture", () => {
    expect(shadowAlpha(0.5, 0.5)).toBeGreaterThan(0.9);
    for (const [u, v] of [[0, 0.5], [1, 0.5], [0.5, 0], [0.5, 1], [0, 0]]) expect(shadowAlpha(u, v)).toBeLessThan(0.01);
  });

  it("falls off smoothly from the middle outward", () => {
    let prev = shadowAlpha(0.5, 0.5);
    for (let u = 0.52; u <= 1; u += 0.02) {
      const a = shadowAlpha(u, 0.5);
      expect(a).toBeLessThanOrEqual(prev + 1e-9);
      prev = a;
    }
  });
});

describe("workshop key light: the pool over the active bay", () => {
  const X = [layout.bays.wheels, layout.bays.stance, layout.bays.kit, layout.bays.paint, layout.bays.tint];

  it("sits over the bay at full power while the car is in it", () => {
    for (let i = 0; i < 5; i++) {
      const pools = X.map((_, j) => (j === i ? 1 : 0));
      expect(poolKey(pools)).toEqual({ x: X[i], power: 1 });
    }
  });

  it("glides between two bays and dims mid-drive, so the car drives through the dark", () => {
    const mid = poolKey([0.5, 0.5, 0, 0, 0]);
    expect(mid.x).toBeCloseTo((X[0] + X[1]) / 2, 6);
    expect(mid.power).toBe(0.5);
    expect(poolKey([0.8, 0.2, 0, 0, 0]).x).toBeCloseTo(0.8 * X[0] + 0.2 * X[1], 6);
  });

  it("is off with every pool off", () => {
    expect(poolKey([0, 0, 0, 0, 0]).power).toBe(0);
  });
});
