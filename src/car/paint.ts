export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

export function rgbToHex([r, g, b]: RGB) {
  return (
    "#" +
    [r, g, b]
      .map((v) => clamp255(v).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** t > 0 lightens toward white, t < 0 darkens toward black. */
export function shade(hex: string, t: number) {
  const [r, g, b] = hexToRgb(hex);
  const target: RGB = t >= 0 ? [255, 255, 255] : [6, 8, 12];
  const k = Math.abs(t);
  return rgbToHex([
    r + (target[0] - r) * k,
    g + (target[1] - g) * k,
    b + (target[2] - b) * k,
  ]);
}

export function mix(a: string, b: string, t: number) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex([
    A[0] + (B[0] - A[0]) * t,
    A[1] + (B[1] - A[1]) * t,
    A[2] + (B[2] - A[2]) * t,
  ]);
}

export function alpha(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/* ------------------------------------------------------------------ */
/*  Paint + glass catalogues                                           */
/* ------------------------------------------------------------------ */

export type Paint = {
  id: string;
  name: string;
  body: string;
  rim: string;
  caliper: string;
  finish: string;
  price: string;
};

export const PAINTS: Paint[] = [
  { id: "satin-black", name: "Satin Onyx", body: "#1d2128", rim: "#2b2f38", caliper: "#d8ac5c", finish: "Matte wrap", price: "included" },
  { id: "nardo", name: "Nardo Grey", body: "#8c939c", rim: "#c9ced6", caliper: "#c62828", finish: "Metallic", price: "included" },
  { id: "rosso", name: "Rosso Corsa", body: "#b5121b", rim: "#1a1c22", caliper: "#f0c26a", finish: "Gloss", price: "included" },
  { id: "miami", name: "Miami Blue", body: "#0d74c8", rim: "#0a1622", caliper: "#e8e8e8", finish: "Metallic", price: "+ $190" },
  { id: "brg", name: "British Green", body: "#12452f", rim: "#cfc7a8", caliper: "#e0b25c", finish: "Gloss", price: "+ $190" },
  { id: "champagne", name: "Champagne Gold", body: "#c2a05e", rim: "#2b2620", caliper: "#3b3b3b", finish: "Satin", price: "+ $340" },
  { id: "pearl", name: "Alpine Pearl", body: "#e8ecf1", rim: "#9aa3ad", caliper: "#1d2128", finish: "Pearl", price: "+ $340" },
  { id: "midnight", name: "Midnight Purple", body: "#3d2a63", rim: "#1a1723", caliper: "#d8b45f", finish: "Flip", price: "+ $520" },
  { id: "solar", name: "Solar Orange", body: "#dd5f16", rim: "#14161b", caliper: "#f2f2f2", finish: "Candy", price: "+ $520" },
];

export type Glass = {
  id: string;
  name: string;
  fill: string;
  opacity: number;
  note: string;
  price: string;
};

export const GLASSES: Glass[] = [
  { id: "clear", name: "Clear Laminated", fill: "#bfe4f5", opacity: 0.34, note: "Factory standard, UV filtered", price: "included" },
  { id: "tinted", name: "Smoke Tint 35%", fill: "#5f7c8a", opacity: 0.62, note: "Legal road tint, heat reject", price: "+ $140" },
  { id: "privacy", name: "Privacy 5%", fill: "#22262c", opacity: 0.86, note: "Limo tint, ceramic layer", price: "+ $260" },
  { id: "laminated", name: "Acoustic Laminated", fill: "#9fd6c6", opacity: 0.48, note: "Road-noise reduction", price: "+ $310" },
  { id: "armoured", name: "Armoured Polycarb", fill: "#c8d8d2", opacity: 0.7, note: "Ballistic rated B4", price: "+ $1,850" },
];

/** Everything a part needs in order to draw itself. */
export type PartPaint = {
  body: string;
  bodyLight: string;
  bodyDark: string;
  bodyDeep: string;
  glass: string;
  glassOpacity: number;
  rim: string;
  rimDark: string;
  caliper: string;
  interior: string;
  interiorLight: string;
  carbon: string;
  metal: string;
  metalLight: string;
  chrome: string;
};

export function buildPartPaint(paint: Paint, glass: Glass): PartPaint {
  return {
    body: paint.body,
    bodyLight: shade(paint.body, 0.34),
    bodyDark: shade(paint.body, -0.42),
    bodyDeep: shade(paint.body, -0.68),
    glass: glass.fill,
    glassOpacity: glass.opacity,
    rim: paint.rim,
    rimDark: shade(paint.rim, -0.5),
    caliper: paint.caliper,
    interior: "#12141a",
    interiorLight: "#242832",
    carbon: "#15171c",
    metal: "#4a5058",
    metalLight: "#8b939d",
    chrome: "#cdd3da",
  };
}

export const getPaint = (id: string) => PAINTS.find((p) => p.id === id) ?? PAINTS[0];
export const getGlass = (id: string) => GLASSES.find((g) => g.id === id) ?? GLASSES[0];
