"""Simulate the satin cover over the SUV on the turntable and bake its pull-off into a morph-target clip
(sent by run.py, headless, after build_garage.py and before bake/export).

Frames 1-60: a sheet falls and drapes over the car while its tail edge is lowered to the floor behind it.
Frames 60-110: that edge is pulled up and back over the roof. The result is a static mesh "cover" (the
draped shape) with one shape key per sampled frame of the pull, and an action "cover_pull" that crossfades
through them; the site scrubs that clip with the scroll. The car used for collisions is deleted afterwards."""
import math, os
import bmesh, bpy
from mathutils import Vector

L = LAYOUT
scene = bpy.data.scenes["Garage"]
bpy.context.window.scene = scene
SHOW = L["show"]
DRAPE_END, PULL_END, STEP = 60, 110, 3


def W(x, y, z):
    return Vector((x, -z, y))


for name in ("cover", "cover_sim", "cover_hook"):
    if name in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects[name], do_unlink=True)
garage = bpy.data.collections["garage"]
tmp = bpy.data.collections.get("cover_tmp") or bpy.data.collections.new("cover_tmp")
if tmp.name not in scene.collection.children:
    scene.collection.children.link(tmp)

# collision car, exactly where the site parks it (nose -x, on the turntable)
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, "public", "models", "hd", "suv.glb"))
car = [o for o in bpy.data.objects if o not in before]
pivot = bpy.data.objects.new("cover_car", None)
tmp.objects.link(pivot)
for o in car:
    for c in o.users_collection:
        c.objects.unlink(o)
    tmp.objects.link(o)
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
centre = (mins + maxs) / 2
pivot.location = W(SHOW, 0, 0) - Vector((centre.x, centre.y, mins.z))
bpy.context.view_layer.update()
length, width, height = maxs.x - mins.x, maxs.y - mins.y, maxs.z - mins.z
for o in car:
    if o.type == "MESH":
        o.modifiers.new("collision", "COLLISION").settings.thickness_outer = 0.06

# floor collider
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=8)
floor = bpy.data.meshes.new("cover_floor")
bm.to_mesh(floor)
fob = bpy.data.objects.new("cover_floor", floor)
fob.location = W(SHOW, 0, 0)
tmp.objects.link(fob)
fob.modifiers.new("collision", "COLLISION")

# the sheet: a little bigger than the car, starting flat above it
sx, sz = length + 1.6, width + 2.0
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=56, y_segments=36, size=0.5)
for v in bm.verts:
    v.co.x *= sx
    v.co.y *= sz
me = bpy.data.meshes.new("cover_sim")
bm.to_mesh(me)
sim = bpy.data.objects.new("cover_sim", me)
sim.location = W(SHOW, height + 0.35, 0)
tmp.objects.link(sim)
pin = sim.vertex_groups.new(name="pin")
tail = [v.index for v in me.vertices if v.co.x > sx / 2 - 1e-4]  # the +x edge, behind the car's tail
pin.add(tail, 1.0, "REPLACE")

hook = bpy.data.objects.new("cover_hook", None)
tmp.objects.link(hook)
hook.location = W(SHOW + sx / 2, height + 0.35, 0)
h = sim.modifiers.new("hook", "HOOK")
h.object = hook
h.vertex_group = "pin"
bpy.context.view_layer.update()
# bind the hook where the empty starts, so the pinned edge only moves by the empty's motion
h.matrix_inverse = hook.matrix_world.inverted() @ sim.matrix_world
cloth = sim.modifiers.new("cloth", "CLOTH")
cs = cloth.settings
cs.quality = 10
cs.mass = 0.15
cs.air_damping = 1.5
cs.tension_stiffness = cs.compression_stiffness = 12
cs.bending_stiffness = 0.05
cs.pin_stiffness = 1
cs.vertex_group_mass = "pin"
cloth.collision_settings.distance_min = 0.012
cloth.collision_settings.use_self_collision = False
cloth.point_cache.frame_start = 1
cloth.point_cache.frame_end = PULL_END

# hook path: down to the floor behind the tail while it drapes, then up and back over the roof
keys = [
    (1, (SHOW + sx / 2, height + 0.35, 0)),
    (30, (SHOW + length / 2 + 0.5, 0.15, 0)),
    (DRAPE_END, (SHOW + length / 2 + 0.5, 0.15, 0)),
    (85, (SHOW + length / 2 + 1.2, height + 1.4, 0.4)),
    (PULL_END, (SHOW + length / 2 + 4.5, height + 1.8, 1.2)),
]
for f, (x, y, z) in keys:
    hook.location = W(x, y, z)
    hook.keyframe_insert("location", frame=f)
scene.frame_start, scene.frame_end = 1, PULL_END

deps = bpy.context.evaluated_depsgraph_get()
shapes = {}
for f in range(1, PULL_END + 1):
    scene.frame_set(f)
    if f >= DRAPE_END and (f - DRAPE_END) % STEP == 0:
        ev = sim.evaluated_get(bpy.context.evaluated_depsgraph_get())
        shapes[f] = [sim.matrix_world @ v.co for v in ev.data.vertices]
print("simulated", len(shapes), "frames")

# the shipped cover: draped shape + one shape key per sampled frame of the pull, local to the turntable centre
origin = W(SHOW, 0, 0)
cover_me = bpy.data.meshes.new("cover")
cover_me.from_pydata([v - origin for v in shapes[DRAPE_END]], [], [tuple(p.vertices) for p in me.polygons])
cover = bpy.data.objects.new("cover", cover_me)
cover.location = origin
garage.objects.link(cover)
for poly in cover_me.polygons:
    poly.use_smooth = True
mat = bpy.data.materials.get("cover_satin") or bpy.data.materials.new("cover_satin")
mat.use_nodes = True
bsdf = mat.node_tree.nodes["Principled BSDF"]
bsdf.inputs["Base Color"].default_value = (0.018, 0.018, 0.022, 1)
bsdf.inputs["Roughness"].default_value = 0.42
bsdf.inputs["Sheen Weight"].default_value = 0.35
bsdf.inputs["Sheen Tint"].default_value = (0.7, 0.7, 0.72, 1)
cover_me.materials.append(mat)
cover.shape_key_add(name="Basis")
frames = sorted(shapes)
for f in frames[1:]:
    k = cover.shape_key_add(name=f"pull_{f:03d}")
    for i, p in enumerate(shapes[f]):
        k.data[i].co = p - origin
# crossfade through the keys: key i is fully on at its own frame and off at its neighbours'
kb = cover_me.shape_keys
for i, f in enumerate(frames[1:], start=1):
    k = kb.key_blocks[f"pull_{f:03d}"]
    for frame, value in ((frames[i - 1], 0.0), (f, 1.0), (frames[i + 1] if i + 1 < len(frames) else f + STEP, 0.0 if i + 1 < len(frames) else 1.0)):
        k.value = value
        k.keyframe_insert("value", frame=frame - DRAPE_END + 1)
for a in [a for a in bpy.data.actions if a.name.startswith("cover_pull")]:
    bpy.data.actions.remove(a)
kb.animation_data.action.name = "cover_pull"

# tidy up: everything used for the simulation goes
for o in list(tmp.all_objects):
    bpy.data.objects.remove(o, do_unlink=True)
bpy.data.collections.remove(tmp)
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
print("cover", len(cover_me.vertices), "verts,", len(kb.key_blocks) - 1, "shape keys")
