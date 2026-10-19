"""Builds a detailed car from the blue 'muscle' car: same shapes and details, every piece under an empty
carrying a registry partId, so the site can select and recolour it. The muscle car is left untouched.
exec() with CFG = {"dst", "root", "dy", optional "warp", "gh_warp", "cuts", "edit"}; no CFG builds sedan_hd.
warp / gh_warp map a car-local point to a new one (gh_warp only for the greenhouse and its trims);
edit(name, obj, local_centre) returns False to drop a detail, or moves it."""
import bpy, bmesh, json, re
from mathutils import Matrix, Vector

bpy.context.window.scene = bpy.data.scenes["Scene"]  # never build into the Commercial scene
bpy.ops.wm.save_mainfile()
CFG = globals().get("CFG") or {}
SRC, DST, DY = "muscle", CFG.get("dst", "sedan_hd"), CFG.get("dy", -3.2)  # placed along -Y from the muscle car
WARP, GH_WARP, EDIT = CFG.get("warp"), CFG.get("gh_warp"), CFG.get("edit")
GH_DETAILS = ("window_frame", "b_pillar", "shark_fin")
src = bpy.data.collections[SRC]
src_root = bpy.data.objects["car_muscle"]
O = src_root.matrix_world.translation.copy()  # muscle origin; local = world - O

# ---------------- fresh collection ----------------
old = bpy.data.collections.get(DST)
if old:
    for o in list(old.all_objects):
        bpy.data.objects.remove(o)
    bpy.data.collections.remove(old)
col = bpy.data.collections.new(DST)
bpy.context.scene.collection.children.link(col)
root = bpy.data.objects.new(CFG.get("root", "car_sedan_hd"), None)
root.location = O + Vector((0, DY, 0))
col.objects.link(root)

# ---------------- materials: copies named by role ----------------
ROLE = {"mesh": "grille", "liner": "arch_liner"}
mats = {}
def mat(m):
    if m is None:
        return None
    if m.name not in mats:
        role = m.name.removeprefix("muscle_")
        c = m.copy()
        c.name = ROLE.get(role, role)  # Blender adds .00x; build tools read the role before the dot
        mats[m.name] = c
    return mats[m.name]

# ---------------- part empties ----------------
empties = {}
def part(pid, side=None):
    key = (pid, side)
    if key not in empties:
        e = bpy.data.objects.new(pid, None)
        e["partId"] = pid
        if side:
            e["side"] = side
        e.parent = root
        e.empty_display_size = 0.05
        col.objects.link(e)
        empties[key] = e
    return empties[key]

def add_mesh(name, me, pid, side=None):
    o = bpy.data.objects.new(name, me)
    col.objects.link(o)
    o.parent = part(pid, side)
    # part empties sit at the root's origin, so a child's basis is its car-local transform
    o.matrix_basis = Matrix.Identity(4)  # mesh data is already car-local
    return o

def warp_data(me, M, fns):
    """Move a mesh's vertices through the warps, in car-local space (M: mesh space -> car-local)."""
    fns = [f for f in fns if f]
    if not fns:
        return
    Mi = M.inverted()
    for v in me.vertices:
        p = M @ v.co
        for f in fns:
            p = f(p)
        v.co = Mi @ p

CUTTERS = None  # set to a collection of warped arch cutters when the wheels move

