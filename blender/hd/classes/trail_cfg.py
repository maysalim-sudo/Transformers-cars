# Boxy four-door trail 4x4 from the saloon. Targets from our own trailSide (220 units per metre): 4.63 m body plus the
# tailgate spare, 3.01 m wheelbase, 0.87 m tyres, rockers at 0.36 m, a flat hood, a near-upright windscreen, a flat roof
# to a vertical tailgate, flares and rock rails, no slotted grille.
XMAP = [(-2.505, -2.455), (-1.52, -1.6), (1.53, 1.409), (2.505, 2.173)]
ZMAP = [(0.145, 0.364), (0.40, 0.60), (0.95, 1.236), (1.05, 1.33)]
WIDTH = 0.955
NEW_AX, K, WZ = {"front": -1.6, "rear": 1.409}, 0.436 / 0.366, 0.436
ARCH_R = 0.412 * K
SPARE = Vector((2.30, 0, 0.955))


def warp(p):
    return Vector((pw(XMAP, p.x), p.y * WIDTH, pw(ZMAP, p.z)))


gh_warp = make_gh_warp([(-0.955, 1.30), (-0.75, 1.765), (0.0, 1.775), (0.9, 1.775), (1.5, 1.775), (2.02, 1.77), (2.11, 1.30)], XMAP, ZMAP)
wheel_warp = make_wheel_warp(NEW_AX, WIDTH, K, WZ)
rim_warp, tyre_warp = make_terrain_wheels(NEW_AX, WIDTH, WZ, WZ, k_rim=1.05, k_width=1.2)


def obj_warp(short):
    if short.startswith("wheel_"):
        return tyre_warp if short.endswith("_tire") else rim_warp
    return None


DROP = ("hood_scoop", "hood_bulge", "spoiler_carbon", "rear_carbon_band", "gill_", "rear_vent", "splitter")
MOVE_TO = {"door_seam_left_0": -0.973, "door_seam_right_0": -0.973, "door_seam_left_1": 0.186, "door_seam_right_1": 0.186,
           "door_seam_left_2": 1.19, "door_seam_right_2": 1.19, "door_handle_left_0": -0.02, "door_handle_right_0": -0.02,
           "door_handle_left_1": 0.98, "door_handle_right_1": 0.98, "b_pillar_left": 0.2, "b_pillar_right": 0.2}


def edit(name, o, lo):
    if name.startswith(DROP) or (name.startswith("exhaust_") and not name.startswith("exhaust_l0.63")):
        return False
    if o is None:
        return True
    if name in MOVE_TO:
        o.matrix_basis.translation.x += MOVE_TO[name] - centre(o).x
    if name.startswith("door_seam_") and name.endswith("_2"):
        fit_z(o, 0.95, 1.26)  # the rear door's back edge sits above the arch
    if name.startswith("mirror"):
        o.matrix_basis.translation.x += -0.31
    if name.startswith("seat_back_"):
        o.matrix_basis.translation.x += (0.75 if lo.x > 0.7 else -0.3) - centre(o).x
    if name.startswith("side_skirt") and not name.startswith("side_skirt_lip"):
        o.data.materials[0] = mat(bpy.data.materials["muscle_matte"])
    return True


def spare(g):
    """a copy of the rear-left tyre and rim turned to face backwards, on a carrier on the tailgate"""
    col, add_mesh, mat = g["col"], g["add_mesh"], g["mat"]
    wheel = next(o for o in col.objects if o.get("partId") == "wheel_rear_left")
    old = Vector((NEW_AX["rear"], -0.865 * WIDTH, WZ))
    M = Matrix.Translation(SPARE) @ Matrix.Rotation(math.pi / 2, 4, "Z") @ Matrix.Translation(-old)
    made = []
    for ch in wheel.children:
        if ch.type != "MESH":
            continue
        me = ch.data.copy()
        me.transform(M @ ch.matrix_basis)
        o = add_mesh("spare_" + ch.name.split(".")[0], me, "trunk")
        for m in ch.modifiers:
            n = o.modifiers.new(m.name, m.type)
            for attr in ("width", "segments", "limit_method", "levels", "thickness"):
                if hasattr(m, attr):
                    setattr(n, attr, getattr(m, attr))
        made.append(o.name)
    carrier = mat(bpy.data.materials["muscle_matte"])
    add_mesh("spare_carrier", quads_mesh("spare_carrier", slab(2.12, SPARE.x - 0.08, -0.12, 0.12, SPARE.z - 0.07, SPARE.z + 0.07), carrier), "trunk")
    return [("spare", len(made))]


def extra(g):
    return spare(g) + cladding(g, NEW_AX, ARCH_R, WZ, band=0.11)


CFG = {"dst": "trail_hd", "root": "car_trail_hd", "dy": -28.8, "warp": warp, "gh_warp": gh_warp, "edit": edit,
       "obj_warp": obj_warp, "cutter_warp": wheel_warp, "extra": extra,
       "cuts": (-2.08, -0.955, -0.973, 0.186, 1.19, 2.05, 1.89), "z": (0.42, 1.05, 0.545, 0.72)}
