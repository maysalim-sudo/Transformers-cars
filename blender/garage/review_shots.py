"""Review renders of the atelier with the hero SUV, from the site's own camera positions (sent by run.py).
ARGS: out=<dir> (default art/garage-review), engine=eevee|cycles, samples=<n>, shots=arrival,wheels,paint,showroom
Writes <out>/<shot>.png at 1280x720. The car lives in collection "review", which is never exported."""
import math, os
import bpy
from mathutils import Vector

L = LAYOUT
out = ARGS.get("out", os.path.join(ROOT, "art", "garage-review"))
os.makedirs(out, exist_ok=True)
scene = bpy.data.scenes["Garage"]

col = bpy.data.collections.get("review") or bpy.data.collections.new("review")
if col.name not in scene.collection.children:
    scene.collection.children.link(col)
for o in list(col.objects):
    bpy.data.objects.remove(o, do_unlink=True)


def W(x, y, z):
    return Vector((x, -z, y))


# the hero car, as the site loads it
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, "public", "models", "hd", "suv.glb"))
car = [o for o in bpy.data.objects if o not in before]
for o in car:
    for c in o.users_collection:
        c.objects.unlink(o)
    col.objects.link(o)
# one pivot for every top-level object the importer made
root = bpy.data.objects.new("review_car", None)
col.objects.link(root)
for o in car:
    if o.parent is None:
        o.parent = root

# [car x, camera offset from the car, look offset] in web coordinates, from src/garage/timeline.ts keys
SHOTS = {
    "arrival": (L["start"], (10.5, 1.8, 3.5), (-6, 2.2, -3.2)),
    "wheels": (L["bays"]["wheels"], (-5.6, 2.3, 4.6), (0, 1.1, 0)),
    "paint": (L["bays"]["paint"], (-4.2, 2.7, 5.2), (0, 0.8, 0)),
    "showroom": (L["show"], (6.2, 1.5, 4.6), (-1.2, 1.2, -0.6)),
}
cam_data = bpy.data.cameras.get("review_cam") or bpy.data.cameras.new("review_cam")
cam_data.lens_unit = "FOV"
cam_data.angle_y = math.radians(36)
cam_data.sensor_fit = "VERTICAL"
cam = bpy.data.objects.get("review_cam") or bpy.data.objects.new("review_cam", cam_data)
if cam.name not in col.objects:
    col.objects.link(cam)
scene.camera = cam

engine = ARGS.get("engine", "eevee")
scene.render.engine = "CYCLES" if engine == "cycles" else "BLENDER_EEVEE"
if engine == "cycles":
    scene.cycles.samples = int(ARGS.get("samples", "64"))
    scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = 1280, 720
scene.view_settings.view_transform = "AgX"
for name in ARGS.get("shots", ",".join(SHOTS)).split(","):
    x, off, look = SHOTS[name]
    root.location = W(x, 0, 0)
    root.rotation_euler = (0, 0, math.pi if name == "showroom" else 0)
    cam.location = W(x + off[0], off[1], off[2])
    d = W(x + look[0], look[1], look[2]) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = os.path.join(out, f"{name}.png")
    bpy.ops.render.render(write_still=True, scene=scene.name)
    print("wrote", scene.render.filepath)
