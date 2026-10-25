// Screenshot + overflow check against the running dev server.
// usage: npm run shots -- <path, e.g. en/diagnose> <width> <height> <label> <fractions> [--reduced] [--raf]
//   fractions: comma list of hero-track progress (0–1) or absolute scroll offsets as y<px>
//   --reduced  emulate prefers-reduced-motion
//   --raf      instead of screenshots, count requestAnimationFrame calls over 2 s at each position, after a 3.5 s settle
//   --gpu      render WebGL on the real GPU (headless Chrome otherwise uses a software rasteriser, too slow for live mode)
//   --nowebgl  launch Chrome with WebGL off (the garage hero must fall back to its stills)
//   --lose-context  after load, force the garage canvas to lose its WebGL context
//   --block=<s>     abort every request whose URL contains <s> (e.g. --block=garage.glb)
//   fractions are of the hero track: [data-garage-track] when present, else the first section in main
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

const defaultChrome = process.platform === "win32" ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/usr/bin/google-chrome";
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? defaultChrome,
  args: flags.has("--nowebgl")
    ? ["--disable-webgl", "--disable-3d-apis"]
    : flags.has("--gpu")
      ? ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=gl"]
      : [],
});
// a phone-sized shot is a phone: touch screen, so the garage treats it as one (device.ts isPhoneDevice)
const phone = Math.min(Number(w), Number(h)) < 768;
const page = await browser.newPage({
  viewport: { width: Number(w), height: Number(h) },
  ...(phone ? { isMobile: true, hasTouch: true, screen: { width: Number(w), height: Number(h) } } : {}),
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
const block = [...flags].find((f) => f.startsWith("--block="))?.slice(8);
if (block) await page.route((url) => url.href.includes(block), (route) => route.abort());
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
await page.goto(base + path, { waitUntil: "networkidle" });
if (flags.has("--lose-context")) {
  await page.waitForTimeout(4000);
  await page.evaluate(() => document.querySelector("[data-garage-track] canvas")?.getContext("webgl2")?.getExtension("WEBGL_lose_context")?.loseContext());
}
await page.waitForTimeout(800);

const scrollTo = (f) =>
  page.evaluate((f) => {
    const track = document.querySelector("[data-garage-track]") ?? document.querySelector("main section");
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
  const mode = await page.evaluate(() => document.querySelector("[data-garage-track]")?.dataset.mode ?? "-");
  console.log(`${file} scrollWidth=${sw} innerWidth=${iw} mode=${mode} ${overflow ? "OVERFLOW" : "ok"}`);
}
await browser.close();
if (pageErrors.length) console.log(`PAGE ERRORS:\n${pageErrors.join("\n")}`);
process.exit(failed || pageErrors.length ? 1 : 0);
