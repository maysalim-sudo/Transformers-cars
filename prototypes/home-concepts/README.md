# Home page concepts (throwaway prototypes)

Standalone scroll prototypes used to pick the direction for the new home page. They are not part of the Next.js
build: each folder is a plain HTML page with Three.js from a CDN and its own copy of the car model and logo.

| Folder | Concept | Status |
| --- | --- | --- |
| `garage-a/` | **A · Garage drive-in.** A stock SUV drives into the workshop and is upgraded bay by bay (wheels on a lift, stance, body kit with sparks, paint booth, tint), then rolls onto a showroom turntable for the CTA. | **Base** for the new home page (2026-10-24) |
| `showroom-b/` | **B · Showroom turntable.** A covered car on a mirror-floor turntable: the cover lifts, the light rig comes on, and a scan beam sweeps each upgrade on panel by panel, with spec callouts pinned to the car. | Reference: its cover reveal, scan-beam panel wipe and pinned callouts are folded into A |

Run one (any static server works; the GLB will not load from `file://`):

```bash
python3 -m http.server 4173 -d prototypes/home-concepts/garage-a
```

In the browser console, `__setP(0.5)` jumps to a point on the scroll timeline (0–1).

The garage is blockout geometry. The final art is planned to come from a Blender garage scene and ComfyUI (Z-Image)
textures and backdrops.
