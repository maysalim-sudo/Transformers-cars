# Two-door widebody fastback from the saloon: shorter overhangs, one long door, a lower roof that runs
# down to the boot in one slope. Proportions from our own coupeSide (old coupe vs old sedan).
from mathutils import Vector

def lerp_table(tab, x):
    if x <= tab[0][0]:
        return tab[0][1:]
    for a, b in zip(tab, tab[1:]):
        if x <= b[0]:
            t = (x - a[0]) / (b[0] - a[0])
            return tuple(p + (q - p) * t for p, q in zip(a[1:], b[1:]))
    return tab[-1][1:]

def warp(p):
    x = p.x
    if x < -1.95:
        x = -1.95 + (x + 1.95) * 0.86
    elif x > 1.95:
        x = 1.95 + (x - 1.95) * 0.93
    return Vector((x, p.y, p.z))

# greenhouse section: old x -> (new x, sill z, height factor above the sill)
GH = [(-0.78, -0.66, 0.865, 1.0), (-0.12, -0.04, 0.906, 0.928), (0.45, 0.42, 0.916, 0.92),
      (0.9, 0.82, 0.926, 0.866), (1.08, 1.0, 0.93, 0.797), (1.3, 1.25, 0.936, 0.70), (1.8, 1.8, 0.935, 1.0)]

def gh_warp(p):
    if p.x < -0.9 or p.x > 1.9:
        return p
    nx, zb, f = lerp_table(GH, p.x)
    z = zb + (p.z - zb) * f if p.z > zb else p.z
    return Vector((nx, p.y, z))

def edit(name, o, lo):
    if name in ("door_seam_left_2", "door_seam_right_2", "door_handle_left_1", "door_handle_right_1"):
        return False  # the rear door's shut line and handle
    if o is None:
        return True
    dx = dz = 0.0
    if name.startswith("door_seam_"):
        dx = 0.08 if name.endswith("_0") else 0.38  # front shut line and the long door's rear edge
    elif name.startswith("door_handle_"):
        dx = 0.62
    elif name.startswith("b_pillar"):
        dx = 0.69 - (lo.x - 0.07)  # quarter-glass pillar at the door's rear edge
    elif name.startswith("seat_back_") and lo.x > 0.7:
        dz = -0.1  # rear 2+2 seats sit under the falling roof
    o.matrix_basis.translation.x += dx
    o.matrix_basis.translation.z += dz
    return True

CFG = {"dst": "coupe_hd", "root": "car_coupe_hd", "dy": -6.4, "warp": warp, "gh_warp": gh_warp, "edit": edit,
       "cuts": (-1.95, -0.66, -0.62, None, 0.71, 1.80, 1.95)}
