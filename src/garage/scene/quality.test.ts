import { describe, expect, it } from "vitest";
import { createLadder, featuresFor, TIER_FEATURES, TIERS, tierFromQuery } from "./quality";

/** Feed `count` frames `step` ms apart from `from`; returns every verdict with the tier after it. */
function run(ladder: ReturnType<typeof createLadder>, from: number, step: number, count: number) {
  const out: { v: string; tier: string; t: number }[] = [];
  let t = from;
  for (let i = 0; i < count; i++, t += step) {
    const v = ladder.frame(t);
    if (v) out.push({ v, tier: ladder.tier, t });
  }
  return { out, t };
}

describe("quality ladder", () => {
  it("drops one tier per slow second until low", () => {
    const ladder = createLadder("ultra");
    const { out } = run(ladder, 0, 33, 300); // 30 fps for 10 s
    expect(out.map((o) => o.v)).toEqual(["drop", "drop", "drop"]);
    expect(out.map((o) => o.tier)).toEqual(["high", "medium", "low"]);
    expect(out[0].t).toBeLessThan(1100);
    expect(ladder.tier).toBe("low");
  });

  it("sends low to stills only after the 45 ms check", () => {
    expect(run(createLadder("low"), 0, 33, 600).out).toEqual([]);
    const { out } = run(createLadder("low"), 0, 60, 100);
    expect(out.map((o) => o.v)).toEqual(["stills"]);
    expect(out[0].t).toBeGreaterThanOrEqual(1900);
    expect(out[0].t).toBeLessThan(2200);
  });

  it("goes from ultra to stills on a device that cannot hold the scene at all", () => {
    expect(run(createLadder("ultra"), 0, 60, 400).out.map((o) => o.v)).toEqual(["drop", "drop", "drop", "stills"]);
  });

  it("stays put on a fast device", () => {
    const ladder = createLadder("ultra");
    expect(run(ladder, 0, 16.7, 600).out).toEqual([]);
    expect(ladder.tier).toBe("ultra");
  });

  it("ignores pauses", () => {
    const ladder = createLadder("ultra");
    expect(run(ladder, 0, 16.7, 30).out).toEqual([]);
    expect(ladder.frame(30 * 16.7 + 5000)).toBeNull(); // tab hidden for 5 s
    expect(run(ladder, 30 * 16.7 + 5016.7, 16.7, 300).out).toEqual([]);
  });

  it("orders the tiers from the most to the least", () => {
    expect(TIERS).toEqual(["ultra", "high", "medium", "low"]);
    const count = (t: (typeof TIERS)[number]) => Object.values(TIER_FEATURES[t]).filter((v) => v === true).length;
    for (let i = 1; i < TIERS.length; i++) {
      expect(count(TIERS[i])).toBeLessThan(count(TIERS[i - 1]));
      expect(TIER_FEATURES[TIERS[i]].maxDpr).toBeLessThanOrEqual(TIER_FEATURES[TIERS[i - 1]].maxDpr);
    }
    expect(TIER_FEATURES.medium.reflections).toBe(false);
    expect(TIER_FEATURES.low.shadows).toBe(false);
    expect(TIER_FEATURES.low.maxDpr).toBeLessThanOrEqual(1.25);
  });

  it("reads a pinned tier from the query string", () => {
    expect(tierFromQuery("?tier=medium")).toBe("medium");
    expect(tierFromQuery("?x=1&tier=low")).toBe("low");
    expect(tierFromQuery("?tier=potato")).toBeNull();
    expect(tierFromQuery("")).toBeNull();
  });

  it("never gives phones depth of field, motion blur, reflections or flares, on any tier", () => {
    for (const t of TIERS) {
      const f = featuresFor(t, true);
      expect([f.dof, f.motionBlur, f.reflections, f.flares], t).toEqual([false, false, false, false]);
      expect(featuresFor(t, false)).toEqual(TIER_FEATURES[t]);
    }
  });

  it("keeps watching after a good start: a heavier part of the scroll later still sheds a tier", () => {
    const ladder = createLadder("ultra");
    const { t } = run(ladder, 0, 16.7, 180); // 3 s of the light arrival at 60 fps
    const { out } = run(ladder, t, 33, 150); // then 5 s in a heavy bay at 30 fps
    expect(out[0]?.v).toBe("drop");
    expect(out[0]?.tier).toBe("high");
  });

  it("does not drop for a single slow second once the start was good (a hitch, a compile)", () => {
    const ladder = createLadder("ultra");
    const { t } = run(ladder, 0, 16.7, 180);
    const hitch = run(ladder, t, 33, 31); // one slow second
    const after = run(ladder, hitch.t, 16.7, 300);
    expect([...hitch.out, ...after.out]).toEqual([]);
    expect(ladder.tier).toBe("ultra");
  });
});

