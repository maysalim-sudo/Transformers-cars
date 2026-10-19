# Compact SUV (Qashqai-sized) from the saloon. Targets from our own suvSide (220 units per metre):
# 4.47 m long, 1.84 m wide, 2.67 m wheelbase, belt at 1.05-1.21 m, roof at ~1.58 m, black cladding, roof rails.
import bmesh, math
from mathutils import Matrix, Vector

def lerp(tab, x):
    if x <= tab[0][0]:
        return tab[0][1:]
    for a, b in zip(tab, tab[1:]):
        if x <= b[0]:
            t = (x - a[0]) / (b[0] - a[0])
            return tuple(p + (q - p) * t for p, q in zip(a[1:], b[1:]))
    return tab[-1][1:]

def pw(tab, x):
    """piecewise linear with the end slopes carried on"""
    if x < tab[0][0]:
        (a, A), (b, B) = tab[0], tab[1]
    elif x > tab[-1][0]:
        (a, A), (b, B) = tab[-2], tab[-1]
    else:
        return lerp(tab, x)[0]
    return A + (x - a) * (B - A) / (b - a)

XMAP = [(-2.505, -2.227), (-1.52, -1.282), (1.53, 1.386), (1.8, 1.98), (2.3, 2.17), (2.505, 2.245)]
ZMAP = [(0.145, 0.19), (0.40, 0.42), (0.95, 1.10), (1.05, 1.20)]  # taller body, belt up ~15 cm
WIDTH = 0.93

def warp(p):
    return Vector((pw(XMAP, p.x), p.y * WIDTH, pw(ZMAP, p.z)))

# greenhouse sections of the saloon: x, sill z, top z  ->  new x, new top z
SECTIONS = [(-0.78, 0.865, 0.962, -0.527, 1.12), (-0.12, 0.906, 1.417, 0.18, 1.56), (0.45, 0.916, 1.442, 0.75, 1.58),
            (0.9, 0.926, 1.427, 1.25, 1.57), (1.08, 0.93, 1.407, 1.55, 1.55), (1.3, 0.936, 1.342, 1.85, 1.49),
            (1.8, 0.935, 1.034, 2.08, 1.15)]
GH = []
for x, zb, top, nx, ntop in SECTIONS:  # rows in post-warp space: x -> (new x, sill, height factor)
    zb2, top2 = pw(ZMAP, zb), pw(ZMAP, top)
    GH.append((pw(XMAP, x), nx, zb2, (ntop - zb2) / (top2 - zb2)))

def gh_warp(p):
    if p.x < GH[0][0] - 0.1 or p.x > GH[-1][0] + 0.1:
        return p
    nx, zb, f = lerp(GH, p.x)
    return Vector((nx, p.y, zb + (p.z - zb) * f if p.z > zb else p.z))

OLD_AX, NEW_AX, K, WZ = {"front": -1.52, "rear": 1.53}, {"front": -1.282, "rear": 1.386}, 0.36 / 0.366, 0.36

def wheel_warp(p):
    axle = "front" if p.x < 0 else "rear"
    oc = Vector((OLD_AX[axle], 0.865 if p.y > 0 else -0.865, 0.365))
    nc = Vector((NEW_AX[axle], oc.y * WIDTH, WZ))
    return nc + (p - oc) * K

def obj_warp(short):
    return wheel_warp if short.startswith("wheel_") else None

ARCH_R = 0.412 * K  # cutter radius after the wheel warp

def clad(c, n):
    """black plastic: a band round each arch and the sill below the lower crease"""
    if abs(c.y) < 0.6:
        return False
    for ax in NEW_AX.values():
        d = math.hypot(c.x - ax, c.z - WZ)
        if d < ARCH_R + 0.09 and c.z > 0.12:
            return True
    return c.z < 0.40 and -1.75 < c.x < 1.85

DROP = ("hood_scoop", "hood_bulge", "spoiler_carbon", "rear_carbon_band", "gill_", "rear_vent", "splitter")
KEEP_EXHAUST = "exhaust_l0.63"

def centre(o):
    return o.matrix_basis @ (sum((v.co for v in o.data.vertices), Vector()) / len(o.data.vertices))

def fit_z(o, z0, z1):
    zs = [v.co.z for v in o.data.vertices]
    a, b = min(zs), max(zs)
    for v in o.data.vertices:
        v.co.z = (z0 + (v.co.z - a) / (b - a) * (z1 - z0)) - o.matrix_basis.translation.z

MOVE_TO = {"door_seam_left_0": -0.527, "door_seam_right_0": -0.527, "door_seam_left_1": 0.562, "door_seam_right_1": 0.562,
           "door_seam_left_2": 1.59, "door_seam_right_2": 1.59, "door_handle_left_0": 0.32, "door_handle_right_0": 0.32,
           "door_handle_left_1": 1.31, "door_handle_right_1": 1.31, "b_pillar_left": 0.562, "b_pillar_right": 0.562}

def edit(name, o, lo):
    if name.startswith(DROP) or (name.startswith("exhaust_") and not name.startswith(KEEP_EXHAUST)):
        return False
    if o is None:
        return True
    if name in MOVE_TO:
        o.matrix_basis.translation.x += MOVE_TO[name] - centre(o).x
    if name.startswith("door_seam_") and name.endswith("_2"):
        fit_z(o, 0.86, 1.17)  # the rear door's back edge sits above the arch
    if name.startswith("mirror"):
        o.matrix_basis.translation.x += -0.05
    if name.startswith("side_skirt") and not name.startswith("side_skirt_lip"):
        o.data.materials[0] = mat(bpy.data.materials["muscle_matte"])  # sill cladding, not paint
    return True

