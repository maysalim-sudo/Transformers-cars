"""Render the fallback stills of the garage hero with Cycles (sent by run.py, headless, after the bake).
Arrival (stock car at the door), Paint (mid-sweep: the front half amber) and Reveal (tuned car on the
turntable, rig lights on, cover gone), each 16:9 (1920x1080) and 9:16 (1080x1920), from the same camera keys
as src/garage/timeline.ts. Writes art/garage-stills/still_<name>_<aspect>.png; pack-assets.py makes the WebPs.
ARGS: samples=<n> (default 160), shots=arrival,paint,reveal, aspects=16x9,9x16"""
import math, os
import bpy
from mathutils import Vector

L = LAYOUT
scene = bpy.data.scenes["Garage"]
bpy.context.window.scene = scene
out = os.path.join(ROOT, "art", "garage-stills")
os.makedirs(out, exist_ok=True)
# this Blender build has no denoiser: render more samples, pack-assets.py --denoise does the rest
samples = int(ARGS.get("samples", "160"))


def W(x, y, z):
    return Vector((x, -z, y))


def colour(hexstr):
    """sRGB hex -> linear RGBA, as Blender stores colours"""
    c = [int(hexstr[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    return [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in c] + [1]


STOCK = {"paint": "#8d939c", "rim": "#c4c9cf", "caliper": "#4b5058", "glass": "#6e7d8c"}
TUNED = {"paint": "#c27a12", "rim": "#0c0d10", "caliper": "#ffad3a", "glass": "#040506"}

col = bpy.data.collections.get("stills") or bpy.data.collections.new("stills")
if col.name not in scene.collection.children:
    scene.collection.children.link(col)
for o in list(col.objects):
    bpy.data.objects.remove(o, do_unlink=True)
review = bpy.data.collections.get("review")
if review:
    for o in review.all_objects:
        o.hide_render = True

before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, "public", "models", "hd", "suv.glb"))
car = [o for o in bpy.data.objects if o not in before]
pivot = bpy.data.objects.new("still_car", None)
col.objects.link(pivot)
for o in car:
    for c in o.users_collection:
        c.objects.unlink(o)
    col.objects.link(o)
    if o.parent is None:
        o.parent = pivot
bpy.context.view_layer.update()
mins = Vector((1e9, 1e9, 1e9))
maxs = Vector((-1e9, -1e9, -1e9))
for o in car:
    if o.type == "MESH":
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            mins = Vector(map(min, mins, w))
            maxs = Vector(map(max, maxs, w))
offset = Vector(((mins.x + maxs.x) / 2, (mins.y + maxs.y) / 2, mins.z))
length = maxs.x - mins.x
# centre the car on its pivot, so turning it spins it in place like the turntable does
for o in car:
    if o.parent == pivot:
        o.location -= offset
bpy.context.view_layer.update()


def part_of(o):
    while o:
        if "partId" in o:
            return o["partId"]
        o = o.parent
    return ""


# one material per mesh and kind, so the paint can be split front/back for the paint still
paints = []
for o in car:
    if o.type != "MESH":
        continue
    pid = part_of(o)
    for slot in o.material_slots:
        m = slot.material
        if not m:
            continue
        base = m.name.split(".")[0]
        kind = "caliper" if pid.startswith("caliper") else {"paint": "paint", "glass": "glass", "rim": "rim", "machined": "rim"}.get(base)
        if not kind:
            continue
        mm = m.copy()
        slot.link = "OBJECT"
        slot.material = mm
        cx = (o.matrix_world @ (sum((Vector(c) for c in o.bound_box), Vector()) / 8)).x
        paints.append((mm, kind, cx / (length / 2)))  # -1 nose … 1 tail


def finish(paint_front, paint_back, split, rest):
    for m, kind, n in paints:
        hexstr = (paint_front if n < split else paint_back) if kind == "paint" else rest[kind]
        bsdf = m.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            bsdf.inputs["Base Color"].default_value = colour(hexstr)


# showroom rig lights for the reveal (live spotlights on the site)
rig = []
for i in range(L["rig"]["count"]):
    e = bpy.data.objects.get(f"spot_{i}")
    d = bpy.data.lights.new(f"still_spot_{i}", "SPOT")
    d.energy = 2500
    d.spot_size = math.radians(42)
    d.spot_blend = 0.5
    d.color = (1, 0.95, 0.88)
    s = bpy.data.objects.new(f"still_spot_{i}", d)
    s.location = e.matrix_world.translation if e else W(L["show"], 7, 0)
    s.rotation_euler = (W(L["show"], 0.6, 0) - s.location).to_track_quat("-Z", "Y").to_euler()
    col.objects.link(s)
    rig.append(s)

cover = bpy.data.objects.get("cover")
if cover:
    cover.hide_render = True

# [car x, camera offset, look offset, car turned 180°, rig on, finish]
SHOTS = {
    "arrival": (L["start"], (10.5, 1.8, 3.5), (-6, 2.2, -3.2), False, False, ("stock", "stock", 0)),
    "paint": (L["bays"]["paint"], (-4.2, 2.7, 5.2), (0, 0.8, 0), False, False, ("tuned", "stock", 0.0)),
    "reveal": (L["show"], (6.2, 1.5, 4.6), (-1.2, 1.2, -0.6), True, True, ("tuned", "tuned", 0)),
}
cam_data = bpy.data.cameras.new("still_cam")
cam_data.lens_unit = "FOV"
cam_data.sensor_fit = "VERTICAL"
cam = bpy.data.objects.new("still_cam", cam_data)
col.objects.link(cam)
scene.camera = cam
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = samples
scene.view_settings.view_transform = "AgX"
scene.render.image_settings.file_format = "PNG"

for name in ARGS.get("shots", "arrival,paint,reveal").split(","):
    x, off, look, turned, rig_on, (front, back, split) = SHOTS[name]
    F = {"stock": STOCK, "tuned": TUNED}
    finish(F[front]["paint"], F[back]["paint"], split, F["tuned" if name != "arrival" else "stock"])
    pivot.location = W(x, 0, 0)
    pivot.rotation_euler = (0, 0, math.pi if turned else 0)
    for s in rig:
        s.hide_render = not rig_on
    for aspect in ARGS.get("aspects", "16x9,9x16").split(","):
        portrait = aspect == "9x16"
        o = (off[0] * 1.45, off[1] * 1.15 + 0.3, off[2] * 1.45) if portrait else off
        scene.render.resolution_x, scene.render.resolution_y = (1080, 1920) if portrait else (1920, 1080)
        cam_data.angle_y = math.radians(52 if portrait else 36)
        # past the door, half a metre inside the side walls, as in timeline.ts
        wall = L["hall"]["halfWidth"] - 0.5
        cz = max(-wall, min(wall, o[2])) if x + o[0] < L["door"] else o[2]
        cam.location = W(x + o[0], o[1], cz)
        cam.rotation_euler = (W(x + look[0], look[1], look[2]) - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(out, f"still_{name}_{aspect}.png")
        bpy.ops.render.render(write_still=True, scene=scene.name)
        print("wrote", scene.render.filepath)

# leave garage.blend as it was
bpy.data.objects.remove(cam, do_unlink=True)
for o in list(col.all_objects):
    bpy.data.objects.remove(o, do_unlink=True)
bpy.data.collections.remove(col)
if cover:
    cover.hide_render = False
