# Shared helpers for the per-class HD configs (concatenated before the cfg and hd_build.py).
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
    """piecewise linear through (x, y) pairs, end slopes carried on"""
    if x < tab[0][0]:
        (a, A), (b, B) = tab[0], tab[1]
    elif x > tab[-1][0]:
        (a, A), (b, B) = tab[-2], tab[-1]
    else:
        return lerp(tab, x)[0]
    return A + (x - a) * (B - A) / (b - a)


# the saloon's greenhouse cage sections: x, sill z, top z
SALOON_GH = [(-0.78, 0.865, 0.962), (-0.12, 0.906, 1.417), (0.45, 0.916, 1.442), (0.9, 0.926, 1.427),
             (1.08, 0.93, 1.407), (1.3, 0.936, 1.342), (1.8, 0.935, 1.034)]


def make_gh_warp(targets, xmap, zmap):
    """targets: new (x, top z) per saloon section. Returns a warp for post-body-warp points."""
    rows = []
    for (x, zb, top), (nx, ntop) in zip(SALOON_GH, targets):
        zb2, top2 = pw(zmap, zb), pw(zmap, top)
        rows.append((pw(xmap, x), nx, zb2, (ntop - zb2) / (top2 - zb2)))

    def gh_warp(p):
        if p.x < rows[0][0] - 0.1 or p.x > rows[-1][0] + 0.1:
            return p
        nx, zb, f = lerp(rows, p.x)
        return Vector((nx, p.y, zb + (p.z - zb) * f if p.z > zb else p.z))
    return gh_warp


def make_wheel_warp(new_ax, width, k, wz):
    old_ax = {"front": -1.52, "rear": 1.53}

    def wheel_warp(p):
        axle = "front" if p.x < 0 else "rear"
        oc = Vector((old_ax[axle], 0.865 if p.y > 0 else -0.865, 0.365))
        nc = Vector((new_ax[axle], oc.y * width, wz))
        return nc + (p - oc) * k
    return wheel_warp


def centre(o):
    return o.matrix_basis @ (sum((v.co for v in o.data.vertices), Vector()) / len(o.data.vertices))


def fit_z(o, z0, z1):
    zs = [v.co.z for v in o.data.vertices]
    a, b = min(zs), max(zs)
    for v in o.data.vertices:
        v.co.z = (z0 + (v.co.z - a) / (b - a) * (z1 - z0)) - o.matrix_basis.translation.z


def quads_mesh(name, quads, material):
    """a mesh from a list of 4-point faces (car-local)"""
    bm = bmesh.new()
    for q in quads:
        bm.faces.new([bm.verts.new(p) for p in q])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(material)
    return me


def slab(x0, x1, y0, y1, z0, z1):
    """the six faces of a box"""
    P = lambda x, y, z: Vector((x, y, z))
    return [
        (P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0)), (P(x0, y0, z1), P(x0, y1, z1), P(x1, y1, z1), P(x1, y0, z1)),
        (P(x0, y0, z0), P(x0, y0, z1), P(x1, y0, z1), P(x1, y0, z0)), (P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)),
        (P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1)), (P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0)),
    ]


def cladding(g, new_ax, arch_r, wz, sill=True, band=0.085, sill_top=0.40):
    """unpainted plastic as clean boolean-cut shells over the paint: one per arch, one per sill"""
    col, add_mesh, mat = g["col"], g["add_mesh"], g["mat"]
    matte = mat(bpy.data.materials["muscle_matte"])
    panels = [o for o in col.objects if o.type == "MESH" and o.name.split(".")[0].endswith("_panel")]

    def bbox(me):
        cs = [v.co for v in me.vertices]
        return [min(c[i] for c in cs) for i in range(3)], [max(c[i] for c in cs) for i in range(3)]

    def volume(fn):
        b = bmesh.new()
        fn(b)
        me = bpy.data.meshes.new("clad_vol")
        b.to_mesh(me)
        b.free()
        v = bpy.data.objects.new("clad_vol", me)
        bpy.context.scene.collection.objects.link(v)
        return v

    def cyl(ax, s):
        return lambda b: bmesh.ops.create_cone(b, cap_ends=True, segments=64, radius1=arch_r + band, radius2=arch_r + band, depth=0.7,
                                               matrix=Matrix.Translation((ax, s * 0.95, wz)) @ Matrix.Rotation(math.pi / 2, 4, "X"))

    def box(s):
        h = sill_top - 0.10
        return lambda b: bmesh.ops.create_cube(b, size=1, matrix=Matrix.Translation(((new_ax["front"] + new_ax["rear"]) / 2, s * 0.95, 0.10 + h / 2))
                                               @ Matrix.Diagonal(Vector((new_ax["rear"] - new_ax["front"], 0.7, h, 1))))

    jobs = []
    for s, side in ((-1, "left"), (1, "right")):
        for axle, ax in new_ax.items():
            jobs.append((f"arch_clad_{axle}_{side}", cyl(ax, s), f"fender_{axle}_{side}"))
        if sill:
            jobs.append((f"sill_clad_{side}", box(s), "body_shell"))
    made = []
    for name, fn, pid in jobs:
        v = volume(fn)
        vb = bbox(v.data)
        out = bmesh.new()
        for p in panels:  # one panel at a time: touching panel edges upset the boolean when joined
            pb = bbox(p.data)
            if not all(pb[0][i] <= vb[1][i] and vb[0][i] <= pb[1][i] for i in range(3)):
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
    return made


