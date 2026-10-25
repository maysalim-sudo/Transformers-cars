"""Render the fallback stills of the garage hero with Cycles (sent by run.py, headless, after the bake).
Arrival (stock car at the door), Paint (mid-sweep: the front of the car amber) and Reveal (tuned car on the
turntable, rig lights on, cover gone), 16:9 (1920x1080) and 9:16 (1080x1920), plus a right-to-left arrival.
Camera poses (position, look, fov, lens shift, focus) come from the live timeline: run
`npx vite-node scripts/still-poses.ts` first, which writes art/garage-stills/poses.json.
Writes art/garage-stills/still_<name>_<aspect>.png; pack-assets.py makes the WebPs.
ARGS: samples=<n> (default 160), shots=arrival,arrival_rtl,paint,reveal, aspects=16x9,9x16"""
import json, math, os, subprocess
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

POSES = json.load(open(os.path.join(out, "poses.json"), encoding="utf8"))
FINISH = {"arrival": ("stock", "stock"), "arrival_rtl": ("stock", "stock"), "paint": ("tuned", "stock"), "reveal": ("tuned", "tuned")}
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

# the live floor is a darker epoxy than the bake's base (surfaces.ts: colour x0.2): match it
floor = bpy.data.materials.get("floor_epoxy")
if floor:
    nt = floor.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    src = bsdf.inputs["Base Color"].links[0].from_socket if bsdf.inputs["Base Color"].links else None
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    mul.inputs[7].default_value = (0.2, 0.2, 0.2, 1)
    if src:
        nt.links.new(src, mul.inputs[6])
    else:
        mul.inputs[6].default_value = bsdf.inputs["Base Color"].default_value
    nt.links.new(mul.outputs[2], bsdf.inputs["Base Color"])

gantry = bpy.data.objects.get("gantry")
gantry_rest = gantry.location.x if gantry else 0
names = ARGS.get("shots", "arrival,arrival_rtl,paint,reveal").split(",")
aspects = ARGS.get("aspects", "16x9,9x16").split(",")
for pose in POSES:
    name, aspect = pose["name"], pose["aspect"]
    if name not in names or aspect not in aspects:
        continue
    front, back = FINISH[name]
    F = {"stock": STOCK, "tuned": TUNED}
    # the paint beam's edge, nose (-1) to tail (1), as car.ts sweeps it
    split = -1.1 + 2.2 * pose["paintSweep"] if name == "paint" else 0
    finish(F[front]["paint"], F[back]["paint"], split, F["stock" if name.startswith("arrival") else "tuned"])
    x = pose["carX"]
    pivot.location = W(x, 0, 0)
    pivot.rotation_euler = (0, 0, pose["tableTurn"])
    if gantry:
        # world.ts: the gantry rides over the car with the paint beam, in the paint bay only
        gantry.location.x = x + (-1.1 + 2.2 * pose["paintSweep"]) * (length / 2) if name == "paint" else gantry_rest
    for sp in rig:
        sp.hide_render = name != "reveal"
    portrait = aspect == "9x16"
    width, height = (1080, 1920) if portrait else (1920, 1080)
    # the timeline's lens shift slides the picture right by a fraction of the width (three's view offset):
    # render wider at the same vertical field of view, then crop the window where the site would look
    extra = round(abs(pose["shift"]) * width)
    scene.render.resolution_x, scene.render.resolution_y = width + 2 * extra, height
    cam_data.angle_y = math.radians(pose["fov"])
    cam_data.shift_x = 0
    cam.location = W(*pose["pos"])
    cam.rotation_euler = (W(*pose["look"]) - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam_data.dof.use_dof = True
    cam_data.dof.focus_distance = (W(*pose["focus"]) - cam.location).length
    cam_data.dof.aperture_fstop = 4.0
    scene.render.filepath = os.path.join(out, f"still_{name}_{aspect}.png")
    bpy.ops.render.render(write_still=True, scene=scene.name)
    if extra:
        path = scene.render.filepath
        x0 = extra - round(pose["shift"] * width)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", path, "-vf", f"crop={width}:{height}:{x0}:0", path + ".crop.png"], check=True)
        os.replace(path + ".crop.png", path)
    print("wrote", scene.render.filepath)

# leave garage.blend as it was
bpy.data.objects.remove(cam, do_unlink=True)
for o in list(col.all_objects):
    bpy.data.objects.remove(o, do_unlink=True)
bpy.data.collections.remove(col)
if cover:
    cover.hide_render = False
if gantry:
    gantry.location.x = gantry_rest
