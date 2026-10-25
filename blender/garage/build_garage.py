"""Build the premium atelier for the garage hero in scene "Garage", collection "garage" (sent by run.py).

Positions come from LAYOUT (src/garage/layout.json, web coordinates: metres, y up, the car's left side +z).
Blender is z up and glTF export maps Blender -Y to +z, so a web point (x, y, z) is Blender (x, -z, y).
Moving parts are their own objects, named exactly: door, lift_arms, gantry, turntable (+ cover, added by
cloth_cover.py), empties spot_0..7, and the tools tool_<name> with their tool_<name>_work poses (tools.py). Static meshes carry a custom property lightmap = workshop | showroom,
which the glTF export writes into extras for the site to pick the baked lightmap.
Never touches the scenes "Scene" or "Commercial". ARGS: dry=1 prints the plan and builds nothing."""
import math, os
import bmesh, bpy

L = LAYOUT
DRY = ARGS.get("dry") == "1"
PICKED = os.path.join(ROOT, "art", "comfy", "picked")
H = L["hall"]["height"]
HW = L["hall"]["halfWidth"]
DOOR, SPLIT, SHOW = L["door"], L["split"], L["show"]
BAYS = L["bays"]
SHOW_END = SHOW - 12  # back of the showroom
SHOW_HW, SHOW_H = 10, 8

if DRY:
    print("bays", BAYS, "door", DOOR, "split", SPLIT, "show", SHOW)
    raise SystemExit


def W(x, y, z):
    """web coordinates -> Blender"""
    return (x, -z, y)


# ---------- scene + collections ----------
scene = bpy.data.scenes.get("Garage")
if not scene:
    if not bpy.app.background:  # inside a user's open Blender: add a scene beside theirs
        scene = bpy.data.scenes.new("Garage")
        bpy.context.window.scene = scene
    else:  # headless, garage.blend or factory startup: this file is ours
        scene = bpy.context.scene
        scene.name = "Garage"
        for o in list(scene.collection.objects):
            bpy.data.objects.remove(o, do_unlink=True)
scene.unit_settings.system = "METRIC"
for name in ("garage", "garage_lights"):
    col = bpy.data.collections.get(name)
    if col:
        for o in list(col.objects):
            bpy.data.objects.remove(o, do_unlink=True)
    else:
        col = bpy.data.collections.new(name)
    if col.name not in scene.collection.children:
        scene.collection.children.link(col)
GARAGE = bpy.data.collections["garage"]
LIGHTS = bpy.data.collections["garage_lights"]  # bake-only lights, never exported


# ---------- materials ----------
def image(name):
    path = os.path.join(PICKED, name)
    if not os.path.exists(path):
        return None
    img = bpy.data.images.get(name) or bpy.data.images.load(path)
    return img


def material(name, color=(0.5, 0.5, 0.5), rough=0.5, metal=0.0, emit=None, strength=0.0, tex=None, alpha=1.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs[0], out.inputs[0])
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    bsdf.inputs["Alpha"].default_value = alpha
    if alpha < 1:
        m.surface_render_method = "BLENDED"
    if emit:
        bsdf.inputs["Emission Color"].default_value = (*emit, 1)
        bsdf.inputs["Emission Strength"].default_value = strength
    img = image(tex) if tex else None
    if img:
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = img
        nt.links.new(t.outputs[0], bsdf.inputs["Base Color"])
        if emit:
            nt.links.new(t.outputs[0], bsdf.inputs["Emission Color"])
    return m


