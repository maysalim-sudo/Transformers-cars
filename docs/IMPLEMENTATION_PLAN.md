# Transformation Scroll, Showroom Polish & "Available Now" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the homepage tell the client's story — a stock car explodes, reassembles, then a scanning beam _transforms_ it into a tuned build (wheels, stance, body kit, amber paint, tint) with welding sparks and a headlight flash — and add an "Available now" section for his consignment and rental cars.

**Architecture:** One master timeline (`src/car/timeline.ts`, pure and unit-tested) drives two CSS variables on the hero track: `--e` (explosion, existing) and `--tx` (transformation, new). Every visible body part renders twice in the stage — a _stock_ layer and a _tuned_ layer — and the beam position `--tx` wipes stock out and tuned in with complementary `clip-path` insets. The tuned layer has its own `CarDefs` instance (prefix `hero-t`) inside a container carrying the tuned finish, because paint gradients resolve CSS variables where the defs live. Sparks are a small canvas fed by the existing rAF loop through an `onFrame` callback, so they stop with it.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4, inline SVG + CSS 3D. New dev-deps: `vitest` (unit tests), `playwright-core` (screenshot script, uses installed Chrome).

**Spec:** the brainstorm in this session (2026-10-18), recommendation order: (1) Transformation scroll, (2) headlight welcome + sparks + floor reflection, (3) "Available now". Design decisions taken from it are listed under Global Constraints. Brief rules in `../PROJECT_BRIEF` still apply (no invented data presented as real, private preview only, reduced-motion support, screenshot every visual change at 390 and 1440 px).

## Global Constraints

- Work on branch `transformer-tuning-site`; one commit per task, message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Hero track becomes **8 panels** of `100svh`: hero, 01 Understanding, 02 Engine, 03 Wheels/brakes/suspension, 04 Body styling, 05 Precision (reassembly), **06 Transformation (new)**, 07 CTA.
- Timeline keyframes (track progress `p`, 0–1): `explodeStart 0.03`, `explodeFull 0.27`, `reassembleStart 0.58`, `reassembleEnd 0.76`, `transformStart 0.79`, `transformEnd 0.93`.
- Stock finish: paint `platinum`, wheel `stock` (new), tint `none`. Tuned finish: paint `amber` (new), wheel `split`, tint `dark`.
- New paint `amber`: tones `["#ffd27a", "#d18a1e", "#7a4708", "#2e1a03"]`, swatch `#c98420`, label en "Showroom amber" / fr "Ambre showroom" / ar "كهرماني المعرض". Do **not** use "Bumblebee", "Autobot" or any Hasbro name anywhere.
- New wheel style `stock`: label en "Factory" / fr "D'origine" / ar "أصلي".
- Tuned stance: tuned layers of every part whose group is `body`, `glass`, `lighting` or `aero` (plus `body_shell`) are drawn 7 viewBox units lower (`translate(0 7)`); wheels, brakes, suspension, drivetrain never move.
- All new copy exists in `en.ts`, `fr.ts`, `ar.ts` (`Strings` type enforces parity). Arabic stays flagged for native review.
- `prefers-reduced-motion: reduce`: no beam animation, no sparks, no headlight animation; `--tx` snaps to 0 or 1 like `--e` does.
- Inventory listings are **examples** until the client supplies real cars: each entry has `example: true` and the section shows the existing placeholder-style note. Never present them as real stock.
- Dev server stays on port 3100; production check builds with `NEXT_DIST_DIR=.next-build npx next build` so the dev server is not clobbered.

## Review Focus

