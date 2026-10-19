import * as THREE from "three";

/**
 * Procedural surface textures, generated as raw pixels so they need no image files, work the same in
 * the browser, in tests and in the GLB export, and carry no licence. Each one is built once and shared.
 *
 * Panel UVs are in model units (ExtrudeGeometry uses the shape's own coordinates), so the tiling
 * textures set `repeat` to 1 / tile size; tyre and disc faces use their own 0..1 UVs.
 */

export type TextureImage = { name: string; size: number; data: Uint8Array; color: boolean };

type Pixel = (u: number, v: number) => [number, number, number, number?];

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** smooth value noise in 0..1, wrapping at `period` cells */
function noise(x: number, y: number, period: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const w = (i: number) => ((i % period) + period) % period;
  const a = hash(w(xi), w(yi));
  const b = hash(w(xi + 1), w(yi));
  const c = hash(w(xi), w(yi + 1));
  const d = hash(w(xi + 1), w(yi + 1));
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function paint(name: string, size: number, color: boolean, px: Pixel): TextureImage {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b, a = 255] = px((x + 0.5) / size, (y + 0.5) / size);
      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  return { name, size, data, color };
}

/** a tangent-space normal map from a height function sampled on the same grid */
function normalFrom(name: string, size: number, height: (u: number, v: number) => number, strength: number): TextureImage {
  const h = (x: number, y: number) => height((((x % size) + size) % size) / size, (((y % size) + size) % size) / size);
  return paint(name, size, false, (u, v) => {
    const x = Math.floor(u * size);
    const y = Math.floor(v * size);
    const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
    const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
    const len = Math.hypot(dx, dy, 1);
    return [((-dx / len) * 0.5 + 0.5) * 255, ((-dy / len) * 0.5 + 0.5) * 255, (1 / len) * 255 * 0.5 + 127.5];
  });
}

const grey = (l: number): [number, number, number] => [l, l, l];
const clamp = (v: number) => Math.max(0, Math.min(255, v));

/** tyre tread, wrapped round the circumference (u) and across the width (v); repeated 6x round */
const tread = () =>
  paint("tread", 256, true, (u, v) => {
    const across = Math.abs(v - 0.5) * 2; // 0 centre .. 1 shoulder
    const along = u * 10;
    // centre rib, then chevron blocks towards each shoulder
    const chevron = (along + across * 0.9) % 1;
    const groove = across > 0.18 && across < 0.92 && chevron < 0.16;
    const sipe = across < 0.16 && (along * 2) % 1 < 0.06;
    const ribGap = Math.abs(across - 0.17) < 0.025;
    const base = 26 + noise(u * 64, v * 64, 64) * 8;
    return grey(groove || ribGap ? 8 : sipe ? 14 : base);
  });

/** tyre sidewall on the round caps (planar 0..1): concentric ribs and a ring of raised blocks */
const sidewall = () =>
  paint("sidewall", 256, true, (u, v) => {
    const r = Math.hypot(u - 0.5, v - 0.5) * 2;
    const a = Math.atan2(v - 0.5, u - 0.5);
    let l = 24 + noise(u * 40, v * 40, 40) * 6;
    if (r > 0.7 && r < 0.98) l += Math.sin(r * 160) > 0.85 ? 10 : 0;
    // raised "lettering" blocks on two arcs
    const arc = Math.abs(Math.sin(a)) > 0.45;
    if (arc && r > 0.82 && r < 0.9 && (a * 18) % 1 < 0.55) l = 44;
    return grey(l);
  });

/** brake disc face (planar 0..1): dark hat, brushed friction ring with three rows of drilled holes */
const discFace = () =>
  paint("disc_face", 256, true, (u, v) => {
    const r = Math.hypot(u - 0.5, v - 0.5) * 2;
    const a = Math.atan2(v - 0.5, u - 0.5);
    if (r < 0.42) return grey(58 + noise(u * 30, v * 30, 30) * 10);
    let l = 150 + Math.sin(r * 260 + noise(a * 8, r * 4, 64) * 3) * 10 + noise(u * 90, v * 90, 90) * 18;
    for (const [ring, offset] of [
      [0.6, 0],
      [0.72, 0.5],
      [0.84, 0],
    ] as const) {
      const step = (Math.PI * 2) / 24;
      const k = Math.round(a / step - offset) + offset;
      const hx = 0.5 + Math.cos(k * step) * ring * 0.5;
      const hy = 0.5 + Math.sin(k * step) * ring * 0.5;
      if (Math.hypot(u - hx, v - hy) < 0.018) l = 18;
    }
    if (r > 0.98) l = 90;
    return grey(clamp(l));
  });