def extra(g):
    """Cladding as clean boolean-cut shells over the paint (one per arch, one per sill) and roof rails seated on the roof."""
    from mathutils.bvhtree import BVHTree
    col, add_mesh, mat = g["col"], g["add_mesh"], g["mat"]
    matte = mat(bpy.data.materials["muscle_matte"])
    panels = [o for o in col.objects if o.type == "MESH" and o.name.split(".")[0].endswith("_panel")]

    def bbox(me):
        cs = [v.co for v in me.vertices]
        return [min(c[i] for c in cs) for i in range(3)], [max(c[i] for c in cs) for i in range(3)]

    def overlaps(a, b):
        return all(a[0][i] <= b[1][i] and b[0][i] <= a[1][i] for i in range(3))

    def volume(name, fn):
        b = bmesh.new()
        fn(b)
        me = bpy.data.meshes.new(name)
        b.to_mesh(me)
        b.free()
        v = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(v)
        return v

    def cyl(ax, s):
        return lambda b: bmesh.ops.create_cone(b, cap_ends=True, segments=64, radius1=ARCH_R + 0.085, radius2=ARCH_R + 0.085,
                                               depth=0.7, matrix=Matrix.Translation((ax, s * 0.95, WZ)) @ Matrix.Rotation(math.pi / 2, 4, "X"))

    def box(s):
        return lambda b: bmesh.ops.create_cube(b, size=1, matrix=Matrix.Translation(((NEW_AX["front"] + NEW_AX["rear"]) / 2, s * 0.95, 0.25))
                                               @ Matrix.Diagonal(Vector((NEW_AX["rear"] - NEW_AX["front"], 0.7, 0.30, 1))))

    jobs = []
    for s, side in ((-1, "left"), (1, "right")):
        for axle, ax in NEW_AX.items():
            jobs.append((f"arch_clad_{axle}_{side}", cyl(ax, s), f"fender_{axle}_{side}"))
        jobs.append((f"sill_clad_{side}", box(s), "body_shell"))
    made = []
    for name, fn, pid in jobs:
        v = volume(name + "_vol", fn)
        vb = bbox(v.data)
        out = bmesh.new()
        for p in panels:  # one panel at a time: the touching panel edges upset the boolean when joined
            if not overlaps(bbox(p.data), vb):
                continue
            sk = bpy.data.objects.new("clad_skin", p.data.copy())
            bpy.context.scene.collection.objects.link(sk)
            so = sk.modifiers.new("thick", "SOLIDIFY")
            so.thickness, so.offset = 0.008, 1.0
            bo = sk.modifiers.new("cut", "BOOLEAN")
            bo.operation, bo.solver, bo.object = "INTERSECT", "EXACT", v
            bpy.context.view_layer.update()
            dg = bpy.context.evaluated_depsgraph_get()
            tmp = bpy.data.meshes.new_from_object(sk.evaluated_get(dg), depsgraph=dg)
            out.from_mesh(tmp)
            d = sk.data
            bpy.data.objects.remove(sk)
            bpy.data.meshes.remove(d)
            bpy.data.meshes.remove(tmp)
        me = bpy.data.meshes.new(name)
        out.to_mesh(me)
        out.free()
        me.materials.append(matte)
        for p in me.polygons:
            p.material_index = 0
        add_mesh(name, me, pid)
        made.append((name, len(me.polygons)))
        d = v.data
        bpy.data.objects.remove(v)
        bpy.data.meshes.remove(d)

    # roof rails: sample the finished roof from above, rail 5 cm over it, feet down to the roof at each end
    vs, fs = [], []
    for o in col.objects:  # every greenhouse piece: the roof skin may be glass or paint
        if o.type == "MESH" and o.name.split(".")[0].endswith("_glass"):
            n = len(vs)
            vs += [v.co.copy() for v in o.data.vertices]
            fs += [tuple(n + i for i in p.vertices) for p in o.data.polygons]
    tree = BVHTree.FromPolygons(vs, fs)
    for s, side in ((-1, "left"), (1, "right")):
        pts = []
        for i in range(25):
            x = 0.35 + i * (1.75 - 0.35) / 24
            hit = tree.ray_cast(Vector((x, s * 0.56, 3)), Vector((0, 0, -1)))
            if hit[0]:
                lift = 0.05 if 0 < i < 24 else 0.012
                pts.append(hit[0] + Vector((0, 0, lift)))
        b = bmesh.new()
        rings = []
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            sd = t.cross(Vector((0, 0, 1))).normalized()
            up = sd.cross(t).normalized()
            rings.append([b.verts.new(p + sd * math.cos(a) * 0.017 + up * math.sin(a) * 0.021) for a in (k * math.pi / 4 for k in range(8))])
        for r0, r1 in zip(rings, rings[1:]):
            for k in range(8):
                b.faces.new((r0[k], r0[(k + 1) % 8], r1[(k + 1) % 8], r1[k]))
        for r in (rings[0], rings[-1]):
            b.faces.new(r)
        b.normal_update()
        me = bpy.data.meshes.new("roof_rail")
        b.to_mesh(me)
        b.free()
        me.materials.append(mat(bpy.data.materials["muscle_trim"]))
        for p in me.polygons:
            p.use_smooth = True
        add_mesh("roof_rail_" + side, me, "roof")
        made.append(("roof_rail_" + side, len(pts)))
    return made

CFG = {"dst": "suv_hd", "root": "car_suv_hd", "dy": -12.8, "warp": warp, "gh_warp": gh_warp, "edit": edit,
       "obj_warp": obj_warp, "cutter_warp": wheel_warp, "extra": extra,
       "cuts": (-1.70, -0.527, -0.527, 0.562, 1.59, 1.95, 1.82), "z": (0.24, 0.90, 0.61, 0.72)}
