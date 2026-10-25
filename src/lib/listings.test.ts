import { describe, expect, it } from "vitest";
import { listings } from "@/config/inventory";
import { formatPrice, getListing, getListings, isShown } from "./listings";

describe("getListings", () => {
  it("returns every listing without a filter", async () => {
    expect(await getListings()).toHaveLength(listings.length);
  });

  it("filters by kind", async () => {
    const rentals = await getListings("rental");
    expect(rentals.length).toBeGreaterThan(0);
    expect(rentals.every((l) => l.kind === "rental")).toBe(true);
  });
});

describe("getListing", () => {
  it("finds a listing by id", async () => {
    expect((await getListing(listings[0].id))?.name).toBe(listings[0].name);
  });

  it("returns undefined for an unknown id", async () => {
    expect(await getListing("nope")).toBeUndefined();
  });
});

describe("isShown", () => {
  it("hides sold cars only", () => {
    const l = listings[0];
    expect(isShown(l)).toBe(true);
    expect(isShown({ ...l, status: "reserved" })).toBe(true);
    expect(isShown({ ...l, status: "sold" })).toBe(false);
  });
});

describe("formatPrice", () => {
  it("formats whole dinars with the currency", () => {
    const text = formatPrice(85000, "en");
    expect(text).toMatch(/TND|DT/);
    expect(text.replace(/\D/g, "")).toBe("85000");
  });
});
