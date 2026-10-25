/**
 * Device pre-check: before anything heavy downloads, pick the tier the visitor's device can likely hold,
 * from what the browser says about it. The quality ladder still corrects the guess from real frame
 * times, and the tier it settles on is remembered for the next visit.
 */
import { TIERS, type Tier } from "./scene/quality";

export type Level = Tier | "stills";
export type Hints = { gpu: string | null; memory?: number; cores?: number; saveData?: boolean; net?: string; phone: boolean };
export type Remembered = { level: Level; at: number };

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;
const INTEGRATED = /intel|mali|adreno|powervr|vivante|videocore/i;
const DAY = 24 * 3600 * 1000;
const WEEK = 7 * DAY;
const KEY = "tt-tier";

export function levelFromHints(h: Hints): Level {
  if (!h.gpu || SOFTWARE.test(h.gpu) || h.saveData || h.net === "2g" || h.net === "slow-2g") return "stills";
  if (h.phone) return "low";
  if ((h.memory ?? Infinity) <= 2 || (h.cores ?? Infinity) <= 2) return "low";
  if (INTEGRATED.test(h.gpu) || (h.memory ?? Infinity) <= 4) return "medium";
  return "ultra";
}

const rank = (l: Level) => (l === "stills" ? TIERS.length : TIERS.indexOf(l));

/**
 * The checked level, capped by what this device settled on last time: a tier for a week, the stills for a day
 * only (one visit on a busy or battery-saving machine must not keep the 3D away for long).
 */
export function startLevel(checked: Level, remembered: Remembered | null, now: number): Level {
  if (!remembered || now - remembered.at > (remembered.level === "stills" ? DAY : WEEK)) return checked;
  // one tier above last time, so a single bad visit (a busy machine) heals on the next
  const cap = remembered.level === "stills" ? "stills" : TIERS[Math.max(0, rank(remembered.level) - 1)];
  return rank(cap) > rank(checked) ? cap : checked;
}

/** The same phone test as a media query, for CSS and matchMedia (keep in step with the `phone` variant in globals.css). */
export const PHONE_QUERY = "(pointer: coarse) and (max-width: 767px), (pointer: coarse) and (max-height: 767px)";

/**
 * A phone, whichever way it is held: a touch screen whose short side is under 768 px. This is about the
 * hardware, so it never looks at the window (a narrow desktop window is still a desktop, a landscape phone a phone).
 */
export function isPhoneDevice({ coarse, screen }: { coarse: boolean; screen: [number, number] }): boolean {
  return coarse && Math.min(...screen) < 768;
}

/** What the browser tells us about this device (the GPU name comes from a throwaway WebGL2 context). */
export function readHints(phone: boolean): Hints {
  let gpu: string | null = null;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (gl) {
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      gpu = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || "unknown");
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    gpu = null;
  }
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };
  return { gpu, memory: nav.deviceMemory, cores: nav.hardwareConcurrency || undefined, saveData: nav.connection?.saveData, net: nav.connection?.effectiveType, phone };
}

export function readRemembered(): Remembered | null {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? "null") as Remembered | null;
    return r && (r.level === "stills" || TIERS.includes(r.level as Tier)) && typeof r.at === "number" ? r : null;
  } catch {
    return null;
  }
}

export function remember(level: Level) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ level, at: Date.now() }));
  } catch {
    // private window or blocked storage: the ladder simply runs again next visit
  }
}