M = {
    "floor_epoxy": material("floor_epoxy", (0.62, 0.63, 0.65), rough=0.28, tex="epoxy_floor.jpg"),
    "wall_panel": material("wall_panel", (0.015, 0.015, 0.017), rough=0.85, tex="wall_panel.jpg"),
    "matte_black": material("matte_black", (0.012, 0.012, 0.014), rough=0.6),
    "chrome": material("chrome", (0.8, 0.8, 0.82), rough=0.15, metal=1),
    "door_metal": material("door_metal", (0.18, 0.19, 0.2), rough=0.35, metal=0.8),
    # the strips are a glow, not the light: each bay's overhead pool carries the light (moody, cinematic v2)
    "led_strip": material("led_strip", (1, 1, 1), emit=(1, 1, 1), strength=3.6),
    "line_white": material("line_white", (0.85, 0.85, 0.85), rough=0.4),
    "amber_accent": material("amber_accent", (0.8, 0.38, 0.04), rough=0.4, emit=(0.95, 0.4, 0.04), strength=3.0),
    "glass_booth": material("glass_booth", (0.75, 0.82, 0.9), rough=0.05, alpha=0.12),
    "booth_light": material("booth_light", (1, 1, 1), emit=(1, 0.98, 0.95), strength=3.5),
    "sign_logo": material("sign_logo", (0, 0, 0), emit=(1, 1, 1), strength=1.5, tex=None),
    "street_plate": material("street_plate", (0.05, 0.06, 0.1), emit=(1, 1, 1), strength=1.0, tex="street_night.jpg"),
    "showroom_art": material("showroom_art", (0.1, 0.1, 0.1), emit=(1, 1, 1), strength=0.8, tex="showroom_art.jpg"),
    "asphalt": material("asphalt", (0.035, 0.035, 0.04), rough=0.55),
    "floor_show": material("floor_show", (0.01, 0.01, 0.012), rough=0.08),
    "turntable_metal": material("turntable_metal", (0.07, 0.07, 0.08), rough=0.25, metal=0.8),
    "spot_lens": material("spot_lens", (1, 1, 1), emit=(1, 0.95, 0.85), strength=0.0),
    "tyre": material("tyre", (0.02, 0.02, 0.02), rough=0.8),
}
# the logo is the real brand PNG, never generated lettering
logo = bpy.data.images.get("logo-on-dark.png") or bpy.data.images.load(os.path.join(ROOT, "public", "brand", "logo-on-dark.png"))
nt = M["sign_logo"].node_tree
t = nt.nodes.new("ShaderNodeTexImage")
t.image = logo
bsdf = nt.nodes["Principled BSDF"]
nt.links.new(t.outputs[0], bsdf.inputs["Emission Color"])
nt.links.new(t.outputs[0], bsdf.inputs["Base Color"])
nt.links.new(t.outputs[1], bsdf.inputs["Alpha"])
M["sign_logo"].surface_render_method = "BLENDED"


# ---------- mesh helpers ----------
def finish(bm, name, mat, zone=None, tile=None, col=GARAGE):
    if tile:
        uv = bm.loops.layers.uv.verify()
        for f in bm.faces:
            n = f.normal
            ax = max(range(3), key=lambda i: abs(n[i]))
            u, v = [(1, 2), (0, 2), (0, 1)][ax]
            for loop in f.loops:
                co = loop.vert.co
                loop[uv].uv = (co[u] / tile, co[v] / tile)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    ob = bpy.data.objects.new(name, me)
    col.objects.link(ob)
    if zone:
        ob["lightmap"] = zone
    return ob


def box(name, size, at, mat, zone=None, tile=None, origin_bottom=False):
    """size and at in web coordinates (x, y, z) -> an axis-aligned box"""
    sx, sy, sz = size
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        v.co = (v.co.x * sx, v.co.y * sz, v.co.z * sy + (sy / 2 if origin_bottom else 0))
    ob = finish(bm, name, mat, zone, tile)
    x, y, z = at
    ob.location = W(x, y - (sy / 2 if origin_bottom else 0) if not origin_bottom else y, z)
    return ob


def plane(name, x0, x1, z0, z1, y, mat, zone=None, tile=None, flip=False):
    bm = bmesh.new()
    vs = [bm.verts.new(W(x, y, z)) for x, z in ((x0, z0), (x1, z0), (x1, z1), (x0, z1))]
    f = bm.faces.new(vs if not flip else vs[::-1])
    bm.normal_update()
    if f.normal.z < 0 and not flip:
        f.normal_flip()
    return finish(bm, name, mat, zone, tile)


