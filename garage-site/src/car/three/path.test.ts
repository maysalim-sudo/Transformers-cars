import { describe, expect, it } from "vitest";
import { sedanSide } from "../models/sideGeometry";
import { area, bounds, intersect, pathToPolygons } from "./path";

describe("pathToPolygons", () => {
  it("reads straight lines and closes the shape", () => {
    expect(pathToPolygons("M0 0 L10 0 L10 10 Z")).toEqual([
      [
        [0, 0],
        [10, 0],
        [10, 10],
      ],
    ]);
  });

  it("samples cubic curves through their end point", () => {
    const [poly] = pathToPolygons("M0 0 C0 10 10 10 10 0 Z");
    expect(poly.at(-1)).toEqual([10, 0]);
    const mid = poly[Math.floor(poly.length / 2)];
    expect(mid[0]).toBeCloseTo(5, 0);
    expect(mid[1]).toBeCloseTo(7.5, 0);
  });

  it("samples SVG arcs the way the wheel arches use them (sweep 0 goes over the top)", () => {
    // right to left with sweep 0, like "L1006 368 A98 98 0 0 0 824 368"
    const [poly] = pathToPolygons("M20 0 A10 10 0 0 0 0 0 Z");
    const b = bounds(poly);
    expect(b.minY).toBeCloseTo(-10, 0);
    expect(b.maxY).toBeCloseTo(0, 5);
    expect(b.maxX).toBeCloseTo(20, 5);
  });

  it("splits sub-paths", () => {
    expect(pathToPolygons("M0 0 L1 0 L1 1 Z M5 5 L6 5 L6 6 Z")).toHaveLength(2);
  });

  it("parses the sedan silhouette into one closed outline", () => {
    const polys = pathToPolygons(sedanSide.sil);
    expect(polys).toHaveLength(1);
    const b = bounds(polys[0]);
    expect(b.minX).toBeGreaterThan(50);
    expect(b.maxX).toBeLessThan(1155);
    expect(b.minY).toBeGreaterThan(105);
    expect(b.maxY).toBeLessThan(380);
  });
});

describe("intersect", () => {
  it("keeps only the overlap of two shapes", () => {
    const a = pathToPolygons("M0 0 L10 0 L10 10 L0 10 Z")[0];
    const b = pathToPolygons("M5 5 L15 5 L15 15 L5 15 Z")[0];
    const out = intersect(a, b);
    expect(out).toHaveLength(1);
    expect(area(out[0])).toBeCloseTo(25, 5);
  });

  it("returns nothing when shapes do not touch", () => {
    const a = pathToPolygons("M0 0 L1 0 L1 1 Z")[0];
    const b = pathToPolygons("M5 5 L6 5 L6 6 Z")[0];
    expect(intersect(a, b)).toEqual([]);
  });
});
