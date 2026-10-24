import { describe, expect, it } from "vitest";
import layout from "./layout.json";
import { BAYS, LIGHT_ON, stateAt } from "./timeline";

const range = (a: number, b: number, step = 0.005) => {
  const out: number[] = [];
  for (let p = a; p <= b + 1e-9; p += step) out.push(Math.round(p * 1e6) / 1e6);
  return out;
};
const bayEnd = (bay: number) => (bay < 6 ? BAYS[bay] : 1);

describe("garage timeline", () => {
  it("names the bay for each part of the scroll", () => {
    const cases: [number, number][] = [[0.05, 0], [0.1, 1], [0.3, 2], [0.5, 3], [0.6, 4], [0.8, 5], [0.9, 6], [1, 6]];
    for (const [p, bay] of cases) expect(stateAt(p).bay, `p=${p}`).toBe(bay);
  });

  it("drives the car from the street to the turntable without ever reversing", () => {
    for (const p of range(0, 0.02)) expect(stateAt(p).carX).toBe(layout.start);
    for (const p of range(0.9, 1)) expect(stateAt(p).carX).toBe(layout.show);
    let prev = Infinity;
    for (const p of range(0, 1)) {
      const x = stateAt(p).carX;
      expect(x).toBeLessThanOrEqual(prev);
      prev = x;
    }
  });

  it("holds the car still while each bay works on it", () => {
    for (const p of [0.2, 0.36, 0.5, 0.67, 0.8]) expect(stateAt(p).carSpeed, `p=${p}`).toBe(0);
  });

  it("applies each upgrade within its bay and keeps it for the rest of the scroll", () => {
    const upgrades: [string, (p: number) => number, number][] = [
      ["wheelFinish", (p) => stateAt(p).wheelFinish, 1],
      ["drop", (p) => stateAt(p).drop / 0.045, 2],
      ["paintSweep", (p) => stateAt(p).paintSweep, 4],
      ["tintSweep", (p) => stateAt(p).tintSweep, 5],
      ["coverPull", (p) => stateAt(p).coverPull, 6],
    ];
    for (const [name, value, bay] of upgrades) {
      expect(value(BAYS[bay - 1]), `${name} at bay start`).toBe(0);
      expect(value(bayEnd(bay)), `${name} at bay end`).toBeCloseTo(1, 6);
      for (const p of range(bayEnd(bay), 1)) expect(value(p), `${name} at ${p}`).toBeCloseTo(1, 6);
    }
  });

  it("sweeps the paint and tint beams forward only", () => {
    for (const [field, a, b] of [["paintSweep", 0.6, 0.71], ["tintSweep", 0.76, 0.83]] as const) {
      let prev = -1;
      for (const p of range(a, b)) {
        const v = stateAt(p)[field];
        expect(v, `${field} at ${p}`).toBeGreaterThan(prev);
        prev = v;
      }
    }
  });

  it("returns the lift, wheels, kit and transition to rest at both ends of their bay", () => {
    const visits: [keyof ReturnType<typeof stateAt>, number][] = [["lift", 1], ["wheelsOff", 1], ["kitOff", 3], ["transition", 6]];
    for (const [field, bay] of visits) {
      expect(stateAt(BAYS[bay - 1])[field], `${field} start`).toBe(0);
      expect(stateAt(bayEnd(bay))[field], `${field} end`).toBe(0);
    }
  });

  it("switches the showroom lights on one after another", () => {
    expect(stateAt(1).showLights).toHaveLength(layout.rig.count);
    for (let i = 1; i < layout.rig.count; i++) expect(LIGHT_ON(i)).toBeGreaterThan(LIGHT_ON(i - 1));
    for (let i = 0; i < layout.rig.count; i++) {
      expect(stateAt(LIGHT_ON(i) - 0.001).showLights[i], `light ${i} before`).toBe(0);
      expect(stateAt(1).showLights[i], `light ${i} at end`).toBeGreaterThanOrEqual(0.99);
    }
  });

  it("parks the car on the turntable in the dark, before the cover appears over it", () => {
    const darkest = 0.855;
    expect(stateAt(darkest).carX).toBe(layout.show);
    expect(stateAt(darkest - 0.001).coverVisible).toBe(false);
    expect(stateAt(darkest).coverVisible).toBe(true);
    // the car must never be seen driving into the showroom while the cover is up
    for (const p of range(0.84, 1)) {
      const s = stateAt(p);
      if (s.coverVisible) expect(s.carX, `p=${p}`).toBe(layout.show);
    }
    expect(stateAt(0.93).coverVisible).toBe(false);
  });

  it("is a pure function of scroll progress", () => {
    const ps = Array.from({ length: 50 }, (_, i) => ((i * 37) % 101) / 100);
    const first = ps.map((p) => stateAt(p));
    stateAt(0.99);
    stateAt(0.01);
    ps.forEach((p, i) => expect(stateAt(p)).toEqual(first[i]));
  });

  it("frames portrait screens differently but changes nothing else", () => {
    const land = stateAt(0.5);
    const port = stateAt(0.5, { portrait: true });
    expect(port.camera).not.toEqual(land.camera);
    expect({ ...port, camera: null }).toEqual({ ...land, camera: null });
  });

  it("spins the wheels by the distance driven", () => {
    for (const p of [0, 0.1, 0.3, 0.95]) {
      const s = stateAt(p, { wheelRadius: 0.4 });
      expect(s.wheelSpin).toBeCloseTo((layout.start - s.carX) / 0.4, 9);
    }
  });
});