- **Scrolling back up after the transformation** — the car must un-transform (tuned → stock) and re-explode cleanly; `transformAt` is symmetric. Test: `transformAt` returns 0 for every `p <= 0.79` including the hold and reassembly ranges.
- **Jumping straight to `/fr#services` or `/fr#contact`** (anchor deep link) — the loop starts while the track is off-screen; `--tx` must not be left mid-wipe when the user scrolls back. Test: `tick` writes `--tx` from `transformAt(p)` even on the first frame (Task 2 step).
- **Reduced motion** — a visitor with reduced motion still sees both the stock and tuned car (snap), never a half-wiped car. Test: Playwright `--reduced` screenshot at `p=0.86` shows a fully tuned car (Task 8).
- **Arabic / RTL** — the beam and wipe are physical (left→right, front of car first) regardless of `dir`; card text moves to the start side. Test: `/ar` screenshot at `p=0.86` (Task 8).
- **Small phones (390 px)** — the beam, sparks canvas and duplicated layers must not cause horizontal overflow or jank. Test: `scrollWidth <= innerWidth` assertion in the shot script at 390 px for every capture (Task 1 script, run in Task 8).

---

## File Structure

| File                                              | Responsibility                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `src/car/timeline.ts` (create)                    | Pure timeline: `SEQUENCE`, `explodeAt(p)`, `transformAt(p)`. Moved out of `useExplode.ts`. |
| `src/car/timeline.test.ts` (create)               | Vitest unit tests for the timeline.                                                        |
| `src/car/useExplode.ts` (modify)                  | Imports the timeline; writes `--tx`; exposes `onFrame`.                                    |
| `src/car/palette.ts` (modify)                     | `amber` paint, `stock` wheel, `TRANSFORM_FINISH`.                                          |
| `src/car/art/primitives.tsx` (modify)             | `stock` wheel drawing; caliper `finish` prop.                                              |
| `src/car/art/context.tsx` (modify)                | `variant: "stock" \| "tuned"` in the art context.                                          |
| `src/car/art/side.tsx` (modify)                   | Tuned-only body-kit details read `variant`.                                                |
| `src/car/CarStage.tsx` (modify)                   | Renders stock + tuned layer per part; tuned defs; beam.                                    |
| `src/components/Sparks.tsx` (create)              | Canvas spark emitter driven by `onFrame`.                                                  |
| `src/components/HeroSequence.tsx` (modify)        | 8 panels, mounts `Sparks`, lit state.                                                      |
| `src/app/globals.css` (modify)                    | Wipe, beam, LED welcome, headlight flash, reflection.                                      |
| `src/config/inventory.ts` (create)                | Example listings for "Available now".                                                      |
| `src/lib/inquiry.ts` + `inquiry.test.ts` (create) | WhatsApp text for "Ask about this car".                                                    |
| `src/components/Inventory.tsx` (create)           | The "Available now" section.                                                               |
| `src/i18n/strings/{en,fr,ar}.ts` (modify)         | New panel 06, inventory copy.                                                              |
| `scripts/shots.mjs` (create)                      | Screenshot + overflow check, committed so anyone can rerun it.                             |

---

### Task 1: Test tooling and screenshot script

**Files:**

- Modify: `package.json` (devDependencies, scripts)
- Create: `vitest.config.ts`, `scripts/shots.mjs`

**Interfaces:**

- Produces: `npm test` (vitest run), `npm run shots -- <path> <width> <height> <label> <fractions> [--reduced]` writing PNGs to `shots/` (git-ignored) and printing `OVERFLOW` when `scrollWidth > innerWidth`.

- [ ] **Step 1:** `npm i -D vitest@3.2.4 playwright-core@1.56.1`
- [ ] **Step 2:** Create `vitest.config.ts` with `test.environment = "node"`, `include: ["src/**/*.test.ts"]`, and the `@` alias resolving to `./src` (mirror `tsconfig.json` paths).
- [ ] **Step 3:** Add scripts `"test": "vitest run"`, `"shots": "node scripts/shots.mjs"`; add `/shots/` to `.gitignore`.
- [ ] **Step 4:** Create `scripts/shots.mjs` from the session's scratchpad `shoot.mjs`: base URL `http://localhost:3100`, Chrome path from `process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe"`, fractions are track progress (`main section` height − viewport) or `y<px>`, `--reduced` sets `reducedMotion: "reduce"`, waits 1600 ms per capture, prints overflow status per capture. A `--raf` flag instead scrolls to each fraction, waits 1.5 s, and prints how many `requestAnimationFrame` calls happen in the next 2 s (init script wraps `requestAnimationFrame` with a counter).
- [ ] **Step 5:** Run `npm test` → expect "No test files found" exit (acceptable) and `npm run shots -- /en 390 844 smoke 0` → one PNG, `ok`.
- [ ] **Step 6:** Commit `chore: add vitest and screenshot script`.

