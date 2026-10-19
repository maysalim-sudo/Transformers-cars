import type { CSSProperties } from "react";
import type { Localized } from "@/i18n/config";

export type Paint = {
  id: string;
  label: Localized;
  /** highlight, base, shadow, deep */
  tones: [string, string, string, string];
  swatch: string;
};

export const paints: Paint[] = [
  { id: "graphite", label: { en: "Graphite", fr: "Graphite", ar: "غرافيت" }, tones: ["#7b828d", "#30353d", "#16191e", "#0b0d10"], swatch: "#3a3f47" },
  { id: "obsidian", label: { en: "Obsidian black", fr: "Noir obsidienne", ar: "أسود أوبسيديان" }, tones: ["#4a4f58", "#15171b", "#0a0b0d", "#050607"], swatch: "#121418" },
  { id: "glacier", label: { en: "Glacier white", fr: "Blanc glacier", ar: "أبيض جليدي" }, tones: ["#ffffff", "#d9dde3", "#a7adb6", "#6c727c"], swatch: "#e3e6ea" },
  { id: "platinum", label: { en: "Platinum silver", fr: "Argent platine", ar: "فضي بلاتيني" }, tones: ["#eef0f3", "#a3a9b2", "#5d636c", "#2d3137"], swatch: "#b1b6bd" },
  { id: "midnight", label: { en: "Midnight blue", fr: "Bleu nuit", ar: "أزرق منتصف الليل" }, tones: ["#5c6f96", "#1b2740", "#0d1424", "#070b14"], swatch: "#1e2b47" },
  { id: "rosso", label: { en: "Deep red", fr: "Rouge profond", ar: "أحمر داكن" }, tones: ["#c25560", "#6e1620", "#3a0a10", "#1e0508"], swatch: "#7a1a25" },
  { id: "amber", label: { en: "Showroom amber", fr: "Ambre showroom", ar: "كهرماني المعرض" }, tones: ["#ffd27a", "#d18a1e", "#7a4708", "#2e1a03"], swatch: "#c98420" },
  { id: "racing-green", label: { en: "Heritage green", fr: "Vert héritage", ar: "أخضر كلاسيكي" }, tones: ["#5f8a72", "#1d3a2b", "#0e2018", "#06110c"], swatch: "#21412f" },
];

export type WheelStyle = { id: "split" | "aero" | "mesh" | "stock"; label: Localized };
export const wheelStyles: WheelStyle[] = [
  { id: "split", label: { en: "Split spoke", fr: "Rayons doubles", ar: "أذرع مزدوجة" } },
  { id: "aero", label: { en: "Aero turbine", fr: "Turbine aéro", ar: "توربين هوائي" } },
  { id: "mesh", label: { en: "Fine mesh", fr: "Maille fine", ar: "شبكة دقيقة" } },
  { id: "stock", label: { en: "Factory", fr: "D'origine", ar: "أصلي" } },
];

export type Tint = { id: string; label: Localized; /** 0 clear … 1 limo */ level: number };
export const tints: Tint[] = [
  { id: "none", label: { en: "Factory", fr: "D'origine", ar: "أصلي" }, level: 0 },
  { id: "light", label: { en: "Light", fr: "Légère", ar: "خفيف" }, level: 0.35 },
  { id: "dark", label: { en: "Dark", fr: "Foncée", ar: "داكن" }, level: 0.7 },
  { id: "limo", label: { en: "Limo", fr: "Limousine", ar: "ليموزين" }, level: 1 },
];

/** The hero's before / after: what the car looks like going in, and coming out of the workshop. */
export const TRANSFORM_FINISH = {
  stock: { paint: "platinum", wheel: "stock", tint: "none" },
  tuned: { paint: "amber", wheel: "split", tint: "dark" },
} as const satisfies Record<"stock" | "tuned", { paint: string; wheel: WheelStyle["id"]; tint: string }>;

export type Livery = { id: "none" | "stripes"; label: Localized };
export const liveries: Livery[] = [
  { id: "none", label: { en: "None", fr: "Aucune", ar: "بدون" } },
  { id: "stripes", label: { en: "Racing stripes", fr: "Bandes racing", ar: "خطوط سباق" } },
];

/** stripes in white on dark paint, near-black on light paint */
export function liveryColor(paintId: string): string {
  const base = (paints.find((p) => p.id === paintId) ?? paints[0]).tones[1];
  const n = parseInt(base.slice(1), 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum > 0.45 ? "#15171b" : "#eef1f4";
}

export const defaults = { paint: "graphite", wheel: "split" as WheelStyle["id"], tint: "none", livery: "none" as Livery["id"] };

/** CSS custom properties consumed by the car gradients. */
export function finishVars(paintId: string, tintId: string): CSSProperties {
  const paint = paints.find((p) => p.id === paintId) ?? paints[0];
  const tint = tints.find((t) => t.id === tintId) ?? tints[0];
  const [hi, base, lo, deep] = paint.tones;
  return {
    "--paint-hi": hi,
    "--paint-base": base,
    "--paint-lo": lo,
    "--paint-deep": deep,
    "--tint": String(tint.level),
  } as CSSProperties;
}
