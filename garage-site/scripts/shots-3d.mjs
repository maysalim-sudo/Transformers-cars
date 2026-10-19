// 3D inspection check: npm run shots:3d -- <locale> <width> <height> <label> [model index 0-2]
import { mkdirSync } from "node:fs";
import { chromium } from "playwright-core";

const [loc = "en", w = "1440", h = "900", label = "3d", modelIdx = "0"] = process.argv.slice(2);
mkdirSync("shots", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: (process.env.GL_ARGS ?? "--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist").split(" "),
});
const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(`${process.env.BASE_URL ?? "http://localhost:3100"}/${loc}/diagnose`, { waitUntil: "networkidle" });
await page.locator("section button[aria-pressed]").nth(Number(modelIdx)).click();

const toggle = page.getByRole("switch");
console.log("3D switch on by default:", await toggle.getAttribute("aria-checked"));
if ((await toggle.getAttribute("aria-checked")) !== "true") await toggle.click();
await page.waitForSelector("canvas", { timeout: 20000 });
await page.waitForTimeout(2500);

const canvas = page.locator("canvas").first();
const shot = async (name) => {
  await page.waitForTimeout(1200);
  const box = await canvas.boundingBox();
  // software WebGL keeps the main thread busy; a clipped page shot avoids element-stability waits
  await page.screenshot({ path: `shots/${label}-${name}.png`, clip: box, timeout: 90000 });
};
await page.evaluate(() => document.querySelector("canvas").scrollIntoView({ block: "center", behavior: "instant" }));
await shot("home");

// orbit by dragging
const b = await canvas.boundingBox();
await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.5);
await page.mouse.down();
await page.mouse.move(b.x + b.width * 0.25, b.y + b.height * 0.35, { steps: 12 });
await page.mouse.up();
await shot("orbit");

for (const v of [/^Underside$|^Dessous$|^الأسفل$/, /^Top$|^Dessus$|^الأعلى$/, /^Front$|^Avant$|^الأمام$/]) {
  await page.locator("[role=tab]", { hasText: v }).click();
  await shot(String(v).replace(/[^A-Za-z]/g, "").slice(0, 9).toLowerCase());
}
await page.locator("[role=tab]", { hasText: /Left side|Côté gauche|الجانب الأيسر/ }).click();
await page.waitForTimeout(1200);

// hover + tap the part under the centre of the car
await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.52);
await shot("hover");
const status = await page.locator("[role=status]").allInnerTexts();
console.log("hover label:", status.join(" | ") || "(none)");
await page.mouse.down();
await page.mouse.up();
await page.waitForTimeout(400);
console.log("selected chips:", (await page.locator("ul li button").allInnerTexts()).map((s) => s.replace(/\s+×?$/, "")).join(" | ") || "(none)");

await page.locator('input[type="range"]').first().fill("1");
await shot("exploded");

const sw = await page.evaluate(() => document.documentElement.scrollWidth);
console.log("scrollWidth", sw, "errors:", errors.length ? errors.slice(0, 5) : "none");
await browser.close();