### Task 2: Timeline module with transformation

**Files:**

- Create: `src/car/timeline.ts`, `src/car/timeline.test.ts`
- Modify: `src/car/useExplode.ts` (remove local `SEQUENCE`/`explodeAt`, import them)

**Interfaces:**

- Produces: `SEQUENCE` (keyframes from Global Constraints), `explodeAt(p: number): number`, `transformAt(p: number): number` (0 before `transformStart`, smoothstep up to 1 at `transformEnd`, 1 after), `useExplode(track, target, onFrame?: (f: { e: number; tx: number; dTx: number; p: number }) => void)`.

- [ ] **Step 1: Write failing tests** in `timeline.test.ts`:
  - `explodeAt(0) === 0`, `explodeAt(0.27) === 1`, `explodeAt(0.5) === 1`, `explodeAt(0.76) === 0`, `explodeAt(1) === 0`.
  - `transformAt(p) === 0` for `p` in `[0, 0.27, 0.5, 0.7, 0.79]`; `transformAt(0.93) === 1`; `transformAt(1) === 1`; `transformAt(0.86)` strictly between 0.4 and 0.6.
  - Explosion and transformation never overlap: for `p` from 0 to 1 step 0.01, `explodeAt(p) === 0 || transformAt(p) === 0`.
- [ ] **Step 2:** `npm test` → FAIL (module not found).
- [ ] **Step 3:** Implement `timeline.ts` (move `clamp01`, `smoothstep`, `SEQUENCE`, `explodeAt` from `useExplode.ts`; add `transformAt`).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** In `useExplode`: keep a smoothed `tx` exactly like `e` (same 0.12 lerp, same reduced-motion snap to 0/1), write `--tx` with `toFixed(4)` on every tick including the first, call `onFrame?.({ e, tx, dTx, p })` each tick (`dTx` = change since last tick), and include `tx` in the "settled" check. Store `onFrame` in a ref so a new callback does not restart the effect.
- [ ] **Step 6:** `npx tsc --noEmit` clean; commit `feat: timeline with transformation phase`.

### Task 3: Stock and tuned finishes

**Files:**

- Modify: `src/car/palette.ts`, `src/car/art/primitives.tsx`, `src/car/art/context.tsx`, `src/car/art/side.tsx`

**Interfaces:**

- Produces: `WheelStyle["id"]` gains `"stock"`; `paints` gains `amber`; `export const TRANSFORM_FINISH = { stock: { paint: "platinum", wheel: "stock", tint: "none" }, tuned: { paint: "amber", wheel: "split", tint: "dark" } } as const`; art context `variant?: "stock" | "tuned"` (default `"tuned"` so every existing render is unchanged); `Caliper` reads `variant` and draws `#3a3f46` metal when stock, accent gradient when tuned.

