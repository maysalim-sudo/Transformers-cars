// Screenshot + overflow check against the running dev server.
// usage: npm run shots -- <path, e.g. en/diagnose> <width> <height> <label> <fractions> [--reduced] [--raf]
//   fractions: comma list of hero-track progress (0–1) or absolute scroll offsets as y<px>
//   --reduced  emulate prefers-reduced-motion
//   --raf      instead of screenshots, count requestAnimationFrame calls over 2 s at each position, after a 3.5 s settle
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const [rawPath = "en", w = "1440", h = "900", label = "shot", fractions = "0"] = args.filter((a) => !a.startsWith("--"));
// Git Bash rewrites "/en" to "C:/Program Files/Git/en"; accept "en" and undo that rewrite.
const path = "/" + rawPath.replace(/^[A-Za-z]:\/.*?\/Git\//, "").replace(/^\/+/, "");
const base = process.env.BASE_URL ?? "http://localhost:3100";
const out = "shots";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
});
const page = await browser.newPage({
  viewport: { width: Number(w), height: Number(h) },
  reducedMotion: flags.has("--reduced") ? "reduce" : "no-preference",
});
if (flags.has("--raf")) {
  await page.addInitScript(() => {
    window.__raf = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => {
      window.__raf++;
      return raf(cb);
    };
  });
}
await page.goto(base + path, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const scrollTo = (f) =>
  page.evaluate((f) => {
    const track = document.querySelector("main section");
    const travel = track ? track.offsetHeight - innerHeight : 0;
    const y = f.startsWith("y") ? Number(f.slice(1)) : Math.round(Number(f) * travel);
    window.scrollTo({ top: y, behavior: "instant" });
  }, f);

let failed = false;
for (const f of fractions.split(",")) {
  await scrollTo(f);
  if (flags.has("--raf")) {
    // let eases and spark lifetimes finish before measuring (override with RAF_SETTLE ms)
    await page.waitForTimeout(Number(process.env.RAF_SETTLE ?? 3500));
    const a = await page.evaluate(() => window.__raf);
    await page.waitForTimeout(2000);
    const b = await page.evaluate(() => window.__raf);
    console.log(`${label} ${f}: rAF calls in 2s = ${b - a}`);
    continue;
  }
  await page.waitForTimeout(Number(process.env.SHOT_WAIT ?? 1600));
  const { sw, iw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  const file = `${out}/${label}-${f}.png`;
  await page.screenshot({ path: file });
  const overflow = sw > iw;
  failed ||= overflow;
  console.log(`${file} scrollWidth=${sw} innerWidth=${iw} ${overflow ? "OVERFLOW" : "ok"}`);
}
await browser.close();
process.exit(failed ? 1 : 0);
