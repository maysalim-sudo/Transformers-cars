"""Export collection "garage" of scene "Garage" to public/garage/garage.raw.glb (sent by run.py; git-ignored).
Uncompressed (this Blender build has no Draco library): scripts/compress-glb.sh meshopt-compresses it into
public/garage/garage.glb, whose 3 MB budget src/garage/assets.test.ts checks. extras on (partId-style custom properties such as lightmap = workshop | showroom), y-up,
animations on (only the cover's cover_pull clip). Bake-only lights and the review car are never exported.
"""
import os
import bpy

scene = bpy.data.scenes["Garage"]
bpy.context.window.scene = scene
out = os.path.join(ROOT, "public", "garage", "garage.raw.glb")
os.makedirs(os.path.dirname(out), exist_ok=True)
garage = bpy.data.collections["garage"]
for o in scene.objects:
    o.select_set(False)
for o in garage.all_objects:
    o.hide_set(False)
    o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=out, export_format="GLB", use_selection=True, export_apply=True, export_extras=True, export_yup=True,
    export_cameras=False, export_lights=False, export_animations=True, export_image_format="WEBP", export_image_quality=80,
)
print("exported", out, os.path.getsize(out) // 1024, "KB")
