import { describe, expect, it } from "vitest";
import type { Listing } from "@/config/inventory";
import { garage } from "@/config/garage";
import { inquiryText } from "./inquiry";
import { whatsappUrl } from "./whatsapp";

const sale: Listing = {
  id: "mustang",
  kind: "sale",
  name: "Ford Mustang GT",
  render: { model: "coupe", paint: "rosso", wheel: "split" },
  example: true,
};
const rental: Listing = { ...sale, id: "panamera", kind: "rental", name: "Porsche Panamera" };

describe("inquiryText", () => {
  it("names the car and says it is a consignment sale", () => {
    const text = inquiryText(sale, "fr");
    expect(text).toContain("Ford Mustang GT");
    expect(text).toContain("dépôt-vente");
  });

  it("asks about renting for a rental car", () => {
    expect(inquiryText(rental, "fr")).toContain("louer");
    expect(inquiryText(rental, "en")).toContain("rent");
  });

  it("never talks about a diagnosis", () => {
    for (const l of [sale, rental]) for (const loc of ["fr", "en", "ar"] as const) expect(inquiryText(l, loc)).not.toMatch(/diagnos/i);
  });

  it("survives the wa.me round trip unchanged", () => {
    const text = inquiryText(sale, "ar");
    expect(new URL(whatsappUrl(garage.whatsapp, text)).searchParams.get("text")).toBe(text);
  });
});
