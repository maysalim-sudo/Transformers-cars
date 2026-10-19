"use client";

import { ArtProvider } from "@/car/art/context";
import { CarDefs } from "@/car/art/Defs";
import { VIEW_CLIPS } from "@/car/art/views";
import { type CarModelId, carModels } from "@/car/models";
import { finishVars, type WheelStyle } from "@/car/palette";
import { getView, type ViewId } from "@/car/views";

type Props = {
  model: CarModelId;
  view: ViewId;
  label: string;
  /** unique per page */
  prefix: string;
  paint: string;
  tint: string;
  wheel: WheelStyle["id"];
};

/** Static drawing of one view (vehicle picker thumbnails). */
export function CarView({ model, view, label, prefix, paint, tint, wheel }: Props) {
  const v = getView(view, model);
  return (
    <ArtProvider value={{ prefix, wheel, geo: carModels[model].side }}>
      <div style={finishVars(paint, tint)} className="relative">
        <CarDefs extraClips={VIEW_CLIPS} />
        <svg viewBox="0 0 1200 480" className="block h-auto w-full" role="img" aria-label={label}>
          <ellipse cx="600" cy="424" rx="540" ry="22" fill={`url(#${prefix}-shadow)`} opacity="0.8" />
          <g transform={v.mirror ? "translate(1200 0) scale(-1 1)" : v.transform}>
            {v.layers.map(({ partId, Art }, i) => (
              <g key={`${partId}-${i}`}>
                <Art />
              </g>
            ))}
          </g>
        </svg>
      </div>
    </ArtProvider>
  );
}
