"""Export collection "garage" of scene "Garage" to public/garage/garage.glb (sent by run.py).
Uncompressed (this Blender build has no Draco library; the file stays inside its 3 MB budget), extras on (partId-style custom properties such as lightmap = workshop | showroom), y-up,
animations on (only the cover's cover_pull clip). Bake-only lights and the review car are never exported.
"""
import os
import bpy

scene = bpy.data.scenes["Garage"]
bpy.context.window.scene = scene
out = os.path.join(ROOT, "public", "garage", "garage.glb")
os.makedirs(os.path.dirname(out), exist_ok=True)
garage = bpy.data.collections["garage"]
for o in scene.objects:
    o.select_set(False)
for o in garage.all_objects:
    o.hide_set(False)
    o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=out, export_format="GLB", use_selection=True, export_apply=True, export_extras=True, export_yup=True,
    export_cameras=False, export_lights=False, export_animations=True,
)
size = os.path.getsize(out)
assert size <= 3_000_000, f"garage.glb is {size} bytes, over the 3 MB budget"
print("exported", out, os.path.getsize(out) // 1024, "KB")
