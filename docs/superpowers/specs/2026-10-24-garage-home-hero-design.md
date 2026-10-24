# Garage Home Hero — Design Spec

**Date:** 2026-10-24
**Status:** Approved in brainstorming, awaiting written-spec review
**Scope:** Replace the SVG `HeroSequence` on `/[locale]` with a scroll-driven, real-time 3D garage in which a stock car is upgraded bay by bay and revealed in the showroom, with an opt-in sound layer (music + effects). Includes the Blender and ComfyUI asset pipeline that produces the garage art and audio.

**Prototypes:** `prototypes/home-concepts/garage-a/` (base) and `prototypes/home-concepts/showroom-b/` (reference). Run either with `python3 -m http.server <port> -d <folder>`; `__setP(0..1)` in the console jumps along the timeline.

---

## 1. Goal

Transformer Tuning Cars is a garage and a showroom at once. The home page should show that in one continuous scroll: a stock car arrives, goes through the workshop and comes out transformed onto the showroom floor, ending at the WhatsApp / "Start your build" call to action.

**Success criteria**

- On a desktop browser the visitor can scroll from the arrival to the delivery reveal at 60 fps, and on a mid-range Android phone at 30 fps or more.
- The headline and Arrival still paint within 2.5 s on 4G (LCP is the still, not the 3D).
- Every piece of copy (headline, bay cards, job card, callouts, spec sheet, CTA) exists in fr, ar and en, is server-rendered HTML, and is read by screen readers and search engines.
- Without WebGL, with reduced motion, or on a device that fails the frame-time probe, the visitor gets the same story and CTA in still mode, never a blank or broken hero.
- Scrolling back up undoes every upgrade exactly; deep links to `#services` / `#contact` work.
- No horizontal overflow at 390 px or 1440 px at any scroll position.
- No sound ever plays until the visitor turns it on; once on, effects land on the moments they belong to and stay silent when scrolling back up.

## 2. Decisions taken

| Question | Decision |
|---|---|
| Concept | **A · Garage drive-in** as the base, plus three ideas from **B · Showroom turntable**: the satin-cover reveal, the scan-beam panel-by-panel wipe, and spec callouts pinned to the car |
| Art direction | **Premium atelier**: bright grey epoxy floor, black walls, white LED strip lines, amber only as an accent (calipers, bay numerals, turntable ring, scan beam, CTA). Night street in Sousse outside the door |
| Car | **One hero car for everyone: the SUV** (`public/models/hd/suv.glb`), with the model id and every car-specific value in one config file so it can be swapped later |
| Production approach | **Real-time hybrid** (approach 1 of 3): Three.js scene, atelier modelled in Blender with baked lightmaps, ComfyUI (Z-Image Turbo) textures and backdrops, Blender-rendered fallback stills. Rejected: Cycles image sequence (25–60 MB, fixed crop, re-render on every tweak) and scrubbed video (iOS scrub jank, same rigidity) |
| Old hero | `HeroSequence.tsx` and `components/sparks/` are deleted once the new hero ships. `PartRender` and the SVG art stay (services cards, `ColourStudio`, `/diagnose`) |
| Sound | **Opt-in sound layer**: muted by default (browsers block autoplay), a sound toggle in the nav, remembered per visitor. Music from **ACE-Step 1.5** (local, ComfyUI), effects from **Stable Audio Open** (local, ComfyUI) with a CC0 library as fallback for any effect that does not come out convincing. Whisper is not used: it transcribes speech, it does not generate audio |
| Dependencies | None new. `three` is already installed. Native scroll smoothed in the render loop (no Lenis/GSAP) |

## 3. The scroll story

The hero is a scroll track about 11 screens tall with a sticky full-viewport canvas. Progress `p` runs 0 → 1 over the track. Ranges below are the targets; exact keyframes live in `layout.json` / `timeline.ts`.

