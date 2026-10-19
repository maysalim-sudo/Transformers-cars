import { describe, expect, it } from "vitest";
import { explodeAt, heroStep, reducedTransformAt, transformAt } from "./timeline";

describe("explodeAt", () => {
  it("is assembled at the top, exploded through the hold, reassembled after", () => {
    expect(explodeAt(0)).toBe(0);
    expect(explodeAt(0.27)).toBe(1);
    expect(explodeAt(0.5)).toBe(1);
    expect(explodeAt(0.76)).toBe(0);
    expect(explodeAt(1)).toBe(0);
  });
});

describe("transformAt", () => {
  it("stays stock through the explosion, hold and reassembly", () => {
    for (const p of [0, 0.27, 0.5, 0.7, 0.79]) expect(transformAt(p)).toBe(0);
  });

  it("is fully tuned from the end of the transformation window", () => {
    expect(transformAt(0.93)).toBe(1);
    expect(transformAt(1)).toBe(1);
  });

  it("is half way through mid-window", () => {
    const mid = transformAt(0.86);
    expect(mid).toBeGreaterThan(0.4);
    expect(mid).toBeLessThan(0.6);
  });

  it("never overlaps the explosion", () => {
    for (let i = 0; i <= 100; i++) {
      const p = i / 100;
      expect(explodeAt(p) === 0 || transformAt(p) === 0).toBe(true);
    }
  });
});

describe("reducedTransformAt", () => {
  it("shows the tuned car for the whole transformation panel, never a half-wiped one", () => {
    expect(reducedTransformAt(0.78)).toBe(0);
    expect(reducedTransformAt(0.8)).toBe(1);
    expect(reducedTransformAt(0.86)).toBe(1);
    expect(reducedTransformAt(1)).toBe(1);
  });
});

describe("heroStep", () => {
  const onScreen = { visible: true, reduced: false, first: false };

  it("under reduced motion lands on its goal in one step for every scroll position, so the loop can stop", () => {
    for (let i = 0; i <= 100; i++) {
      const s = heroStep({ e: 0, tx: 0 }, i / 100, { ...onScreen, reduced: true });
      expect(s.e).toBe(s.eGoal);
      expect(s.tx).toBe(s.txGoal);
      expect([0, 1]).toContain(s.e);
      expect([0, 1]).toContain(s.tx);
    }
  });

  it("snaps instead of easing while the hero is off screen (deep link to #contact)", () => {
    const s = heroStep({ e: 0, tx: 0 }, 1, { ...onScreen, visible: false });
    expect(s).toMatchObject({ e: 0, tx: 1, snapped: true });
  });

  it("snaps on the very first frame", () => {
    const s = heroStep({ e: 0, tx: 0 }, 0.5, { ...onScreen, first: true });
    expect(s).toMatchObject({ e: 1, tx: 0, snapped: true });
  });

  it("eases while visible", () => {
    const s = heroStep({ e: 0, tx: 0 }, 1, onScreen);
    expect(s.tx).toBeCloseTo(0.12, 5);
    expect(s.snapped).toBe(false);
  });
});
