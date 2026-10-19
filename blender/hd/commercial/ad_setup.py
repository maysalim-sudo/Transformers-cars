"""SUV commercial: drives in, drifts through a 90-degree corner, stops, comes apart part by part, and
'BUY IT NOW' rises out of the middle. Built in its own scene 'Commercial' from copies of suv_hd objects
(meshes shared), so the model scene is untouched."""
import bpy, bmesh, math, random
from mathutils import Matrix, Vector, Euler

bpy.ops.wm.save_mainfile()
END, FPS = 216, 24
ACCENT = (0.827, 0.549, 0.133)  # --accent #d38c22, linear-ised below
def lin(c):
    return tuple(((x + 0.055) / 1.055) ** 2.4 for x in c)

# ---------------- scene ----------------
sc = bpy.data.scenes.get("Commercial")
if sc:
    for o in list(sc.collection.all_objects):
        d = o.data
        bpy.data.objects.remove(o)
        if d and d.users == 0 and isinstance(d, (bpy.types.Curve, bpy.types.Camera, bpy.types.Light)):
            pass
    for c in list(sc.collection.children_recursive):
        bpy.data.collections.remove(c)
else:
    sc = bpy.data.scenes.new("Commercial")
bpy.context.window.scene = sc
sc.frame_start, sc.frame_end, sc.render.fps = 1, END, FPS
car_col = bpy.data.collections.new("ad_car")
set_col = bpy.data.collections.new("ad_set")
sc.collection.children.link(car_col)
sc.collection.children.link(set_col)

# ---------------- copy the SUV hierarchy ----------------
src_root = bpy.data.objects["car_suv_hd"]
copies = {}
for o in [src_root] + list(src_root.children_recursive):
    c = o.copy()
    car_col.objects.link(c)
    copies[o] = c
for o, c in copies.items():
    if o.parent in copies:
        c.parent = copies[o.parent]
        c.matrix_parent_inverse = o.matrix_parent_inverse.copy()
root = copies[src_root]
root.name = "ad_suv"
root.animation_data_clear()
parts = [c for c in root.children if c.get("partId")]

# wheels spin about their own centres: a pivot under each wheel part, the wheel and its disc beneath it
AX = {"front": -1.282, "rear": 1.386}
WY, WR = 0.865 * 0.93, 0.36
pivots = {}
for axle, x in AX.items():
    for side, s in (("left", -1), ("right", 1)):
        wheel = next(p for p in parts if p["partId"] == f"wheel_{axle}_{side}")
        disc = next(p for p in parts if p["partId"] == f"brake_disc_{axle}" and p.get("side") == side)
        cen = Vector((x, s * WY, WR))
        pv = bpy.data.objects.new(f"spin_{axle}_{side}", None)
        car_col.objects.link(pv)
        pv.parent = wheel
        pv.location = cen
        pv.empty_display_size = 0.1
        for ch in [c for c in list(wheel.children) + list(disc.children) if c is not pv]:
            mb = ch.matrix_basis.copy()
            ch.parent = pv
            ch.matrix_parent_inverse = Matrix.Identity(4)
            ch.matrix_basis = Matrix.Translation(-cen) @ mb
        pivots[(axle, side)] = pv

# ---------------- drive, drift, stop ----------------
def smooth(a, b, f):
    t = min(max((f - a) / (b - a), 0), 1)
    return t * t * (3 - 2 * t)

def speed(f):
    if f <= 50:
        return 0.30
    if f <= 100:
        return 0.30 - 0.16 * (f - 50) / 50
    return 0.14 * (1 - smooth(100, 118, f))

def heading(f):
    return math.pi / 2 * smooth(50, 100, f)

def slip(f):
    return 0.8 * (smooth(50, 70, f) - smooth(90, 114, f))

pos, dist, spin_extra = Vector((0, 0, 0)), 0.0, 0.0
track = []
for f in range(1, END + 1):
    h = heading(f)
    track.append((f, pos.copy(), h, slip(f), dist, spin_extra))
    v = speed(f)
    pos += Vector((-math.cos(h), -math.sin(h), 0)) * v
    dist += v
    spin_extra += 0.35 * slip(f)  # the rear tyres spin up while the tail is out
stop = track[-1][1].copy()
for f, p, h, sl, d, ex in track:
    p -= stop  # the car comes to rest on the origin
    yaw = h + sl
    roll = -0.06 * sl / 0.8
    pitch = -0.035 * math.sin(math.pi * smooth(104, 128, f)) if f > 104 else 0.0
    root.location = p
    root.rotation_euler = Euler((roll, pitch, yaw))
    root.keyframe_insert("location", frame=f)
    root.keyframe_insert("rotation_euler", frame=f)
    for (axle, side), pv in pivots.items():
        pv.rotation_euler = (0, -(d + (ex if axle == "rear" else 0)) / WR, 0)
        pv.keyframe_insert("rotation_euler", frame=f)