def cylinder(name, r, h, at, mat, zone=None, segs=64, axis="Y"):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=h)
    ob = finish(bm, name, mat, zone)
    ob.location = W(*at)
    if axis == "X":
        ob.rotation_euler = (0, math.pi / 2, 0)
    elif axis == "Z":
        ob.rotation_euler = (math.pi / 2, 0, 0)
    return ob


def torus(name, R, r, at, mat, zone=None):
    bm = bmesh.new()
    segs, rings = 128, 12
    grid = []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        row = []
        for j in range(rings):
            b = 2 * math.pi * j / rings
            row.append(bm.verts.new(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b))))
        grid.append(row)
    for i in range(segs):
        for j in range(rings):
            bm.faces.new((grid[i][j], grid[(i + 1) % segs][j], grid[(i + 1) % segs][(j + 1) % rings], grid[i][(j + 1) % rings]))
    bm.normal_update()
    ob = finish(bm, name, mat, zone)
    ob.location = W(*at)
    return ob


def area_light(name, at, size, power, color=(1, 1, 1), spread=180):
    d = bpy.data.lights.new(name, "AREA")
    d.shape = "RECTANGLE"
    d.size, d.size_y = size
    d.energy = power
    d.color = color
    d.spread = math.radians(spread)
    ob = bpy.data.objects.new(name, d)
    ob.location = W(*at)
    LIGHTS.objects.link(ob)
    return ob


# ---------- workshop shell ----------
length = DOOR - SPLIT
mid = (DOOR + SPLIT) / 2
plane("floor_workshop", SPLIT, DOOR, -HW, HW, 0, M["floor_epoxy"], "workshop", tile=2.0)
plane("lot", DOOR, DOOR + 40, -30, 30, -0.01, M["asphalt"], "workshop", tile=4.0)
for s in (-1, 1):
    box(f"wall_{'left' if s > 0 else 'right'}", (length, H, 0.2), (mid, H / 2, s * (HW + 0.1)), M["wall_panel"], "workshop", tile=3.6)
box("ceiling", (length, 0.2, HW * 2 + 0.4), (mid, H + 0.1, 0), M["matte_black"], "workshop")
# continuous LED lines: three along the ceiling, one round the walls at 2.6 m
for z in (-2.6, 0, 2.6):
    box(f"led_ceiling_{z:+.0f}", (length - 0.6, 0.05, 0.08), (mid, H - 0.03, z), M["led_strip"])
for s in (-1, 1):
    box(f"led_wall_{'left' if s > 0 else 'right'}", (length - 0.6, 0.04, 0.03), (mid, 2.6, s * (HW - 0.02)), M["led_strip"])

# facade: black frame, two big glass windows, the door opening, the brand sign
DW, DH = 4.2, 3.5
side = (HW - DW / 2)
for s in (-1, 1):
    zc = s * (DW / 2 + side / 2)
    box(f"facade_low_{s:+d}", (0.4, 0.4, side), (DOOR, 0.2, zc), M["matte_black"], "workshop")
    box(f"facade_top_{s:+d}", (0.4, H - 3.6, side), (DOOR, 3.6 + (H - 3.6) / 2, zc), M["matte_black"], "workshop")
    box(f"facade_glass_{s:+d}", (0.06, 3.2, side - 0.2), (DOOR, 2.0, zc), M["glass_booth"])
    box(f"facade_jamb_{s:+d}", (0.4, H, 0.25), (DOOR, H / 2, s * (DW / 2 + 0.125)), M["matte_black"], "workshop")
box("facade_lintel", (0.4, H - DH, DW), (DOOR, DH + (H - DH) / 2, 0), M["matte_black"], "workshop")
# the sign faces the street (+x): its u runs along -z so the logo reads left to right from outside
bm = bmesh.new()
face = bm.faces.new([bm.verts.new(W(DOOR + 0.22, y, z)) for z, y in ((3.2, 3.55), (-3.2, 3.55), (-3.2, 5.15), (3.2, 5.15))])
uv = bm.loops.layers.uv.verify()
for loop, c in zip(face.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]):
    loop[uv].uv = c
