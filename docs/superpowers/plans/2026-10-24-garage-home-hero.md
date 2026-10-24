# Garage Home Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the SVG home hero with a scroll-driven real-time 3D garage where a stock SUV is upgraded bay by bay and revealed under a cover in the showroom, with an opt-in sound layer and a still-image fallback.

**Architecture:** A pure `timeline.ts` turns scroll progress into a `GarageState`; an imperative Three.js scene behind `createGarage()` applies it; `GarageHero.tsx` owns scroll, overlays, callouts, still mode and sound. Art comes from a Blender atelier with baked lightmaps (built through the Blender MCP) and ComfyUI textures/audio; positions shared through `src/garage/layout.json`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4, three 0.180 (already installed), Vitest, playwright-core, Blender 4.x via MCP (port 9876) + `blender/hd/bl.py`, ComfyUI at `127.0.0.1:8188` (Z-Image Turbo, RealESRGAN, ACE-Step 1.5, Stable Audio Open), Pillow, ffmpeg.

**Spec:** `docs/superpowers/specs/2026-10-24-garage-home-hero-design.md`. Visual reference: `prototypes/home-concepts/garage-a/index.html` (route, camera keys, wheel/kit/lift choreography) and `prototypes/home-concepts/showroom-b/index.html` (cover, per-part scan wipe, callout projection, light rig). Port logic from them; do not copy their blockout geometry.

## Global Constraints