for fc in root.animation_data.action.fcurves if hasattr(root.animation_data.action, "fcurves") else []:
    for k in fc.keyframe_points:
        k.interpolation = "LINEAR"

def car_matrix(f):
    _, p, h, sl, _, _ = track[f - 1]
    return Matrix.Translation(p) @ Euler((0, 0, h + sl)).to_matrix().to_4x4()

# ---------------- skid marks: ribbons under the rear tyres, revealed as the drift happens ----------------
skid = bpy.data.materials.new("ad_skid")
skid.use_nodes = True
b = skid.node_tree.nodes["Principled BSDF"]
b.inputs["Base Color"].default_value = (0.005, 0.005, 0.005, 1)
b.inputs["Roughness"].default_value = 0.9
b.inputs["Alpha"].default_value = 0.75
for side, s in (("left", -1), ("right", 1)):
    bm = bmesh.new()
    prev = None
    for f in range(54, 113):
        M = car_matrix(f)
        c = M @ Vector((AX["rear"], s * WY, 0.004))
        a = (M.to_3x3() @ Vector((0, 1, 0))).normalized() * 0.11
        pair = (bm.verts.new(c - a), bm.verts.new(c + a))
        if prev:
            bm.faces.new((prev[0], prev[1], pair[1], pair[0]))
        prev = pair
    me = bpy.data.meshes.new(f"skid_{side}")
    bm.to_mesh(me)
    bm.free()
    me.materials.append(skid)
    o = bpy.data.objects.new(f"skid_{side}", me)
    set_col.objects.link(o)
    bd = o.modifiers.new("reveal", "BUILD")
    bd.frame_start, bd.frame_duration = 54, 58

# ---------------- coming apart ----------------
rng = random.Random(7)
cam_end = Vector((5.2, -9.4, 2.9))
to_cam = Vector((cam_end.x, cam_end.y, 0)).normalized()
def part_centre(p):
    pts = []
    for ch in p.children_recursive:
        if ch.type == "MESH":
            m = root.matrix_world.inverted() @ ch.matrix_world  # rest pose matrices are fine: frame 1 relative
            pts += [m @ Vector(c) for c in ch.bound_box]
    if not pts:
        return Vector((0, 0, 0.8))
    return sum(pts, Vector()) / len(pts)

sc.frame_set(1)
INNER = ("engine", "transmission", "spring_", "chassis_floor", "exhaust")
C = Vector((0, 0, 0.75))
for p in parts:
    pid = p["partId"]
    m = part_centre(p)
    d = m - C
    inner = pid.startswith(INNER)
    d.z += 0.6 if not inner else 0.2
    if d.dot(to_cam) > 0:  # nothing flies into the camera's line to the text
        d -= to_cam * d.dot(to_cam) * 1.3
    if d.length < 1e-3:
        d = Vector((0, 0, 1))
    d.normalize()
    far = 0.5 if inner else 0.8 * (2.1 if pid.startswith("wheel_") else 1.0 + 0.9 * min(m.length / 2.2, 1))
    t0 = 126 + int(rng.uniform(0, 10)) + (6 if inner else 0)
    rot = Vector((rng.uniform(-0.45, 0.45), rng.uniform(-0.45, 0.45), rng.uniform(-0.35, 0.35)))
    p.location, p.rotation_euler = (0, 0, 0), (0, 0, 0)
    p.keyframe_insert("location", frame=t0)
    p.keyframe_insert("rotation_euler", frame=t0)
    p.location = d * far
    p.rotation_euler = rot
    p.keyframe_insert("location", frame=t0 + 22)
    p.keyframe_insert("rotation_euler", frame=t0 + 22)
    p.location = d * far * 1.22  # keep floating apart through the end card
    p.rotation_euler = rot * 1.3
    p.keyframe_insert("location", frame=END)
    p.keyframe_insert("rotation_euler", frame=END)

