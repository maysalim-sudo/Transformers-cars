import { describe, expect, it } from "vitest";
import { paints, tints, TRANSFORM_FINISH, wheelStyles } from "./palette";

describe("transformation finishes", () => {
  it("adds the showroom amber paint with the brand tones", () => {
    const amber = paints.find((p) => p.id === "amber");
    expect(amber?.tones).toEqual(["#ffd27a", "#d18a1e", "#7a4708", "#2e1a03"]);
    expect(amber?.label.en).toBe("Showroom amber");
  });

  it("adds a factory wheel style", () => {
    expect(wheelStyles.find((w) => w.id === "stock")?.label.fr).toBe("D'origine");
  });

  it("goes from a plain silver car to amber on split spokes with dark glass", () => {
    expect(TRANSFORM_FINISH).toEqual({
      stock: { paint: "platinum", wheel: "stock", tint: "none" },
      tuned: { paint: "amber", wheel: "split", tint: "dark" },
    });
    for (const f of Object.values(TRANSFORM_FINISH)) {
      expect(paints.some((p) => p.id === f.paint)).toBe(true);
      expect(wheelStyles.some((w) => w.id === f.wheel)).toBe(true);
      expect(tints.some((t) => t.id === f.tint)).toBe(true);
    }
  });
});
