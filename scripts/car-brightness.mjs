// Is the car the brightest thing on screen? At each bay midpoint, compares the highlights of the car
// (its 90th-percentile luma; the car's outline comes from the same frame with the garage hidden) with the
// highlights of everything outside it (scene only: the HTML overlays are
// hidden while measuring). Highlights, not means: up close the car fills the frame, and its black wheels and
// glass would sink a mean below a floor that is in fact darker than its paint.
// usage: node scripts/car-brightness.mjs [locale] [width] [height] [tier]   (BASE_URL, CHROME_PATH as for shots.mjs)
// Pass: the car's 90th percentile is at least the surroundings' 90th percentile at every bay.
import { chromium } from "playwright-core";

const [locale = "fr", w = "1440", h = "900", tier = "ultra"] = process.argv.slice(2);
const base = process.env.BASE_URL ?? "http://localhost:3100";
const BAYS = { wheels: 0.195, stance: 0.365, kit: 0.515, paint: 0.675, tint: 0.81, showroom: 0.97 };

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome",
  args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"],
});
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
await page.goto(`${base}/${locale}?tier=${tier}`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.querySelector("[data-garage-track]")?.dataset.mode === "live" && window.__garage, null, { timeout: 30000 });
await page.addStyleTag({ content: "[data-garage-track] *, header { visibility: hidden !important } [data-garage-track] canvas { visibility: visible !important }" });

const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
let failed = false;
for (const [bay, p] of Object.entries(BAYS)) {
  await page.evaluate((p) => {
    const track = document.querySelector("[data-garage-track]");
    window.scrollTo({ top: Math.round(p * (track.offsetHeight - innerHeight)), behavior: "instant" });
  }, p);
  await page.waitForTimeout(2500);
  const shot = async () => {
    // decode the screenshot in the page (a 2D canvas), so this needs no image library
    const png = (await page.screenshot()).toString("base64");
    return page.evaluate(async (b64) => {
      const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const c = new OffscreenCanvas(img.width, img.height).getContext("2d");
      c.drawImage(img, 0, 0);
      return { px: Array.from(c.getImageData(0, 0, img.width, img.height).data), width: img.width, height: img.height };
    }, png);
  };
  const { px, width, height } = await shot();
  // the car's outline: the same frame with the garage hidden leaves the car alone on the night background
  await page.evaluate(() => window.__garage.isolateCar(true));
  await page.waitForTimeout(300);
  const alone = await shot();
  await page.evaluate(() => window.__garage.isolateCar(false));
  const all = new Float32Array(width * height);
  const inside = [];
  const outside = [];
  for (let i = 0; i < all.length; i++) {
    const l = luma(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
    (luma(alone.px[i * 4], alone.px[i * 4 + 1], alone.px[i * 4 + 2]) > 12 ? inside : outside).push(l);
    all[i] = l;
  }
  const sorted = Float32Array.from(all).sort();
  const pct = (q) => sorted[Math.floor(q * (sorted.length - 1))];
  const p90 = (a) => (a.length ? a.sort((m, n) => m - n)[Math.floor(0.9 * (a.length - 1))] : 0);
  const [car, rest] = [p90(inside), p90(outside)];
  const ok = inside.length > 0 && car >= rest;
  failed ||= !ok;
  console.log(`${bay.padEnd(8)} p=${p} car p90=${car.toFixed(1)} rest p90=${rest.toFixed(1)} car=${Math.round((100 * inside.length) / all.length)}% of frame, frame p50=${pct(0.5).toFixed(1)} ${ok ? "ok" : "CAR NOT BRIGHTEST"}`);
}
await browser.close();
process.exit(failed ? 1 : 0);
