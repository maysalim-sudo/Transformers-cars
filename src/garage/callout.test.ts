import { describe, expect, it } from "vitest";
import { calloutPlace } from "./callout";

/** where the card lands on screen, as [left, right] edges, for a placement */
function edges(x: number, card: number, rtl: boolean, place: { flip: boolean; shift: number }) {
  const towardEnd = rtl === place.flip; // the card reaches right of the dot
  const left = towardEnd ? x + 56 : x - 56 - card;
  return [left + place.shift, left + card + place.shift];
}

describe("callout placement", () => {
  it("keeps the card on its usual side when it fits", () => {
    expect(calloutPlace({ x: 100, card: 180, view: 390, rtl: false })).toEqual({ flip: false, shift: 0 });
    expect(calloutPlace({ x: 300, card: 180, view: 390, rtl: true })).toEqual({ flip: false, shift: 0 });
  });

  it("puts the card on the other side of the dot when only that side fits", () => {
    expect(calloutPlace({ x: 300, card: 180, view: 390, rtl: false })).toEqual({ flip: true, shift: 0 });
    expect(calloutPlace({ x: 100, card: 180, view: 390, rtl: true })).toEqual({ flip: true, shift: 0 });
  });

  it("keeps the card on screen when neither side fits (a narrow phone, a dot mid-screen)", () => {
    for (const rtl of [false, true]) {
      for (const x of [150, 195, 240]) {
        const [l, r] = edges(x, 220, rtl, calloutPlace({ x, card: 220, view: 390, rtl }));
        expect(l, `x=${x} rtl=${rtl}`).toBeGreaterThanOrEqual(8);
        expect(r, `x=${x} rtl=${rtl}`).toBeLessThanOrEqual(382);
      }
    }
  });
});