- [ ] **Step 1:** Add `amber` paint and `stock` wheel style (values in Global Constraints). The colour studio and inspection tool pick them up automatically — confirm by type-check only.
- [ ] **Step 2:** In `primitives.tsx` add `StockFace` used when `style === "stock"`: tyre ring thickened inward to r 54 (deeper sidewall = smaller-looking rim), five plain flat spokes `#b8bdc4` with no highlight line, flat hub cap r 12. No other wheel styles change.
- [ ] **Step 3:** In `side.tsx`, gate tuned-only details on `variant === "tuned"`: front splitter lip (existing `geo.splitter` stroke), ducktail line, fender vent, a new side-skirt strip `M ${front+90} 358 L ${rear-90} 356` stroke `#050607` width 6 drawn in both door panels, and a second exhaust tip at `tip[0]-18` in `Diffuser`. Stock shows none of these.
- [ ] **Step 4:** Visual check: temporarily render `PartRender` twice in the studio (`variant` via a new optional `variant` prop on `PartRender` that forwards to `ArtProvider`), `npm run shots -- /en 1440 900 finish y7800` and look at the PNG: stock must read as a plain silver car with small wheels; tuned as amber with big wheels, kit and dark glass. Keep the `variant` prop; remove the temporary second render.
- [ ] **Step 5:** Commit `feat: stock and tuned finishes`.

### Task 4: Dual-layer stage and transformation beam

**Files:**

- Modify: `src/car/CarStage.tsx`, `src/app/globals.css`

**Interfaces:**

- Consumes: `TRANSFORM_FINISH`, art `variant`, `--tx` from Task 2.
- Produces: `.car-stock` / `.car-tuned` layer classes, `.car-beam` element, `data-lit` attribute contract on the stage root (set by Task 5).

- [ ] **Step 1:** In `CarStage`, wrap the stage in two `ArtProvider`s' worth of defs: existing `CarDefs` (prefix `hero`, stock finish vars) and a second `CarDefs` (prefix `hero-t`) inside a `<div style={finishVars(TRANSFORM_FINISH.tuned.paint, TRANSFORM_FINISH.tuned.tint)}>`. The outer frame now uses the stock finish.
- [ ] **Step 2:** For each hero part render `<svg class="car-stock">` (prefix `hero`, variant `stock`, wheel `stock`) and — for every part except `engine`, `transmission`, `exhaust`, `chassis_floor`, `spring_*` — a second `<svg class="car-tuned">` (prefix `hero-t`, variant `tuned`, wheel `split`); tuned layers of stance groups (Global Constraints) wrap their art in `<g transform="translate(0 7)">`.
- [ ] **Step 3:** CSS: `.car-stock { clip-path: inset(0 0 0 calc(var(--tx,0) * 100%)); }`, `.car-tuned { clip-path: inset(0 calc((1 - var(--tx,0)) * 100%) 0 0); }`; wheel art in both layers rotates `calc(var(--tx,0) * 540deg)` around its centre (`transform-box: view-box`, origin `${cx}px ${cy}px`) so wheels spin as the beam passes.
- [ ] **Step 4:** Add `<div class="car-beam" aria-hidden>` inside `.car-rig`: absolute, `left: calc(var(--tx) * 100%)`, width 2px, full height, amber gradient with 24px blur glow, `opacity: calc(min(var(--tx), 1 - var(--tx)) * 8)` clamped to 1 so it only shows mid-transform. Hidden under reduced motion.
- [ ] **Step 5:** `npm run shots -- /en 1440 900 tx 0,0.5,0.82,0.86,0.9,1` and `... 390 844 txm 0.86`. Look at each: 0 = stock silver, 0.86 = half silver / half amber split at a glowing beam, 1 = full tuned car lowered onto big wheels; no seams, no dark shell showing at the drop line, no overflow.
- [ ] **Step 6:** Commit `feat: transformation beam over dual-layer car`.

### Task 5: Story panels, sparks and headlight moments

**Files:**

- Modify: `src/components/HeroSequence.tsx`, `src/i18n/strings/{en,fr,ar}.ts`, `src/app/globals.css`, `src/car/art/side.tsx` (LED `pathLength`)
- Create: `src/components/Sparks.tsx`

**Interfaces:**

- Consumes: `useExplode(track, target, onFrame)` from Task 2.
- Produces: `<Sparks emitRef />` where `emitRef.current(xFraction: number, intensity: number)` spawns sparks at that horizontal stage position.

