import { farSideParts, sideArt } from "./art/side";
import { frontLayers, rearLayers, topLayers, undersideLayers, type ViewLayer } from "./art/views";
import { type CarModelId, carModels } from "./models";
import { getPart, mirrorPartId, parts } from "./registry";

export const viewIds = ["front", "rear", "left", "right", "top", "underside"] as const;
export type ViewId = (typeof viewIds)[number];

/** Hidden behind the body from the side; shown in the underside view instead. */
const hiddenFromSide = new Set(["engine", "transmission", "exhaust", "chassis_floor"]);

const sideLayers: ViewLayer[] = parts
  .filter((p) => sideArt[p.id] && !farSideParts.has(p.id) && !hiddenFromSide.has(p.id))
  .sort((a, b) => a.z - b.z)
  .map((p) => ({ partId: p.id, Art: sideArt[p.id] }));

export type CarView = {
  layers: ViewLayer[];
  /** mirror the drawing horizontally (right side reuses the left-side artwork) */
  mirror?: boolean;
  /** reshapes a shared drawing to this body */
  transform?: string;
  /** maps a drawn layer to the part it stands for on this car */
  resolve: (partId: string) => string;
};

const base: Record<ViewId, { layers: ViewLayer[]; mirror?: boolean; flip?: boolean }> = {
  front: { layers: frontLayers },
  rear: { layers: rearLayers },
  left: { layers: sideLayers },
  right: { layers: sideLayers, mirror: true, flip: true },
  top: { layers: topLayers },
  underside: { layers: undersideLayers },
};

export function getView(view: ViewId, modelId: CarModelId): CarView {
  const model = carModels[modelId];
  const b = base[view];
  const resolve = (id: string) => {
    const side = b.flip ? mirrorPartId(id) : id;
    return model.alias[side] ?? side;
  };
  const isSide = view === "left" || view === "right";
  return {
    // side views use the class's own geometry, so missing parts simply drop out;
    // shared views keep the shape but credit it to the aliased part
    layers: b.layers.filter((l) => !model.missing.has(l.partId) || (!isSide && model.alias[l.partId])),
    mirror: b.mirror,
    transform: isSide ? undefined : model.viewTransform[view],
    resolve,
  };
}

/** Selectable parts visible in a view, in drawing order, de-duplicated. */
export function selectablePartsIn(view: ViewId, modelId: CarModelId): string[] {
  const v = getView(view, modelId);
  const ids = v.layers.map((l) => v.resolve(l.partId)).filter((id) => getPart(id).selectable);
  return [...new Set(ids)];
}
