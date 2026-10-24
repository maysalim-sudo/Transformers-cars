import { describe, expect, it } from "vitest";
import { createFrameProbe } from "./probe";

/** Feed frames `step` ms apart from `from`; returns the first verdict and the time it came. */
function run(probe: ReturnType<typeof createFrameProbe>, from: number, step: number, count: number) {
  let t = from;
  for (let i = 0; i < count; i++, t += step) {
    const v = probe.frame(t);
    if (v) return { v, t };
  }
  return { v: null, t };
}

describe("frame probe", () => {
  it("passes a device that keeps 60 fps for 2 s", () => {
    expect(run(createFrameProbe(), 0, 16.7, 200).v).toBe("ok");
  });

  it("flags a device that averages over 45 ms a frame", () => {
    expect(run(createFrameProbe(), 0, 60, 100).v).toBe("slow");
  });

  it("gives one verdict only", () => {
    const probe = createFrameProbe();
    const { t } = run(probe, 0, 60, 100);
    expect(probe.frame(t + 60)).toBeNull();
  });

  it("ignores a pause (tab hidden, hero scrolled away, throttled background page)", () => {
    const probe = createFrameProbe();
    expect(run(probe, 0, 16.7, 30).v).toBeNull(); // 0.5 s of good frames
    expect(probe.frame(30 * 16.7 + 5000)).toBeNull(); // the loop resumes 5 s later
    expect(run(probe, 30 * 16.7 + 5000 + 16.7, 16.7, 200).v).toBe("ok");
  });

  it("never flags a page whose frames all arrive throttled to one a second", () => {
    expect(run(createFrameProbe(), 0, 1000, 20).v).toBeNull();
  });
});