/** honeycomb mesh for grilles and intakes */
const honeycomb = () =>
  paint("honeycomb", 128, true, (u, v) => {
    const cells = 6;
    const x = u * cells * Math.sqrt(3);
    const y = v * cells * 2;
    // distance to the nearest hexagon centre on two offset grids
    const d = (cx: number, cy: number) => Math.hypot(x - cx, (y - cy) / 1.15);
    const ax = Math.round(x / Math.sqrt(3)) * Math.sqrt(3);
    const ay = Math.round(y / 2) * 2;
    const bx = Math.floor(x / Math.sqrt(3)) * Math.sqrt(3) + Math.sqrt(3) / 2;
    const by = Math.floor(y / 2) * 2 + 1;
    const near = Math.min(d(ax, ay), d(bx, by));
    if (near < 0.62) return grey(6);
    return near < 0.72 ? grey(70) : grey(38);
  });

/** 2x2 twill carbon fibre */
const carbon = () =>
  paint("carbon", 128, true, (u, v) => {
    const n = 8;
    const cx = Math.floor(u * n);
    const cy = Math.floor(v * n);
    const horizontal = (cx + cy) % 4 < 2;
    const t = horizontal ? (v * n) % 1 : (u * n) % 1;
    const sheen = Math.sin(t * Math.PI);
    const l = (horizontal ? 30 : 18) + sheen * 26 + noise(u * 64, v * 64, 64) * 6;
    return [clamp(l), clamp(l + 2), clamp(l + 6)];
  });

/** LED lens: bright cells on a slightly dimmer reflector, used as colour and glow map */
const lens = () =>
  paint("lens", 64, true, (u, v) => {
    const cu = (u * 4) % 1;
    const cv = (v * 4) % 1;
    const d = Math.hypot(cu - 0.5, cv - 0.5);
    return grey(d < 0.28 ? 255 : 150 + (0.5 - d) * 60);
  });

/** metallic flake: a fine random tilt per texel, for the paint's normal map */
const flake = () =>
  paint("paint_flake", 256, false, (u, v) => {
    const x = Math.floor(u * 256);
    const y = Math.floor(v * 256);
    const nx = (hash(x, y) - 0.5) * 0.5;
    const ny = (hash(y + 17, x + 3) - 0.5) * 0.5;
    const len = Math.hypot(nx, ny, 1);
    return [(nx / len) * 127.5 + 127.5, (ny / len) * 127.5 + 127.5, (1 / len) * 127.5 + 127.5];
  });

/** clear-coat orange peel: a soft, low ripple */
const orangePeel = () => normalFrom("clearcoat_peel", 256, (u, v) => noise(u * 16, v * 16, 16) * 0.6 + noise(u * 32, v * 32, 32) * 0.4, 3);

const generators = { tread, sidewall, discFace, honeycomb, carbon, lens, flake, orangePeel };
export type TextureName = keyof typeof generators;

/** model-unit tile size for textures laid on panel UVs; 0 = the face's own 0..1 UVs */
const TILE: Record<TextureName, number> = { tread: 0, sidewall: 0, discFace: 0, honeycomb: 14, carbon: 12, lens: 6, flake: 4, orangePeel: 60 };
const REPEAT: Partial<Record<TextureName, [number, number]>> = { tread: [6, 1] };

/** every texture as raw RGBA pixels with its tile size, e.g. to write PNGs for Blender */
export function textureImages(): (TextureImage & { tile: number; repeat: [number, number] })[] {
  return (Object.keys(generators) as TextureName[]).map((k) => ({ ...generators[k](), tile: TILE[k], repeat: REPEAT[k] ?? [1, 1] }));
}

let cache: Record<TextureName, THREE.DataTexture> | null = null;

/** the shared three.js textures, built on first use */
export function carTextures(): Record<TextureName, THREE.DataTexture> {
  if (cache) return cache;
  const out = {} as Record<TextureName, THREE.DataTexture>;
  for (const k of Object.keys(generators) as TextureName[]) {
    const img = generators[k]();
    const t = new THREE.DataTexture(img.data, img.size, img.size, THREE.RGBAFormat);
    t.name = img.name;
    t.colorSpace = img.color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 4;
    const tile = TILE[k];
    if (tile) t.repeat.set(1 / tile, 1 / tile);
    const rep = REPEAT[k];
    if (rep) t.repeat.set(rep[0], rep[1]);
    t.needsUpdate = true;
    out[k] = t;
  }
  cache = out;
  return out;
}
