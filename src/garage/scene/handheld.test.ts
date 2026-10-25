import { describe, expect, it } from "vitest";
import { createHandheld } from "./handheld";

/** run the camera resting at `pos` for `ms`, one frame every 16.7 ms; returns every frame's sway */
function rest(h: ReturnType<typeof createHandheld>, from: number, ms: number, pos: [number, number, number] = [0, 1, 5]) {
  const out = [];
  for (let t = from; t < from + ms; t += 16.7) out.push(h.frame(t, pos));
  return out;
}

describe("handheld breathing", () => {
  it("sways within 2 cm and 0.3°", () => {
    for (const s of rest(createHandheld(false), 0, 60000)) {
      expect(Math.hypot(...s.offset)).toBeLessThanOrEqual(0.02 + 1e-9);
      expect(Math.abs(s.yaw)).toBeLessThanOrEqual(0.3);
      expect(Math.abs(s.pitch)).toBeLessThanOrEqual(0.3);
    }
  });

  it("actually moves, slowly and smoothly", () => {
    const frames = rest(createHandheld(false), 0, 20000);
    const spread = Math.max(...frames.map((s) => s.offset[0])) - Math.min(...frames.map((s) => s.offset[0]));
    expect(spread).toBeGreaterThan(0.01);
    for (let i = 1; i < frames.length; i++) {
      expect(Math.hypot(...frames[i].offset.map((v, k) => v - frames[i - 1].offset[k]))).toBeLessThan(0.001);
    }
  });

  it("is still under reduced motion", () => {
    for (const s of rest(createHandheld(true), 0, 5000)) {
      expect(s.offset).toEqual([0, 0, 0]);
      expect(s.yaw).toBe(0);
      expect(s.pitch).toBe(0);
    }
  });

  it("settles while the camera moves fast, and comes back once it rests", () => {
    const h = createHandheld(false);
    rest(h, 0, 3000);
    let last = h.frame(3000, [0, 1, 5]);
    for (let i = 1; i <= 60; i++) last = h.frame(3000 + i * 16.7, [i * 0.1, 1, 5]); // 10 cm a frame for 1 s
    expect(Math.hypot(...last.offset)).toBeLessThan(0.001);
    const back = rest(h, 4100, 3000, [6, 1, 5]);
    expect(Math.max(...back.map((s) => Math.hypot(...s.offset)))).toBeGreaterThan(0.005);
  });
});
