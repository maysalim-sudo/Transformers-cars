/** Workshop sparks: tiny pure particle model, rendered by Sparks.tsx. Units are CSS pixels and ms. */
export type Spark = { x: number; y: number; vx: number; vy: number; age: number; life: number };

export const MAX_SPARKS = 120;
const GRAVITY = 0.0012; // px / ms²

/** Adds up to `n` sparks at (x, y), flying up and outwards; the pool never exceeds MAX_SPARKS. */
export function spawn(pool: Spark[], n: number, x: number, y: number, rand: () => number = Math.random): Spark[] {
  const room = Math.max(0, MAX_SPARKS - pool.length);
  const fresh: Spark[] = [];
  for (let i = 0; i < Math.min(n, room); i++) {
    const angle = -Math.PI / 2 + (rand() - 0.5) * 2.4;
    const speed = 0.25 + rand() * 0.45;
    fresh.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, life: 400 + rand() * 500 });
  }
  return pool.concat(fresh);
}

/** Advances every spark by `dt` ms and drops the dead ones. */
export function step(pool: Spark[], dt: number): Spark[] {
  const next: Spark[] = [];
  for (const s of pool) {
    const age = s.age + dt;
    if (age >= s.life) continue;
    const vy = s.vy + GRAVITY * dt;
    next.push({ ...s, age, vy, x: s.x + s.vx * dt, y: s.y + vy * dt });
  }
  return next;
}