finish(bm, "sign", M["sign_logo"])
box("led_sign", (0.05, 0.04, 6.4), (DOOR + 0.24, 3.48, 0), M["amber_accent"])
door = box("door", (0.1, DH, DW), (DOOR + 0.05, 0, 0), M["door_metal"], origin_bottom=True)
door.location = W(DOOR + 0.05, 0, 0)

# the street outside: the night plate on a half cylinder facing the door
bm = bmesh.new()
segs, R, top = 48, 38, 16
ring = []
for i in range(segs + 1):
    a = -math.pi / 2 + math.pi * i / segs
    x, z = DOOR + R * math.cos(a), R * math.sin(a)
    ring.append((bm.verts.new(W(x, -1, z)), bm.verts.new(W(x, top, z)), i / segs))
uv = bm.loops.layers.uv.verify()
for (a0, a1, u0), (b0, b1, u1) in zip(ring, ring[1:]):
    f = bm.faces.new((a0, b0, b1, a1))
    for loop, c in zip(f.loops, [(u0, 0), (u1, 0), (u1, 1), (u0, 1)]):
        loop[uv].uv = c
finish(bm, "street_plate", M["street_plate"])

# ---------- bays ----------
def bay_lines(x):
    for s in (-1, 1):
        box(f"bayline_{x}_{s:+d}", (6, 0.004, 0.06), (x, 0.002, s * 1.8), M["line_white"])
        box(f"bayline_end_{x}_{s:+d}", (0.06, 0.004, 3.6), (x + s * 3, 0.002, 0), M["line_white"])


def numeral(x, text):
    curve = bpy.data.curves.new(f"num_{text}", "FONT")
    curve.body = text
    curve.size = 1.1
    curve.extrude = 0.02
    curve.align_x = "CENTER"
    ob = bpy.data.objects.new(f"num_{text}", curve)
    GARAGE.objects.link(ob)
    ob.location = W(x, 3.4, -HW + 0.06)
    ob.rotation_euler = (math.pi / 2, 0, 0)
    ob.data.materials.append(M["amber_accent"])
    # glTF has no text: bake the glyphs into a mesh
    bpy.context.view_layer.update()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    mesh_ob = bpy.data.objects.new(f"num_{text}", me)
    mesh_ob.matrix_world = ob.matrix_world.copy()
    bpy.data.objects.remove(ob, do_unlink=True)
    bpy.data.curves.remove(curve)
    GARAGE.objects.link(mesh_ob)
    return mesh_ob


for i, key in enumerate(("wheels", "stance", "kit", "paint", "tint")):
    x = BAYS[key]
    bay_lines(x)
    numeral(x, f"{i + 1:02d}")
    # a pool of light over the car's footprint (6000 K), narrow enough that the walls fall off into the dark
    area_light(f"pool_{key}", (x, H - 0.4, 0), (5, 2.2), 600, (1.0, 0.96, 0.92), spread=60)

# bay 01: two-post lift and a tyre rack
xw = BAYS["wheels"]
for s in (-1, 1):
    # posts behind the B-pillar, so the three-quarter shots from the front see the car, not a post
    box(f"lift_post_{s:+d}", (0.3, 3.6, 0.3), (xw + 0.9, 1.8, s * 1.75), M["matte_black"], "workshop")
    box(f"lift_stripe_{s:+d}", (0.31, 0.05, 0.31), (xw + 0.9, 3.3, s * 1.75), M["amber_accent"])
bm = bmesh.new()
for sx in (-1, 1):
    for sz in (-1, 1):
        bmesh.ops.create_cube(bm, size=1, matrix=__import__("mathutils").Matrix.LocRotScale((sx * 0.9, -sz * 1.05, 0.06), None, (1.6, 0.12, 0.08)))
