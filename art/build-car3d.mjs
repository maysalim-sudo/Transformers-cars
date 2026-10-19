// Programmatic 3D -> SVG car renderer.
// A lofted body, four wheels, a perspective camera, painter's-algorithm
// depth sorting, and Blinn-Phong shading with an environment reflection map.
// Output: SVG (then rendered to PNG by vectorcraft-cli).
import fs from "node:fs";

/* ------------------------------- vectors ------------------------------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/* -------------------------------- colour ------------------------------- */
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const hex = (c) => "#" + c.map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, "0")).join("");
const ENV_SKY = [0.90, 0.94, 0.99], ENV_HOR = [0.21, 0.245, 0.30], ENV_GND = [0.028, 0.032, 0.042];
const env = (r) => { const t = Math.max(-1, Math.min(1, r[1]));
  return t >= 0 ? mixc(ENV_HOR, ENV_SKY, Math.pow(t, 0.7)) : mixc(ENV_HOR, ENV_GND, Math.pow(-t, 0.55)); };

/* ------------------------------ materials ------------------------------ */
const MAT = {
  paint: { albedo: [0.62, 0.055, 0.075], refl: 0.48, shine: 200, spec: 0.75 },
  glass: { albedo: [0.022, 0.032, 0.045], refl: 0.95, shine: 320, spec: 1.5 },
  tyre:  { albedo: [0.028, 0.028, 0.033], refl: 0.06, shine: 14,  spec: 0.25 },
  rim:   { albedo: [0.52, 0.545, 0.58],   refl: 0.42, shine: 150, spec: 1.6 },
  trim:  { albedo: [0.045, 0.047, 0.055], refl: 0.30, shine: 60,  spec: 0.7 },
  lamp:  { albedo: [0.80, 0.86, 0.92],    refl: 0.75, shine: 220, spec: 2.0 },
  red:   { albedo: [0.85, 0.09, 0.07],    refl: 0.50, shine: 200, spec: 1.8 },
};

const LIGHT = norm([-0.42, 0.86, 0.30]);   // key light, upper front-left

function shade(n, p, eye, m) {
  const Vd = norm(sub(eye, p));
  const diff = Math.max(0, dot(n, LIGHT));
  const H = norm(add(LIGHT, Vd));
  const spec = Math.pow(Math.max(0, dot(n, H)), m.shine);
  const R = sub(mul(n, 2 * dot(n, Vd)), Vd);        // reflection of view about normal
  const fres = 0.04 + 0.46 * Math.pow(1 - Math.max(0, dot(n, Vd)), 5);
  const e = env(R);
  const c = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    c[i] = m.albedo[i] * (0.13 + 0.80 * diff) + e[i] * m.refl * fres + m.spec * spec;
  }
  return hex(c);
}

/* --------------------------- car body profile -------------------------- */
const XS = [-2.35, -2.10, -1.80, -1.50, -1.20, -0.85, -0.50, -0.15, 0.20, 0.55, 0.90, 1.25, 1.60, 1.90, 2.15, 2.35];
const YT = [0.74, 0.81, 0.87, 0.92, 0.98, 1.05, 1.10, 1.11, 1.07, 0.96, 0.83, 0.715, 0.655, 0.62, 0.59, 0.57];
const WB = [0.64, 0.76, 0.86, 0.90, 0.915, 0.905, 0.895, 0.895, 0.905, 0.915, 0.92, 0.90, 0.86, 0.79, 0.68, 0.52];
const WT = [0.62, 0.74, 0.84, 0.86, 0.78, 0.60, 0.52, 0.50, 0.54, 0.66, 0.80, 0.86, 0.80, 0.68, 0.52, 0.34];

function interp(x, table) {
  if (x <= XS[0]) return table[0];
  if (x >= XS[XS.length - 1]) return table[table.length - 1];
  for (let i = 0; i < XS.length - 1; i++) {
    if (x <= XS[i + 1]) {
      const t = (x - XS[i]) / (XS[i + 1] - XS[i]);
      const s = t * t * (3 - 2 * t);
      return table[i] + (table[i + 1] - table[i]) * s;
    }
  }
  return table[0];
}
const arch = (x) =>
  0.42 * Math.exp(-Math.pow((x - 1.45) / 0.40, 2)) + 0.42 * Math.exp(-Math.pow((x + 1.45) / 0.40, 2));