- Work on a new branch `garage-hero` (`main` has the owner's unrelated uncommitted work: never stage files you did not touch; use `git add <paths>`, never `git add -A`). One commit per task, message ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- No new npm dependencies. three addons import from `three/examples/jsm/...` (as `src/car/three/hdCar.ts` does).
- World units are metres; y up; the car's nose points −x and its left side +z (same as `hdCar.ts`). The car drives toward −x.
- Bay ranges of `p`: arrival `[0, 0.08)`, wheels `[0.08, 0.27)`, stance `[0.27, 0.42)`, kit `[0.42, 0.57)`, paint `[0.57, 0.74)`, tint `[0.74, 0.84)`, reveal `[0.84, 1]`.
- Body drop is exactly `0.045` m. Bodies that drop: every part node except ids matching `/^(wheel|brake|caliper|spring)/`.
- Stock finish: paint `#8d939c`, rim `#c4c9cf`, caliper `#4b5058`, glass `#6e7d8c` opacity 0.45. Tuned: paint `#c27a12`, rim `#0c0d10`, caliper `#ffad3a`, glass `#040506` opacity 0.9.
- Art direction: grey epoxy floor, black walls, white LED strips; amber (`#d38c22` / `#f0b04e`) only on calipers, bay numerals, turntable ring, scan beam, CTA.
- No text rendered into 3D except the brand sign using `public/brand/logo-on-dark.png`. No "Bumblebee", "Autobot" or any Hasbro name anywhere.
- All copy in `src/i18n/strings/{en,fr,ar}.ts`; the `Strings` type (= `typeof en`) enforces parity. Arabic stays flagged for native review.
- Budgets: `garage.glb` ≤ 3 MB, `public/garage/*.webp` total ≤ 2.5 MB, `public/garage/audio/` ≤ 2 MB.
- Sound is off by default; `localStorage` key `tt-sound`, all access in try/catch.
- Still mode when: no WebGL, context lost, `prefers-reduced-motion: reduce`, asset load failure, or mean frame time > 45 ms over the first 2 s after `ready` (one-way for the visit).
- Phones (`innerWidth < 768`): DPR ≤ 1.5, no real-time shadows, bloom at half resolution, portrait camera framings. Desktop DPR ≤ 1.75.
- Screenshots: dev server `npm run dev` (port 3000) → run shots with `BASE_URL=http://localhost:3000 CHROME_PATH=$(which google-chrome || which chromium)`.

## Review Focus

- **Jumping instead of scrolling** (deep link to `/fr#contact`, Home/End key, scrollbar drag): no burst of sounds or sparks, and the car shows the exact state for the landing `p`. Pinned in Task 1 (`stateAt` is pure) and Task 10 (`cuesCrossed` ignores jumps > 0.05 and the first frame).
- **Rotating a phone or resizing mid-scroll:** framing switches between portrait and landscape keys, canvas never stretches. Pinned in Task 1 (portrait framing test) and Task 12 (shots at 844×390 after a 390×844 load).
- **WebGL context lost mid-visit** (GPU reset, many tabs): hero falls back to stills, no blank black box. Pinned in Task 9 (Playwright `WEBGL_lose_context` check).
- **Asset fails to load** (`garage.glb` 404 or slow network): still mode stays, no uncaught error. Pinned in Task 9 (route-abort check).
- **Leaving and coming back** (client navigation to `/showroom` and back): exactly one canvas, render loop and audio stopped off-page. Pinned in Task 12 (`--raf` check after navigation).

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/garage/layout.json` (create) | Shared world layout (metres) |
| `src/garage/timeline.ts` + `.test.ts` (create) | Pure `stateAt(p, opts)` → `GarageState` |
| `src/garage/heroCar.ts` + `.test.ts` (create) | Hero model id, finishes, kit parts, callout anchors |
| `src/garage/scene/car.ts` + `.test.ts` (create) | Rig the loaded car; apply state to it |
| `src/garage/scene/world.ts` (create) | Load `garage.glb`, lightmaps, live lights, moving nodes |
| `src/garage/scene/effects.ts` (create) | Sparks, mist, beam, cover clip |
| `src/garage/scene/index.ts` (create) | `createGarage()` facade, renderer, composer, probe |
| `src/garage/sound/cues.ts` + `.test.ts` (create) | Cue sheet, `cuesCrossed` |
| `src/garage/sound/engine.ts` (create) | Web Audio engine |
| `src/components/GarageHero.tsx` (create) | Track, overlays, callouts, modes, sound toggle |
| `src/app/[locale]/page.tsx` (modify) | Use `GarageHero` |
| `src/i18n/strings/{en,fr,ar}.ts` (modify) | `garage` block |
| `blender/garage/*.py` (create) | build, cloth, bake, export, stills |
| `art/comfy/{workflows/*.json,prompts.json,audio.json}`, `scripts/comfy-generate.mjs`, `scripts/pack-assets.py`, `scripts/pack-audio.py` (create) | Asset generation |
| `public/garage/**`, `public/draco/*` (create) | Shipped assets |
| `scripts/shots.mjs` (modify) | Modes, garage track selector |

---

### Task 1: Layout and pure timeline

**Files:**
- Create: `src/garage/layout.json`, `src/garage/timeline.ts`, `src/garage/timeline.test.ts`

**Interfaces:**
- Produces:
  - `layout.json`: `{ "start": 25, "door": 16, "bays": { "wheels": 10, "stance": 0, "kit": -10, "paint": -20, "tint": -28 }, "split": -34, "show": -44, "hall": { "halfWidth": 7, "height": 5.2 }, "booth": { "length": 7, "width": 5.2, "height": 3.4 }, "turntable": { "radius": 3.4 }, "rig": { "count": 8, "radius": 5.2, "height": 7.2 } }`
  - `export const BAYS = [0.08, 0.27, 0.42, 0.57, 0.74, 0.84] as const` (bay start fractions for bays 1–6)
  - `export type Vec3 = [number, number, number]`
  - `export type GarageState = { bay: 0|1|2|3|4|5|6; done: boolean[] /* 6: wheels, stance, kit, paint, tint, showroom */; carX: number; carSpeed: number /* 0..1 */; wheelSpin: number /* rad */; doorOpen: number; lift: number; wheelsOff: number; wheelFinish: number; drop: number /* m */; kitOff: number; lipsVisible: boolean; sparks: number; boothLight: number; mist: number; paintSweep: number; tintSweep: number; transition: number; coverPull: number; showLights: number[] /* length rig.count */; tableTurn: number; headlights: number; camera: { pos: Vec3; look: Vec3 } }`
  - `export function stateAt(p: number, opts: { portrait?: boolean; wheelRadius?: number } = {}): GarageState` (defaults `portrait: false`, `wheelRadius: 0.36`; tests below write `stateAt(x)` for the defaults)

- [ ] **Step 1: Write failing tests** in `timeline.test.ts`:
  - `bay`: `stateAt(0.05).bay === 0`, `0.1 → 1`, `0.3 → 2`, `0.5 → 3`, `0.6 → 4`, `0.8 → 5`, `0.9 → 6`, `1 → 6`.
  - Car route: `carX === 25` for `p ≤ 0.02`; `carX === -44` for `p ≥ 0.9`; `carX` is non-increasing over `p` from 0 to 1 step 0.005; `carSpeed === 0` inside the hold of each bay (e.g. `p = 0.2, 0.36, 0.5, 0.67, 0.8`).
  - Upgrades: for each of `wheelFinish`, `drop/0.045`, `paintSweep`, `tintSweep`, `coverPull`: equals 0 at its bay start and 1 at its bay end (from `BAYS`), and stays at 1 for every later `p`.
  - `paintSweep` strictly increases across `[0.6, 0.71]`; `tintSweep` across `[0.76, 0.83]`.
  - `lift`, `wheelsOff`, `kitOff`, `transition` are 0 at both ends of their bay (they go and come back).
  - `showLights`: length 8; light `i` turns on later than light `i-1` in the reveal; all ≥ 0.99 at `p = 1`.
  - Purity: for 50 random `p`, `stateAt(p)` deep-equals `stateAt(p)` computed after calling `stateAt` at other values (no hidden state).
  - Portrait: `stateAt(0.5, {portrait:true}).camera` differs from landscape; every other field is equal.
  - `wheelSpin === (25 - carX) / wheelRadius`.
- [ ] **Step 2:** `npm test -- src/garage/timeline.test.ts` → FAIL (module not found).
- [ ] **Step 3: Implement `stateAt`.** Port the route, lift/wheel/kit/booth timings and camera keys from `prototypes/home-concepts/garage-a/index.html` (`route`, `cams`, the `ss(...)` calls in `frame()`), re-timed to the bay ranges above; add the reveal: `transition` up then down over `[0.84, 0.87]`, `coverPull` over `[0.88, 0.93]`, `showLights[i]` over `[0.875 + 0.008i, 0.89 + 0.008i]`, `tableTurn` = π × smoothstep over `[0.9, 1]`, `headlights` = square flash on `(0.93, 0.955)` then 1. Camera keys are offsets relative to `carX` (world `pos = [carX + o.x, o.y, o.z]`), with a second `portraitCams` array (wider and further back, same `p` keys). Keep helpers `clamp01`, `smoothstep`, `ss(a, b, x)` local.
- [ ] **Step 4:** `npm test -- src/garage/timeline.test.ts` → PASS; `npx tsc --noEmit` clean.
- [ ] **Step 5:** Commit `feat(garage): shared layout and pure scroll timeline`.

### Task 2: Hero car config

**Files:**
- Create: `src/garage/heroCar.ts`, `src/garage/heroCar.test.ts`

**Interfaces:**
- Consumes: `getPart(id)` from `src/car/registry.ts`, `CarModelId` from `src/car/models`.
- Produces:
  - `export type Anchor = { partId: string; offset: [number, number, number] }`
  - `export type AnchorId = "wheels" | "stance" | "kit" | "paint" | "tint"` (offset in metres from the part's bounding-box centre, car-local)
  - `export const heroCar: { model: CarModelId; url: string; stock: Finish; tuned: Finish; kitParts: { id: string; out: [number, number, number] }[]; lipNodes: RegExp; anchors: Record<AnchorId, Anchor> }` with `Finish = { paint: string; rim: string; caliper: string; glass: string; glassOpacity: number }`
  - Values: `model: "suv"`, `url: "/models/hd/suv.glb"`, finishes from Global Constraints, `kitParts`: `bumper_front` out `[-0.9, 0.25, 0]`, `bumper_rear` `[0.9, 0.25, 0]`, `diffuser` `[0.6, -0.1, 0]`; `lipNodes: /^(side_skirt_lip|diffuser_light)/`; anchors: wheels → `wheel_front_left` `[0, 0, 0.12]`, stance → `fender_front_left` `[0, -0.35, 0.05]`, kit → `diffuser` `[0, 0, 0.3]`, paint → `roof` `[0, 0.05, 0]`, tint → `side_windows_left` `[0, 0, 0.05]`.

- [ ] **Step 1: Write failing tests:** every `anchors[*].partId` and every `kitParts[*].id` passes `getPart` without throwing; the SUV GLB (load as in `src/car/three/hdCar.test.ts`) contains a node with each of those `partId` extras and at least one node whose name matches `lipNodes`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement `heroCar.ts` with the values above.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(garage): hero car config`.

