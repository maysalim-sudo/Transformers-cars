"""Bake the atelier's lighting into two lightmaps (sent by run.py, headless).
Every mesh with the custom property lightmap = workshop | showroom gets a second UV map "lightmap", packed per
zone; Cycles bakes diffuse direct + indirect lighting (no colour) into art/garage-bake/lm_<zone>.png at 2048²,
which pack-assets.py turns into public/garage/lm_<zone>.webp. The review car is hidden so moving things never
leave baked shadows. ARGS: samples=<n> (default 96), size=<px> (default 2048), zones=workshop,showroom"""
import os
import bpy

scene = bpy.data.scenes["Garage"]
bpy.context.window.scene = scene
samples = int(ARGS.get("samples", "96"))
size = int(ARGS.get("size", "2048"))
zones = ARGS.get("zones", "workshop,showroom").split(",")
out = os.path.join(ROOT, "art", "garage-bake")
os.makedirs(out, exist_ok=True)

review = bpy.data.collections.get("review")
if review:
    for o in review.all_objects:
        o.hide_render = True

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = samples
scene.cycles.use_denoising = True
scene.render.bake.margin = 4
scene.render.bake.use_pass_direct = True
scene.render.bake.use_pass_indirect = True
scene.render.bake.use_pass_color = False

for zone in zones:
    objs = [o for o in scene.objects if o.type == "MESH" and o.get("lightmap") == zone]
    # second UV map, packed for this zone only
    for o in objs:
        uvs = o.data.uv_layers
        if "lightmap" not in uvs:
            uvs.new(name="lightmap")
        uvs.active = uvs["lightmap"]
        uvs[0].active_render = True
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.lightmap_pack(PREF_CONTEXT="ALL_FACES", PREF_PACK_IN_ONE=True, PREF_NEW_UVLAYER=False, PREF_BOX_DIV=12, PREF_MARGIN_DIV=0.3)
    bpy.ops.object.mode_set(mode="OBJECT")

    img = bpy.data.images.get(f"lm_{zone}") or bpy.data.images.new(f"lm_{zone}", size, size, float_buffer=True)
    # every material on these objects bakes into this zone's image (an unconnected, active image node)
    nodes = []
    for m in {s.material for o in objs for s in o.material_slots if s.material}:
        n = m.node_tree.nodes.new("ShaderNodeTexImage")
        n.image = img
        n.select = True
        m.node_tree.nodes.active = n
        nodes.append((m, n))
    bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, use_clear=True, margin=4)
    for m, n in nodes:
        m.node_tree.nodes.remove(n)
    img.filepath_raw = os.path.join(out, f"lm_{zone}.png")
    img.file_format = "PNG"
    img.save()
    print("baked", zone, len(objs), "objects ->", img.filepath_raw)

bpy.ops.wm.save_as_mainfile(filepath=BLEND)
