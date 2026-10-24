/**
 * The one car that drives through the garage hero. Everything specific to it lives here, so another
 * HD class (or a client's build) can take its place by editing this file only.
 */
import type { CarModelId } from "../car/models";

export type Finish = { paint: string; rim: string; caliper: string; glass: string; glassOpacity: number };
/** A point on the car for a callout: the centre of a part's bounding box plus an offset (metres, car-local). */
export type Anchor = { partId: string; offset: [number, number, number] };
export type AnchorId = "wheels" | "stance" | "kit" | "paint" | "tint";

export const heroCar: {
  model: CarModelId;
  url: string;
  stock: Finish;
  tuned: Finish;
  /** parts that come off and go back on in the body-kit bay, and which way they move */
  kitParts: { id: string; out: [number, number, number] }[];
  /** meshes that only exist on the tuned car (skirt lips, diffuser light) */
  lipNodes: RegExp;
  anchors: Record<AnchorId, Anchor>;
} = {
  model: "suv",
  url: "/models/hd/suv.glb",
  stock: { paint: "#8d939c", rim: "#c4c9cf", caliper: "#4b5058", glass: "#6e7d8c", glassOpacity: 0.45 },
  tuned: { paint: "#c27a12", rim: "#0c0d10", caliper: "#ffad3a", glass: "#040506", glassOpacity: 0.9 },
  kitParts: [
    { id: "bumper_front", out: [-0.9, 0.25, 0] },
    { id: "bumper_rear", out: [0.9, 0.25, 0] },
    { id: "diffuser", out: [0.6, -0.1, 0] },
  ],
  lipNodes: /^(side_skirt_lip|diffuser_light)/,
  anchors: {
    wheels: { partId: "wheel_front_left", offset: [0, 0, 0.12] },
    stance: { partId: "fender_front_left", offset: [0, -0.35, 0.05] },
    kit: { partId: "diffuser", offset: [0, 0, 0.3] },
    paint: { partId: "roof", offset: [0, 0.05, 0] },
    tint: { partId: "side_windows_left", offset: [0, 0, 0.05] },
  },
};
