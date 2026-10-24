/**
 * Web Audio engine of the garage hero. Opt-in: nothing is fetched and no AudioContext exists until enable(),
 * which must run inside the visitor's click (browsers refuse to start audio without a gesture).
 * Loops follow the scene each frame; one-shots fire on forward crossings only (cues.ts), four voices at most;
 * the music bed loops under everything and ducks under the reveal sting.
 */
import type { GarageState } from "../timeline";
import { cuesCrossed, loops, MAX_STEP, MUSIC, oneShots } from "./cues";

export type SoundEngine = {
  enable(): Promise<void>;
  disable(): void;
  frame(prev: number | null, p: number, s: GarageState): void;
  suspend(): void;
  resume(): void;
  dispose(): void;
};

type Deps = { createContext?: () => AudioContext; load?: (url: string) => Promise<ArrayBuffer> };

const FADE_S = 0.3;
const MAX_VOICES = 4;
const BED_GAIN = 10 ** (-8 / 20);
const DUCK = 10 ** (-6 / 20);

export function createSoundEngine(base = "/garage/audio/", deps: Deps = {}): SoundEngine {
  const createContext = deps.createContext ?? (() => new AudioContext());
  const load = deps.load ?? (async (url: string) => (await fetch(url)).arrayBuffer());

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let loading: Promise<void> | null = null;
  let ready = false;
  let enabled = false;
  const buffers = new Map<string, AudioBuffer>();
  const looping: { src: AudioBufferSourceNode; gain: GainNode; def: (typeof loops)[number] }[] = [];
  let bed: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  const voices: AudioBufferSourceNode[] = [];
  let unduck: ReturnType<typeof setTimeout> | undefined;

  const files = [...new Set([...oneShots.map((c) => c.file), ...loops.map((l) => l.file), MUSIC.bed, MUSIC.sting])];

  function fadeTo(param: AudioParam, value: number) {
    const now = ctx!.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + FADE_S);
  }

  function source(file: string, loop: boolean, gainValue: number) {
    const src = ctx!.createBufferSource();
    src.buffer = buffers.get(file) ?? null;
    src.loop = loop;
    const gain = ctx!.createGain();
    gain.gain.value = gainValue;
    src.connect(gain);
    gain.connect(master!);
    return { src, gain };
  }

  function play(file: string, gain: number) {
    if (!buffers.has(file)) return;
    while (voices.length >= MAX_VOICES) voices.shift()!.stop();
    const { src } = source(file, false, gain);
    src.onended = () => {
      const i = voices.indexOf(src);
      if (i >= 0) voices.splice(i, 1);
    };
    voices.push(src);
    src.start();
  }

  async function loadAll() {
    await Promise.all(
      files.map(async (f) => {
        try {
          buffers.set(f, await ctx!.decodeAudioData(await load(base + f)));
        } catch {
          // a missing or broken file leaves its cue silent; the rest still plays
        }
      }),
    );
    for (const def of loops) {
      if (!buffers.has(def.file)) continue;
      const { src, gain } = source(def.file, true, 0);
      src.start();
      looping.push({ src, gain, def });
    }
    if (buffers.has(MUSIC.bed)) {
      bed = source(MUSIC.bed, true, BED_GAIN);
      bed.src.start();
    }
    ready = true;
  }

  return {
    async enable() {
      if (!ctx) {
        ctx = createContext();
        master = ctx.createGain();
        master.gain.value = 0;
        master.connect(ctx.destination);
      }
      enabled = true;
      await ctx.resume();
      loading ??= loadAll();
      await loading;
      if (enabled) fadeTo(master!.gain, 1);
    },
    disable() {
      enabled = false;
      if (ctx && master) fadeTo(master.gain, 0);
    },
    frame(prev, p, s) {
      if (!enabled || !ready || !ctx) return;
      const now = ctx.currentTime;
      for (const l of looping) {
        l.gain.gain.setTargetAtTime(l.def.gain(s), now, 0.08);
        if (l.def.rate) l.src.playbackRate.setTargetAtTime(l.def.rate(s), now, 0.08);
      }
      for (const cue of cuesCrossed(prev, p)) play(cue.file, cue.gain);
      if (prev !== null && prev < MUSIC.stingAt && p >= MUSIC.stingAt && p - prev <= MAX_STEP) {
        play(MUSIC.sting, 1);
        if (bed) {
          const dur = buffers.get(MUSIC.sting)?.duration ?? 3;
          bed.gain.gain.setTargetAtTime(BED_GAIN * DUCK, now, 0.05);
          clearTimeout(unduck);
          unduck = setTimeout(() => bed && ctx && bed.gain.gain.setTargetAtTime(BED_GAIN, ctx.currentTime, 0.4), dur * 1000);
        }
      }
    },
    suspend() {
      if (ctx?.state === "running") void ctx.suspend();
    },
    resume() {
      if (enabled && ctx?.state === "suspended") void ctx.resume();
    },
    dispose() {
      clearTimeout(unduck);
      for (const v of [...voices]) v.stop();
      for (const l of looping) l.src.stop();
      bed?.src.stop();
      looping.length = 0;
      bed = null;
      void ctx?.close();
      ctx = null;
      enabled = false;
      ready = false;
    },
  };
}
