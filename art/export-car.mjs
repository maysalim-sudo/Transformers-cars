// art/export-car.tsx
import { renderToStaticMarkup } from "react-dom/server";

// src/car/paint.ts
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16)
  ];
}
var clamp255 = (n) => Math.max(0, Math.min(255, Math.round(n)));
function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => clamp255(v).toString(16).padStart(2, "0")).join("");
}
function shade(hex, t) {
  const [r, g, b] = hexToRgb(hex);
  const target = t >= 0 ? [255, 255, 255] : [6, 8, 12];
  const k = Math.abs(t);
  return rgbToHex([
    r + (target[0] - r) * k,
    g + (target[1] - g) * k,
    b + (target[2] - b) * k
  ]);
}
var PAINTS = [
  { id: "satin-black", name: "Satin Onyx", body: "#1d2128", rim: "#2b2f38", caliper: "#d8ac5c", finish: "Matte wrap", price: "included" },
  { id: "nardo", name: "Nardo Grey", body: "#8c939c", rim: "#c9ced6", caliper: "#c62828", finish: "Metallic", price: "included" },
  { id: "rosso", name: "Rosso Corsa", body: "#b5121b", rim: "#1a1c22", caliper: "#f0c26a", finish: "Gloss", price: "included" },
  { id: "miami", name: "Miami Blue", body: "#0d74c8", rim: "#0a1622", caliper: "#e8e8e8", finish: "Metallic", price: "+ $190" },
  { id: "brg", name: "British Green", body: "#12452f", rim: "#cfc7a8", caliper: "#e0b25c", finish: "Gloss", price: "+ $190" },
  { id: "champagne", name: "Champagne Gold", body: "#c2a05e", rim: "#2b2620", caliper: "#3b3b3b", finish: "Satin", price: "+ $340" },
  { id: "pearl", name: "Alpine Pearl", body: "#e8ecf1", rim: "#9aa3ad", caliper: "#1d2128", finish: "Pearl", price: "+ $340" },
  { id: "midnight", name: "Midnight Purple", body: "#3d2a63", rim: "#1a1723", caliper: "#d8b45f", finish: "Flip", price: "+ $520" },
  { id: "solar", name: "Solar Orange", body: "#dd5f16", rim: "#14161b", caliper: "#f2f2f2", finish: "Candy", price: "+ $520" }
];
var GLASSES = [
  { id: "clear", name: "Clear Laminated", fill: "#bfe4f5", opacity: 0.34, note: "Factory standard, UV filtered", price: "included" },
  { id: "tinted", name: "Smoke Tint 35%", fill: "#5f7c8a", opacity: 0.62, note: "Legal road tint, heat reject", price: "+ $140" },
  { id: "privacy", name: "Privacy 5%", fill: "#22262c", opacity: 0.86, note: "Limo tint, ceramic layer", price: "+ $260" },
  { id: "laminated", name: "Acoustic Laminated", fill: "#9fd6c6", opacity: 0.48, note: "Road-noise reduction", price: "+ $310" },
  { id: "armoured", name: "Armoured Polycarb", fill: "#c8d8d2", opacity: 0.7, note: "Ballistic rated B4", price: "+ $1,850" }
];
function buildPartPaint(paint2, glass2) {
  return {
    body: paint2.body,
    bodyLight: shade(paint2.body, 0.34),
    bodyDark: shade(paint2.body, -0.42),
    bodyDeep: shade(paint2.body, -0.68),
    glass: glass2.fill,
    glassOpacity: glass2.opacity,
    rim: paint2.rim,
    rimDark: shade(paint2.rim, -0.5),
    caliper: paint2.caliper,
    interior: "#12141a",
    interiorLight: "#242832",
    carbon: "#15171c",
    metal: "#4a5058",
    metalLight: "#8b939d",
    chrome: "#cdd3da"
  };
}
var getPaint = (id) => PAINTS.find((p) => p.id === id) ?? PAINTS[0];
var getGlass = (id) => GLASSES.find((g) => g.id === id) ?? GLASSES[0];