def local_mesh(o, fns=(), boxes=()):
    """Evaluated copy of o (modifiers applied) in car-local coordinates, its cage warped first."""
    tmp, temps = None, []
    if any(fns) or boxes:
        tmp = o.copy()
        tmp.data = o.data.copy()
        bpy.context.scene.collection.objects.link(tmp)
        warp_data(tmp.data, src_root.matrix_world.inverted() @ o.matrix_world, fns)
        bpy.context.view_layer.update()
        o = tmp
        for m in o.modifiers:
            if m.type == "BOOLEAN" and CUTTERS:
                m.collection = CUTTERS
        for i, (lo, hi) in enumerate(boxes):  # extra cut-outs in car-local space, e.g. an open bed
            bm = bmesh.new()
            bmesh.ops.create_cube(bm, size=1, matrix=Matrix.Translation((Vector(lo) + Vector(hi)) / 2)
                                  @ Matrix.Diagonal((*(Vector(hi) - Vector(lo)), 1)))
            bme = bpy.data.meshes.new("cut_box")
            bm.to_mesh(bme)
            bm.free()
            box = bpy.data.objects.new("cut_box", bme)
            bpy.context.scene.collection.objects.link(box)
            box.matrix_world = src_root.matrix_world.copy()
            box.hide_render = True
            temps.append(box)
            m = o.modifiers.new(f"box{i}", "BOOLEAN")
            m.operation, m.solver, m.object, m.use_hole_tolerant = "DIFFERENCE", "EXACT", box, True
        bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), depsgraph=dg)
    me.transform(src_root.matrix_world.inverted() @ o.matrix_world)
    for x in ([tmp] if tmp else []) + temps:
        d = x.data
        bpy.data.objects.remove(x)
        bpy.data.meshes.remove(d)
    for i, m in enumerate(me.materials):
        me.materials[i] = mat(m)
    return me

# ---------------- split a shell into panels ----------------
def split(o, classify, prefix, fns=()):
    me = local_mesh(o, fns, CFG.get("body_boxes", ()) if prefix == "panel" else ())
    bm = bmesh.new()
    bm.from_mesh(me)
    for co, no in CUTS:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no)
    bm.faces.ensure_lookup_table()
    labels = [classify(f) for f in bm.faces]
    if prefix == "panel" and CFG.get("clad"):  # unpainted plastic cladding on arches and sills
        me.materials.append(mat(bpy.data.materials[SRC + "_matte"]))
        ci = len(me.materials) - 1
        for f in bm.faces:
            if CFG["clad"](f.calc_center_median(), f.normal):
                f.material_index = ci
    bm.to_mesh(me)
    bm.free()
    out = {}
    for lab in sorted(set(labels)):
        b = bmesh.new()
        b.from_mesh(me)
        b.faces.ensure_lookup_table()
        bmesh.ops.delete(b, geom=[f for f, l in zip(b.faces, labels) if l != lab], context="FACES")
        m2 = me.copy()
        b.to_mesh(m2)
        b.free()
        pid, side = lab
        add_mesh(f"{pid}_{prefix}", m2, pid, side)
        out[f"{pid}/{side}"] = len(m2.polygons)
    bpy.data.meshes.remove(me)
    return out

# section lines, in car-local metres (nose -X, left -Y)
X_BUMP_F, X_SCREEN, X_DOOR_F, X_DOOR_R, X_FENDER_R, X_GLASS_R, X_BUMP_R = CFG.get("cuts", (-1.95, -0.78, -0.70, 0.33, 1.06, 1.80, 1.95))
Z_SILL, Z_BUMP_F, Z_BUMP_R, Y_CREASE = CFG.get("z", (0.22, 0.80, 0.83, 0.78))
CUTS = [((x, 0, 0), (1, 0, 0)) for x in (X_BUMP_F, X_SCREEN, X_DOOR_F, X_DOOR_R, X_FENDER_R, X_GLASS_R, X_BUMP_R) if x is not None]
CUTS += [((0, 0, z), (0, 0, 1)) for z in (Z_SILL, Z_BUMP_F, Z_BUMP_R)]
CUTS += [((0, y, 0), (0, 1, 0)) for y in (-Y_CREASE, Y_CREASE)]