| # | Bay | `p` range | What happens | Callout (pinned to) |
|---|---|---|---|---|
| 00 | Arrival | 0 – 0.08 | Night Sousse street (ComfyUI plate). Atelier facade lit white inside, brand sign with the real logo. Headline at the bottom-start. Roller door rises; the stock silver SUV drives in | — |
| 01 | Wheels & brakes | 0.08 – 0.27 | Car rises on the two-post lift; wheels slide off along their axles, come back gloss black; calipers turn amber; lift lowers | "Forged · gloss black" (front wheel) |
| 02 | Stance | 0.27 – 0.42 | Low camera at the front arch; body (everything except wheels, brakes, calipers, springs) drops 45 mm | "−45 mm coilovers" (arch gap) |
| 03 | Body kit | 0.42 – 0.57 | Front bumper, rear bumper and diffuser come off and go back on; side-skirt lips appear; welding sparks while they re-seat | "Skirts · diffuser" (rear lower) |
| 04 | Paint booth | 0.57 – 0.74 | Booth light panels flare; paint mist; the spray gantry (scan beam) sweeps nose → tail and each painted part turns amber as the beam passes its centre | "Showroom amber" (roof) |
| 05 | Tint | 0.74 – 0.84 | A slimmer beam passes along the glass; each window darkens as it passes | "Dark tint" (side glass) |
| 06 | Delivery reveal | 0.84 – 1.0 | Short dark transition into the showroom. The finished car waits on the turntable under a satin cover. Cover pulls off (baked cloth clip), spotlights switch on one by one, turntable turns the car to face the camera, headlights double-flash. Spec sheet + "Start your build" + WhatsApp | — |

Persistent overlay: **job card** (top-end) ticking off Wheels, Stance, Body kit, Paint, Tint, Showroom; on phones it collapses to a thin progress row. A thin amber progress bar along the bottom edge.

Sound cues for each bay are listed in §7.

Wheels roll in proportion to distance driven. The camera follows the car with per-bay framings (offset + look target relative to the car) and has a **portrait variant** of every framing for tall viewports.

## 4. Architecture

New folder `src/garage/`, one job per unit:

| Unit | Responsibility | Depends on |
|---|---|---|
| `garage/layout.json` | Shared world layout: door x, bay x positions, booth and showroom extents, turntable centre/radius. Read by the Blender scripts and by `timeline.ts` | — |
| `garage/timeline.ts` | **Pure, unit-tested.** `stateAt(p, { portrait })` → `GarageState`: `carX`, `wheelSpin`, `lift`, `wheelsOff`, `wheelFinish`, `drop`, `kitOff`, `lipsVisible`, `paintBeam` (x or null), `tintBeam` (x or null), `boothLight`, `coverPull`, `showLights`, `tableTurn`, `headlights`, `camera { pos, look }`, `bay` (0–6), `done[]`. No three.js import | `layout.json` |
| `garage/heroCar.ts` | The swap point: `model: "suv"`, stock and tuned finishes (paint, rim, caliper, glass colours), kit part ids, callout anchors as `{ partId, offset }` | `car/registry` |
| `garage/scene/world.ts` | Loads `public/garage/garage.glb` (Draco), applies the baked lightmaps (`lightMap`, uv1) by material name, finds the named moving nodes (`door`, `lift_arms`, `gantry`, `turntable`, `cover`), adds the live lights (booth, showroom spots, beam) | three |
| `garage/scene/car.ts` | Loads the hero car and rigs it: wheel pivots at wheel centres, the list of dropping body nodes, kit nodes with rest positions, and per-part clones of paint / glass / rim / caliper materials with each part's centre x recorded so a beam can switch it. Reuses the partId traversal pattern from `car/three/hdCar.ts` | three, `heroCar` |
| `garage/scene/effects.ts` | Sparks, paint mist, scan beam mesh, cover clip scrubbing | three |
| `garage/scene/index.ts` | `createGarage(canvas, opts) → { ready: Promise<void>, apply(state), project(anchorId) → {x, y, visible}, resize(), dispose() }`. All imperative three.js lives behind this | above |
| `garage/sound/cues.ts` | **Pure, unit-tested.** The cue sheet: one-shot cues at a `p` (`{ id, at, file, gain }`) and loops driven by state (`{ id, file, gainFrom(state), rateFrom(state) }`). `cuesCrossed(prevP, p)` returns the one-shots crossed going **forward** only, so scrubbing back up is silent and a jump (deep link, first frame) fires nothing | `timeline` types |
| `garage/sound/engine.ts` | Web Audio engine: lazy-loads and decodes files on first enable, one `GainNode` per loop, master gain with a 300 ms fade on toggle, `resume()` inside the toggle's click handler. Suspends when the hero is off screen or the tab is hidden | Web Audio |
| `components/GarageHero.tsx` | Client component: scroll track, sticky stage, still/canvas layers, HTML overlays (headline, bay cards, job card, callouts, spec sheet, CTA). Per frame: read scroll → `stateAt` → `apply` → position callouts from `project` → if sound is on, fire `cuesCrossed` and update loop gains. Loop runs only while the track is on screen and the tab is visible | timeline, scene (dynamic import, `ssr: false`), i18n |

