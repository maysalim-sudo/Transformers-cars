# Garage hero cinematic v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the garage hero a film-grade sequence on desktop (film-crew camera, moody pools of light, DOF, flares, light rays, motion blur, working tools and props, hero-orbit ending) with automatic effect shedding, then a lighter phone version with the overhead camera.

**Architecture:** The pure timeline gains orbit-based camera shots, a `focus` point and `tools[]` states; the scene facade gains a quality ladder that switches effects per tier; new post passes live in `src/garage/scene/post/`; Blender re-lights and adds props and tools; the export is meshopt-compressed.

**Tech Stack:** three 0.180 (EffectComposer, BokehPass, Reflector, MeshoptDecoder), Blender 5 headless scripts, ComfyUI (Z-Image Turbo), @gltf-transform/cli, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-25-garage-hero-cinematic-v2-design.md` (amends `2026-10-24-garage-home-hero-design.md`)

## Global Constraints

- Desktop at tier Ultra: 60 fps on an RTX 3050 at 1440×900. Every tier must render a correct frame (no black or NaN, which bloom spreads).
- `garage.glb` ≤ 3 MB after compression; lightmaps + textures ≤ 2.5 MB; all audio ≤ 2 MB.
- `stateAt(p)` stays pure: time-based motion (handheld breathing) lives in the scene, never in the timeline.
- Reduced motion: no breathing, no motion blur, no grain animation; still mode unchanged.
- Camera stays ≥ 0.5 m inside side walls past the door, under the 5.2 m workshop ceiling, and under the 3.4 m booth roof whenever it is over the booth.
- Props and image panels: no text, no real brands, no people.
- Commits: env `GIT_AUTHOR_*`/`GIT_COMMITTER_*` = "Salim May <74213415+salimmay@users.noreply.github.com>", messages end with the Co-Authored-By line. Blender scripts run headless via `blender/garage/run.py`.

## Review Focus

- **Scrolling backwards through an orbit:** the camera retraces the same arc; no flip when the azimuth wraps past ±180° (interpolate the shortest way round). Pinned in Task 2.
- **Tier drop mid-scroll:** an effect switching off between two frames must not flash, go black or leak GPU memory (dispose on drop). Pinned in Task 1 (ladder) + Task 6 (each effect's `setEnabled(false)` disposes nothing it will need again and renders a valid frame next).
- **DOF focus on a part off screen** (e.g. callout anchor behind the camera): focus falls back to the car centre, never to infinity. Pinned in Task 6.
- **Motion blur on a jump** (End key snaps p): the previous-frame matrix must reset on a jump, or the first frame smears across the whole screen. Pinned in Task 6.
- **Darker lighting vs readability:** HTML overlays keep their contrast (cards have their own backgrounds); the headline scrim still covers bay 0. Checked by shots in Task 8.

---

### Task 1: Quality ladder

**Files:**
- Create: `src/garage/scene/quality.ts`, `src/garage/scene/quality.test.ts`
- Modify: `src/garage/scene/index.ts` (replace the extras/main probe pair from commit 6ea6f68)

**Interfaces:**
- Produces: `export type Tier = "ultra" | "high" | "medium" | "low"`, `export const TIER_FEATURES: Record<Tier, { motionBlur: boolean; dof: boolean; reflections: boolean; flares: boolean; rays: boolean; shadows: boolean; maxDpr: number }>`, `export function createLadder(start: Tier): { tier: Tier; frame(now: number): "drop" | "stills" | null }`, `export function tierFromQuery(search: string): Tier | null` (`?tier=medium` for checks).

- [ ] **Step 1: Failing tests** in `quality.test.ts`:
  - `"drops one tier per slow second until low"`: frames at 33 ms from `"ultra"` return `"drop"` three times, with `tier` ending at `"low"`.
  - `"sends low to stills only after the 45 ms check"`: at 33 ms on `"low"` it never returns `"stills"`; at 60 ms it returns `"stills"` after about 2 s.
  - `"stays put on a fast device"`: 16.7 ms frames for 10 s → never `"drop"`.
  - `"ignores pauses"`: a 5 s gap counts as nothing (reuse `createFrameProbe` semantics).
  - `"phones start at low"` is a scene concern, so it is asserted in Task 7.
- [ ] **Step 2:** Run `npx vitest run src/garage/scene/quality.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement using `createFrameProbe({ slowMs: 28, probeMs: 1000 })` per tier and `createFrameProbe()` (45 ms over 2 s) on `"low"`. Wire it in `index.ts`:
  - each `"drop"` calls `applyTier(tier)`, which toggles the effects that exist so far and the DPR;
  - `"stills"` calls the `slow` callbacks;
  - `?tier=` pins the tier and disables dropping.
