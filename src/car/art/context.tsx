"use client";

import { createContext, useContext } from "react";
import { sedanSide, type SideGeometry } from "../models/sideGeometry";
import type { WheelStyle } from "../palette";

/** "stock" = the car as it arrives; "tuned" = after the workshop (body kit, amber calipers). */
export type ArtVariant = "stock" | "tuned";

type ArtContext = {
  prefix: string;
  wheel: WheelStyle["id"];
  geo?: SideGeometry;
  variant?: ArtVariant;
  /** stripe colour when the racing-stripe livery is on */
  livery?: string;
};

const Ctx = createContext<ArtContext>({ prefix: "car", wheel: "split" });

export const ArtProvider = Ctx.Provider;

/** Resolves ids of the shared gradients / clips for this car instance, and its side geometry. */
export function useArt() {
  const ctx = useContext(Ctx);
  return {
    ...ctx,
    geo: ctx.geo ?? sedanSide,
    variant: ctx.variant ?? "tuned",
    id: (name: string) => `${ctx.prefix}-${name}`,
    url: (name: string) => `url(#${ctx.prefix}-${name})`,
  };
}