**Integration**

- `src/app/[locale]/page.tsx`: `<HeroSequence>` → `<GarageHero locale t />`.
- **i18n:** new `garage` block in `src/i18n/strings/{en,fr,ar}.ts` (headline, eyebrow, lead, scroll hint, 6 bay cards, job-card labels, 5 callouts, spec-sheet rows, CTA labels). The `Strings` type enforces parity; Arabic flagged for native review as elsewhere. No text in 3D textures except the brand sign (real logo PNG).
- **RTL:** overlays move to the start side; the 3D world stays physical (same drive direction, beam always nose → tail), as the current hero does.
- **Sound toggle:** a speaker button rendered by `GarageHero` (so it exists on the home page only; `Nav` lives in the shared layout), fixed at the top-end beside the nav, above it in z-order, `aria-pressed`, label in all three locales, state in `localStorage` (`tt-sound`, read in a try/catch; default off).
- **Assets:** `public/garage/` (`garage.glb`, lightmap and texture WebPs, stills, `audio/`), `public/draco/` (three.js Draco decoder copied from `three/examples/jsm/libs/draco/gltf/`).
- **Old code removed** at the end. As of 2026-10-24 these are used only by the old hero: `components/HeroSequence.tsx`, `components/sparks/`, `car/CarStage.tsx`, `car/useExplode.ts`, `car/timeline.ts` + `timeline.test.ts`, the hero-only CSS in `globals.css` (`.car-stock`, `.car-tuned`, `.car-beam`, `.car-reflection`, `.car-idle`, LED/headlight keyframes), and the `sequence` strings. Re-check with a grep before deleting.

## 5. Asset pipeline

### 5.1 Blender (`blender/garage/`, sent through `blender/hd/bl.py` to the MCP on port 9876)

| Script | Output |
|---|---|
| `build_garage.py` | Builds the atelier in a `garage` collection (scene `Garage`, never touching `Scene` or `Commercial`) from `layout.json`: epoxy floor, black wall panels, LED strip lines, glass-and-black facade with door opening, roller door, two-post lift, glass paint booth with light panels and gantry, showroom with turntable, curved backdrop and spotlight truss, brand sign with `public/brand/logo-on-dark.png`. Moving parts are separate objects named `door`, `lift_arms`, `gantry`, `turntable`, `cover` |
| `cloth_cover.py` | Cloth-simulates the satin cover being pulled off the SUV on the turntable and bakes it to a shape-key / vertex animation clip named `cover_pull` |
| `bake_garage.py` | Adds a second UV (lightmap pack) to static meshes; Cycles-bakes diffuse lighting + AO into two 2048 px lightmaps (`workshop`, `showroom`); saves as WebP via Pillow |
| `export_garage.py` | Exports the `garage` collection to `public/garage/garage.glb` with Draco compression, extras on, y-up (same conventions as `hd/export_glb.py`) |
| `render_stills.py` | Cycles stills of the real scene: Arrival, Paint booth, Delivery reveal, each 16:9 (1920×1080) and 9:16 (1080×1920), with the SUV in the matching finish. The Delivery reveal 16:9 doubles as the Open Graph image |

