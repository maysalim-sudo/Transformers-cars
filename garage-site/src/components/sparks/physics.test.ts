import { describe, expect, it } from "vitest";
import { MAX_SPARKS, spawn, step } from "./physics";

const fixed = () => 0.5;

describe("spark physics", () => {
  it("spawns at the emitter and caps the pool", () => {
    const pool = spawn([], 200, 100, 50, fixed);
    expect(pool).toHaveLength(MAX_SPARKS);
    expect(pool[0]).toMatchObject({ x: 100, y: 50 });
  });

  it("falls under gravity", () => {
    const [s] = spawn([], 1, 0, 0, fixed);
    const [after] = step([s], 16);
    expect(after.vy).toBeGreaterThan(s.vy);
  });

  it("removes sparks whose life has run out", () => {
    const pool = spawn([], 3, 0, 0, fixed);
    expect(step(pool, 2000)).toHaveLength(0);
  });
});