lift_arms = finish(bm, "lift_arms", M["chrome"])
lift_arms.location = W(xw, 0, 0)
for i in range(4):
    t_ = torus(f"tyre_{i}", 0.31, 0.11, (xw - 4.6 + i * 0.75, 0.45, -HW + 0.35), M["tyre"], "workshop")
    t_.rotation_euler = (0, math.pi / 2, 0)

# bay 03: panels hung on the wall, tool chest
xk = BAYS["kit"]
box("kit_rack", (3.4, 1.6, 0.08), (xk - 3.2, 2.1, -HW + 0.06), M["chrome"], "workshop")
for i in range(2):
    box(f"kit_panel_{i}", (1.6, 0.45, 0.25), (xk - 3.2, 1.6 + i * 0.7, -HW + 0.25), M["matte_black"], "workshop")
box("tool_chest", (1.6, 1.0, 0.6), (xk + 3.6, 0.5, -HW + 0.5), M["matte_black"], "workshop")

# bay 04: glass paint booth with light panels and the spray gantry
xp = BAYS["paint"]
B = L["booth"]
for sx in (-1, 1):
    for sz in (-1, 1):
        box(f"booth_post_{sx:+d}{sz:+d}", (0.12, B["height"], 0.12), (xp + sx * B["length"] / 2, B["height"] / 2, sz * B["width"] / 2), M["matte_black"], "workshop")
for sz in (-1, 1):
    box(f"booth_glass_{sz:+d}", (B["length"], B["height"], 0.03), (xp, B["height"] / 2, sz * B["width"] / 2), M["glass_booth"])
box("booth_roof", (B["length"], 0.08, B["width"]), (xp, B["height"], 0), M["matte_black"], "workshop")
for sz in (-1, 0, 1):
    box(f"booth_panel_{sz:+d}", (B["length"] - 0.4, 0.03, 0.5), (xp, B["height"] - 0.06, sz * 1.6), M["booth_light"])
bm = bmesh.new()
M3 = __import__("mathutils").Matrix
for part in [((0, -2.3, 1.3), (0.1, 0.1, 2.6)), ((0, 2.3, 1.3), (0.1, 0.1, 2.6)), ((0, 0, 2.6), (0.12, 4.7, 0.12)), ((0, 0, 2.45), (0.06, 4.2, 0.05))]:
    bmesh.ops.create_cube(bm, size=1, matrix=M3.LocRotScale(part[0], None, part[1]))
gantry = finish(bm, "gantry", M["chrome"])
gantry.location = W(xp + B["length"] / 2 - 0.4, 0, 0)

# bay 05: tint bench and film rolls
xt = BAYS["tint"]
box("tint_bench", (2.4, 0.9, 0.8), (xt + 3.4, 0.45, -HW + 0.6), M["matte_black"], "workshop")
for i in range(3):
    cylinder(f"film_roll_{i}", 0.08, 1.5, (xt - 3.6 + i * 0.3, 1.9, -HW + 0.2), M["matte_black"], "workshop", segs=24, axis="X")

# ---------- split into the showroom ----------
for s in (-1, 1):
    box(f"portal_{s:+d}", (0.3, H, 0.3), (SPLIT, H / 2, s * HW), M["matte_black"], "workshop")
    box(f"portal_led_{s:+d}", (0.04, H - 0.4, 0.04), (SPLIT - 0.16, H / 2, s * (HW - 0.17)), M["led_strip"])
box("portal_top", (0.3, 0.3, HW * 2), (SPLIT, H, 0), M["matte_black"], "workshop")