const bodyAt = (x) => {
  const yt = interp(x, YT), wb = interp(x, WB), wt = interp(x, WT);
  const ybelt = Math.min(0.735, yt - 0.06);
  // The arch may never rise to (or past) the body's top edge, or the
  // cross-section inverts and the loft tears. Clamp it under the beltline.
  const yb = Math.min(0.245 + arch(x), ybelt - 0.02, yt - 0.06);
  return { yb, yt, wb, wt, ybelt };
};

function samplePoly(keys, per) {
  const out = [];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    const n = per[i];
    for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * (k / n), a[1] + (b[1] - a[1]) * (k / n)]);
  }
  out.push(keys[keys.length - 1]);
  return out;
}

function section(x) {
  const { yb, yt, wb, wt, ybelt } = bodyAt(x);
  const gh = Math.max(0.04, yt - ybelt);            // greenhouse height
  const P0 = [wb * 0.72, yb];                        // rocker
  const P1 = [wb * 0.94, yb + 0.05];                 // lower flank
  const P2 = [wb * 0.985, ybelt - gh * 0.24];        // vertical flank below the shoulder
  const P3 = [wb, ybelt];                            // shoulder crease (widest)
  const P4 = [wb * 0.80, ybelt + gh * 0.22];         // tumblehome
  const P5 = [wt, yt - gh * 0.20];                   // upper greenhouse
  const P6 = [wt * 0.86, yt - gh * 0.05];
  const P7 = [wt * 0.50, yt];                        // roof centre
  const right = samplePoly([P0, P1, P2, P3, P4, P5, P6, P7], [2, 3, 2, 2, 3, 2, 2]);
  const pts = [...right];
  for (let i = right.length - 1; i >= 0; i--) pts.push([-right[i][0], right[i][1]]);
  return pts;
}

// Outward normal at ring index i, in the cross-section (z, y) plane.
function ringNormal2(sec, i) {
  const n = sec.length;
  const a = sec[(i - 1 + n) % n], b = sec[(i + 1) % n];
  let nr = [b[1] - a[1], -(b[0] - a[0])];
  const l = Math.hypot(nr[0], nr[1]) || 1;
  nr = [nr[0] / l, nr[1] / l];
  const cen = sec.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]).map((v) => v / n);
  const d = [sec[i][0] - cen[0], sec[i][1] - cen[1]];
  if (nr[0] * d[0] + nr[1] * d[1] < 0) nr = [-nr[0], -nr[1]];
  return nr;
}

// A ribbon that hugs the body surface between two x stations and a range of
// ring indices, pushed a hair outward. Used for lamps and shut lines.
function decal(x0, x1, i0, i1, m, off = 0.012) {
  const faces = [];
  const s0 = section(x0), s1 = section(x1);
  const { yb, yt } = bodyAt((x0 + x1) / 2);
  const ref = [(x0 + x1) / 2, (yb + yt) / 2, 0];
  const P = (sec, x, i) => {
    const n = ringNormal2(sec, i);
    return [x, sec[i][1] + n[1] * off, sec[i][0] + n[0] * off];
  };
  for (let i = i0; i < i1; i++) {
    faces.push({ pts: [P(s0, x0, i), P(s0, x0, i + 1), P(s1, x1, i + 1), P(s1, x1, i)], m, ref });
  }
  return faces;
}

