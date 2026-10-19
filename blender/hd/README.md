# HD cars (MCP for Blender)

These scripts build the detailed cars in `cars Collection (2).blend`, the working copy on the Desktop in
`Blender mcp test`. They do not touch `../cars.blend`.

Every class starts from the hand-built `muscle` collection (the blue saloon) in that file. Each config warps the
saloon to its own class's proportions, taken from `src/car/models/sideGeometry.ts` at 220 units per metre (the
desert truck at 193.6, since it is drawn at 88%). It then cuts the body into registry part ids and adds the class's
own details: open beds, cladding, roof rails, a roll cage, a light bar and a spare wheel.

## Run

You need Blender with the MCP for Blender add-on connected on port 9876 and the working copy open.

```
python -I build.py suv        # sedan, coupe, hatchback, suv, pickup, doublecab, offroad, desert, trail
python -I run_shot.py car_suv_hd -55 7 eevee suv.png   # review render: target, yaw, distance, engine, file
```

- `build.py` concatenates `hd_lib.py`, `classes/<class>_cfg.py` and `hd_build.py`, then sends the result through
  `bl.py`.
- Each class lands in its own collection `<class>_hd`, with a root named `car_<class>_hd`.
- Each part sits under an empty that carries `partId`.
- `hd_build.py` always builds in the model scene `Scene`, never in `Commercial`.

## Files

- `hd_build.py`: copies the saloon, applies the warps, re-cuts the arches, splits the panels by part id, places the
  details and borrows the engine, gearbox and springs from the old `sedan`.
- `hd_lib.py`: shared warps (greenhouse sections, road and terrain wheels), plus the cladding cut, tubes, roof rails
  and box meshes.
- `classes/*_cfg.py`: one config per class. `hatchback_cfg.py` and `coupe_cfg.py` predate `hd_lib.py` and carry their
  own helpers.
- `commercial/ad_setup.py`: the SUV commercial scene (drive-in, drift, break-apart, BUY IT NOW).
- `commercial/ad_render.py`: the settings for rendering it to MP4 with background Blender:
  `blender -b --factory-startup "<blend>" -S Commercial --python ad_render.py -a`.
- The commercial uses the Poly Haven HDRI `industrial_sunset_02_puresky` (CC0), packed into the blend.
