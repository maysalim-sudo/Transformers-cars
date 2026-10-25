import { describe, expect, it } from "vitest";
import { stateAt } from "../../timeline";
import * as THREE from "three";
import { apertureAt, blurStrength, focusDistance, previousPoint, rimBlurAmount } from "./lens";

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

  it("moves a point on the car with the car, and leaves the garage where it was", () => {
    // the car drove 0.3 m toward -x since last frame (the camera tracked it)
    const now = new THREE.Matrix4().makeTranslation(9.7, 0, 0);
    const prev = new THREE.Matrix4().makeTranslation(10, 0, 0);
    const box = { center: new THREE.Vector3(0, 0.8, 0), half: new THREE.Vector3(2.4, 1, 1.1) };
    const onCar = previousPoint(new THREE.Vector3(9.7 + 1, 0.5, 0.9), now, prev, box);
    expect(onCar.toArray().map((v) => +v.toFixed(9))).toEqual([10 + 1, 0.5, 0.9]);
    const wall = previousPoint(new THREE.Vector3(9.7, 1, -6.9), now, prev, box);
    expect(wall.toArray()).toEqual([9.7, 1, -6.9]);
  });
});

