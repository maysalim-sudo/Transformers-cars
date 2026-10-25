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

  it("keeps the camera inside the side walls once it is past the door, on every screen shape", () => {
    for (const portrait of [false, true]) {
      for (let i = 0; i <= 1000; i++) {
        const [x, , z] = stateAt(i / 1000, { portrait }).camera.pos;
        if (x < layout.door) expect(Math.abs(z), `p=${i / 1000} portrait=${portrait}`).toBeLessThanOrEqual(layout.hall.halfWidth - 0.5);
      }
    }
  });

  describe("film-crew camera (desktop)", () => {
    /** the camera's bearing round its look target, in degrees, unwrapped along the scroll */
    const bearing = (p: number) => {
      const { pos, look } = stateAt(p).camera;
      return (Math.atan2(pos[0] - look[0], pos[2] - look[2]) * 180) / Math.PI;
    };
    const swept = (a: number, b: number) => {
      let total = 0;
      for (const p of range(a, b, 0.001).slice(1)) {
        let d = bearing(p) - bearing(Math.round((p - 0.001) * 1e6) / 1e6);
        d -= 360 * Math.round(d / 360);
        total += d;
      }
      return total;
    };
    /** where the car holds still in each bay */
    const HOLDS: [number, number][] = [[0.13, 0.26], [0.32, 0.41], [0.47, 0.56], [0.62, 0.73], [0.78, 0.84]];

    it("frames the arrival off-centre, so the headline has its own half of the screen", () => {
      // held while the headline shows (all of bay 0), so the garage never slides under the words
      for (const p of [0, 0.03, 0.06]) {
        expect(stateAt(p).camera.shift, `p=${p}`).toBeGreaterThanOrEqual(0.2);
        // right-to-left pages put the headline on the right: the garage moves left instead (less far, as the
        // shot already sits left of centre)
        expect(stateAt(p, { rtl: true }).camera.shift, `p=${p} rtl`).toBeLessThanOrEqual(-0.05);
      }
      // centred again as the first bay's card takes over, and for the rest of the scroll
      for (const p of range(0.1, 1, 0.01)) {
        expect(stateAt(p).camera.shift, `p=${p}`).toBe(0);
        expect(stateAt(p, { rtl: true }).camera.shift, `p=${p} rtl`).toBe(0);
      }
      // phones put the headline at the bottom: no shift
      expect(stateAt(0, { portrait: true }).camera.shift).toBe(0);
    });

    it("tracks alongside on the drives", () => {
      for (const p of [0.075, 0.29, 0.44, 0.59, 0.755]) {
        const s = stateAt(p);
        expect(Math.abs(s.camera.pos[0] - s.carX), `p=${p} x`).toBeLessThanOrEqual(2.5);
        expect(s.camera.pos[1], `p=${p} height`).toBeGreaterThanOrEqual(0.6);
        expect(s.camera.pos[1], `p=${p} height`).toBeLessThanOrEqual(1.4);
        expect(s.camera.fov, `p=${p} fov`).toBeLessThanOrEqual(32);
      }
    });

    it("orbits each bay by 30–45°, alternating direction", () => {
      const sweeps = HOLDS.map(([a, b]) => swept(a, b));
      for (const [i, d] of sweeps.entries()) {
        expect(Math.abs(d), `bay ${i + 1}`).toBeGreaterThanOrEqual(30);
        expect(Math.abs(d), `bay ${i + 1}`).toBeLessThanOrEqual(45);
        if (i > 0) expect(Math.sign(d), `bay ${i + 1} direction`).toBe(-Math.sign(sweeps[i - 1]));
      }
    });

    it("circles the tuned car once from the cover pull to the end, the turntable holding still", () => {
      expect(Math.abs(swept(0.9, 1))).toBeGreaterThanOrEqual(355);
      expect(Math.abs(swept(0.9, 1))).toBeLessThanOrEqual(365);
      for (const p of range(0.9, 1)) expect(stateAt(p).tableTurn, `p=${p}`).toBe(stateAt(0.9).tableTurn);
    });

    it("never flips or cuts, except in the dark between workshop and showroom", () => {
      let prev = stateAt(0);
      for (let i = 1; i <= 1000; i++) {
        const s = stateAt(i / 1000);
        const step = Math.hypot(...s.camera.pos.map((v, k) => v - prev.camera.pos[k]));
        if (s.transition === 0 && prev.transition === 0) expect(step, `p=${i / 1000}`).toBeLessThan(0.6);
        prev = s;
      }
    });

    it("focuses on the part being worked on", () => {
      // part centres plus the callout offsets (heroCar.anchors), car-local, measured from suv.glb
      const parts: [number, [number, number, number]][] = [
        [0.195, [-1.282, 0.36 + 0.55, 0.924]], // the front wheel, on the raised lift
        [0.365, [-1.269, 0.277, 0.815]],
        [0.515, [0.311, 0.323, 0.3]],
        [0.675, [1.099, 1.393, 0]],
        [0.81, [0.777, 1.274, 0.41]],
      ];
      for (const [p, [x, y, z]] of parts) {
        const s = stateAt(p);
        const [fx, fy, fz] = s.camera.focus;
        expect(Math.hypot(fx - (s.carX + x), fy - y, fz - z), `p=${p}`).toBeLessThanOrEqual(0.01);
      }
    });
  });

  describe("phone camera: overhead on the drives, dipping in at each bay", () => {
    /** how steeply the camera looks down, in degrees */
    const pitch = (p: number) => {
      const { pos, look } = stateAt(p, { portrait: true }).camera;
      return (Math.atan2(pos[1] - look[1], Math.hypot(pos[0] - look[0], pos[2] - look[2])) * 180) / Math.PI;
    };

    it("films the drives between bays from overhead", () => {
      // the drive into the paint booth is overhead only briefly (0.565): the booth roof makes the camera dip early
      for (const p of [0.08, 0.29, 0.445, 0.565, 0.77, 0.85]) expect(pitch(p), `p=${p}`).toBeGreaterThanOrEqual(60);
    });

    it("dips to a three-quarter view while each bay works on the car", () => {
      for (const p of [0.2, 0.37, 0.52, 0.67, 0.81]) {
        expect(pitch(p), `p=${p}`).toBeGreaterThanOrEqual(15);
        expect(pitch(p), `p=${p}`).toBeLessThanOrEqual(50);
      }
    });

    it("comes down low for the reveal", () => {
      expect(pitch(0.99)).toBeLessThan(30);
    });

    it("stays under the workshop ceiling, and under the booth roof whenever it is over the booth", () => {
      const { booth, bays, hall, door } = layout;
      for (let i = 0; i <= 1000; i++) {
        const [x, y, z] = stateAt(i / 1000, { portrait: true }).camera.pos;
        if (x < door && x > layout.split) expect(y, `p=${i / 1000}`).toBeLessThanOrEqual(hall.height - 0.4);
        if (Math.abs(x - bays.paint) <= booth.length / 2 && Math.abs(z) <= booth.width / 2) expect(y, `p=${i / 1000} over the booth`).toBeLessThanOrEqual(booth.height - 0.2);
      }
    });
  });

  it("spins the wheels by the distance driven", () => {
    for (const p of [0, 0.1, 0.3, 0.95]) {
      const s = stateAt(p, { wheelRadius: 0.4 });
      expect(s.wheelSpin).toBeCloseTo((layout.start - s.carX) / 0.4, 9);
    }
  });
});