### Task 3: Garage copy in three languages

**Files:**
- Modify: `src/i18n/strings/en.ts`, `fr.ts`, `ar.ts`

**Interfaces:**
- Produces: `t.garage = { eyebrow, title, lead, scroll, jobCard: { title, items: string[6] }, bays: { kicker, title, body }[6], callouts: Record<"wheels"|"stance"|"kit"|"paint"|"tint", { label: string; value: string }>, spec: { title: string; rows: { label: string; value: string }[5] }, cta: { primary, secondary }, sound: { on, off } }`.

- [ ] **Step 1:** Add the block to `en.ts`:
  - eyebrow "Garage · Showroom · Sousse"; title "Drive in stock. Roll out transformed."; lead "Scroll to take a car through our workshop, bay by bay, all the way to the showroom floor."; scroll "Scroll ↓".
  - jobCard.title "Job card · #0427"; items "Wheels & calipers", "Stance −45 mm", "Body kit", "Paint", "Window tint", "Showroom".
  - bays: ("Bay 01 · Wheels & brakes", "Up on the lift. New wheels on.", "Gloss-black wheels and amber calipers, torqued and balanced in the first bay."), ("Bay 02 · Suspension", "Lowered 45 mm.", "Coilovers set the stance: closer to the road, tighter in the corners."), ("Bay 03 · Body styling", "Skirts and diffuser.", "Every panel fitted and aligned by hand before it goes to paint."), ("Bay 04 · Paint booth", "Showroom amber.", "Base, colour and clear coat, panel by panel, in a dust-free booth."), ("Bay 05 · Glass", "Dark tint.", "Privacy film and heat rejection, cut to every window."), ("06 · Showroom", "Start your build.", "Tell us what you drive and what you want it to become.").
  - callouts: wheels ("Wheels", "Forged · gloss black"), stance ("Stance", "−45 mm coilovers"), kit ("Body kit", "Skirts · diffuser"), paint ("Paint", "Showroom amber"), tint ("Glass", "Dark tint").
  - spec.title "Build #0427 · SUV"; rows Wheels/"Forged · gloss black", Stance/"−45 mm", Body/"Skirts · diffuser", Paint/"Showroom amber", Glass/"Dark tint".
  - cta: primary "Start your build", secondary "WhatsApp"; sound: on "Sound on", off "Sound off".