def body(f):
    c, n = f.calc_center_median(), f.normal
    side = "left" if c.y < 0 else "right"
    ax = max(range(3), key=lambda i: abs(n[i]))
    if n.z < -0.6:
        return ("body_shell", None)
    if c.x < X_BUMP_F and c.z < Z_BUMP_F:
        return ("bumper_front", None)
    if c.x > X_BUMP_R and c.z < Z_BUMP_R:
        return ("bumper_rear", None)
    top = ax == 2 or (ax == 0 and (c.z >= Z_BUMP_F if n.x < 0 else c.z >= Z_BUMP_R))
    if top and abs(c.y) < Y_CREASE:
        if c.x < X_SCREEN:
            return ("hood", None)
        if c.x > X_GLASS_R:
            return ("trunk", None)
        return ("body_shell", None)
    if c.z < Z_SILL:
        return ("body_shell", None)
    if c.x < X_DOOR_F:
        return (f"fender_front_{side}", None)
    if X_DOOR_R is None or c.x < X_DOOR_R:  # a two-door has one long door up to the rear fender
        return (f"door_front_{side}", None) if c.x < X_FENDER_R else (f"fender_rear_{side}", None)
    if c.x < X_FENDER_R:
        return (f"door_rear_{side}", None)
    return (f"fender_rear_{side}", None)

def greenhouse(f):
    c, n = f.calc_center_median(), f.normal
    side = "left" if c.y < 0 else "right"
    m = GH_MATS[f.material_index]
    if m.startswith("glass"):
        if abs(n.y) > max(abs(n.x), abs(n.z)):
            return (f"side_windows_{side}", None)
        return ("windshield", None) if c.x < 0.4 else ("rear_window", None)
    if m.startswith("trim"):
        return (f"side_windows_{side}", None)
    return ("roof", None)

report = {}
OBJ_WARP = CFG.get("obj_warp") or (lambda short: None)  # per-detail warp replacing the body warp (wheels)
if CFG.get("cutter_warp"):
    CUTTERS = bpy.data.collections.new(DST + "_tmp_cutters")
    bpy.context.scene.collection.children.link(CUTTERS)
    for cut in bpy.data.collections[SRC + "_cutters"].objects:
        c = cut.copy()
        c.data = cut.data.copy()
        CUTTERS.objects.link(c)
        warp_data(c.data, src_root.matrix_world.inverted() @ c.matrix_world, (CFG["cutter_warp"],))
    lc = bpy.context.view_layer.layer_collection.children[CUTTERS.name]
    lc.hide_viewport = True
    bpy.context.view_layer.update()
report["body"] = split(src.objects["muscle_body_shell_paint"], body, "panel", (WARP,))
gh = src.objects["muscle_greenhouse"]
GH_MATS = [mat(m).name if m else "" for m in gh.data.materials]
report["greenhouse"] = split(gh, greenhouse, "glass", (WARP, GH_WARP))
if CUTTERS:
    for c in list(CUTTERS.objects):
        d = c.data
        bpy.data.objects.remove(c)
        bpy.data.meshes.remove(d)
    bpy.data.collections.remove(CUTTERS)

# ---------------- details by name ----------------
def detail_part(name, lo):
    n = name.removeprefix("muscle_")
    n = re.sub(r"\.\d+$", "", n)
    side = "left" if lo.y < 0 else "right"
    m = re.match(r"wheel_(front|rear)_(left|right)_(\w+)", n)
    if m:
        axle, s, piece = m.groups()
        if piece == "disc":
            return f"brake_disc_{axle}", s
        if piece == "caliper":
            return f"caliper_{axle}", s
        return f"wheel_{axle}_{s}", None
    table = [
        (r"hood_", "hood"), (r"grille|splitter|plate_front|badge_front", "bumper_front"),
        (r"headlight_|drl_", "headlight_{s}"), (r"taillight_|reflector_", "taillight_{s}"),
        (r"rear_vent|rear_lower_band|plate_rear|diffuser_light", "bumper_rear"),
        (r"rear_strip|rear_carbon_band|badge_rear|spoiler", "trunk"),
        (r"^diffuser$", "diffuser"), (r"exhaust", "exhaust"), (r"gill_", "fender_front_{s}"),
        (r"side_skirt|seat_back", "body_shell"), (r"belt_trim|b_pillar|window_frame", "side_windows_{s}"),
        (r"mirror", "mirror_{s}"), (r"shark_fin", "roof"), (r"chassis_floor", "chassis_floor"),
    ]
    if n.startswith("door_seam_"):
        return ("door_front_{s}" if n.endswith("_0") else "door_rear_{s}").format(s=side), None
    if n.startswith("door_handle_"):
        return ("door_front_{s}" if n.endswith("_0") else "door_rear_{s}").format(s=side), None
    for pat, pid in table:
        if re.search(pat, n):
            return pid.format(s=side), None
    return None, None