- [ ] **Step 1: Copy.** Insert a new 6th entry into `sequence` (before the CTA entry) in all three files:
  - en: kicker "06 · Transformation", title "Stock in. Transformed out.", body "Wheels, stance, body kit, colour and tint — fitted and finished in our workshop."
  - fr: "06 · Transformation", "Entrée d'origine. Sortie transformée.", "Jantes, assiette, kit carrosserie, teinte et vitres — posés et finis dans notre atelier."
  - ar: "06 · التحويل", "تدخل أصلية. تخرج متحوّلة.", "جنوط ووضعية وبودي كيت ولون وتظليل — تركيب وتشطيب في ورشتنا."
    Renumber the CTA kicker to "07 · …" and change its title to en "Start your build." / fr "Lancez votre projet." / ar "ابدأ مشروعك."
- [ ] **Step 2:** `HeroSequence`: track height `8 * 100svh`; `PANEL_IDS = ["car-explode-start","car-explode-full",undefined,undefined,"car-reassemble","car-transform",undefined]`; the last panel keeps the top-start CTA layout.
- [ ] **Step 3: Sparks.** `Sparks.tsx`: a `<canvas>` absolutely covering the car frame, DPR-scaled, max 120 particles, each with position, velocity (up/out, gravity 0.25 px/frame²), life 400–900 ms, colour `#ffd27a`→`#d18a1e`, drawn as 2px streaks. Its own rAF runs only while particles exist. Under reduced motion `emit` is a no-op.
- [ ] **Step 4:** Wire `onFrame` in `HeroSequence`: when `dTx > 0.0005` emit at `x = tx` along the body height with intensity proportional to `dTx`; when `|de| > 0.004` emit a small burst at the wheel hubs (x 0.25 and 0.76). When `tx` first crosses 0.98 set `data-lit="1"` on the stage root; clear it when `tx < 0.9`.
- [ ] **Step 5: Headlights.** Add `pathLength={1}` and class `led` to headlight/taillight LED paths in `side.tsx`. CSS: on first paint `.led` draws in (`stroke-dasharray:1; stroke-dashoffset:1 → 0`, 1.2 s, 0.6 s delay, tail lights 0.2 s later); `[data-lit="1"] .car-tuned .led` plays a double flash (opacity 1→0.2→1→0.2→1 over 700 ms). Both disabled under reduced motion.
- [ ] **Step 6:** Shots at 1440 and 390 for `0`, `0.84`, `0.95`; confirm sparks appear on the beam at 0.84 (take the capture 300 ms after scrolling for this one) and nothing overflows. Commit `feat: transformation story panel, sparks and headlight moments`.

### Task 6: Showroom floor reflection

**Files:**

- Modify: `src/components/HeroSequence.tsx`, `src/app/globals.css`

**Interfaces:**

- Consumes: `PartRender` with `variant` (Task 3).

- [ ] **Step 1:** Under the car frame in the pinned stage, render two `PartRender`s (`id="refl-s"` stock finish / `id="refl-t"` tuned finish, `show="car"`, full viewBox `0 0 1200 480`) inside a wrapper flipped with `scaleY(-1)`, positioned so its top edge meets the car's ground line (y 420 of 480 → `top: 87.5%` of the frame), `opacity: calc(0.14 * (1 - var(--e)))`, `mask-image: linear-gradient(to bottom, #000, transparent 45%)`. The two reflection layers use the same complementary `--tx` clip-paths as Task 4.
- [ ] **Step 2:** Shots `0`, `0.9`, `1` at both widths: reflection visible when assembled, gone while exploded, matches stock/tuned split. Commit `feat: showroom floor reflection`.

### Task 7: "Available now" section

**Files:**

