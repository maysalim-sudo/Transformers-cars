# Lifted off-road extended-cab truck from the saloon. Targets from our own offroadSide (220 units per metre): 5.13 m long,
# 3.23 m wheelbase, 0.93 m tyres, rockers at 0.38 m, tall flat hood, one door plus a rear quarter window, a short bed with
# wheel tubs, a tube roll cage behind the cab, a roof light bar, big black flares.
XMAP = [(-2.505, -2.555), (-1.52, -1.709), (1.53, 1.523), (2.505, 2.573)]
ZMAP = [(0.145, 0.382), (0.40, 0.62), (0.95, 1.209), (1.05, 1.31)]
WIDTH = 0.94
NEW_AX, K, WZ = {"front": -1.709, "rear": 1.523}, 0.464 / 0.366, 0.464
ARCH_R = 0.412 * K
BED = (0.70, 2.47, 0.80, 0.80)  # x0, x1, inner half width, floor z; the rear wheels get tubs


def warp(p):
    return Vector((pw(XMAP, p.x), p.y * WIDTH, pw(ZMAP, p.z)))


gh_warp = make_gh_warp([(-0.936, 1.32), (-0.545, 1.755), (-0.1, 1.775), (0.25, 1.775), (0.45, 1.77), (0.585, 1.75), (0.635, 1.30)], XMAP, ZMAP)
wheel_warp = make_wheel_warp(NEW_AX, WIDTH, K, WZ)


rim_warp, tyre_warp = make_terrain_wheels(NEW_AX, WIDTH, WZ, WZ)


def obj_warp(short):
    if short.startswith("wheel_"):
        return tyre_warp if short.endswith("_tire") else rim_warp
    return None


DROP = ("hood_scoop", "spoiler_carbon", "rear_carbon_band", "gill_", "rear_vent", "splitter",
        "door_seam_left_2", "door_seam_right_2", "door_handle_left_1", "door_handle_right_1")
MOVE_TO = {"door_seam_left_0": -0.964, "door_seam_right_0": -0.964, "door_seam_left_1": 0.036, "door_seam_right_1": 0.036,
           "door_handle_left_0": -0.10, "door_handle_right_0": -0.10, "b_pillar_left": 0.055, "b_pillar_right": 0.055}


def edit(name, o, lo):
    if name.startswith(DROP) or (name.startswith("exhaust_") and not name.startswith("exhaust_l0.63")):
        return False
    if name.startswith("seat_back_") and lo.x > 0.7:
        return False  # one row of seats in a single cab
    if o is None:
        return True
    if name in MOVE_TO:
        o.matrix_basis.translation.x += MOVE_TO[name] - centre(o).x
    if name.startswith("mirror"):
        o.matrix_basis.translation.x += -0.25
    if name.startswith("seat_back_"):
        o.matrix_basis.translation.x += -0.15 - centre(o).x
    if name.startswith("side_skirt") and not name.startswith("side_skirt_lip"):
        o.data.materials[0] = mat(bpy.data.materials["muscle_matte"])
    return True


