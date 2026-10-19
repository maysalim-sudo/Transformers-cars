"use client";

import { type ArtVariant, ArtProvider } from "./art/context";
import { CarDefs } from "./art/Defs";
import { farSideParts, sideArt } from "./art/side";
import { finishVars, type WheelStyle } from "./palette";
import { parts } from "./registry";

const hidden = new Set(["engine", "transmission", "exhaust", "chassis_floor"]);
const assembled = parts.filter((p) => sideArt[p.id] && !farSideParts.has(p.id) && !hidden.has(p.id)).map((p) => p.id);
const zOrder = new Map(parts.map((p) => [p.id, p.z]));

type Props = {
  /** unique per page: prefixes gradient / clip ids */
  id: string;
  /** side-view part ids to draw, or "car" for the assembled car */
  show: string[] | "car";
  /** crop of the 1200×480 side view */
  viewBox: string;
  paint?: string;
  tint?: string;
  wheel?: WheelStyle["id"];
  variant?: ArtVariant;
  className?: string;
};

/** A studio "render" of one part (or a crop of the car), drawn from the same artwork as the hero. */
export function PartRender({ id, show, viewBox, paint = "graphite", tint = "none", wheel = "split", variant, className }: Props) {
  const ids = (show === "car" ? assembled : show).slice().sort((a, b) => (zOrder.get(a) ?? 0) - (zOrder.get(b) ?? 0));
  return (
    <ArtProvider value={{ prefix: id, wheel, variant }}>
      <div style={finishVars(paint, tint)} className={className}>
        <CarDefs />
        <svg viewBox={viewBox} className="block h-full w-full" aria-hidden preserveAspectRatio="xMidYMid meet">
          {ids.map((pid) => {
            const Art = sideArt[pid];
            return Art ? <Art key={pid} /> : null;
          })}
        </svg>
      </div>
    </ArtProvider>
  );
}