# ---------- showroom ----------
plane("floor_showroom", SHOW_END, SPLIT, -SHOW_HW, SHOW_HW, 0, M["floor_show"], "showroom", tile=2.0)
box("show_ceiling", (SPLIT - SHOW_END, 0.2, SHOW_HW * 2), ((SPLIT + SHOW_END) / 2, SHOW_H, 0), M["matte_black"], "showroom")
for s in (-1, 1):
    box(f"show_wall_{s:+d}", (SPLIT - SHOW_END, SHOW_H, 0.2), ((SPLIT + SHOW_END) / 2, SHOW_H / 2, s * (SHOW_HW + 0.1)), M["wall_panel"], "showroom", tile=3.6)
    box(f"show_header_{s:+d}", (0.2, SHOW_H - H, SHOW_HW - HW), (SPLIT, H + (SHOW_H - H) / 2, s * (HW + (SHOW_HW - HW) / 2)), M["matte_black"], "showroom")
    box(f"show_return_{s:+d}", (0.2, H, SHOW_HW - HW), (SPLIT, H / 2, s * (HW + (SHOW_HW - HW) / 2)), M["matte_black"], "showroom")
    for j, x in enumerate((SHOW + 4, SHOW - 4)):
        frame = plane(f"art_{s:+d}_{j}", x - 1.5, x + 1.5, s * (SHOW_HW - 0.02), s * (SHOW_HW - 0.02), 3.0, M["showroom_art"])
# curved backdrop behind the turntable with vertical light slats
bm = bmesh.new()
segs, R = 40, 9
cx = SHOW
pts = []
for i in range(segs + 1):
    a = math.pi / 2 + math.pi * i / segs
    pts.append((cx + R * math.cos(a), R * math.sin(a)))
uv = bm.loops.layers.uv.verify()
cols = [(bm.verts.new(W(x, 0, z)), bm.verts.new(W(x, SHOW_H, z))) for x, z in pts]
for (a0, a1), (b0, b1) in zip(cols, cols[1:]):
    bm.faces.new((a0, a1, b1, b0))
finish(bm, "backdrop", M["matte_black"], "showroom", tile=2.0)
for i in range(1, segs, 2):
    x, z = pts[i]
    box(f"slat_{i}", (0.05, 6.5, 0.05), (x + 0.12 * (SHOW - x) / R, 4.0, z * (1 - 0.12 / R)), M["led_strip"])
# turntable + amber ring
# set into the floor: its top is flush, so the car rolls straight on
tt = cylinder("turntable", L["turntable"]["radius"], 0.14, (SHOW, -0.069, 0), M["turntable_metal"], segs=96)
torus("turntable_ring", L["turntable"]["radius"] + 0.06, 0.02, (SHOW, 0.0, 0), M["amber_accent"])
# overhead truss ring with the eight fixtures
rig = L["rig"]
torus("truss", rig["radius"], 0.07, (SHOW, rig["height"], 0), M["chrome"], "showroom")
for i in range(rig["count"]):
    a = 2 * math.pi * i / rig["count"] + 0.2
    x, z = SHOW + math.sin(a) * rig["radius"], math.cos(a) * rig["radius"]
    head = cylinder(f"fixture_{i}", 0.2, 0.42, (x, rig["height"] - 0.3, z), M["matte_black"], segs=24)
    lens = cylinder(f"lens_{i}", 0.17, 0.02, (x * 1 + (SHOW - x) * 0.02, rig["height"] - 0.52, z * 0.98), M["spot_lens"], segs=24)
    e = bpy.data.objects.new(f"spot_{i}", None)
    e.location = W(x, rig["height"] - 0.5, z)
    GARAGE.objects.link(e)
area_light("show_key", (SHOW, SHOW_H - 0.3, 0), (8, 8), 1600)
area_light("show_fill", (SPLIT - 2, SHOW_H - 0.3, 0), (3, 12), 500)

# props (baked) and the working tools (moving), in their own files, sharing these helpers
for part in ("props.py", "tools.py"):
    exec(open(os.path.join(ROOT, "blender", "garage", part), encoding="utf8").read(), globals())

# world: deep night blue (the site sets the same colour as the three.js background)
w = bpy.data.worlds.get("garage_night") or bpy.data.worlds.new("garage_night")
w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.006, 0.009, 0.02, 1)
w.node_tree.nodes["Background"].inputs[1].default_value = 1.0
scene.world = w
if bpy.app.background:
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
print("built", len(GARAGE.objects), "objects;", "textures:", [n for n in ("epoxy_floor.jpg", "wall_panel.jpg", "street_night.jpg", "showroom_art.jpg") if image(n)])
