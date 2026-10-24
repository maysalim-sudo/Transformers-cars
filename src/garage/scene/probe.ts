/**
 * Frame-time probe: after 2 s of rendering, says whether the device averaged over 45 ms a frame.
 * Time is summed frame to frame, and a gap longer than a second (tab hidden, hero scrolled out of view,
 * throttled background page) is a pause, not a slow frame: it is left out of the average.
 */
const SLOW_MS = 45;
const PROBE_MS = 2000;
const PAUSE_MS = 1000;

export type FrameProbe = { frame(now: number): "ok" | "slow" | null };

export function createFrameProbe(): FrameProbe {
  let last = 0;
  let total = 0;
  let frames = 0;
  let done = false;
  return {
    frame(now) {
      if (done) return null;
      const dt = last ? now - last : 0;
      last = now;
      if (dt <= 0 || dt >= PAUSE_MS) return null;
      total += dt;
      frames++;
      if (total < PROBE_MS) return null;
      done = true;
      return total / frames > SLOW_MS ? "slow" : "ok";
    },
  };
}