// src/car/parts.tsx
import { jsx, jsxs } from "react/jsx-runtime";
var CAR_W = 1240;
var CAR_H = 520;
var CAR_VIEWBOX = `0 0 ${CAR_W} ${CAR_H}`;
function Wheel({
  cx,
  cy,
  r = 78,
  c,
  uid,
  far = false
}) {
  const N = 10;
  const spokes = Array.from({ length: N }, (_, i) => i * 360 / N);
  return /* @__PURE__ */ jsxs("g", { opacity: far ? 0.5 : 1, children: [
    /* @__PURE__ */ jsxs("defs", { children: [
      /* @__PURE__ */ jsxs("radialGradient", { id: `${uid}-tire`, cx: "42%", cy: "30%", r: "84%", children: [
        /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#3f454e" }),
        /* @__PURE__ */ jsx("stop", { offset: "45%", stopColor: "#1b1f25" }),
        /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#07080b" })
      ] }),
      /* @__PURE__ */ jsxs("radialGradient", { id: `${uid}-well`, cx: "50%", cy: "45%", r: "70%", children: [
        /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#16191e" }),
        /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#05060a" })
      ] }),
      /* @__PURE__ */ jsxs("linearGradient", { id: `${uid}-rim`, x1: "14%", y1: "0%", x2: "86%", y2: "100%", children: [
        /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: shade(c.rim, 0.62) }),
        /* @__PURE__ */ jsx("stop", { offset: "26%", stopColor: shade(c.rim, 0.06) }),
        /* @__PURE__ */ jsx("stop", { offset: "52%", stopColor: shade(c.rim, 0.48) }),
        /* @__PURE__ */ jsx("stop", { offset: "76%", stopColor: c.rim }),
        /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: shade(c.rim, -0.56) })
      ] }),
      /* @__PURE__ */ jsxs("radialGradient", { id: `${uid}-cap`, cx: "34%", cy: "28%", r: "82%", children: [
        /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: c.metalLight }),
        /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#1c1f25" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("circle", { cx, cy, r, fill: `url(#${uid}-tire)` }),
    /* @__PURE__ */ jsx("circle", { cx, cy, r: r * 0.99, fill: "none", stroke: "#000", strokeOpacity: "0.45", strokeWidth: r * 0.05 }),
    /* @__PURE__ */ jsx("circle", { cx, cy, r: r * 0.71, fill: `url(#${uid}-well)` }),
    /* @__PURE__ */ jsx("circle", { cx, cy, r: r * 0.46, fill: "#262a30" }),
    /* @__PURE__ */ jsx("circle", { cx, cy, r: r * 0.46, fill: "none", stroke: "#3a4048", strokeWidth: r * 0.022 }),
    /* @__PURE__ */ jsx(
      "circle",
      {
        cx,
        cy,
        r: r * 0.54,
        fill: "none",
        stroke: c.caliper,
        strokeWidth: r * 0.13,
        strokeDasharray: `${r * 0.44} ${2 * Math.PI * r * 0.54}`,
        transform: `rotate(214 ${cx} ${cy})`,
        strokeLinecap: "round"
      }
    ),
    spokes.map((a) => /* @__PURE__ */ jsxs("g", { transform: `rotate(${a} ${cx} ${cy})`, children: [
      /* @__PURE__ */ jsx(
        "path",
        {
          d: `M${cx - r * 0.058} ${cy - r * 0.1} L${cx - r * 0.034} ${cy - r * 0.71} L${cx + r * 0.034} ${cy - r * 0.71} L${cx + r * 0.058} ${cy - r * 0.1} Z`,
          fill: `url(#${uid}-rim)`
        }
      ),
      /* @__PURE__ */ jsx(
        "path",
        {
          d: `M${cx - r * 0.016} ${cy - r * 0.13} L${cx - r * 0.01} ${cy - r * 0.69} L${cx + r * 0.01} ${cy - r * 0.69} L${cx + r * 0.016} ${cy - r * 0.13} Z`,
          fill: "#fff",
          opacity: "0.16"
        }
      )
    ] }, a)),
    /* @__PURE__ */ jsx("circle", { cx, cy, r: r * 0.725, fill: "none", stroke: `url(#${uid}-rim)`, strokeWidth: r * 0.06 }),
    /* @__PURE__ */ jsx("circle", { cx, cy, r: r * 0.665, fill: "none", stroke: "#000", strokeOpacity: "0.35", strokeWidth: r * 0.02 }),
    /* @__PURE__ */ jsx("circle", { cx, cy, r: r * 0.17, fill: `url(#${uid}-cap)` }),
    /* @__PURE__ */ jsx("circle", { cx, cy, r: r * 0.17, fill: "none", stroke: "#0a0c10", strokeWidth: "2" }),
    /* @__PURE__ */ jsx("circle", { cx, cy, r: r * 0.06, fill: "#0e1014" })
  ] });
}
var bodyShell = (c, uid) => /* @__PURE__ */ jsxs("g", { children: [
  /* @__PURE__ */ jsxs("defs", { children: [
    /* @__PURE__ */ jsxs("linearGradient", { id: `${uid}-b`, x1: "4%", y1: "0%", x2: "24%", y2: "100%", children: [
      /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: shade(c.body, 0.78) }),
      /* @__PURE__ */ jsx("stop", { offset: "10%", stopColor: shade(c.body, 0.36) }),
      /* @__PURE__ */ jsx("stop", { offset: "26%", stopColor: c.body }),
      /* @__PURE__ */ jsx("stop", { offset: "40%", stopColor: shade(c.body, 0.56) }),
      /* @__PURE__ */ jsx("stop", { offset: "50%", stopColor: c.body }),
      /* @__PURE__ */ jsx("stop", { offset: "70%", stopColor: shade(c.body, -0.62) }),
      /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: shade(c.body, -0.9) })
    ] }),
    /* @__PURE__ */ jsxs("linearGradient", { id: `${uid}-hor`, x1: "0%", y1: "0%", x2: "0%", y2: "100%", children: [
      /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#fff", stopOpacity: "0" }),
      /* @__PURE__ */ jsx("stop", { offset: "16%", stopColor: "#fff", stopOpacity: "0.10" }),
      /* @__PURE__ */ jsx("stop", { offset: "40%", stopColor: "#fff", stopOpacity: "0.30" }),
      /* @__PURE__ */ jsx("stop", { offset: "47%", stopColor: "#fff", stopOpacity: "0.10" }),
      /* @__PURE__ */ jsx("stop", { offset: "58%", stopColor: "#fff", stopOpacity: "0" })
    ] }),
    /* @__PURE__ */ jsxs("linearGradient", { id: `${uid}-s`, x1: "0%", y1: "0%", x2: "0%", y2: "100%", children: [
      /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#000", stopOpacity: "0" }),
      /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#000", stopOpacity: "0.55" })
    ] })
  ] }),
  /* @__PURE__ */ jsx(
    "path",
    {
      d: "M152 262 C214 252 320 243 430 240 L456 239 L622 245 L792 240 L900 222 L1072 232 L1136 246\n         C1158 262 1168 296 1162 328 C1156 358 1142 380 1120 392 L1006 400\n         A96 96 0 0 0 818 400 L448 400 A96 96 0 0 0 256 400 L176 398\n         C146 394 122 378 112 350 C104 326 108 296 122 276 Z",
      fill: `url(#${uid}-b)`
    }
  ),
  /* @__PURE__ */ jsx(
    "path",
    {
      d: "M152 262 C214 252 320 243 430 240 L456 239 L622 245 L792 240 L900 222 L1072 232 L1136 246\n         C1158 262 1168 296 1162 328 C1156 358 1142 380 1120 392 L1006 400\n         A96 96 0 0 0 818 400 L448 400 A96 96 0 0 0 256 400 L176 398\n         C146 394 122 378 112 350 C104 326 108 296 122 276 Z",
      fill: `url(#${uid}-hor)`
    }
  ),
  /* @__PURE__ */ jsx(
    "path",
    {
      d: "M168 277 C256 262 366 254 456 251 L620 255 L790 251 L902 232 L1062 243 L1124 260",
      stroke: "#fff",
      strokeOpacity: "0.55",
      strokeWidth: "6",
      fill: "none",
      strokeLinecap: "round"
    }
  ),
  /* @__PURE__ */ jsx(
    "path",
    {
      d: "M176 280 C260 266 368 258 458 255 L620 259 L788 255 L900 236 L1058 247 L1118 263",
      stroke: "#fff",
      strokeOpacity: "0.5",
      strokeWidth: "2",
      fill: "none",
      strokeLinecap: "round"
    }
  ),
  /* @__PURE__ */ jsx("path", { d: "M256 400 A96 96 0 0 1 448 400 Z", fill: "#080a0d" }),
  /* @__PURE__ */ jsx("path", { d: "M818 400 A96 96 0 0 1 1006 400 Z", fill: "#080a0d" }),
  /* @__PURE__ */ jsx("path", { d: "M474 240 L608 180 L790 186 L888 235 Z", fill: "#0b0d11" }),
  /* @__PURE__ */ jsx(
    "path",
    {
      d: "M152 262 C214 252 320 243 430 240 L456 239 L622 245 L792 240 L900 222 L1072 232 L1136 246\n         C1158 262 1168 296 1162 328 C1156 358 1142 380 1120 392 L1006 400\n         A96 96 0 0 0 818 400 L448 400 A96 96 0 0 0 256 400 L176 398\n         C146 394 122 378 112 350 C104 326 108 296 122 276 Z",
      fill: `url(#${uid}-s)`
    }
  ),
  /* @__PURE__ */ jsxs("g", { stroke: "#000", strokeOpacity: "0.28", strokeWidth: "2", fill: "none", children: [
    /* @__PURE__ */ jsx("path", { d: "M470 244 L466 396" }),
    /* @__PURE__ */ jsx("path", { d: "M792 242 L790 396" }),
    /* @__PURE__ */ jsx("path", { d: "M1074 236 L1078 392" }),
    /* @__PURE__ */ jsx("path", { d: "M236 292 L238 396" })
  ] }),
  /* @__PURE__ */ jsx(
    "path",
    {
      d: "M880 250 C940 246 1000 248 1052 258",
      stroke: "#fff",
      strokeOpacity: "0.13",
      strokeWidth: "7",
      fill: "none",
      strokeLinecap: "round"
    }
  ),
  /* @__PURE__ */ jsx(
    "path",
    {
      d: "M980 300 C1010 318 1030 348 1034 384",
      stroke: "#fff",
      strokeOpacity: "0.09",
      strokeWidth: "10",
      fill: "none",
      strokeLinecap: "round"
    }
  )
] });
var doorPanel = (c, uid) => /* @__PURE__ */ jsxs("g", { children: [
  /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: `${uid}-d`, x1: "8%", y1: "0%", x2: "30%", y2: "100%", children: [
    /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: shade(c.body, 0.62) }),
    /* @__PURE__ */ jsx("stop", { offset: "26%", stopColor: c.body }),
    /* @__PURE__ */ jsx("stop", { offset: "42%", stopColor: shade(c.body, 0.46) }),
    /* @__PURE__ */ jsx("stop", { offset: "58%", stopColor: shade(c.body, -0.22) }),
    /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: shade(c.body, -0.82) })
  ] }) }),
  /* @__PURE__ */ jsx(
    "path",
    {
      d: "M470 244 L622 248 L792 244 L790 380 L700 396 L560 398 L468 392 Z",
      fill: `url(#${uid}-d)`,
      stroke: "#000",
      strokeOpacity: "0.35",
      strokeWidth: "2"
    }
  ),
  /* @__PURE__ */ jsx("path", { d: "M478 300 L784 296", stroke: "#fff", strokeOpacity: "0.44", strokeWidth: "3.5", strokeLinecap: "round", fill: "none" }),
  /* @__PURE__ */ jsx("path", { d: "M482 294 L780 290", stroke: "#fff", strokeOpacity: "0.20", strokeWidth: "10", strokeLinecap: "round", fill: "none" }),
  /* @__PURE__ */ jsx("path", { d: "M478 320 L784 316", stroke: "#000", strokeOpacity: "0.25", strokeWidth: "4", strokeLinecap: "round", fill: "none" }),
  /* @__PURE__ */ jsx("rect", { x: "700", y: "278", width: "58", height: "11", rx: "5.5", fill: c.chrome, opacity: "0.85" }),
  /* @__PURE__ */ jsx("rect", { x: "700", y: "276", width: "58", height: "6", rx: "3", fill: "#fff", opacity: "0.25" }),
  /* @__PURE__ */ jsxs("g", { fill: "#000", opacity: "0.35", children: [
    /* @__PURE__ */ jsx("circle", { cx: "540", cy: "366", r: "16" }),
    /* @__PURE__ */ jsx("circle", { cx: "742", cy: "366", r: "14" })
  ] }),
  /* @__PURE__ */ jsx("path", { d: "M470 244 L622 248 L792 244 L790 252 L472 252 Z", fill: "#fff", opacity: "0.08" })
] });
var hood = (c, uid) => /* @__PURE__ */ jsxs("g", { children: [
  /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: `${uid}-h`, x1: "0%", y1: "0%", x2: "0%", y2: "100%", children: [
    /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: shade(c.body, 0.6) }),
    /* @__PURE__ */ jsx("stop", { offset: "34%", stopColor: shade(c.body, 0.22) }),
    /* @__PURE__ */ jsx("stop", { offset: "62%", stopColor: c.body }),
    /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: shade(c.body, -0.28) })
  ] }) }),
  /* @__PURE__ */ jsx("path", { d: "M150 262 L452 237 L462 222 L158 248 Z", fill: `url(#${uid}-h)`, stroke: "#000", strokeOpacity: "0.3", strokeWidth: "1.5" }),
  /* @__PURE__ */ jsx("path", { d: "M150 262 L452 237 L452 232 L150 257 Z", fill: "#fff", opacity: "0.1" }),
  /* @__PURE__ */ jsx("path", { d: "M170 258 L448 236", stroke: "#000", strokeOpacity: "0.22", strokeWidth: "3", fill: "none" }),
  /* @__PURE__ */ jsxs("g", { opacity: "0.9", children: [
    /* @__PURE__ */ jsx("rect", { x: "360", y: "238", width: "56", height: "8", rx: "4", fill: "#0c0e12", transform: "rotate(-4.6 360 238)" }),
    /* @__PURE__ */ jsx("rect", { x: "360", y: "248", width: "56", height: "8", rx: "4", fill: "#0c0e12", transform: "rotate(-4.6 360 248)" })
  ] })
] });
var trunkLid = (c, uid) => /* @__PURE__ */ jsxs("g", { children: [
  /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: `${uid}-t`, x1: "0%", y1: "0%", x2: "0%", y2: "100%", children: [
    /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: shade(c.body, 0.56) }),
    /* @__PURE__ */ jsx("stop", { offset: "36%", stopColor: shade(c.body, 0.2) }),
    /* @__PURE__ */ jsx("stop", { offset: "64%", stopColor: c.body }),
    /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: shade(c.body, -0.3) })
  ] }) }),
  /* @__PURE__ */ jsx("path", { d: "M896 220 L1078 236 L1084 222 L902 206 Z", fill: `url(#${uid}-t)`, stroke: "#000", strokeOpacity: "0.3", strokeWidth: "1.5" }),
  /* @__PURE__ */ jsx("path", { d: "M896 220 L1078 236 L1078 231 L896 215 Z", fill: "#fff", opacity: "0.12" }),
  /* @__PURE__ */ jsx("rect", { x: "920", y: "214", width: "120", height: "7", rx: "3.5", fill: "#0c0e12", opacity: "0.85" })
] });
var roofFrame = (c, uid) => /* @__PURE__ */ jsxs("g", { children: [
  /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: `${uid}-r`, x1: "10%", y1: "0%", x2: "0%", y2: "100%", children: [
    /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: shade(c.body, 0.64) }),
    /* @__PURE__ */ jsx("stop", { offset: "38%", stopColor: shade(c.body, 0.24) }),
    /* @__PURE__ */ jsx("stop", { offset: "70%", stopColor: c.body }),
    /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: shade(c.body, -0.34) })
  ] }) }),
  /* @__PURE__ */ jsx(
    "path",
    {
      d: "M452 243 L588 170 C608 163 636 161 662 162 L786 168 L900 232 L886 243 L790 186 L612 182 L480 240 Z",
      fill: `url(#${uid}-r)`,
      stroke: "#000",
      strokeOpacity: "0.3",
      strokeWidth: "1.5"
    }
  ),
  /* @__PURE__ */ jsx("path", { d: "M614 184 L620 240", stroke: "#000", strokeOpacity: "0.3", strokeWidth: "3" }),
  /* @__PURE__ */ jsx("path", { d: "M790 188 L796 240", stroke: "#000", strokeOpacity: "0.3", strokeWidth: "3" }),
  /* @__PURE__ */ jsx("path", { d: "M572 190 L508 240", stroke: "#fff", strokeOpacity: "0.14", strokeWidth: "6", fill: "none" })
] });
var windScreen = (c, uid) => /* @__PURE__ */ jsxs("g", { children: [
  /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: `${uid}-w`, x1: "0%", y1: "100%", x2: "100%", y2: "0%", children: [
    /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: c.glass, stopOpacity: c.glassOpacity }),
    /* @__PURE__ */ jsx("stop", { offset: "55%", stopColor: c.glass, stopOpacity: Math.min(1, c.glassOpacity + 0.28) }),
    /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#ffffff", stopOpacity: c.glassOpacity * 0.7 })
  ] }) }),
  /* @__PURE__ */ jsx("path", { d: "M454 242 L590 171 L608 183 L482 240 Z", fill: `url(#${uid}-w)`, stroke: "#0a0c10", strokeOpacity: "0.5", strokeWidth: "2" }),
  /* @__PURE__ */ jsx("path", { d: "M478 234 L566 181 L574 186 L486 238 Z", fill: "#fff", opacity: "0.18" })
] });
var sideGlass = (c, uid) => /* @__PURE__ */ jsxs("g", { children: [
  /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: `${uid}-g`, x1: "0%", y1: "0%", x2: "30%", y2: "100%", children: [
    /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#ffffff", stopOpacity: c.glassOpacity * 0.75 }),
    /* @__PURE__ */ jsx("stop", { offset: "40%", stopColor: c.glass, stopOpacity: c.glassOpacity }),
    /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: c.glass, stopOpacity: Math.min(1, c.glassOpacity * 0.8) })
  ] }) }),
  /* @__PURE__ */ jsx(
    "path",
    {
      d: "M484 240 L610 183 L788 187 L888 235 L886 242 L484 243 Z",
      fill: `url(#${uid}-g)`
    }
  ),
  /* @__PURE__ */ jsx("path", { d: "M612 184 L622 185 L628 240 L618 240 Z", fill: c.bodyDark, opacity: "0.92" }),
  /* @__PURE__ */ jsx("path", { d: "M790 187 L799 189 L804 240 L795 240 Z", fill: c.bodyDark, opacity: "0.92" }),
  /* @__PURE__ */ jsx("path", { d: "M646 192 L678 196 L650 238 L626 236 Z", fill: "#fff", opacity: "0.12" }),
  /* @__PURE__ */ jsx("path", { d: "M704 196 L716 198 L694 238 L682 236 Z", fill: "#fff", opacity: "0.07" })
] });
var rearGlass = (c, uid) => /* @__PURE__ */ jsxs("g", { children: [
  /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: `${uid}-rg`, x1: "0%", y1: "0%", x2: "40%", y2: "100%", children: [
    /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#ffffff", stopOpacity: c.glassOpacity * 0.6 }),
    /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: c.glass, stopOpacity: c.glassOpacity })
  ] }) }),
  /* @__PURE__ */ jsx("path", { d: "M790 187 L886 234 L876 242 L782 197 Z", fill: `url(#${uid}-rg)`, stroke: "#0a0c10", strokeOpacity: "0.35", strokeWidth: "1.5" })
] });
var frontBumper = (c, uid) => /* @__PURE__ */ jsxs("g", { children: [
  /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: `${uid}-fb`, x1: "0%", y1: "0%", x2: "20%", y2: "100%", children: [
    /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: shade(c.body, 0.3) }),
    /* @__PURE__ */ jsx("stop", { offset: "60%", stopColor: c.body }),
    /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: c.bodyDeep })
  ] }) }),
  /* @__PURE__ */ jsx(
    "path",
    {
      d: "M118 288 C106 302 102 328 110 352 C120 380 146 396 178 398 L244 398 L246 300 L236 286 C196 292 152 294 118 288 Z",
      fill: `url(#${uid}-fb)`,
      stroke: "#000",
      strokeOpacity: "0.3",
      strokeWidth: "2"
    }
  ),
  /* @__PURE__ */ jsx("path", { d: "M124 318 L240 310 L242 336 L126 342 Z", fill: "#0a0c10", opacity: "0.85" }),
  /* @__PURE__ */ jsxs("g", { stroke: "#3d434d", strokeWidth: "2", opacity: "0.7", children: [
    /* @__PURE__ */ jsx("path", { d: "M132 320 L236 313" }),
    /* @__PURE__ */ jsx("path", { d: "M132 327 L236 320" }),
    /* @__PURE__ */ jsx("path", { d: "M132 334 L238 327" })
  ] }),
  /* @__PURE__ */ jsx("path", { d: "M112 386 L252 386 L250 400 L114 400 Z", fill: c.carbon }),
  /* @__PURE__ */ jsx("path", { d: "M116 390 L248 390 L248 393 L116 393 Z", fill: "#fff", opacity: "0.08" })
] });
var rearBumper = (c, uid) => /* @__PURE__ */ jsxs("g", { children: [
  /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: `${uid}-rb`, x1: "100%", y1: "0%", x2: "80%", y2: "100%", children: [
    /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: shade(c.body, 0.28) }),
    /* @__PURE__ */ jsx("stop", { offset: "60%", stopColor: c.body }),
    /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: c.bodyDeep })
  ] }) }),
  /* @__PURE__ */ jsx(
    "path",
    {
      d: "M1046 238 L1136 248 C1158 264 1168 296 1162 328 C1156 358 1142 380 1120 392 L1076 398 L1044 396 Z",
      fill: `url(#${uid}-rb)`,
      stroke: "#000",
      strokeOpacity: "0.3",
      strokeWidth: "2"
    }
  ),
  /* @__PURE__ */ jsx("path", { d: "M1050 358 L1120 358 L1116 396 L1054 396 Z", fill: "#0a0c10" }),
  /* @__PURE__ */ jsxs("g", { fill: "#2a2f38", children: [
    /* @__PURE__ */ jsx("rect", { x: "1058", y: "362", width: "8", height: "30", rx: "3" }),
    /* @__PURE__ */ jsx("rect", { x: "1076", y: "362", width: "8", height: "30", rx: "3" }),
    /* @__PURE__ */ jsx("rect", { x: "1094", y: "362", width: "8", height: "30", rx: "3" }),
    /* @__PURE__ */ jsx("rect", { x: "1110", y: "362", width: "6", height: "30", rx: "3" })
  ] })
] });
var sideSkirt = (c) => /* @__PURE__ */ jsxs("g", { children: [
  /* @__PURE__ */ jsx("path", { d: "M462 382 L804 382 L810 402 L456 402 Z", fill: c.carbon, stroke: "#000", strokeOpacity: "0.4", strokeWidth: "1.5" }),
  /* @__PURE__ */ jsx("path", { d: "M466 386 L800 386 L802 390 L466 390 Z", fill: "#fff", opacity: "0.07" })
] });
var grille = (c) => /* @__PURE__ */ jsxs("g", { children: [
  /* @__PURE__ */ jsx("path", { d: "M126 300 L238 296 L242 316 L128 320 Z", fill: "#0a0c10" }),
  /* @__PURE__ */ jsxs("g", { stroke: c.metal, strokeWidth: "2.5", opacity: "0.75", children: [
    /* @__PURE__ */ jsx("path", { d: "M132 303 L236 299" }),
    /* @__PURE__ */ jsx("path", { d: "M132 309 L238 305" }),
    /* @__PURE__ */ jsx("path", { d: "M132 315 L240 311" })
  ] })
] });
var headlight = (_c, uid) => /* @__PURE__ */ jsxs("g", { children: [
  /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: `${uid}-hl`, x1: "0%", y1: "0%", x2: "100%", y2: "60%", children: [
    /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#ffffff" }),
    /* @__PURE__ */ jsx("stop", { offset: "55%", stopColor: "#cfe8f6" }),
    /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#5f7f92" })
  ] }) }),
  /* @__PURE__ */ jsx("path", { d: "M150 268 C192 261 230 261 258 268 L250 294 C216 300 182 300 156 292 Z", fill: "#12151a" }),
  /* @__PURE__ */ jsx("path", { d: "M158 272 C194 266 228 266 250 272 L244 288 C214 293 186 293 162 287 Z", fill: `url(#${uid}-hl)`, opacity: "0.95" }),
  /* @__PURE__ */ jsx("path", { d: "M164 276 C196 271 226 271 242 276 L240 282 C214 278 190 278 168 282 Z", fill: "#fff", opacity: "0.55" }),
  /* @__PURE__ */ jsx("circle", { cx: "244", cy: "286", r: "5", fill: "#f6f9ff" })
] });
var taillight = (_c, uid) => /* @__PURE__ */ jsxs("g", { children: [
  /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: `${uid}-tl`, x1: "0%", y1: "0%", x2: "100%", y2: "40%", children: [
    /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#ff5a4a" }),
    /* @__PURE__ */ jsx("stop", { offset: "60%", stopColor: "#c81f1f" }),
    /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#6d0f12" })
  ] }) }),
  /* @__PURE__ */ jsx("path", { d: "M1036 250 L1132 258 L1136 284 L1040 278 Z", fill: "#160b0c" }),
  /* @__PURE__ */ jsx("path", { d: "M1042 256 L1126 263 L1128 278 L1044 273 Z", fill: `url(#${uid}-tl)` }),
  /* @__PURE__ */ jsx("path", { d: "M1046 262 L1120 268 L1120 272 L1046 267 Z", fill: "#fff", opacity: "0.25" })
] });
var spoiler = (c) => /* @__PURE__ */ jsxs("g", { children: [
  /* @__PURE__ */ jsx("path", { d: "M948 200 L1122 190 L1126 202 L952 212 Z", fill: c.carbon, stroke: "#000", strokeOpacity: "0.45", strokeWidth: "1.5" }),
  /* @__PURE__ */ jsx("path", { d: "M952 202 L1122 192 L1122 196 L952 206 Z", fill: "#fff", opacity: "0.1" }),
  /* @__PURE__ */ jsx("path", { d: "M1000 208 L1014 208 L1010 236 L996 236 Z", fill: "#1c1f26" }),
  /* @__PURE__ */ jsx("path", { d: "M1064 202 L1078 202 L1074 232 L1060 232 Z", fill: "#1c1f26" })
] });
var mirror = (c) => /* @__PURE__ */ jsxs("g", { children: [
  /* @__PURE__ */ jsx("path", { d: "M470 224 L498 216 L504 232 L474 238 Z", fill: c.body, stroke: "#000", strokeOpacity: "0.35", strokeWidth: "1.5" }),
  /* @__PURE__ */ jsx("path", { d: "M474 227 L494 221 L496 226 L476 232 Z", fill: "#0e1116" }),
  /* @__PURE__ */ jsx("path", { d: "M470 230 L462 238 L468 240 L476 234 Z", fill: c.bodyDark })
] });
var exhaust = (c) => /* @__PURE__ */ jsxs("g", { children: [
  /* @__PURE__ */ jsx("rect", { x: "1082", y: "366", width: "66", height: "20", rx: "10", fill: "#2c3138" }),
  /* @__PURE__ */ jsx("rect", { x: "1086", y: "369", width: "58", height: "8", rx: "4", fill: "#191d23" }),
  /* @__PURE__ */ jsx("rect", { x: "1088", y: "344", width: "62", height: "18", rx: "9", fill: "#333941" }),
  /* @__PURE__ */ jsx("rect", { x: "1092", y: "347", width: "54", height: "7", rx: "3.5", fill: "#15181d" }),
  /* @__PURE__ */ jsx("ellipse", { cx: "1148", cy: "376", rx: "7", ry: "10", fill: c.chrome, opacity: "0.8" })
] });
var engine = (_c, uid) => /* @__PURE__ */ jsxs("g", { children: [
  /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsxs("linearGradient", { id: `${uid}-e`, x1: "0%", y1: "0%", x2: "0%", y2: "100%", children: [
    /* @__PURE__ */ jsx("stop", { offset: "0%", stopColor: "#6d747e" }),
    /* @__PURE__ */ jsx("stop", { offset: "50%", stopColor: "#3b4048" }),
    /* @__PURE__ */ jsx("stop", { offset: "100%", stopColor: "#1a1d23" })
  ] }) }),
  /* @__PURE__ */ jsx("rect", { x: "826", y: "268", width: "184", height: "66", rx: "10", fill: `url(#${uid}-e)` }),
  /* @__PURE__ */ jsx("rect", { x: "840", y: "246", width: "72", height: "30", rx: "9", fill: "#4d535c" }),
  /* @__PURE__ */ jsx("rect", { x: "924", y: "246", width: "72", height: "30", rx: "9", fill: "#4d535c" }),
  /* @__PURE__ */ jsx("rect", { x: "846", y: "250", width: "60", height: "8", rx: "4", fill: "#7d858f", opacity: "0.8" }),
  /* @__PURE__ */ jsx("rect", { x: "930", y: "250", width: "60", height: "8", rx: "4", fill: "#7d858f", opacity: "0.8" }),
  /* @__PURE__ */ jsx("rect", { x: "830", y: "288", width: "176", height: "10", rx: "5", fill: "#c0392b" }),
  /* @__PURE__ */ jsxs("g", { fill: "#22262d", children: [
    /* @__PURE__ */ jsx("circle", { cx: "856", cy: "318", r: "9" }),
    /* @__PURE__ */ jsx("circle", { cx: "906", cy: "318", r: "9" }),
    /* @__PURE__ */ jsx("circle", { cx: "956", cy: "318", r: "9" })
  ] }),
  /* @__PURE__ */ jsx("path", { d: "M836 276 L1000 276", stroke: "#fff", strokeOpacity: "0.1", strokeWidth: "3" })
] });
function Seat({ x, y, c, dark }) {
  const base = dark ? shade(c.interior, -0.4) : c.interiorLight;
  const hi = dark ? shade(c.interiorLight, -0.35) : shade(c.interiorLight, 0.3);
  return /* @__PURE__ */ jsxs("g", { children: [
    /* @__PURE__ */ jsx("rect", { x, y, width: 40, height: 104, rx: 16, fill: base }),
    /* @__PURE__ */ jsx("rect", { x: x - 6, y: y - 24, width: 52, height: 34, rx: 13, fill: base }),
    /* @__PURE__ */ jsx("rect", { x: x - 2, y: y - 20, width: 44, height: 26, rx: 10, fill: hi }),
    /* @__PURE__ */ jsx("rect", { x, y: y + 82, width: 82, height: 26, rx: 12, fill: base }),
    /* @__PURE__ */ jsx("rect", { x: x + 4, y: y + 86, width: 74, height: 12, rx: 6, fill: hi, opacity: "0.5" }),
    /* @__PURE__ */ jsx("rect", { x: x + 6, y: y + 12, width: 6, height: 70, rx: 3, fill: "#000", opacity: "0.25" })
  ] });
}
var CAR_PARTS = [
  {
    id: "wheel-rear-far",
    name: "Rear Wheel (off-side)",
    group: "Chassis",
    z: -48,
    dx: 128,
    dy: 186,
    dz: -420,
    anchor: [912, 386],
    label: null,
    draw: (c, uid) => /* @__PURE__ */ jsx(Wheel, { cx: 902, cy: 382, c, uid: `${uid}-rf`, far: true })
  },
  {
    id: "wheel-front-far",
    name: "Front Wheel (off-side)",
    group: "Chassis",
    z: -48,
    dx: -158,
    dy: 186,
    dz: -420,
    anchor: [352, 386],
    label: null,
    draw: (c, uid) => /* @__PURE__ */ jsx(Wheel, { cx: 342, cy: 382, c, uid: `${uid}-ff`, far: true })
  },
  {
    id: "engine",
    name: "Mid-Mounted V8",
    group: "Drivetrain",
    z: -26,
    dx: 186,
    dy: -140,
    dz: -300,
    anchor: [918, 300],
    label: "right",
    draw: engine
  },
  {
    id: "seat-far",
    name: "Driver Seat",
    group: "Interior",
    z: -62,
    dx: 30,
    dy: -140,
    dz: -300,
    anchor: [600, 250],
    label: null,
    draw: (c) => /* @__PURE__ */ jsx(Seat, { x: 508, y: 246, c, dark: true })
  },
  {
    id: "exhaust",
    name: "Titanium Exhaust",
    group: "Drivetrain",
    z: -8,
    dx: 322,
    dy: 158,
    dz: -90,
    anchor: [1114, 376],
    label: "down",
    draw: exhaust
  },
  {
    id: "body-shell",
    name: "Monocoque Shell",
    group: "Body",
    z: 0,
    dx: 0,
    dy: 44,
    dz: -180,
    anchor: [700, 300],
    label: null,
    draw: bodyShell
  },
  {
    id: "seat-near",
    name: "Passenger Seat",
    group: "Interior",
    z: 22,
    dx: -60,
    dy: -150,
    dz: 300,
    anchor: [640, 250],
    label: "left",
    draw: (c) => /* @__PURE__ */ jsx(Seat, { x: 528, y: 246, c })
  },
  {
    id: "front-bumper",
    name: "Front Bumper",
    group: "Body",
    z: 30,
    dx: -286,
    dy: 66,
    dz: 70,
    anchor: [180, 344],
    label: "left",
    draw: frontBumper
  },
  {
    id: "rear-bumper",
    name: "Rear Bumper + Diffuser",
    group: "Body",
    z: 28,
    dx: 300,
    dy: 58,
    dz: 70,
    anchor: [1104, 330],
    label: "right",
    draw: rearBumper
  },
  {
    id: "grille",
    name: "Front Intake",
    group: "Body",
    z: 34,
    dx: -250,
    dy: 168,
    dz: 130,
    anchor: [184, 308],
    label: null,
    draw: grille
  },
  {
    id: "side-skirt",
    name: "Carbon Side Skirt",
    group: "Aero",
    z: 32,
    dx: 30,
    dy: 220,
    dz: 240,
    anchor: [634, 396],
    label: "down",
    draw: sideSkirt
  },
  {
    id: "hood",
    name: "Bonnet / Hood",
    group: "Body",
    z: 36,
    dx: -150,
    dy: -252,
    dz: 60,
    rot: -13,
    anchor: [300, 246],
    label: "up",
    draw: hood
  },
  {
    id: "trunk-lid",
    name: "Boot Lid",
    group: "Body",
    z: 32,
    dx: 164,
    dy: -214,
    dz: 50,
    rot: 9,
    anchor: [990, 224],
    label: null,
    draw: trunkLid
  },
  {
    id: "roof",
    name: "Roof + Pillars",
    group: "Body",
    z: 40,
    dx: 26,
    dy: -352,
    dz: 110,
    anchor: [672, 154],
    label: "up",
    draw: roofFrame
  },
  {
    id: "windscreen",
    name: "Windscreen",
    group: "Glass",
    z: 62,
    dx: -104,
    dy: -282,
    dz: 200,
    rot: -8,
    anchor: [512, 196],
    label: "up",
    draw: windScreen
  },
  {
    id: "side-glass",
    name: "Side Glazing",
    group: "Glass",
    z: 66,
    dx: 44,
    dy: -196,
    dz: 280,
    anchor: [672, 200],
    label: null,
    draw: sideGlass
  },
  {
    id: "rear-glass",
    name: "Engine Cover Glass",
    group: "Glass",
    z: 58,
    dx: 146,
    dy: -246,
    dz: 170,
    anchor: [830, 202],
    label: null,
    draw: rearGlass
  },
  {
    id: "door",
    name: "Door Skin",
    group: "Body",
    z: 26,
    dx: -66,
    dy: -40,
    dz: 330,
    anchor: [630, 320],
    label: "left",
    draw: doorPanel
  },
  {
    id: "headlight",
    name: "LED Headlamp",
    group: "Lighting",
    z: 44,
    dx: -262,
    dy: -128,
    dz: 160,
    anchor: [204, 280],
    label: "up",
    draw: headlight
  },
  {
    id: "taillight",
    name: "Tail Light Bar",
    group: "Lighting",
    z: 40,
    dx: 284,
    dy: -108,
    dz: 150,
    anchor: [1086, 264],
    label: "right",
    draw: taillight
  },
  {
    id: "spoiler",
    name: "Rear Wing",
    group: "Aero",
    z: 54,
    dx: 210,
    dy: -300,
    dz: 130,
    rot: 6,
    anchor: [1036, 196],
    label: "up",
    draw: spoiler
  },
  {
    id: "mirror",
    name: "Door Mirror",
    group: "Body",
    z: 72,
    dx: -128,
    dy: -188,
    dz: 320,
    anchor: [486, 228],
    label: null,
    draw: mirror
  },
  {
    id: "wheel-front-near",
    name: "Front Wheel",
    group: "Chassis",
    z: 56,
    dx: -140,
    dy: 258,
    dz: 340,
    anchor: [352, 386],
    label: "down",
    draw: (c, uid) => /* @__PURE__ */ jsx(Wheel, { cx: 352, cy: 386, c, uid: `${uid}-fn` })
  },
  {
    id: "wheel-rear-near",
    name: "Rear Wheel",
    group: "Chassis",
    z: 56,
    dx: 150,
    dy: 258,
    dz: 340,
    anchor: [912, 386],
    label: "down",
    draw: (c, uid) => /* @__PURE__ */ jsx(Wheel, { cx: 912, cy: 386, c, uid: `${uid}-rn` })
  }
];

// art/export-car.tsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var paint = getPaint("rosso");
var glass = getGlass("tinted");
var pp = buildPartPaint(paint, glass);
var parts = [...CAR_PARTS].sort((a, b) => a.z - b.z);
function scene(e) {
  return renderToStaticMarkup(
    /* @__PURE__ */ jsxs2(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: CAR_VIEWBOX,
        width: CAR_W,
        height: CAR_H,
        children: [
          /* @__PURE__ */ jsx2("rect", { x: 0, y: 0, width: CAR_W, height: CAR_H, fill: "#06070a" }),
          parts.map((p) => /* @__PURE__ */ jsx2(
            "g",
            {
              transform: e === 0 ? void 0 : `translate(${p.dx * e} ${p.dy * e})` + (p.rot ? ` rotate(${p.rot * e} ${p.anchor[0]} ${p.anchor[1]})` : ""),
              children: p.draw(pp, p.id)
            },
            p.id
          ))
        ]
      }
    )
  );
}
process.stdout.write("===ASSEMBLED===\n" + scene(0) + "\n===EXPLODED===\n" + scene(1) + "\n");