skipped, placed = [], 0
for o in src.objects:
    if o.type != "MESH" or o.name in ("muscle_body_shell_paint", "muscle_greenhouse"):
        continue
    lo = src_root.matrix_world.inverted() @ (o.matrix_world @ (sum((Vector(c) for c in o.bound_box), Vector()) / 8))
    pid, side = detail_part(o.name, lo)
    if pid and X_DOOR_R is None:
        pid = pid.replace("door_rear_", "door_front_")  # two-door: no rear door
    short = re.sub(r"\.\d+$", "", o.name.removeprefix("muscle_"))
    if pid and EDIT and EDIT(short, None, lo) is False:
        continue
    if not pid:
        skipped.append(o.name)
        continue
    c = o.copy()
    c.data = o.data.copy()
    for i, m in enumerate(c.data.materials):
        c.data.materials[i] = mat(m)
    col.objects.link(c)
    c.name = o.name.replace("muscle_", "")
    mw = o.matrix_world.copy()
    c.parent = part(pid, side)
    c.matrix_parent_inverse = Matrix.Identity(4)
    c.matrix_basis = src_root.matrix_world.inverted() @ mw
    ow = OBJ_WARP(short)
    warp_data(c.data, c.matrix_basis, (ow,) if ow else (WARP, GH_WARP if short.startswith(GH_DETAILS) else None))
    if EDIT:
        EDIT(short, c, lo)
    placed += 1

# ---------------- engine, gearbox, springs from the old sedan, rescaled to this body ----------------
from mathutils import Matrix
sed = bpy.data.objects["car_sedan"]
def box(objs):
    inv = sed.matrix_world.inverted()
    pts = [inv @ o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])
smn, smx = box([o for o in bpy.data.collections["sedan"].all_objects if o.type == "MESH" and o.parent and o.parent.get("partId") == "body_shell"])
k = 5.01 / (smx.x - smn.x)
fit = Matrix.Translation((0, 0, 0.145)) @ Matrix.Scale(k, 4) @ Matrix.Translation(-Vector(((smn.x + smx.x) / 2, (smn.y + smx.y) / 2, smn.z)))
borrowed = []
for e in bpy.data.collections["sedan"].all_objects:
    pid = e.get("partId") if e.type == "EMPTY" else None
    if pid not in ("engine", "transmission", "spring_front", "spring_rear"):
        continue
    for ch in e.children:
        if ch.type != "MESH":
            continue
        c = ch.copy()
        c.data = ch.data.copy()
        c.modifiers.clear()
        col.objects.link(c)
        c.parent = part(pid, e.get("side"))
        c.matrix_parent_inverse = Matrix.Identity(4)
        c.matrix_basis = fit @ sed.matrix_world.inverted() @ ch.matrix_world
        c.name = f"{pid}_mesh"
        bpy.context.view_layer.update()
        warp_data(c.data, c.matrix_basis, (WARP,))
        borrowed.append(c.name)

if CFG.get("extra"):
    report["extra"] = CFG["extra"](globals())
bpy.ops.wm.save_mainfile()
print(json.dumps({"panels": report, "details": placed, "skipped": skipped, "borrowed": borrowed,
                  "parts": sorted({f"{k[0]}/{k[1]}" for k in empties}), "mats": sorted(m.name for m in mats.values())}))
