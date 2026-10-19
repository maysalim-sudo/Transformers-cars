# Five-door supermini (Ibiza-sized) from the saloon. Targets from our own hatchbackSide (220 units per metre):
# 4.08 m long, 2.56 m wheelbase, 0.345 m tyres, a tall roof that drops into a near-vertical tailgate.
from mathutils import Vector

def lerp(tab, x):
    if x <= tab[0][0]:
        return tab[0][1:]
    for a, b in zip(tab, tab[1:]):
        if x <= b[0]:
            t = (x - a[0]) / (b[0] - a[0])
            return tuple(p + (q - p) * t for p, q in zip(a[1:], b[1:]))
    return tab[-1][1:]

# saloon x -> hatchback x: axles land exactly on the new axles, the boot deck folds into the tailgate
XMAP = [(-2.505, -2.03), (-1.52, -1.21), (1.53, 1.35), (1.8, 1.84), (2.3, 1.99), (2.505, 2.045)]
WIDTH = 0.9

def xmap(x):
    if x <= XMAP[0][0]:
        return XMAP[0][1] + (x - XMAP[0][0]) * 0.48
    if x >= XMAP[-1][0]:
        return XMAP[-1][1] + (x - XMAP[-1][0]) * 0.27
    return lerp(XMAP, x)[0]

def warp(p):
    return Vector((xmap(p.x), p.y * WIDTH, p.z))

# greenhouse sections after warp: x -> (new x, sill z, height factor above the sill)
GH = [(-0.589, -0.555, 0.865, 1.0), (-0.035, 0.03, 0.906, 0.967), (0.443, 0.55, 0.916, 0.996),
      (0.82, 1.05, 0.926, 1.006), (0.971, 1.35, 0.93, 1.006), (1.156, 1.62, 0.936, 1.044), (1.542, 1.84, 0.935, 0.657)]

def gh_warp(p):
    if p.x < -0.7 or p.x > 1.65:
        return p
    nx, zb, f = lerp(GH, p.x)
    return Vector((nx, p.y, zb + (p.z - zb) * f if p.z > zb else p.z))

# wheels and arches: smaller, round, moved with the axles
OLD_AX, NEW_AX, K = {"front": -1.52, "rear": 1.53}, {"front": -1.21, "rear": 1.35}, 0.345 / 0.366

def wheel_warp(p):
    axle = "front" if p.x < 0 else "rear"
    oc = Vector((OLD_AX[axle], 0.865 if p.y > 0 else -0.865, 0.365))
    nc = Vector((NEW_AX[axle], oc.y * WIDTH, 0.345))
    return nc + (p - oc) * K

def obj_warp(short):
    return wheel_warp if short.startswith("wheel_") else None

DROP = ("hood_scoop", "hood_bulge", "spoiler_carbon", "rear_carbon_band", "gill_", "rear_vent", "splitter",
        "door_handle_dummy")
KEEP_EXHAUST = "exhaust_l0.63"

def centre(o):
    n = len(o.data.vertices)
    return o.matrix_basis @ (sum((v.co for v in o.data.vertices), Vector()) / n)

def fit_z(o, z0, z1):
    zs = [v.co.z for v in o.data.vertices]
    a, b = min(zs), max(zs)
    for v in o.data.vertices:  # these trims have identity rotation, so data z is car-local z minus an offset
        v.co.z = (z0 + (v.co.z - a) / (b - a) * (z1 - z0)) - o.matrix_basis.translation.z

MOVE_TO = {"door_seam_left_0": -0.555, "door_seam_right_0": -0.555, "door_seam_left_1": 0.50, "door_seam_right_1": 0.50,
           "door_seam_left_2": 1.35, "door_seam_right_2": 1.35, "door_handle_left_0": 0.30, "door_handle_right_0": 0.30,
           "door_handle_left_1": 1.12, "door_handle_right_1": 1.12, "b_pillar_left": 0.50, "b_pillar_right": 0.50}

def edit(name, o, lo):
    if name.startswith(DROP) or (name.startswith("exhaust_") and not name.startswith(KEEP_EXHAUST)):
        return False
    if o is None:
        return True
    if name in MOVE_TO:
        o.matrix_basis.translation.x += MOVE_TO[name] - centre(o).x
    if name.startswith("door_seam_") and name.endswith("_2"):
        fit_z(o, 0.76, 1.02)  # the rear door's back edge sits above the arch, not in it
    if name.startswith("mirror"):
        o.matrix_basis.translation.x += -0.116
    return True

CFG = {"dst": "hatchback_hd", "root": "car_hatchback_hd", "dy": -9.6, "warp": warp, "gh_warp": gh_warp, "edit": edit,
       "obj_warp": obj_warp, "cutter_warp": wheel_warp,
       "cuts": (-1.62, -0.555, -0.555, 0.50, 1.35, 1.80, 1.76), "z": (0.22, 0.80, 0.61, 0.70)}