### 5.2 ComfyUI (Z-Image Turbo at `127.0.0.1:8188`)

- `art/comfy/workflows/*.json`: the API-format workflows.
- `art/comfy/prompts.json`: one entry per asset with prompt, negative prompt, seed, size.
- `scripts/comfy-generate.mjs`: queues each entry, saves results to `art/comfy/out/` (git-ignored).
- Assets: (1) Sousse night street plate seen through the door (wide, upscaled with RealESRGAN); (2) tileable epoxy floor speckle and black acoustic wall panel albedos (roughness derived in Blender); (3) abstract automotive light-painting wall art for the showroom (no text, no real brands, no Hasbro names).
- `scripts/pack-assets.py` (Pillow): converts the picked outputs and Blender renders to sized WebP in `public/garage/`.

### 5.3 Audio (ComfyUI)

- **Music:** ACE-Step 1.5 turbo (`acestep_v1.5_turbo`, already installed), instrumental only. One loopable bed of about 60 s (minimal cinematic electronic, about 100 BPM, warm sub, clean percussion: premium, not aggressive) and one 6–8 s reveal sting in the same key for the Delivery reveal. Workflow `art/comfy/workflows/music_ace15.json`, prompts in `art/comfy/audio.json`.
- **Effects:** Stable Audio Open 1.0 via the built-in `ConditioningStableAudio` nodes (**model not installed yet**: download the checkpoint and T5 encoder into ComfyUI). Workflow `art/comfy/workflows/sfx_stable_audio.json`. Any effect that does not sound real after a few seeds is replaced from a CC0 library (e.g. Freesound CC0), with its source URL recorded in `art/comfy/audio.json`.
- `scripts/comfy-generate.mjs` handles both kinds; `scripts/pack-audio.py` trims, normalises to −16 LUFS and encodes to MP3 128 kbps (music) / 96 kbps mono (effects) in `public/garage/audio/` using ffmpeg.
- **Licences to verify before shipping:** ACE-Step 1.5 and Stable Audio Open (the latter's community licence has a revenue threshold) for commercial use.

### 5.4 Budget (loaded after first paint)

| Asset | Budget |
|---|---|
| `garage.glb` | ≤ 3 MB |
| Lightmaps + textures | ≤ 2.5 MB |
| SUV | 1.3 MB (existing) |
| Draco decoder | ≈ 0.3 MB |
| **Total** | **≈ 7 MB** |
| Audio (only after the visitor turns sound on) | ≤ 2 MB |

### 5.5 Preconditions

- Blender MCP connected on port 9876 (confirmed 2026-10-24; the garage is built in its own `Garage` scene).
- ComfyUI running at `127.0.0.1:8188` with Z-Image Turbo, RealESRGAN and ACE-Step 1.5 (confirmed 2026-10-24), plus Stable Audio Open once downloaded.
- ffmpeg available for `pack-audio.py`.
- **Verify the Z-Image Turbo model licence permits commercial use** before any generated asset ships. If it does not, the same prompts go to a model whose licence does.

## 6. Render modes and fallbacks

| Mode | When | What the visitor sees |
|---|---|---|
| **Live** | WebGL available, no reduced motion, frame-time probe passes | Canvas with the full story |
| **Still** | No WebGL, WebGL context lost, `prefers-reduced-motion: reduce`, or mean frame time > 45 ms over the first 2 s of rendering after `ready` (the switch is one-way for the visit) | Same track, copy, job card and CTA; background crossfades Arrival → Paint booth → Delivery reveal stills across the bay ranges; no canvas, no motion |
| **Loading** | Before the scene's `ready` resolves | Still mode, with the canvas fading in over the still when ready |

Stills use `<picture>` with the 9:16 version for portrait viewports.

## 7. Sound

Off by default (toggle at the top-end beside the nav, §4). When the visitor turns it on, the music bed fades in and the effects follow the scroll. Turning it off fades everything out in 300 ms. Still mode keeps sound available (music and the one-shot cues; the drive loop stays silent because nothing moves).

| Bay | One-shots (fire going forward only) | Loops (gain follows state) |
|---|---|---|
| 00 Arrival | roller-door rattle; engine start | street ambience (fades as the car enters); engine idle → drive, gain and playback rate follow car speed |
| 01 Wheels | lift hydraulic whine (up and down); impact-wrench bursts as wheels come off and go on | workshop room tone |
| 02 Stance | air-ride / coilover settle thump | — |
| 03 Body kit | panel clunks; short welding crackles synced to the sparks | — |
| 04 Paint | booth fan spin-up | spray-gun hiss, gain follows the beam |
| 05 Tint | film squeegee swipes, one per window | — |
| 06 Reveal | low whoosh into the dark transition; silk cover swoosh; spotlight clunks one per light; engine rev at the headlight flash; reveal sting | music bed ducks under the sting, then returns |

Mix rules: effects sit 6–9 dB under the music peaks; at most 4 one-shots play at once (oldest stopped); nothing louder than −1 dBTP after packing.

## 8. Performance and accessibility

- Desktop: device-pixel ratio ≤ 1.75, bloom full resolution. Phones (width < 768): DPR ≤ 1.5, no real-time shadows, bloom at half resolution, portrait framings.
- Render loop stops when the track is off screen or `document.hidden`; `dispose()` on unmount frees geometry, materials, textures and the renderer.
- No sound plays unless the visitor turns it on; the toggle is a real `<button>` with `aria-pressed` and a text label; audio never carries information that is not also on screen.
- Canvas and callouts are `aria-hidden`; all information is in the server-rendered copy. CTAs are real links and keep `data-event="whatsapp_click"`. The `<h1>` is the hero headline.

## 9. Testing

**Vitest**

- `garage/timeline.test.ts`: car is at the door for `p ≤ 0.04` and on the turntable for `p ≥ 0.9`; each upgrade is 0 before its bay and 1 after it; `stateAt` is a pure function of `p`, so scrolling back up gives identical states; beams are `null` outside their bays and move strictly nose → tail inside them; `bay` ranges match §3; portrait framings differ from landscape only in camera.
- `garage/sound/cues.test.ts`: `cuesCrossed(a, b)` returns each one-shot whose `at` lies in `(a, b]` when `b > a`, nothing when `b ≤ a`, and nothing on the first frame; every cue's `at` falls inside its bay's range; every cue file exists in `public/garage/audio/`.
- `garage/heroCar.test.ts`: every callout anchor and kit part id exists in `car/registry`.
- `garage/scene/car.test.ts`: on a stub scene built in the style of `car/three/hdCar.test.ts`, a beam at x switches exactly the parts whose centre is behind x.

**Playwright (`npm run shots`, extended)**

- `/fr`, `/ar`, `/en` at each bay midpoint, at 390×844 and 1440×900, in live mode, still mode (Chrome with `--disable-webgl`) and reduced motion.
- Every capture asserts no console errors and `scrollWidth ≤ innerWidth`.

**Before shipping:** `npm test`, `npx tsc --noEmit`, `npm run lint`, `NEXT_DIST_DIR=.next-build npx next build`, and a manual pass on a real phone.

## 10. Out of scope (v1)

- Visitor-chosen car class at the door.
- Voice-over or vocals.
- Smooth-scroll or animation libraries.
- Carrying colour-studio choices onto the hero car.
- Real stock / CRM data in the hero.
