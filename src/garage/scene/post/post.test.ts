import { describe, expect, it } from "vitest";
import { stateAt } from "../../timeline";
import { apertureAt, blurStrength, focusDistance, rimBlurAmount } from "./lens";

describe("film effects: the pure parts", () => {
  it("focuses on the part, or on the car when the part is out of view (never at infinity)", () => {
    expect(focusDistance([0, 1, 5], [0, 1, 1], [0, 1, 0], true)).toBeCloseTo(4, 9);
    expect(focusDistance([0, 1, 5], [0, 1, 50], [0, 1, 0], false)).toBeCloseTo(5, 9);
    expect(Number.isFinite(focusDistance([0, 1, 5], [Infinity, 0, 0], [0, 1, 0], false))).toBe(true);
  });

  it("opens the aperture at the bays and closes it on the drives", () => {
    for (const [bay, drive] of [[0.195, 0.29], [0.365, 0.44], [0.515, 0.59], [0.675, 0.755]]) {
      expect(apertureAt(stateAt(bay)), `bay ${bay} vs drive ${drive}`).toBeGreaterThan(apertureAt(stateAt(drive)));
    }
  });

  it("blurs the rims only once the wheels spin fast", () => {
    expect(rimBlurAmount(0)).toBe(0);
    expect(rimBlurAmount(6)).toBe(0);
    expect(rimBlurAmount(18)).toBeGreaterThan(0);
    expect(rimBlurAmount(18)).toBeLessThan(1);
    expect(rimBlurAmount(30)).toBe(1);
    expect(rimBlurAmount(-30)).toBe(1); // either direction
  });

  it("never smears a jump, nor a camera that is barely moving", () => {
    expect(blurStrength(2, true)).toBe(0);
    expect(blurStrength(0.001, false)).toBe(0);
    expect(blurStrength(0.1, false)).toBeGreaterThan(0);
  });
});
