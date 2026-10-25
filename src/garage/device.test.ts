import { describe, expect, it } from "vitest";
import { levelFromHints, startLevel } from "./device";

const desktop = { gpu: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3050 Direct3D11 vs_5_0 ps_5_0)", memory: 8, cores: 12, phone: false };
const DAY = 24 * 3600 * 1000;

describe("device pre-check", () => {
  it("sends software renderers and data savers to stills", () => {
    expect(levelFromHints({ ...desktop, gpu: null })).toBe("stills");
    expect(levelFromHints({ ...desktop, gpu: "Google SwiftShader" })).toBe("stills");
    expect(levelFromHints({ ...desktop, gpu: "llvmpipe (LLVM 15.0.7, 256 bits)" })).toBe("stills");
    expect(levelFromHints({ ...desktop, gpu: "ANGLE (Microsoft, Microsoft Basic Render Driver)" })).toBe("stills");
    expect(levelFromHints({ ...desktop, saveData: true })).toBe("stills");
    expect(levelFromHints({ ...desktop, net: "2g" })).toBe("stills");
    expect(levelFromHints({ ...desktop, net: "slow-2g" })).toBe("stills");
  });

  it("starts phones low", () => {
    expect(levelFromHints({ ...desktop, gpu: "Adreno (TM) 740", phone: true })).toBe("low");
  });

  it("starts small machines low", () => {
    expect(levelFromHints({ ...desktop, memory: 2 })).toBe("low");
    expect(levelFromHints({ ...desktop, cores: 2 })).toBe("low");
  });

  it("starts integrated GPUs at medium", () => {
    expect(levelFromHints({ ...desktop, gpu: "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11)" })).toBe("medium");
    expect(levelFromHints({ ...desktop, gpu: "Mali-G78" })).toBe("medium");
    expect(levelFromHints({ ...desktop, memory: 4 })).toBe("medium");
  });

  it("starts a strong desktop at ultra, also when the browser hides memory and cores", () => {
    expect(levelFromHints(desktop)).toBe("ultra");
    expect(levelFromHints({ gpu: "Apple M2", phone: false })).toBe("ultra");
    expect(levelFromHints({ ...desktop, net: "4g" })).toBe("ultra");
  });

  it("retries one tier above the remembered one", () => {
    expect(startLevel("ultra", { level: "low", at: 0 }, DAY)).toBe("medium");
    expect(startLevel("ultra", { level: "high", at: 0 }, DAY)).toBe("ultra");
    // the check still caps it
    expect(startLevel("low", { level: "medium", at: 0 }, DAY)).toBe("low");
    expect(startLevel("ultra", null, DAY)).toBe("ultra");
  });

  it("keeps stills for a week, then tries again", () => {
    expect(startLevel("ultra", { level: "stills", at: 0 }, 6 * DAY)).toBe("stills");
    expect(startLevel("ultra", { level: "stills", at: 0 }, 8 * DAY)).toBe("ultra");
    expect(startLevel("ultra", { level: "low", at: 0 }, 8 * DAY)).toBe("ultra");
  });

  it("starts phones at low and never above, whatever this device managed before", () => {
    const phone = levelFromHints({ gpu: "Adreno (TM) 740", memory: 8, cores: 8, phone: true });
    for (const level of ["ultra", "high", "medium", "low"] as const) {
      expect(startLevel(phone, { level, at: 0 }, DAY), level).toBe("low");
    }
    expect(startLevel(phone, null, DAY)).toBe("low");
  });
});

