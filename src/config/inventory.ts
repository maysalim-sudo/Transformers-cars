import type { CarModelId } from "@/car/models";
import type { WheelStyle } from "@/car/palette";

export type ListingStatus = "available" | "reserved" | "sold" | "rented";

export type Listing = {
  id: string;
  kind: "sale" | "rental";
  /** make and model only — no prices, years or mileage until the showroom confirms them */
  name: string;
  year?: number;
  /** in TND; omitted = "price on request" */
  price?: number;
  /** omitted = available */
  status?: ListingStatus;
  /** drawing used until a real photo exists */
  render: { model: CarModelId; paint: string; wheel: WheelStyle["id"] };
  /** cover photo; `photos` holds the rest of the gallery */
  photo?: string;
  photos?: string[];
  /** true = illustrative listing, shown with a note; never presented as real stock */
  example: boolean;
};

/** Example listings. Names come from the showroom's public Instagram highlights. Replace with real stock. */
export const listings: Listing[] = [
  { id: "mustang-gt", kind: "sale", name: "Ford Mustang GT", render: { model: "coupe", paint: "rosso", wheel: "split" }, example: true },
  { id: "camaro-ss", kind: "sale", name: "Chevrolet Camaro SS", render: { model: "coupe", paint: "amber", wheel: "mesh" }, example: true },
  { id: "panamera", kind: "rental", name: "Porsche Panamera", render: { model: "sedan", paint: "obsidian", wheel: "split" }, example: true },
  { id: "range-rover-sport", kind: "rental", name: "Range Rover Sport", render: { model: "suv", paint: "glacier", wheel: "aero" }, example: true },
];