# ---------------- BUY IT NOW ----------------
txt_d = bpy.data.curves.new("ad_text", "FONT")
txt_d.body = "BUY IT NOW"
txt_d.align_x, txt_d.align_y = "CENTER", "CENTER"
txt_d.size, txt_d.extrude, txt_d.bevel_depth, txt_d.bevel_resolution = 0.62, 0.07, 0.012, 2
txt_d.space_character = 1.05
txt = bpy.data.objects.new("ad_text", txt_d)
set_col.objects.link(txt)
glow = bpy.data.materials.new("ad_text_glow")
glow.use_nodes = True
b = glow.node_tree.nodes["Principled BSDF"]
b.inputs["Base Color"].default_value = (*lin(ACCENT), 1)
b.inputs["Emission Color"].default_value = (*lin(ACCENT), 1)
b.inputs["Emission Strength"].default_value = 1.6
b.inputs["Metallic"].default_value = 0.6
b.inputs["Roughness"].default_value = 0.25
txt_d.materials.append(glow)
face = math.atan2(cam_end.x, -cam_end.y)
txt.rotation_euler = (math.pi / 2, 0, face)
front = to_cam * 2.8  # in front of the flying parts
for f, z, s in ((138, 0.7, 0.0), (152, 1.3, 1.12), (158, 1.25, 1.0), (END, 1.3, 1.03)):
    txt.location = front + Vector((0, 0, z))
    txt.scale = (s, s, s)
    txt.keyframe_insert("location", frame=f)
    txt.keyframe_insert("scale", frame=f)

# ---------------- set ----------------
bpy.ops.mesh.primitive_plane_add(size=160, location=(0, 0, 0))
ground = bpy.context.active_object
ground.name = "ad_ground"
for c in ground.users_collection:
    c.objects.unlink(ground)
set_col.objects.link(ground)
asphalt = bpy.data.materials.new("ad_asphalt")
asphalt.use_nodes = True
nt = asphalt.node_tree
b = nt.nodes["Principled BSDF"]
b.inputs["Base Color"].default_value = (0.022, 0.022, 0.026, 1)
b.inputs["Roughness"].default_value = 0.5
noise = nt.nodes.new("ShaderNodeTexNoise")
noise.inputs["Scale"].default_value = 180
bump = nt.nodes.new("ShaderNodeBump")
bump.inputs["Strength"].default_value = 0.08
nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
nt.links.new(bump.outputs["Normal"], b.inputs["Normal"])
ground.data.materials.append(asphalt)

sun_d = bpy.data.lights.new("ad_sun", "SUN")
sun_d.energy, sun_d.angle = 3.0, math.radians(3)
sun = bpy.data.objects.new("ad_sun", sun_d)
sun.rotation_euler = (math.radians(55), 0, math.radians(150))
set_col.objects.link(sun)

# camera: holds on the corner while the car arrives, then eases in on the exploded car and the text
cam_d = bpy.data.cameras.new("ad_cam")
cam_d.lens = 35
cam = bpy.data.objects.new("ad_cam", cam_d)
set_col.objects.link(cam)
aim = bpy.data.objects.new("ad_aim", None)
set_col.objects.link(aim)
tc = cam.constraints.new("TRACK_TO")
tc.target, tc.track_axis, tc.up_axis = aim, "TRACK_NEGATIVE_Z", "UP_Y"
for f in range(1, END + 1, 2):
    _, p, *_ = track[min(f, 118) - 1]
    car_aim = p + Vector((0, 0, 0.7)) if f <= 118 else Vector((0, 0, 0.7))
    end_aim = Vector((0, 0, 1.0))
    k = smooth(112, 170, f)
    aim.location = car_aim.lerp(end_aim, k)
    aim.keyframe_insert("location", frame=f)
# outside the corner for the drift, then an orbit round the stopped car to the end-card angle
cam_start = Vector((-4.0, 10.0, 3.5))
a0, a1 = math.atan2(cam_start.y, cam_start.x), math.atan2(cam_end.y, cam_end.x)
if a1 > a0:
    a1 -= 2 * math.pi
r0, r1 = cam_start.xy.length, cam_end.xy.length
for f in [1, 118] + list(range(120, 181, 3)) + [END]:
    k = smooth(118, 180, f)
    a, rr = a0 + (a1 - a0) * k, r0 + (r1 - r0) * k
    z = cam_start.z + (cam_end.z - cam_start.z) * k
    if f == END:
        rr, z = rr * 0.94, z - 0.1
    cam.location = (math.cos(a) * rr, math.sin(a) * rr, z)
    cam.keyframe_insert("location", frame=f)
sc.camera = cam

# ---------------- render ----------------
r = sc.render
items = {i.identifier for i in r.bl_rna.properties["engine"].enum_items}
r.engine = next(e for e in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT") if e in items)
sc.eevee.taa_render_samples = 48
r.resolution_x, r.resolution_y, r.resolution_percentage = 1280, 720, 100
r.use_motion_blur = True
try:
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
except TypeError:
    pass
sc.frame_set(1)
bpy.ops.wm.save_mainfile()
print({"stop": tuple(round(x, 2) for x in stop), "start": tuple(round(x, 2) for x in (track[0][1])), "parts": len(parts),
       "objects": len(sc.collection.all_objects), "engine": r.engine})