/* -------------------------------- wheels ------------------------------- */
function wheel(cx, cy, cz, m) {
  const faces = [];
  const R = 0.358, W = 0.135, N = 22;
  const at = (a, r, z) => [cx + r * Math.cos(a), cy + r * Math.sin(a), cz + z];
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
    // tread
    faces.push({ pts: [at(a0, R, -W), at(a1, R, -W), at(a1, R, W), at(a0, R, W)], m, ref: [cx, cy, cz] });
    // outer sidewall (annulus R -> rim)
    faces.push({ pts: [at(a0, R, W), at(a1, R, W), at(a1, 0.215, W), at(a0, 0.215, W)], m, ref: [cx, cy, cz] });
    // inner sidewall
    faces.push({ pts: [at(a0, R, -W), at(a1, R, -W), at(a1, 0.215, -W), at(a0, 0.215, -W)], m, ref: [cx, cy, cz] });
  }
  // rim dish (outer face)
  const dish = [];
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2; dish.push(at(a, 0.196, W + 0.004)); }
  faces.push({ pts: dish, m: "rim", ref: [cx, cy, cz] });
  // five spokes
  for (let s = 0; s < 5; s++) {
    const a = (s / 5) * Math.PI * 2, w = 0.055;
    faces.push({
      pts: [at(a - w, 0.06, W + 0.010), at(a + w, 0.06, W + 0.010), at(a + w * 0.7, 0.20, W + 0.008), at(a - w * 0.7, 0.20, W + 0.008)],
      m: "rim", ref: [cx, cy, cz],
    });
  }
  // hub
  faces.push({ pts: [at(0, 0.0, W + 0.02), at(0.6, 0.055, W + 0.02), at(2.2, 0.055, W + 0.02), at(3.5, 0.05, W + 0.02), at(4.6, 0.05, W + 0.02), at(5.4, 0.055, W + 0.02)], m: "trim", ref: [cx, cy, cz] });
  return faces;
}

/* ------------------------------ build model ---------------------------- */
const WHEELS = [
  { x: 1.45, z: 0.84 }, { x: 1.45, z: -0.84 },
  { x: -1.45, z: 0.84 }, { x: -1.45, z: -0.84 },
];

function buildCar() {
  const faces = [];
  const NS = 46;
  const stations = [];
  for (let i = 0; i <= NS; i++) {
    const x = -2.35 + (4.70 * i) / NS;
    stations.push({ x, pts: section(x).map(([z, y]) => [x, y, z]) });
  }
  // loft
  for (let i = 0; i < NS; i++) {
    const A = stations[i].pts, B = stations[i + 1].pts;
    const cx = (stations[i].x + stations[i + 1].x) / 2;
    const { yb, yt } = bodyAt(cx);
    const axis = [cx, (yb + yt) / 2, 0];
    for (let j = 0; j < A.length; j++) {
      const k = (j + 1) % A.length;
      faces.push({ pts: [A[j], A[k], B[k], B[j]], m: matFor(cx, stations[i].pts[j][1]), ref: axis });
    }
  }
  // nose + tail caps
  for (const end of [stations[0], stations[stations.length - 1]]) {
    const { yb, yt } = bodyAt(end.x);
    const axis = [end.x, (yb + yt) / 2, 0];
    const c = [end.x, (yb + yt) / 2, 0];
    for (let j = 0; j < end.pts.length; j++) {
      const k = (j + 1) % end.pts.length;
      faces.push({ pts: [end.pts[j], end.pts[k], c], m: "trim", ref: axis });
    }
  }
  for (const w of WHEELS) faces.push(...wheel(w.x, 0.358, w.z, "tyre"));
  // lamps and shut lines, riding the body surface
  faces.push(...decal(1.88, 2.16, 5, 9, "lamp", 0.016));
  faces.push(...decal(-2.16, -1.88, 5, 9, "red", 0.016));
  faces.push(...decal(0.58, 0.602, 2, 13, "trim", 0.012));
  faces.push(...decal(-0.88, -0.858, 2, 13, "trim", 0.012));
  return faces;
}

// Which material is a body face? Greenhouse (above the beltline) and the
// windscreen wedge get glass; the very top strip is paint; below is paint.
function matFor(x, y) {
  const { yt, ybelt } = bodyAt(x);
  const cabin = x > -1.08 && x < 0.98;          // greenhouse run only
  if (cabin && y > ybelt + 0.03 && y < yt - 0.12) return "glass";
  return "paint";
}

/* ------------------------------- camera -------------------------------- */
function camera(eye, target, up = [0, 1, 0]) {
  const f = norm(sub(target, eye));
  const r = norm(cross(f, up));
  const u = cross(r, f);
  return { eye, r, u, f };
}

