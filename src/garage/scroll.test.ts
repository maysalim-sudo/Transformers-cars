import { describe, expect, it } from "vitest";
import { follow } from "./scroll";
import { cuesCrossed } from "./sound/cues";

/** Run frames at 60 fps toward a fixed scroll target; returns every eased p and the cues they fired. */
function settle(from: number, target: number, prevTarget: number | null) {
  let p = from;
  let prev = prevTarget;
  let soundP: number | null = from;
  const cues: string[] = [];
  for (let i = 0; i < 240; i++) {
    const r = follow(p, target, prev, 1 / 60, false);
    prev = target;
    if (r.jumped) soundP = null;
    cues.push(...cuesCrossed(soundP, r.p).map((c) => c.id));
    soundP = r.p;
    p = r.p;
  }
  return { p, cues };
}

describe("scroll follow", () => {
  it("snaps on the first frame (deep link, reload, coming back on screen)", () => {
    expect(follow(0, 0.7, null, 1 / 60, false)).toEqual({ p: 0.7, jumped: true });
  });

  it("eases an ordinary scroll", () => {
    const r = follow(0.4, 0.42, 0.41, 1 / 60, false);
    expect(r.jumped).toBe(false);
    expect(r.p).toBeGreaterThan(0.4);
    expect(r.p).toBeLessThan(0.42);
  });

  it("snaps when the scroll itself jumps (End key, scrollbar drag, anchor link)", () => {
    expect(follow(0.6, 1, 0.6, 1 / 60, false)).toEqual({ p: 1, jumped: true });
  });

  it("does not fast-forward through the bays after a jump, so no burst of cues", () => {
    const { p, cues } = settle(0.6, 1, 0.6);
    expect(p).toBe(1);
    expect(cues).toEqual([]);
  });

  it("follows the scroll exactly under reduced motion", () => {
    expect(follow(0.4, 0.42, 0.41, 1 / 60, true)).toEqual({ p: 0.42, jumped: false });
  });
});