- Create: `src/config/inventory.ts`, `src/lib/inquiry.ts`, `src/lib/inquiry.test.ts`, `src/components/Inventory.tsx`
- Modify: `src/app/[locale]/page.tsx` (insert after services), strings ×3

**Interfaces:**

- Produces: `type Listing = { id: string; kind: "sale" | "rental"; name: string; year?: number; render: { model: CarModelId; paint: string; wheel: WheelStyle["id"] }; photo?: string; example: boolean }`; `listings: Listing[]`; `inquiryText(listing: Listing, locale: Locale): string`.

- [ ] **Step 1: Failing tests** in `inquiry.test.ts`: for a sale listing named "Ford Mustang GT", `inquiryText(l, "fr")` contains `"Ford Mustang GT"` and `"dépôt-vente"`; for a rental, contains `"location"`; the text never contains `"diagnos"`; `whatsappUrl(garage.whatsapp, inquiryText(l,"fr"))` round-trips through `new URL(...).searchParams.get("text")`.
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement `inquiryText` using new `message.inquirySale` / `message.inquiryRental` strings (fr: `"Bonjour, je suis intéressé(e) par la {name} en dépôt-vente. Est-elle toujours disponible ?"` / `"Bonjour, je souhaite louer la {name}. Quelles sont les disponibilités ?"`; en and ar equivalents), placeholder `{name}` replaced.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** `inventory.ts`: four entries, all `example: true` — sale "Ford Mustang GT" (coupe, rosso), sale "Chevrolet Camaro SS" (coupe, amber), rental "Porsche Panamera" (sedan, obsidian), rental "Range Rover Sport" (suv, glacier). Names only from the client's public Instagram highlights; no prices, years or mileage.
- [ ] **Step 6:** `Inventory.tsx`: kicker en "Available now" / fr "Disponible" / ar "متوفر الآن", title en "In the showroom." / fr "Au showroom." / ar "في المعرض.", filter chips All / For sale / For rent, cards with `photo` if set else `CarView` (`view="left"`, render finish), kind badge, name, button "Ask about this car" / "Demander cette voiture" / "اسأل عن هذه السيارة" opening `whatsappUrl(garage.whatsapp, inquiryText(l, garage.messageLocale))`. When any listing has `example: true`, show the note en "Example listings — real cars and photos come from the showroom." (fr/ar equivalents).
- [ ] **Step 7:** Shots of the section at 390 and 1440 (`y` offsets found with the script), confirm cards, chips and RTL in `/ar`. Commit `feat: available-now showroom section`.

### Task 8: Full verification pass

**Files:** none (fixes go back to the owning task's files)

- [ ] **Step 1:** `npm test`, `npx tsc --noEmit`, `npx eslint src` — all clean.
- [ ] **Step 2:** `NEXT_DIST_DIR=.next-build npx next build` succeeds; dev server still returns 200.
- [ ] **Step 3:** `npm run shots` for `/fr`, `/ar`, `/en` at 390×844 and 1440×900 with fractions `0,0.15,0.4,0.7,0.86,1,y9500`, plus `/fr 1440 900 rm 0.4,0.86 --reduced`. Look at every PNG. Pass = no `OVERFLOW` lines; reduced-motion 0.86 shows a fully tuned car with no beam; RTL cards on the start side; sparks never cover the copy cards (cards sit above the canvas in z-order).
- [ ] **Step 4:** `npm run shots -- /en 1440 900 raf 0,0.45,1,y9500 --raf` — expect `0` rAF calls for every idle position (hero, exploded hold, transformed end, services).
- [ ] **Step 5:** Copy the key shots to `../phase0-screens/day3-*.png`; commit `chore: day 3 verification shots`.

---

## Out of scope (from the brainstorm, deliberately deferred)

- Engine/exhaust sound and "hold to rev".
- Shareable build card image for WhatsApp / Instagram stories.
- Tunisian derja message option.
- Real-time 3D (Phase 2) and the Blender teaser (brief steps 6–7).
