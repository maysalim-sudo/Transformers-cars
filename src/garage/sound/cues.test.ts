import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BAYS, stateAt } from "../timeline";
import { cuesCrossed, loops, MUSIC, oneShots } from "./cues";

const audioDir = path.resolve(__dirname, "../../../public/garage/audio");
const bayRange = (bay: number): [number, number] => [bay === 0 ? 0 : BAYS[bay - 1], bay < 6 ? BAYS[bay] : 1];
const BAY_OF_PREFIX: [RegExp, number][] = [
  [/^(door|engine)_/, 0],
  [/^(lift|wrench)_/, 1],
  [/^coil_/, 2],
  [/^(panel|weld)_/, 3],
  [/^fan_/, 4],
  [/^squeegee_/, 5],
  [/^(whoosh|cover|spot|rev)_?/, 6],
];

describe("sound cues", () => {
  it("fires nothing on the first frame", () => {
    expect(cuesCrossed(null, 0.5)).toEqual([]);
  });

  it("stays silent when scrolling back up or standing still", () => {
    expect(cuesCrossed(0.6, 0.55)).toEqual([]);
    expect(cuesCrossed(0.6, 0.6)).toEqual([]);
  });

  it("stays silent on a jump (deep link, Home/End, scrollbar drag)", () => {
    expect(cuesCrossed(0.1, 0.16)).toEqual([]);
    expect(cuesCrossed(0, 0.9)).toEqual([]);
  });

  it("fires exactly the cues crossed going forward, in order", () => {
    for (let a = 0; a < 1; a += 0.01) {
      const b = Math.min(1, a + 0.03);
      const got = cuesCrossed(a, b).map((c) => c.id);
      const want = oneShots.filter((c) => c.at > a && c.at <= b).sort((x, y) => x.at - y.at).map((c) => c.id);
      expect(got, `${a}→${b}`).toEqual(want);
    }
  });

  it("places every cue inside the bay it belongs to", () => {
    for (const c of oneShots) {
      const bay = BAY_OF_PREFIX.find(([re]) => re.test(c.id))?.[1];
      expect(bay, c.id).toBeDefined();
      const [a, b] = bayRange(bay!);
      expect(c.at, c.id).toBeGreaterThanOrEqual(a);
      expect(c.at, c.id).toBeLessThanOrEqual(b);
    }
  });

  it("switches the engine off while the car is parked in a bay, so no drone runs under the scroll", () => {
    const engine = loops.find((l) => l.id === "engine")!;
    for (const p of [0.2, 0.36, 0.5, 0.66, 0.8, 0.97]) {
      const s = stateAt(p);
      expect(s.carSpeed, `p=${p}`).toBe(0);
      expect(engine.gain(s), `p=${p}`).toBe(0);
    }
  });

  it("idles the engine at the door and follows the car while it drives", () => {
    const engine = loops.find((l) => l.id === "engine")!;
    expect(engine.gain(stateAt(0.01))).toBeGreaterThan(0);
    const moving = stateAt(0.1);
    expect(moving.carSpeed).toBeGreaterThan(0);
    expect(engine.gain(moving)).toBeGreaterThan(engine.gain(stateAt(0.01)));
  });

  it.skipIf(!existsSync(audioDir))("has a file for every cue, loop and music track", () => {
    const files = [...oneShots.map((c) => c.file), ...loops.map((l) => l.file), MUSIC.bed, MUSIC.sting];
    for (const f of files) expect(existsSync(path.join(audioDir, f)), f).toBe(true);
  });
});