- [ ] **Step 2:** `fr.ts`: eyebrow "Garage · Showroom · Sousse"; title "Entrée d'origine. Sortie transformée."; lead "Faites défiler pour suivre une voiture dans notre atelier, baie par baie, jusqu'au showroom."; scroll "Défiler ↓"; jobCard "Fiche atelier · #0427" / "Jantes & étriers", "Assiette −45 mm", "Kit carrosserie", "Peinture", "Vitres teintées", "Showroom"; bays ("Baie 01 · Jantes & freins", "Sur le pont. Nouvelles jantes.", "Jantes noir brillant et étriers ambre, serrées et équilibrées dans la première baie."), ("Baie 02 · Suspension", "Abaissée de 45 mm.", "Les combinés filetés fixent l'assiette : plus près de la route, plus précise en virage."), ("Baie 03 · Carrosserie", "Bas de caisse et diffuseur.", "Chaque élément ajusté et aligné à la main avant la peinture."), ("Baie 04 · Cabine de peinture", "Ambre showroom.", "Apprêt, base et vernis, panneau par panneau, dans une cabine sans poussière."), ("Baie 05 · Vitrage", "Teinte foncée.", "Film intimité et anti-chaleur, découpé pour chaque vitre."), ("06 · Showroom", "Lancez votre projet.", "Dites-nous ce que vous conduisez et ce qu'elle doit devenir."); callouts ("Jantes", "Forgées · noir brillant"), ("Assiette", "Combinés −45 mm"), ("Kit", "Bas de caisse · diffuseur"), ("Peinture", "Ambre showroom"), ("Vitrage", "Teinte foncée"); spec.title "Projet #0427 · SUV", rows Jantes/Assiette/Carrosserie/Peinture/Vitrage with the callout values; cta "Lancez votre projet" / "WhatsApp"; sound "Son activé" / "Son coupé".
- [ ] **Step 3:** `ar.ts`: eyebrow "ورشة · معرض · سوسة"; title "تدخل أصلية. تخرج متحوّلة."; lead "مرّر لتتابع سيارة داخل ورشتنا، مرحلة بمرحلة، حتى أرضية المعرض."; scroll "مرّر ↓"; jobCard "بطاقة العمل · ‎#0427" / "الجنوط والفرامل", "خفض ‎45 مم", "بودي كيت", "الطلاء", "تظليل الزجاج", "المعرض"; bays ("المرحلة 01 · الجنوط والفرامل", "على الرافعة. جنوط جديدة.", "جنوط سوداء لامعة وفرامل كهرمانية، مشدودة وموزونة في المرحلة الأولى."), ("المرحلة 02 · نظام التعليق", "أخفض بـ‎45 مم.", "مساعدات قابلة للضبط تحدد الوضعية: أقرب إلى الطريق وأدق في المنعطفات."), ("المرحلة 03 · الهيكل", "تنانير جانبية وديفيوزر.", "كل قطعة تُركّب وتُضبط يدويًا قبل الطلاء."), ("المرحلة 04 · غرفة الطلاء", "كهرماني المعرض.", "أساس ولون وورنيش، لوحة بلوحة، في غرفة خالية من الغبار."), ("المرحلة 05 · الزجاج", "تظليل داكن.", "فيلم خصوصية وعازل حرارة لكل نافذة."), ("06 · المعرض", "ابدأ مشروعك.", "أخبرنا ماذا تقود وماذا تريد أن تصبح سيارتك."); callouts ("الجنوط", "مطروقة · أسود لامع"), ("الوضعية", "مساعدات ‎−45 مم"), ("البودي كيت", "تنانير · ديفيوزر"), ("الطلاء", "كهرماني المعرض"), ("الزجاج", "تظليل داكن"); spec.title "المشروع ‎#0427 · SUV", rows with the same labels/values; cta "ابدأ مشروعك" / "واتساب"; sound "الصوت مفعّل" / "الصوت مغلق".
- [ ] **Step 4:** `npx tsc --noEmit` clean (parity enforced by `Strings`).
- [ ] **Step 5:** Commit `feat(garage): hero copy in fr, ar, en`.

### Task 4: Car rig

**Files:**
- Create: `src/garage/scene/car.ts`, `src/garage/scene/car.test.ts`

**Interfaces:**
- Consumes: `heroCar` (Task 2), `GarageState` (Task 1).
- Produces:
  - `export type RiggedCar = { group: THREE.Group; wheelRadius: number; length: number; apply(s: GarageState): void; anchorWorld(id: AnchorId, out: THREE.Vector3): THREE.Vector3; dispose(): void }`
  - `export function rigCar(scene: THREE.Object3D): RiggedCar` (scene = a loaded glTF scene, unscaled metres)
  - `export function sweepAmount(centreN: number, sweep: number): number` — beam position `b = -1.1 + 2.2 * sweep`; returns `clamp01((b - centreN) / 0.15 + 0.5)`. `centreN` is the part's centre x mapped to −1 (nose) … 1 (tail).