def greenhouse_tree(col):
    from mathutils.bvhtree import BVHTree
    vs, fs = [], []
    for o in col.objects:
        if o.type == "MESH" and o.name.split(".")[0].endswith("_glass"):
            n = len(vs)
            vs += [v.co.copy() for v in o.data.vertices]
            fs += [tuple(n + i for i in p.vertices) for p in o.data.polygons]
    return BVHTree.FromPolygons(vs, fs)


def tube(g, name, pts, r_side, r_up, material, pid, sides=8, side=None):
    b = bmesh.new()
    rings = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        sd = t.cross(Vector((0, 0, 1)))
        sd = sd.normalized() if sd.length > 1e-6 else Vector((0, 1, 0))
        up = sd.cross(t).normalized()
        rings.append([b.verts.new(p + sd * math.cos(a) * r_side + up * math.sin(a) * r_up) for a in (k * 2 * math.pi / sides for k in range(sides))])
    for r0, r1 in zip(rings, rings[1:]):
        for k in range(sides):
            b.faces.new((r0[k], r0[(k + 1) % sides], r1[(k + 1) % sides], r1[k]))
    for r in (rings[0], rings[-1]):
        b.faces.new(r)
    b.normal_update()
    me = bpy.data.meshes.new(name)
    b.to_mesh(me)
    b.free()
    me.materials.append(material)
    for p in me.polygons:
        p.use_smooth = True
    return g["add_mesh"](name, me, pid, side)


def roof_rails(g, x0, x1, y, lift=0.05):
    tree = greenhouse_tree(g["col"])
    made = []
    for s, side in ((-1, "left"), (1, "right")):
        pts = []
        for i in range(25):
            x = x0 + i * (x1 - x0) / 24
            hit = tree.ray_cast(Vector((x, s * y, 3)), Vector((0, 0, -1)))
            if hit[0]:
                pts.append(hit[0] + Vector((0, 0, lift if 0 < i < 24 else 0.012)))
        tube(g, "roof_rail_" + side, pts, 0.017, 0.021, g["mat"](bpy.data.materials["muscle_trim"]), "roof")
        made.append(("roof_rail_" + side, len(pts)))
    return made


def make_terrain_wheels(new_ax, width, wz, r_out, k_rim=1.08, k_width=1.25):
    """off-road wheels: the rim grows a little, the tyre gets a tall sidewall out to r_out and a wider tread.
    Returns (rim_warp, tyre_warp)."""
    old_ax = {"front": -1.52, "rear": 1.53}
    R_RIM, R_TYRE = 0.276, 0.366  # the saloon's rim and tyre radii

    def frame(p):
        axle = "front" if p.x < 0 else "rear"
        oc = Vector((old_ax[axle], 0.865 if p.y > 0 else -0.865, 0.365))
        return oc, Vector((new_ax[axle], oc.y * width, wz))

    def rim_warp(p):
        oc, nc = frame(p)
        return nc + (p - oc) * k_rim

    def tyre_warp(p):
        oc, nc = frame(p)
        d = p - oc
        r = math.hypot(d.x, d.z)
        if r < 1e-6:
            return nc
        if r <= R_RIM:
            r2 = r * k_rim
        else:
            r2 = R_RIM * k_rim + (r - R_RIM) / (R_TYRE - R_RIM) * (r_out - R_RIM * k_rim)
        return nc + Vector((d.x / r * r2, d.y * k_width, d.z / r * r2))
    return rim_warp, tyre_warp
