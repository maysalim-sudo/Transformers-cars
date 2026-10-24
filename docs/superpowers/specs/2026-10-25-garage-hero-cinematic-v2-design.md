# Garage hero, cinematic v2: design

**Date:** 2026-10-25
**Builds on:** `docs/superpowers/specs/2026-10-24-garage-home-hero-design.md` (v1, shipped on branch `garage-hero`). Everything in v1 still holds unless this document changes it.
**Why:** the owner judged v1 "not cinematic enough". Since then v1 has gained a headline scrim, a contact shadow, a key light, surface maps, haze, showroom beams, a colour grade, floor reflections, and phone camera keys (overhead on the drives). This addendum records the owner's choices for the next step.

## 1. What the owner chose (2026-10-25)

| Topic | Choice |
|---|---|
| Desktop camera | **Film crew:** a tracking shot alongside the car on the drives, a slow orbit round the car at each bay, and a slight handheld "breathing" when the scroll rests |
| Lighting mood | **Darker, moodier:** the same atelier, but a pool of light over each bay and darker surroundings, with higher contrast. The car is always the brightest thing on screen |
| Film effects (desktop) | **All four:** depth of field, lens flares, light rays in the workshop air, motion blur |
| Life in the garage | **Working tools** and **details and props**, kept sparse and tasteful, never cluttered |
| Ending | **Hero orbit:** after the cover comes off, the camera circles the tuned car once while the spec card and the CTA show |
| How tools and props are made | **Mix:** tools that move, and props near the car, are modelled in Blender; the far background shelves and tool walls are ComfyUI images on panels |
| Weaker desktops | **Shed effects in order:** heaviest effects go first, the camera moves and mood stay, stills only as a last resort |
| Phones | **Overhead on the drives, dipping to three-quarter at each bay, low for the reveal** (keys done, commit 786906b). Same script, less detail |
| Order | One plan for both; **desktop first**, phone after the owner has seen desktop |

## 2. Camera

- The timeline describes each shot as an **orbit around a target** on the car: azimuth, elevation, distance, look target. Positions are then derived from those values. Interpolating the angles, rather than blending positions, makes moves curve round the car instead of cutting through it.
- **Drives:** the camera tracks alongside at the car's speed, slightly behind, at wheel-arch height, with a long lens (fov 28–32).
- **Bays:** a slow orbit tied to the scroll inside the bay, sweeping 30–45° while the work happens. The direction alternates bay to bay so it does not feel mechanical.
- **Reveal:** one full 360° orbit from the cover pull to the end of the track, while the turntable holds still. The orbit is the motion.
- **Handheld breathing:** a tiny time-based drift (±2 cm, ±0.3°) at roughly 0.2 Hz. It is applied in the scene, not the timeline, so the timeline stays pure. It is off under reduced motion and when the camera is moving fast.
- Unchanged from v1: purity, scrolling back up gives the same frames, jumps snap, and the camera stays inside the walls.

## 3. Mood

- **Re-light in Blender:**
  - Each bay gets a strong overhead pool (a rectangular area light over the car's footprint).
  - Hall LED strips drop to about 30%.
  - Walls fall off into darkness.
  - Then re-bake both lightmaps.
- **Live:**
  - Each bay has a pool key light whose intensity follows the bay that is active.
  - The workshop key light from the cinematic pass becomes the pool light of the current bay.
- **Exposure and grade:** retuned for the darker room. The car must be the brightest element in every bay (checked by measuring screenshots).

## 4. Life in the garage

- **Tools (modelled, animated by scroll):**
  - wheels: impact wrench at the hub
  - stance: coilover spring tool at the strut
  - kit: rivet or drill gun at the skirt
  - paint: spray gun on the gantry (gantry exists)
  - tint: squeegee and heat gun at the glass
- **Tool motion:**
  - Each tool rests on a cart and moves to its part while its bay works.
  - The motion is pure timeline state (`tools[]`), so it is tested.
- **Props (modelled, static, baked):** at most three near each bay:
  - tool cart
  - tyre rack
  - jack stands
  - a compressor
  - a cable reel
- **Far background:** two or three ComfyUI images (a tool wall and a parts shelf) on panels in the dark between bays. They have no text and no brands.

## 5. Film effects and the quality ladder

| Tier | Gets | Drops |
|---|---|---|
| Ultra (start, desktop) | everything | — |
| High | reflections, DOF, flares, rays, shadows | motion blur |
| Medium | flares, rays, shadows | DOF, reflections |
| Low | grade, contact shadow | flares, rays, real-time shadows; DPR ≤ 1.25 |
| Stills | the v1 still pictures | the 3D scene |

- **How tiers drop:** a 1-second frame check at 28 ms per frame drops one tier at a time. After two seconds on Low, the existing 45 ms check decides on stills. (This generalises the reflections-first check from the floor-reflections commit.)
- **Phones:** start at Low with the overhead camera. Phones never get DOF, motion blur, reflections or flares.
- **Depth of field:** the focus follows the timeline's `focus` point, which is the part being worked on. Aperture opens at the bays and closes on the drives.
- **Lens flares:** an anamorphic streak pass. Bright pixels get a horizontal blur, then are added back, tinted slightly blue.
- **Light rays:** the beam material from the showroom, placed under the bay pool lights, fading with the active bay.
- **Motion blur:** camera-velocity blur from the depth buffer and the previous frame's view matrix. Wheels switch to a blurred rim material above a spin speed.

## 6. Assets

- **Compression:** `garage.glb` (2.92 MB, budget 3 MB) gains props and tools. It is compressed after export with gltf-transform meshopt and loaded with three's `MeshoptDecoder`. Budget: 3 MB for `garage.glb` after compression.
- **Re-renders:** stills and the share image are re-rendered with the new mood.

## 7. Phone version

- **Same everything as desktop**, except:
  - the overhead camera keys
  - quality starts at Low
  - props further than one bay from the car are hidden
- **Checked on screen** at 390×844 in ar/fr/en.

## 8. Success

- **Speed:** desktop at Ultra holds 60 fps on the owner's RTX 3050 at 1440×900.
- **Tiers:** forcing each tier (debug query `?tier=`) shows the right effects and leaves no broken frame.
- **The car is the brightest thing** at every bay midpoint, measured in screenshots.
- **The v1 rules still hold:** all tests, no horizontal overflow, the stills fallback, the sound, and the RTL layout.