- [ ] **Step 1: Write failing tests** (load `suv.glb` like `hdCar.test.ts`):
  - `sweepAmount(c, 0) === 0` and `sweepAmount(c, 1) === 1` for `c` in `[-1, -0.3, 0.4, 1]`; at `sweep = 0.5` a part at `c = -0.6` is 1 and a part at `c = 0.6` is 0.
  - After `apply(stateAt(0.65))`, the hood's paint colour is the tuned colour and the trunk's is still the stock colour (nose painted first); after `apply(stateAt(0.74))` both are tuned.
  - After `apply(stateAt(0.4))` every body node is 0.045 lower than its rest y and every wheel pivot is unchanged.
  - After `apply(stateAt(0.2))` with `wheelsOff > 0`, the left wheels moved +z and the right wheels −z.
  - `apply(stateAt(0))` after `apply(stateAt(1))` restores rest positions and stock colours (scroll back).
  - Lip nodes are hidden at `p = 0.3` and visible at `p = 0.6`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.** Centre the scene on its bounding box (x, z) with `min.y = 0`. Material swap and per-part clones as in `prototypes/home-concepts/showroom-b/index.html` (the `swaps` loop): kinds `paint | glass | rim | cal` by material name prefix (`paint`, `glass`, `rim`/`machined`) and `caliper*` part id; record each clone's `centreN`. Wheel pivots at wheel centres as in garage-a (`pivot.attach`). `apply` sets lift (group y = `lift * 0.55`), wheel slide `wheelsOff * 0.75` along ±z, wheel rotation `wheelSpin`, rim/caliper colours by `wheelFinish`, body drop, kit offsets (`kitOff * out`), lip visibility, paint/glass by `sweepAmount`, LED emissive × `0.6 + headlights * 2.5` relative to each LED material's original intensity.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(garage): rig hero car with per-panel sweeps`.

### Task 5: ComfyUI image assets

**Files:**
- Create: `art/comfy/workflows/zimage_t2i.json`, `art/comfy/workflows/upscale_esrgan.json`, `art/comfy/prompts.json`, `scripts/comfy-generate.mjs`, `scripts/pack-assets.py`; Modify: `.gitignore` (add `/art/comfy/out/`)

**Interfaces:**
- Produces: `node scripts/comfy-generate.mjs <prompts.json> [--only <id>]` → `art/comfy/out/<id>-<seed>.png`; `python3 -I scripts/pack-assets.py <src> <dest.webp> --max <px> [--quality 82]`.
- Produces assets (used by Task 6): `art/comfy/picked/street_night.png` (≥ 3072×1024), `epoxy_floor.png` (1024², tileable), `wall_panel.png` (1024², tileable), `showroom_art_1.png`, `showroom_art_2.png` (1536×1024).

- [ ] **Step 1:** Export API-format workflows from ComfyUI (`z_image_turbo_bf16` + `qwen_3_4b` + `ae`, 8 steps; upscaler RealESRGAN ×4) into `workflows/`. Check the licence of Z-Image Turbo on its model card and record the result in `art/comfy/LICENSES.md`; stop and tell the owner if commercial use is not allowed.
- [ ] **Step 2:** `prompts.json`: one entry per asset `{ id, workflow, prompt, negative, seed, width, height, tile? }`. Prompts follow the art direction: premium atelier; street plate = a modern Sousse street at night, whitewashed walls, palm trees, wet asphalt, no people, no readable text, no logos; surfaces flat and evenly lit; wall art = abstract long-exposure light trails, white and amber, no cars' brands, no text.
- [ ] **Step 3:** Implement `comfy-generate.mjs`: POST `/prompt` with the workflow (prompt, seed, size patched by node title `PROMPT`, `NEGATIVE`, `SEED`, `SIZE`), poll `/history/<id>`, download via `/view`. Run it: `node scripts/comfy-generate.mjs art/comfy/prompts.json` → PNGs in `art/comfy/out/`.
- [ ] **Step 4:** Show the owner a contact sheet of the outputs (`python3 -I scripts/pack-assets.py --sheet art/comfy/out art/comfy/out/sheet.jpg`); copy the chosen files into `art/comfy/picked/` with the names above; upscale the street plate.
- [ ] **Step 5:** Commit `chore(art): ComfyUI workflows, prompts and picked textures` (commit `picked/`, not `out/`).

### Task 6: Blender atelier build

**Files:**
- Create: `blender/garage/README.md`, `blender/garage/build_garage.py`, `blender/garage/run.py`

**Interfaces:**
- Consumes: `src/garage/layout.json`, `art/comfy/picked/*`, `public/brand/logo-on-dark.png`, the SUV from `public/models/hd/suv.glb` (imported only to frame and to shadow the bake, not exported).
- Produces: scene `Garage` with collection `garage`; static meshes; moving objects named exactly `door`, `lift_arms`, `gantry`, `turntable`, `cover`; empties `spot_0` … `spot_7` marking spotlight positions; material names `floor_epoxy`, `wall_panel`, `led_strip`, `glass_booth`, `sign_logo`, `street_plate`, `showroom_art`, `chrome`, `matte_black`, `amber_accent`.

- [ ] **Step 1:** `run.py <script.py> [args]` prepends `LAYOUT = <json>` and `ROOT = <repo path>` to the script and sends it with `blender/hd/bl.py`. Smoke test: `python3 -I blender/garage/run.py blender/garage/build_garage.py --dry` prints the bay list.
- [ ] **Step 2:** Implement `build_garage.py`: creates/clears scene `Garage` (never touches `Scene` or `Commercial`), units metres, Blender −Y ↔ glTF +z as in `blender/hd/export_glb.py`. Geometry per spec §5.1 at `layout.json` positions; floor 1 cm bevels on edges; LED strips as thin emissive meshes; street plate on a large curved plane outside the door.
- [ ] **Step 3:** Run it, then `python3 -I blender/hd/run_shot.py`-style review renders (Eevee) from the arrival, wheels and showroom cameras; show the owner the three renders and adjust until approved.
- [ ] **Step 4:** Save the working file as `blender/garage/garage.blend` (git-ignored if > 50 MB; otherwise commit).
- [ ] **Step 5:** Commit `feat(blender): premium atelier build script`.

### Task 7: Cover cloth, bake, export, stills

**Files:**
- Create: `blender/garage/cloth_cover.py`, `bake_garage.py`, `export_garage.py`, `render_stills.py`; Create: `public/garage/garage.glb`, `public/garage/lm_workshop.webp`, `public/garage/lm_showroom.webp`, `public/garage/still_{arrival,paint,reveal}_{16x9,9x16}.webp`, `public/garage/og.jpg`, `public/draco/draco_decoder.{js,wasm}`, `public/draco/draco_wasm_wrapper.js`

**Interfaces:**
- Produces: `garage.glb` with the named nodes from Task 6, a second UV set on static meshes, and animation clip `cover_pull` on `cover` (0 → 1 s = on → off); lightmaps sized 2048²; stills at 1920×1080 and 1080×1920.

- [ ] **Step 1:** `cloth_cover.py`: cloth sim of a satin sheet draped over the SUV on the turntable and pulled off toward +y/−z over 48 frames; bake to shape keys on `cover`; name the action `cover_pull`.
- [ ] **Step 2:** `bake_garage.py`: lightmap-pack UV2 on static meshes, Cycles bake diffuse (direct + indirect) + AO into `lm_workshop` / `lm_showroom` at 2048², save PNG, then `python3 -I scripts/pack-assets.py <png> public/garage/<name>.webp --max 2048 --quality 80`.
- [ ] **Step 3:** `export_garage.py`: export collection `garage` to `public/garage/garage.glb`, GLB, Draco level 6, extras on, y-up, animations on (only `cover_pull`). Copy the three Draco decoder files from `node_modules/three/examples/jsm/libs/draco/gltf/` to `public/draco/`.
- [ ] **Step 4:** Check budgets: `du -b public/garage/garage.glb` ≤ 3 000 000 and `du -cb public/garage/*.webp | tail -1` ≤ 2 500 000; reduce texture sizes if not.
- [ ] **Step 5:** `render_stills.py`: Cycles renders with the SUV in stock finish (arrival), mid-paint (paint) and tuned on the turntable with lights on (reveal), both aspects, packed to WebP (`--max 1920 --quality 78`); `og.jpg` = reveal 16:9 at 1200×630.
- [ ] **Step 6:** Commit `feat(garage): baked atelier, cover clip, stills and decoder`.

### Task 8: Scene facade (world, effects, renderer)

**Files:**
- Create: `src/garage/scene/world.ts`, `src/garage/scene/effects.ts`, `src/garage/scene/index.ts`

**Interfaces:**
- Consumes: `rigCar` (Task 4), `GarageState`/`stateAt` (Task 1), `heroCar` (Task 2), assets (Task 7).
- Produces:
  - `export type Garage = { ready: Promise<void>; apply(s: GarageState): void; render(): void; project(id: AnchorId): { x: number; y: number; visible: boolean }; resize(w: number, h: number, portrait: boolean): void; onSlow(cb: () => void): void; onLost(cb: () => void): void; dispose(): void }`
  - `export function createGarage(canvas: HTMLCanvasElement, opts: { phone: boolean }): Garage`
  - `world.ts`: `loadWorld(loader): Promise<{ root: THREE.Object3D; nodes: Record<"door"|"lift_arms"|"gantry"|"turntable"|"cover", THREE.Object3D>; coverAction: THREE.AnimationAction; spots: THREE.SpotLight[]; booth: THREE.PointLight; apply(s: GarageState): void }>` (assigns `lm_*.webp` as `lightMap` on materials by name; `uv1`)
  - `effects.ts`: `createEffects(scene): { sparksAt(pos: THREE.Vector3, n: number): void; apply(s: GarageState, car: RiggedCar, dt: number): void; dispose(): void }` (sparks and mist particle pools as in garage-a; beam mesh parented to the car as in showroom-b)

- [ ] **Step 1:** Implement `world.ts`, `effects.ts`, `index.ts`. Renderer/composer settings from garage-a (ACES, exposure 0.82, bloom 0.38/0.5/0.92), DPR caps and phone rules from Global Constraints; `DRACOLoader` decoder path `/draco/`; `project()` uses the camera and `car.anchorWorld`; `visible` false when behind the camera or outside the viewport. Frame-time probe: after `ready`, average `performance.now()` deltas over 2 s of `render()` calls; if > 45 ms call `onSlow` callbacks once. `webglcontextlost` on the canvas calls `onLost`.
- [ ] **Step 2:** Temporary dev harness: `src/app/[locale]/garage-lab/page.tsx` rendering a full-screen canvas with a range slider for `p` (not linked anywhere). `npm run dev`, open `/fr/garage-lab`, step through `p = 0, 0.2, 0.36, 0.5, 0.66, 0.8, 0.95`, screenshot each with the browser pane; compare against the approved Blender review renders and the prototype; fix until each bay reads correctly.
- [ ] **Step 3:** `npx tsc --noEmit`, `npm test`, `npm run lint` clean.
- [ ] **Step 4:** Delete the lab page. Commit `feat(garage): three.js scene facade`.

### Task 9: GarageHero component, still mode, page swap

**Files:**
- Create: `src/components/GarageHero.tsx`; Modify: `src/app/[locale]/page.tsx`, `scripts/shots.mjs`

**Interfaces:**
- Consumes: `createGarage` (Task 8, via `next/dynamic`-style lazy `import()` inside an effect), `stateAt`, `BAYS`, `t.garage` (Task 3).
- Produces: `export function GarageHero({ locale, t }: { locale: Locale; t: Strings })`; track element `<section data-garage-track>` with height `1100svh`; root attribute `data-mode="still" | "live"`; shots flags `--track=garage`, `--nowebgl`, `--lose-context`, `--block=<url-substring>`.

- [ ] **Step 1:** Implement the server-safe shell: track, sticky stage, `<picture>` stills (arrival/paint/reveal, 9:16 source for `(orientation: portrait)`), overlays from `t.garage` (headline at bottom-start; bay cards; job card top-end, collapsed row under 768 px; spec sheet + CTA in bay 6; CTA links reuse `whatsappUrl(garage.whatsapp, …)` and `data-event="whatsapp_click"` exactly as `HeroSequence` does). Stills crossfade by bay (arrival for bays 0–3, paint for 4–5, reveal for 6).
- [ ] **Step 2:** Live mode in an effect: skip when `matchMedia("(prefers-reduced-motion: reduce)")` matches or WebGL is unavailable; otherwise lazy-import the scene, `createGarage`, on `ready` fade the canvas in and set `data-mode="live"`; on `onSlow`, `onLost` or a rejected `ready`, dispose and stay/return to still. rAF loop: read `p` like `useExplode`'s `read()`, smooth with `lerp(p, target, 1 - 0.0015 ** dt)`, `apply(stateAt(p, …))`, `render()`, position each callout (`t.garage.callouts[k]`, shown only in its bay and when `visible`) with `transform: translate(x, y)`. Loop runs only while an `IntersectionObserver` reports the track visible and `!document.hidden`. Canvas and callouts `aria-hidden`.
- [ ] **Step 3:** `page.tsx`: replace `<HeroSequence locale={locale} t={t} />` with `<GarageHero locale={locale} t={t} />`.
- [ ] **Step 4:** `shots.mjs`: track selector `[data-garage-track]` when present (fallback `main section`); `--nowebgl` launches Chrome with `--disable-webgl --disable-3d-apis`; `--lose-context` calls `getExtension("WEBGL_lose_context").loseContext()` on the canvas after load; `--block=<s>` aborts requests whose URL contains `s`. Default `CHROME_PATH` falls back to `/usr/bin/google-chrome` on Linux.
- [ ] **Step 5: Verify.** `npm run dev`, then:
  - `npm run shots -- fr 1440 900 live 0,0.2,0.36,0.5,0.66,0.8,0.97` and `... ar 390 844 live-ar 0,0.5,0.97` → no `OVERFLOW`, bays read correctly.
  - `... fr 1440 900 still 0,0.66,0.97 --nowebgl` and `--reduced` → stills, no canvas.
  - `... fr 1440 900 lost 0.5 --lose-context` → still visible, `data-mode="still"`.
  - `... fr 1440 900 blocked 0.5 --block=garage.glb` → still visible, no page error in console.
- [ ] **Step 6:** Commit `feat(garage): GarageHero with live and still modes on the home page`.

### Task 10: Sound cue sheet

**Files:**
- Create: `src/garage/sound/cues.ts`, `src/garage/sound/cues.test.ts`

**Interfaces:**
- Consumes: `BAYS`, `GarageState`.
- Produces:
  - `export type OneShot = { id: string; at: number; file: string; gain: number }`, `export type Loop = { id: string; file: string; gain(s: GarageState): number; rate?(s: GarageState): number }`
  - `export const oneShots: OneShot[]`, `export const loops: Loop[]`, `export const MUSIC = { bed: "music_bed.mp3", sting: "music_sting.mp3", stingAt: 0.93 }`
  - `export function cuesCrossed(prev: number | null, p: number): OneShot[]`

- [ ] **Step 1: Write failing tests:** `cuesCrossed(null, x)` is `[]`; `cuesCrossed(a, b)` with `b ≤ a` is `[]`; with `b - a > 0.05` is `[]`; otherwise returns exactly the cues with `a < at ≤ b`, sorted by `at`; every one-shot's `at` lies inside the bay its id prefix names (`door_`/`engine_` → 0, `lift_`/`wrench_` → 1, `coil_` → 2, `panel_`/`weld_` → 3, `fan_` → 4, `squeegee_` → 5, `whoosh_`/`cover_`/`spot_`/`rev_` → 6); every `file` (one-shots, loops, `MUSIC`) exists under `public/garage/audio/` (this assertion is skipped with `it.skipIf(!existsSync(dir))` until Task 11 lands).
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement the sheet from spec §7: one-shots `door_rattle` (0.01), `engine_start` (0.02), `lift_up` (0.15), `wrench_off` (0.19), `wrench_on` (0.22), `lift_down` (0.25), `coil_settle` (0.37), `panel_off` (0.49), `panel_on` (0.53), `weld_1..3` (0.535, 0.545, 0.555), `fan_spin` (0.6), `squeegee_1..4` (0.77, 0.79, 0.81, 0.83), `whoosh_dark` (0.845), `cover_swoosh` (0.885), `spot_0..7` at each light's on-time from Task 1, `rev` (0.93); loops `street` (gain = 1 − doorOpen·0.8 while bay 0), `engine` (gain = 0.15 + carSpeed·0.85, rate = 0.8 + carSpeed·0.5), `room` (gain 0.35 in bays 1–5), `spray` (gain = 1 while 0 < paintSweep < 1).
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat(garage): sound cue sheet`.

### Task 11: Audio assets

**Files:**
- Create: `art/comfy/workflows/music_ace15.json`, `art/comfy/workflows/sfx_stable_audio.json`, `art/comfy/audio.json`, `scripts/pack-audio.py`, `public/garage/audio/*.mp3`; Modify: `art/comfy/LICENSES.md`, `scripts/comfy-generate.mjs` (audio outputs)

**Interfaces:**
- Consumes: the file names in `oneShots`, `loops`, `MUSIC` (Task 10).
- Produces: one MP3 per name; `python3 -I scripts/pack-audio.py <in> <out.mp3> [--mono] [--loop] [--trim s]`.

- [ ] **Step 1:** Precondition check: `curl -s 127.0.0.1:8188/object_info/CheckpointLoaderSimple` lists `stable_audio_open_1.0.safetensors`; `t5_base.safetensors` is in `text_encoders`. If Stable Audio Open is missing, ask the owner to download it (licence accepted on Hugging Face) or approve the CC0 fallback for all effects. Record the ACE-Step 1.5 and Stable Audio Open licence terms in `LICENSES.md`.
- [ ] **Step 2:** `audio.json`: music bed prompt "instrumental minimal cinematic electronic, 100 BPM, warm sub bass, clean tight percussion, premium automotive showroom, no vocals", 60 s, seed fixed; sting "short rising cinematic hit, same key, no vocals", 8 s; one effect entry per one-shot/loop with a concrete prompt (e.g. `impact wrench short burst in a garage, close mic, dry`), seed, length; `source` field for CC0 replacements (URL + licence).
- [ ] **Step 3:** Generate with `node scripts/comfy-generate.mjs art/comfy/audio.json`; the owner listens to each and approves or asks for a reseed/CC0 swap.
- [ ] **Step 4:** `pack-audio.py` (ffmpeg): trim silence, `loudnorm=I=-16:TP=-1`, music 128 kbps stereo, effects 96 kbps mono, loops with 50 ms crossfade at the seam. Pack every approved file into `public/garage/audio/`; `du -cb public/garage/audio/* | tail -1` ≤ 2 000 000.
- [ ] **Step 5:** `npm test -- src/garage/sound` → the file-existence test now runs and passes.
- [ ] **Step 6:** Commit `feat(garage): music and sound effects`.

### Task 12: Sound engine, toggle, final verification

**Files:**
- Create: `src/garage/sound/engine.ts`; Modify: `src/components/GarageHero.tsx`

**Interfaces:**
- Consumes: `oneShots`, `loops`, `MUSIC`, `cuesCrossed` (Task 10); audio files (Task 11); `t.garage.sound` (Task 3).
- Produces: `export function createSoundEngine(base = "/garage/audio/"): { enable(): Promise<void>; disable(): void; frame(prev: number | null, p: number, s: GarageState): void; suspend(): void; resume(): void; dispose(): void }`

- [ ] **Step 1:** Implement the engine: `AudioContext` created and resumed inside `enable()` (called from the click); fetch + decode all files on first enable; master gain fades 0 ↔ 1 over 300 ms; loops are looping `AudioBufferSourceNode`s with per-loop gain/playbackRate set each `frame`; one-shots via `cuesCrossed` with at most 4 voices (stop the oldest); music bed loops under everything at −8 dB and ducks −6 dB for the sting at `MUSIC.stingAt` (forward crossing only).
- [ ] **Step 2:** In `GarageHero`: speaker `<button aria-pressed>` fixed top-end beside the nav (`z-[60]`, mirrored for RTL), label `t.garage.sound.on/off`; persist to `localStorage["tt-sound"]` (try/catch; default off); call `engine.frame` in the loop (live) or from a scroll listener (still mode, with `carSpeed` forced to 0); `suspend` when off-screen or hidden; `dispose` on unmount.
- [ ] **Step 3: Verify in the browser pane:** turn sound on at `p = 0`, scroll slowly to the end: cues land on their moments (check console log of fired ids in dev only); scroll back up: silence. Reload with `tt-sound` = on: the button shows pressed, and audio starts on the visitor's first pointerdown/keydown anywhere on the page (browsers refuse to start an AudioContext without a gesture); nothing plays before that.
- [ ] **Step 4: Full verification:**
  - `npm test`, `npx tsc --noEmit`, `npm run lint` clean.
  - Shots: `fr`, `ar`, `en` at 1440×900 and 390×844, fractions `0,0.2,0.36,0.5,0.66,0.8,0.97`, live + `--nowebgl` + `--reduced` → all `ok`.
  - Rotation: load at 390×844, resize to 844×390 at `p = 0.5` → landscape framing, no stretch (screenshot).
  - Navigation: `--raf` at `y99999` (contact) after client-navigating `/fr` → `/fr/showroom` → back: exactly one `<canvas>` and rAF calls in 2 s = 0 while the hero is off screen.
  - `NEXT_DIST_DIR=.next-build npx next build` succeeds.
- [ ] **Step 5:** Commit `feat(garage): opt-in sound with toggle`.

### Task 13: Remove the old hero

**Files:**
- Delete: `src/components/HeroSequence.tsx`, `src/components/sparks/`, `src/car/CarStage.tsx`, `src/car/useExplode.ts`, `src/car/timeline.ts`, `src/car/timeline.test.ts`; Modify: `src/app/globals.css` (remove `.car-stock`, `.car-tuned`, `.car-beam`, `.car-reflection`, `.car-idle`, LED/headlight keyframes), `src/i18n/strings/{en,fr,ar}.ts` (remove `sequence` and unused `hero` keys), `src/app/[locale]/layout.tsx` (OG image → `/garage/og.jpg`), `README.md` (hero section, tech stack)

- [ ] **Step 1:** `grep -rn "HeroSequence\|CarStage\|useExplode\|car/timeline\|sparks/\|car-stock\|car-tuned\|car-beam\|car-reflection\|car-idle\|\.sequence\|t\.hero" src` → only the files above; delete/modify them.
- [ ] **Step 2:** `npm test`, `npx tsc --noEmit`, `npm run lint`, production build → clean; shots `fr 1440 900 final 0,0.5,0.97` and `y99999` → services, featured cars, colour studio and contact unchanged.
- [ ] **Step 3:** Commit `refactor: remove the SVG hero sequence`.