/* ------------------------------ rendering ------------------------------ */
function faceNormal(pts) {
  const n = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    n[0] += (a[1] - b[1]) * (a[2] + b[2]);
    n[1] += (a[2] - b[2]) * (a[0] + b[0]);
    n[2] += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return norm(n);
}

function renderCar(faces, cam, W, H, fov, mirror = false) {
  const focal = (H / 2) / Math.tan(fov / 2);
  const items = [];
  for (const fc of faces) {
    let n = faceNormal(fc.pts);
    const cen = fc.pts.reduce((a, p) => add(a, p), [0, 0, 0]).map((v) => v / fc.pts.length);
    if (dot(n, sub(cen, fc.ref)) < 0) n = mul(n, -1);
    const col = shade(n, cen, cam.eye, MAT[fc.m]);
    const proj = [];
    let depth = 0, ok = true;
    for (const p of fc.pts) {
      const wp = mirror ? [p[0], -p[1], p[2]] : p;
      const d = sub(wp, cam.eye);
      const z = dot(d, cam.f);
      if (z <= 0.05) { ok = false; break; }
      proj.push([W / 2 + (focal * dot(d, cam.r)) / z, H / 2 - (focal * dot(d, cam.u)) / z]);
      depth += z;
    }
    if (!ok) continue;
    items.push({ depth: depth / fc.pts.length, proj, col });
  }
  items.sort((a, b) => b.depth - a.depth);   // far first
  return items
    .map((it) => `<polygon points="${it.proj.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}" fill="${it.col}"/>`)
    .join("");
}

function scene(cam, W, H, label) {
  const faces = buildCar();
  const fov = (34 * Math.PI) / 180;
  const body = renderCar(faces, cam, W, H, fov, false);
  const refl = renderCar(faces, cam, W, H, fov, true);
  // screen-space floor line at the car's centre
  const focal = (H / 2) / Math.tan(fov / 2);
  const d0 = sub([0, 0, 0], cam.eye);
  const floorY = H / 2 - (focal * dot(d0, cam.u)) / dot(d0, cam.f);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="72%">
      <stop offset="0%" stop-color="#1b1f27"/><stop offset="48%" stop-color="#0c0e13"/><stop offset="100%" stop-color="#050608"/>
    </radialGradient>
    <linearGradient id="rf" x1="0" y1="${floorY.toFixed(1)}" x2="0" y2="${(floorY + H * 0.42).toFixed(1)}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#fff" stop-opacity="0.30"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="fg" x1="0" y1="${(floorY - H * 0.14).toFixed(1)}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#dfae55" stop-opacity="0.13"/><stop offset="100%" stop-color="#dfae55" stop-opacity="0"/>
    </linearGradient>
    <mask id="rm"><rect x="0" y="${floorY.toFixed(1)}" width="${W}" height="${H}" fill="url(#rf)"/></mask>
    <filter id="soft" x="-20%" y="-80%" width="140%" height="300%"><feGaussianBlur stdDeviation="18"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="${(floorY - H * 0.14).toFixed(1)}" width="${W}" height="${H}" fill="url(#fg)"/>
  <g mask="url(#rm)">${refl}</g>
  <ellipse cx="${W / 2}" cy="${floorY.toFixed(1)}" rx="${(W * 0.30).toFixed(0)}" ry="20" fill="#000" opacity="0.6" filter="url(#soft)"/>
  ${body}
  <rect x="0" y="${floorY.toFixed(1)}" width="${W}" height="1.4" fill="#dfae55" opacity="0.13"/>
</svg>`;
}

/* -------------------------------- output ------------------------------- */
const W = 1600, H = 1000;
const views = {
  "34front": camera([5.9, 2.15, 4.6], [0, 0.62, 0]),
  "side":    camera([0.0, 0.78, 12.5], [0, 0.62, 0]),
  "34rear":  camera([-5.5, 2.25, 4.9], [0, 0.62, 0]),
};
const outDir = process.argv[2] || ".";
const faces = buildCar();
console.log("faces:", faces.length);
for (const [name, cam] of Object.entries(views)) {
  const svg = scene(cam, W, H, name);
  fs.writeFileSync(`${outDir}/car3d-${name}.svg`, svg);
  console.log(name, "svg bytes:", svg.length);
}