def bed(g):
    """liner floor and walls inside the cut-out, black rail caps on the bed sides, the tailgate's inner skin"""
    col, add_mesh, mat = g["col"], g["add_mesh"], g["mat"]
    liner = mat(bpy.data.materials["muscle_matte"])
    x0, x1, w, fl = BED
    side_panel = next(o for o in col.objects if o.name.startswith("fender_rear_left_panel"))
    top = [v.co for v in side_panel.data.vertices if 1.0 < v.co.x < 2.0]
    rail = max(v.z for v in top)
    outer = max(abs(v.y) for v in top if v.z > rail - 0.05)
    add_mesh("bed_floor", quads_mesh("bed_floor", slab(x0, x1, -w, w, fl - 0.02, fl), liner), "body_shell")
    add_mesh("bed_front_wall", quads_mesh("bed_front_wall", slab(x0 - 0.02, x0, -w, w, fl, rail), liner), "body_shell")
    add_mesh("tailgate_inner", quads_mesh("tailgate_inner", slab(x1, x1 + 0.02, -w, w, fl, rail), liner), "trunk")
    made = [("rail", round(rail, 3), round(outer, 3))]
    for o in col.all_objects:  # rear springs stay under the bed floor
        if o.type == "MESH" and o.parent and o.parent.get("partId") == "spring_rear":
            M = o.matrix_basis
            zs = [(M @ v.co).z for v in o.data.vertices]
            lo, hi = min(zs), max(zs)
            if hi > fl - 0.03:
                k = (fl - 0.03 - lo) / (hi - lo)
                Mi = M.inverted()
                for v in o.data.vertices:
                    p = M @ v.co
                    p.z = lo + (p.z - lo) * k
                    v.co = Mi @ p
            made.append((o.name, round(hi, 3)))
    ax, tr = NEW_AX["rear"], ARCH_R + 0.03
    for s, side in ((-1, "left"), (1, "right")):  # wheel tubs over the rear arches, inside the bed
        ya, yb = sorted((s * w, s * (w - 0.30)))
        add_mesh(f"bed_tub_{side}", quads_mesh("bed_tub", slab(ax - tr, ax + tr, ya, yb, fl, WZ + tr), liner), "body_shell")
    for s, side in ((-1, "left"), (1, "right")):
        ya, yb = sorted((s * w, s * (w + 0.02)))
        add_mesh(f"bed_wall_{side}", quads_mesh("bed_wall", slab(x0, x1, ya, yb, fl, rail), liner), f"fender_rear_{side}")
        ya, yb = sorted((s * (w - 0.005), s * (outer + 0.01)))
        add_mesh(f"bed_rail_cap_{side}", quads_mesh("bed_rail_cap", slab(x0 - 0.02, x1 + 0.02, ya, yb, rail - 0.005, rail + 0.022), liner),
                 f"fender_rear_{side}")
    return made


def cage_and_lights(g):
    """tube roll cage over the bed (both sides, joined across) and a light bar on the front of the roof"""
    mat = g["mat"]
    tubes = mat(bpy.data.materials["muscle_matte"])
    U = lambda sx, sy: Vector(((sx - 600) / 220, 0, (420 - sy) / 220))  # side-view units to car-local x, z
    path = [U(752, 154), U(752, 40), U(754, 20), U(762, 12), U(860, 12), U(872, 16), U(876, 22)]
    path += [U(876, 22).lerp(U(1060, 154), t / 6) for t in range(1, 7)]
    made = []
    for s, side in ((-1, "left"), (1, "right")):
        pts = [Vector((p.x, s * 0.72, p.z)) for p in path]
        tube(g, f"cage_{side}", pts, 0.028, 0.028, tubes, "body_shell", sides=10)
    for sx, sy in ((754, 20), (872, 16)):
        p = U(sx, sy)
        tube(g, f"cage_cross_{sx}", [Vector((p.x, -0.72, p.z)), Vector((p.x, 0.72, p.z))], 0.028, 0.028, tubes, "body_shell", sides=10)
    tree = greenhouse_tree(g["col"])
    hit = tree.ray_cast(Vector((-0.42, 0, 3)), Vector((0, 0, -1)))[0]
    z = hit.z + 0.045
    housing = mat(bpy.data.materials["muscle_trim"])
    led = mat(bpy.data.materials["muscle_led"])
    g["add_mesh"]("light_bar", quads_mesh("light_bar", slab(-0.47, -0.39, -0.62, 0.62, z, z + 0.075), housing), "roof")
    g["add_mesh"]("light_bar_led", quads_mesh("light_bar_led", slab(-0.476, -0.47, -0.60, 0.60, z + 0.012, z + 0.063), led), "roof")
    for y in (-0.5, 0.5):
        g["add_mesh"]("light_bar_foot", quads_mesh("light_bar_foot", slab(-0.44, -0.42, y - 0.01, y + 0.01, hit.z - 0.02, z), housing), "roof")
    made.append(("light_bar_z", round(z, 3)))
    return made


def extra(g):
    return bed(g) + cage_and_lights(g) + cladding(g, NEW_AX, ARCH_R, WZ, band=0.12)


CFG = {"dst": "offroad_hd", "root": "car_offroad_hd", "dy": -22.4, "warp": warp, "gh_warp": gh_warp, "edit": edit,
       "obj_warp": obj_warp, "cutter_warp": wheel_warp, "extra": extra,
       "body_boxes": [((BED[0], -BED[2], BED[3]), (BED[1], BED[2], 3.0))],
       "cuts": (-2.22, -0.936, -0.964, None, 0.036, 2.46, 2.03), "z": (0.45, 1.05, 0.68, 0.70)}