- [ ] **Step 4:** Run `npx vitest run src/garage`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(garage): quality ladder sheds effects tier by tier`.

### Task 2: Film-crew camera (desktop)

**Files:**
- Modify: `src/garage/timeline.ts`, `src/garage/timeline.test.ts`
- Modify: `src/garage/scene/index.ts` (breathing, fov per shot)

**Interfaces:**
- Produces: in `GarageState.camera`, add `fov: number` and `focus: Vec3` (the world point DOF focuses on). Also add `export type Shot = { p: number; target: "car" | Vec3; azimuth: number; elevation: number; distance: number; lookOffset: Vec3; fov: number }` (degrees and metres). Landscape `cams` become `Shot[]`; portrait keys stay offset-based (commit 786906b) but also gain `fov`/`focus`.

- [ ] **Step 1: Failing tests:**
  - `"tracks alongside on the drives"`: at the drive midpoints (0.075, 0.29, 0.44, 0.59, 0.755), the camera's x is within 2.5 m of `carX`, its height is 0.6–1.4 m, and fov is ≤ 32.
  - `"orbits each bay by 30–45°, alternating direction"`: for each bay hold `[start, end]`, the azimuth change is between 30° and 45° in absolute value, and the signs alternate from bay to bay.
  - `"circles the tuned car once at the end"`: the azimuth swept from 0.93 to 1.0 is 360° ± 5°, and `tableTurn` is constant over that range.
  - `"never flips when the azimuth wraps"`: over p in steps of 0.001, the camera moves less than 0.6 m per step everywhere except at jumps.
  - `"focus is on the part being worked on"`: at each bay midpoint, `focus` equals the anchor of that bay (use `heroCar.anchors` offsets plus `carX`), within 1 cm.
  - The existing wall, ceiling and booth tests must still pass.
- [ ] **Step 2:** Run the tests. Expected: the new ones FAIL.
- [ ] **Step 3:** Implement `shotAt(p)`:
  - interpolate azimuth the shortest way round, and elevation, distance, fov and lookOffset with `ss`;
  - derive `pos` from the target plus the spherical offset, then apply `insideWalls`;
  - the end orbit uses a linear azimuth (no ease), so the speed stays constant.
- [ ] **Step 4:** In the scene, set `camera.fov` from state. Add breathing: an offset of `±0.02` m and `±0.3°` from a smooth noise of `performance.now()`, skipped when `reduced` or when the camera moved more than 5 cm since the last frame.
- [ ] **Step 5:** Run `npx vitest run src/garage` (PASS). Take shots `fr 1440 900 cam 0.075,0.2,0.36,0.52,0.67,0.81,0.95,0.99 --gpu` and check that every bay is framed on its part.
- [ ] **Step 6:** Commit `feat(garage): film-crew camera — tracking drives, bay orbits, hero orbit`.

### Task 3: Mood — pools of light, re-bake

**Files:**
- Modify: `blender/garage/build_garage.py` (pool area lights per bay, LED strips ×0.3, darker wall material), `blender/garage/bake_garage.py` (no code change expected; re-run)
- Modify: `src/garage/scene/world.ts` (one live pool `SpotLight` per bay, intensity from `s.bay`), `src/garage/scene/grounding.ts` (key light → current bay pool), `src/garage/scene/index.ts` (`EXPOSURE`), `src/garage/scene/grade.ts` (vignette 0.5)
- Regenerate: `public/garage/lm_*.webp`, `public/garage/garage.glb`

**Interfaces:**
- Consumes: `layout.bays`. Produces `GarageState.poolLight: number[]` (5 values, 0–1, active bay = 1, neighbours ≤ 0.25), added to `stateAt` with a test.

- [ ] **Step 1: Failing test** `"lights the active bay's pool, dims the others"`: at each bay midpoint, `poolLight[bay-1] === 1` and every other value is ≤ 0.25; on drives the two neighbouring pools cross-fade (their sum is between 0.9 and 1.2).
- [ ] **Step 2:** Run the test (FAIL), implement `poolLight` in `stateAt`, then run again (PASS).
- [ ] **Step 3:** Blender:
  - add `pool_<bay>` area lights of 1.6 × 5 m, 4.8 m up, 6000 K, 400 W;
  - multiply the LED strip emission by 0.3;
  - set `wall_panel` base ×0.6;
  - run `run.py build_garage.py`, then `bake_garage.py` (`--timeout 3600`), then `export_garage.py`;
  - pack the lightmaps with `--smooth`.
- [ ] **Step 4:** Live: the pool spots follow `poolLight`, and the grounding key light becomes the pool of the current bay. Retune `EXPOSURE` until the car is the brightest element. The check takes shots at the bay midpoints and measures the mean luma of the car's screen box (from `project("wheels")` and others) against the frame's 90th percentile; the car box must be ≥ the frame's 75th percentile.
- [ ] **Step 5:** Commit `feat(garage): moody pools of light per bay`.

### Task 4: Tools, props and background panels

**Files:**
- Create: `blender/garage/props.py` (tool cart, tyre rack, jack stands, compressor, cable reel), `blender/garage/tools.py` (impact wrench, spring tool, rivet gun, spray gun mounted on the existing gantry, squeegee + heat gun), named nodes `tool_wrench`, `tool_spring`, `tool_rivet`, `tool_spray`, `tool_squeegee`
- Modify: `art/comfy/prompts.json` (+ `tool_wall`, `parts_shelf`; seeds `[1,2,3]`), `blender/garage/build_garage.py` (panels using the picked images)
- Modify: `src/garage/timeline.ts` (+ `tools`), `src/garage/heroCar.ts` (tool target anchors), `src/garage/scene/world.ts` (animate tool nodes)

**Interfaces:**
- Produces: `GarageState.tools: { wrench: number; spring: number; rivet: number; squeegee: number }`. 0 means at rest on the cart, 1 means at the part. Spray is the existing `paintSweep`.

- [ ] **Step 1: Failing tests:**
  - `"each tool works only in its bay"`: each tool is 0 outside its bay's hold and reaches 1 inside it.
  - `"tools go back to the cart before the car leaves"`: each tool is 0 at its bay's drive-out start.
- [ ] **Step 2:** Run the tests (FAIL), implement with `visit()` windows inside each hold, then run again (PASS).
- [ ] **Step 3:** ComfyUI: generate `tool_wall` and `parts_shelf` (no text or brands), make a contact sheet with `pack-assets.py --sheet`, and **ask the owner to pick**, as for v1 textures.
- [ ] **Step 4:** Blender:
  - props: at most 3 per bay, baked into the lightmaps;
  - tools: separate moving nodes with rest and work transforms stored as extras (`rest`/`work` matrices);
  - panels: placed on the far walls between bays.
  Then re-bake and export.
- [ ] **Step 5:** Scene: tools lerp from the `rest` to the `work` matrix by `tools.*`, and the wrench and rivet gun spin while > 0.9. Shots at each bay midpoint.
- [ ] **Step 6:** Commit `feat(garage): working tools, props and background panels`.

### Task 5: Meshopt compression

**Files:**
- Create: `scripts/compress-glb.sh` (`npx --yes @gltf-transform/cli@4.5.1 meshopt public/garage/garage.raw.glb public/garage/garage.glb`)
- Modify: `blender/garage/export_garage.py` (writes `garage.raw.glb`, git-ignored), `src/garage/scene/index.ts` (`loader.setMeshoptDecoder(MeshoptDecoder)`), `.gitignore`
- Test: `src/garage/assets.test.ts`

- [ ] **Step 1: Failing test** `"garage.glb fits its 3 MB budget and declares meshopt"`: size ≤ 3 × 1024² and `extensionsUsed` includes `EXT_meshopt_compression` (parse the GLB JSON chunk).
- [ ] **Step 2:** Run the test (FAIL), run the export and compression, then run again (PASS). Check that the scene still loads (`mode=live` in shots).
- [ ] **Step 3:** Commit `build(garage): meshopt-compress the garage scene`.

### Task 6: Film effects

**Files:**
- Create: `src/garage/scene/post/dof.ts`, `post/flares.ts`, `post/motionBlur.ts`, and `post/post.test.ts` (pure parts)
- Modify: `src/garage/scene/world.ts` (workshop light rays under the pools), `src/garage/scene/car.ts` (blurred rim material swap), `src/garage/scene/index.ts` (pass order: render → motion blur → DOF → bloom → flares → output → grade)

**Interfaces:**
- Each effect exports `{ pass: Pass; setEnabled(on: boolean): void; update(s: GarageState, camera: THREE.PerspectiveCamera, jumped: boolean): void; dispose(): void }`. The pure helpers:
  - `export function focusDistance(camera: Vec3, focus: Vec3, fallback: Vec3, inView: boolean): number`
  - `export function apertureAt(s: GarageState): number` (open at bays, closed on drives)
  - `export function rimBlurAmount(spinSpeed: number): number`
  - `export function blurStrength(cameraDelta: number, jumped: boolean): number` (0 on a jump)

- [ ] **Step 1: Failing tests** in `post.test.ts`:
  - `focusDistance` returns the fallback distance when the focus is out of view (never ∞);
  - `apertureAt` is larger at bay midpoints than at drive midpoints;
  - `rimBlurAmount` is 0 below 6 rad/s and rises to 1 by 30 rad/s;
  - `blurStrength(…, true) === 0`.
- [ ] **Step 2:** Run the tests (FAIL), implement the helpers, then run again (PASS).
- [ ] **Step 3:** Implement the passes:
  - **DOF:** three's `BokehPass`, focus and aperture from the helpers.
  - **Flares:** a threshold, then a 1-D horizontal blur at ¼ size, then additive with a blue tint.
  - **Motion blur:** reconstruct the previous clip position from depth and the previous view-projection matrix, take 8 samples along the velocity, scaled by `blurStrength`. The render target gets a `DepthTexture`.
  - **Rays:** the showroom beam material under each pool, multiplied by `poolLight`.
  - **Rim blur:** cross-fade rim opacity to a pre-blurred disc.
- [ ] **Step 4:** Wire the effects to the tiers (Task 1). Check with forced tiers `?tier=ultra|high|medium|low`: shots at 0.2/0.5/0.99 per tier, every frame valid (mean luma > 10, no NaN), and 60 fps at Ultra measured with the fps probe.
- [ ] **Step 5:** Commit `feat(garage): depth of field, anamorphic flares, light rays, motion blur`.

### Task 7: Phone version

**Files:**
- Modify: `src/garage/scene/index.ts` (phones start at `"low"`, no DOF/motion blur/reflections/flares ever), `src/garage/scene/world.ts` (hide props more than one bay from the car on phones)
- Test: extend `quality.test.ts` with `"phones start at low and never climb"`.

- [ ] **Step 1:** Failing test, implement, PASS.
- [ ] **Step 2:** Shots `ar|fr|en 390 844 ph 0,0.08,0.2,0.36,0.52,0.67,0.81,0.99 --gpu` and `844 390` (landscape phone). Check: overhead on the drives, three-quarter at the bays, low reveal, no overflow, callouts on their parts.
- [ ] **Step 3:** Commit `feat(garage): phone version — overhead camera, lighter detail`.

### Task 8: Stills, share image, verification

**Files:**
- Modify: `blender/garage/render_stills.py` (new mood, props and tools in their work poses), re-run; re-pack the stills and `og.jpg`
- Re-run: all shots modes (live, `--nowebgl`, `--reduced`, `--lose-context`, `--block=garage.glb`) at 1440×900 and 390×844 in fr/ar/en; the fps probe per tier; `npm test`, `npx tsc --noEmit`, `npm run lint`, `NEXT_DIST_DIR=.next-build npx next build`

- [ ] **Step 1:** Re-render and pack the stills; check that the asset budgets still hold.
- [ ] **Step 2:** Full verification as listed. Expected: all green, every shot `ok`.
- [ ] **Step 3:** Commit `feat(garage): v2 stills and share image`.
- [ ] **Step 4:** Final whole-branch review with the review package and a reviewer on the most capable model; fix Critical and Important findings test-first.
