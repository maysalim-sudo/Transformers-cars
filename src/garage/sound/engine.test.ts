import { describe, expect, it } from "vitest";
import { stateAt } from "../timeline";
import { MUSIC } from "./cues";
import { createSoundEngine } from "./engine";

type Param = { value: number; target: number; setTargetAtTime(v: number): void; linearRampToValueAtTime(v: number): void; cancelScheduledValues(): void; setValueAtTime(v: number): void };
const param = (value = 1): Param => ({
  value,
  target: value,
  setTargetAtTime(v) { this.target = v; },
  linearRampToValueAtTime(v) { this.target = v; },
  cancelScheduledValues() {},
  setValueAtTime(v) { this.value = v; this.target = v; },
});

/** Just enough of an AudioContext to watch what the engine plays. */
function fakeAudio() {
  const sources: { file: string; loop: boolean; started: boolean; stopped: boolean; gain?: Param; playbackRate: Param }[] = [];
  const gains: Param[] = [];
  const names = new Map<object, string>();
  const ctx = {
    currentTime: 0,
    state: "suspended",
    destination: {},
    resume: async () => void (ctx.state = "running"),
    suspend: async () => void (ctx.state = "suspended"),
    close: async () => void (ctx.state = "closed"),
    decodeAudioData: async (buf: ArrayBuffer) => {
      const b = { duration: 1 };
      names.set(b, (buf as unknown as { file: string }).file);
      return b;
    },
    createGain() {
      const gain = param();
      gains.push(gain);
      const node = { gain, connect: (to: { gainParam?: Param }) => to };
      return node;
    },
    createBufferSource() {
      const rec = { file: "?", loop: false, started: false, stopped: false, gain: undefined as Param | undefined, playbackRate: param() };
      const src = {
        buffer: null as object | null,
        loop: false,
        playbackRate: rec.playbackRate,
        onended: null as null | (() => void),
        connect: (to: { gain: Param }) => {
          rec.gain = to.gain;
          return to;
        },
        start() {
          Object.assign(rec, { file: names.get(src.buffer!) ?? "?", loop: src.loop, started: true });
          sources.push(rec);
        },
        stop() {
          rec.stopped = true;
          src.onended?.();
        },
      };
      return src;
    },
  };
  const loaded: string[] = [];
  const deps = {
    createContext: () => ctx as unknown as AudioContext,
    load: async (url: string) => {
      loaded.push(url);
      return { file: url.split("/").pop() } as unknown as ArrayBuffer;
    },
  };
  const playing = () => sources.filter((s) => s.started && !s.stopped && !s.loop);
  return { ctx, deps, sources, gains, loaded, playing };
}

/** Scroll forward from a to b in steps small enough to count as scrolling. */
function scroll(engine: ReturnType<typeof createSoundEngine>, a: number, b: number, step = 0.004) {
  for (let p = a; p < b; p += step) engine.frame(p, Math.min(b, p + step), stateAt(Math.min(b, p + step)));
}

describe("sound engine", () => {
  it("loads nothing and plays nothing until the visitor turns sound on", () => {
    const a = fakeAudio();
    const engine = createSoundEngine("/garage/audio/", a.deps);
    scroll(engine, 0, 1);
    expect(a.loaded).toEqual([]);
    expect(a.sources).toEqual([]);
  });

  it("fires the cues crossed going forward, never more than four at once", async () => {
    const a = fakeAudio();
    const engine = createSoundEngine("/garage/audio/", a.deps);
    await engine.enable();
    expect(a.loaded).toContain("/garage/audio/spot.mp3");
    let most = 0;
    for (let p = 0.86; p < 0.94; p += 0.004) {
      engine.frame(p, p + 0.004, stateAt(p + 0.004));
      most = Math.max(most, a.playing().length);
    }
    expect(a.sources.filter((s) => s.file === "spot.mp3").length).toBe(8);
    expect(most).toBeLessThanOrEqual(4);
  });

  it("stays silent scrolling back up", async () => {
    const a = fakeAudio();
    const engine = createSoundEngine("/garage/audio/", a.deps);
    await engine.enable();
    const before = a.sources.length;
    for (let p = 0.9; p > 0.1; p -= 0.004) engine.frame(p, p - 0.004, stateAt(p - 0.004));
    expect(a.sources.length).toBe(before);
  });

  it("plays the sting once going forward and ducks the music bed under it", async () => {
    const a = fakeAudio();
    const engine = createSoundEngine("/garage/audio/", a.deps);
    await engine.enable();
    const bed = a.sources.find((s) => s.file === MUSIC.bed)!;
    expect(bed.loop).toBe(true);
    const level = bed.gain!.value;
    scroll(engine, 0.9, 0.95);
    expect(a.sources.filter((s) => s.file === MUSIC.sting).length).toBe(1);
    expect(bed.gain!.target).toBeCloseTo(level / 2, 2);
    engine.frame(0.95, 0.8, stateAt(0.8));
    scroll(engine, 0.8, 0.95);
    expect(a.sources.filter((s) => s.file === MUSIC.sting).length).toBe(2);
  });

  it("settles quietly when the visitor leaves while the files are still loading", async () => {
    const a = fakeAudio();
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const engine = createSoundEngine("/garage/audio/", { ...a.deps, load: async (url) => (await gate, a.deps.load(url)) });
    const enabling = engine.enable();
    await Promise.resolve();
    engine.dispose();
    release();
    await expect(enabling).resolves.toBeUndefined();
    expect(a.sources.filter((s) => s.started && !s.stopped)).toEqual([]);
  });

  it("fades out on disable and stops everything on dispose", async () => {
    const a = fakeAudio();
    const engine = createSoundEngine("/garage/audio/", a.deps);
    await engine.enable();
    const master = a.gains[0];
    expect(master.target).toBe(1);
    engine.disable();
    expect(master.target).toBe(0);
    engine.dispose();
    expect(a.sources.every((s) => s.stopped)).toBe(true);
    expect(a.ctx.state).toBe("closed");
  });
});
