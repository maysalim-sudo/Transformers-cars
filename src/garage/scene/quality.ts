/**
 * The quality ladder: the scene starts at a tier and, while a device cannot hold about 35 fps
 * (28 ms a frame over a second), sheds the heaviest effects one tier at a time. On the last tier the
 * main 45 ms check decides whether the 3D scene goes and the still pictures take over.
 */
import { createFrameProbe, type FrameProbe } from "./probe";

export const TIERS = ["ultra", "high", "medium", "low"] as const;
export type Tier = (typeof TIERS)[number];

export type TierFeatures = {
  motionBlur: boolean;
  dof: boolean;
  reflections: boolean;
  flares: boolean;
  rays: boolean;
  shadows: boolean;
  maxDpr: number;
};

export const TIER_FEATURES: Record<Tier, TierFeatures> = {
  ultra: { motionBlur: true, dof: true, reflections: true, flares: true, rays: true, shadows: true, maxDpr: 1.75 },
  high: { motionBlur: false, dof: true, reflections: true, flares: true, rays: true, shadows: true, maxDpr: 1.75 },
  medium: { motionBlur: false, dof: false, reflections: false, flares: true, rays: true, shadows: true, maxDpr: 1.5 },
  low: { motionBlur: false, dof: false, reflections: false, flares: false, rays: false, shadows: false, maxDpr: 1.25 },
};

export type Ladder = { readonly tier: Tier; frame(now: number): "drop" | "stills" | null };

export function createLadder(start: Tier): Ladder {
  let tier: Tier = start;
  let done = false;
  const probeFor = (t: Tier): FrameProbe => (t === "low" ? createFrameProbe() : createFrameProbe({ slowMs: 28, probeMs: 1000 }));
  let probe = probeFor(tier);
  return {
    get tier() {
      return tier;
    },
    frame(now) {
      if (done) return null;
      const verdict = probe.frame(now);
      if (verdict === null) return null;
      if (verdict === "ok") {
        done = true;
        return null;
      }
      if (tier === "low") {
        done = true;
        return "stills";
      }
      tier = TIERS[TIERS.indexOf(tier) + 1];
      probe = probeFor(tier);
      return "drop";
    },
  };
}

/** `?tier=medium` pins a tier, for checking each one by hand */
export function tierFromQuery(search: string): Tier | null {
  const t = new URLSearchParams(search).get("tier");
  return (TIERS as readonly string[]).includes(t ?? "") ? (t as Tier) : null;
}
