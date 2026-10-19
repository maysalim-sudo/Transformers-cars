import polygonClipping from "polygon-clipping";

/** A closed outline as [x, y] points (SVG user units, y down). The closing point is not repeated. */
export type Polygon = [number, number][];

const CURVE_STEPS = 12;
const ARC_STEP = Math.PI / 30; // 6°

/** angle from vector u to v, in (-π, π] */
function angleBetween(ux: number, uy: number, vx: number, vy: number) {
  return Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
}

/** SVG elliptical arc (rotation 0) → points after the start point, per SVG spec F.6.5. */
function arcPoints(x1: number, y1: number, rx: number, ry: number, large: boolean, sweep: boolean, x2: number, y2: number): Polygon {
  const hx = (x1 - x2) / 2;
  const hy = (y1 - y2) / 2;
  const lambda = (hx * hx) / (rx * rx) + (hy * hy) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num = rx * rx * ry * ry - rx * rx * hy * hy - ry * ry * hx * hx;
  const den = rx * rx * hy * hy + ry * ry * hx * hx;
  const coef = (large !== sweep ? 1 : -1) * Math.sqrt(Math.max(0, num / den));
  const cxp = (coef * rx * hy) / ry;
  const cyp = (-coef * ry * hx) / rx;
  const cx = cxp + (x1 + x2) / 2;
  const cy = cyp + (y1 + y2) / 2;
  const t1 = angleBetween(1, 0, (hx - cxp) / rx, (hy - cyp) / ry);
  let dt = angleBetween((hx - cxp) / rx, (hy - cyp) / ry, (-hx - cxp) / rx, (-hy - cyp) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const n = Math.max(2, Math.ceil(Math.abs(dt) / ARC_STEP));
  const out: Polygon = [];
  for (let i = 1; i < n; i++) {
    const t = t1 + (dt * i) / n;
    out.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
  }
  out.push([x2, y2]);
  return out;
}

/**
 * Flattens the absolute SVG path data used by the car artwork (M, L, C, A, Z) into polygons.
 * One polygon per sub-path.
 */
export function pathToPolygons(d: string): Polygon[] {
  const tokens = d.match(/[MLCAZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) ?? [];
  const polys: Polygon[] = [];
  let cur: Polygon = [];
  let i = 0;
  let cmd = "";
  const num = () => Number(tokens[i++]);
  const last = () => cur[cur.length - 1];

  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) cmd = tokens[i++].toUpperCase();
    switch (cmd) {
      case "M":
        if (cur.length) polys.push(cur);
        cur = [[num(), num()]];
        cmd = "L"; // implicit lineto after moveto
        break;
      case "L":
        cur.push([num(), num()]);
        break;
      case "C": {
        const [x0, y0] = last();
        const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x3 = num(), y3 = num();
        for (let s = 1; s <= CURVE_STEPS; s++) {
          const t = s / CURVE_STEPS;
          const u = 1 - t;
          cur.push([
            u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
            u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
          ]);
        }
        break;
      }
      case "A": {
        const [x0, y0] = last();
        const rx = num(), ry = num();
        num(); // rotation (always 0 in this artwork)
        const large = num() === 1, sweep = num() === 1;
        const x = num(), y = num();
        cur.push(...arcPoints(x0, y0, rx, ry, large, sweep, x, y));
        break;
      }
      case "Z":
        if (cur.length) polys.push(cur);
        cur = [];
        break;
      default:
        i++; // skip anything unexpected rather than loop forever
    }
  }
  if (cur.length) polys.push(cur);
  return polys.map((p) => {
    const [fx, fy] = p[0];
    const [lx, ly] = p[p.length - 1];
    return p.length > 1 && Math.abs(fx - lx) < 1e-9 && Math.abs(fy - ly) < 1e-9 ? p.slice(0, -1) : p;
  });
}

export function bounds(p: Polygon) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of p) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

/** Unsigned area (shoelace). */
export function area(p: Polygon) {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

/** Outer rings of a ∩ b (the artwork's panels never have holes). */
export function intersect(a: Polygon, b: Polygon): Polygon[] {
  const out = polygonClipping.intersection([a], [b]);
  return out.map((poly) => poly[0].slice(0, -1) as Polygon).filter((p) => p.length >= 3 && area(p) > 0.5);
}
