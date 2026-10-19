# Four-door double-cab pickup from the saloon. Targets from our own doublecabSide (220 units per metre): 5.32 m long,
# 3.09 m wheelbase, 0.373 m tyres, a long four-door cab ending at x 0.91, a shorter open bed 0.97-2.56 m, black arch cladding.
XMAP = [(-2.505, -2.641), (-1.52, -1.5), (1.53, 1.586), (2.505, 2.682)]
ZMAP = [(0.145, 0.22), (0.40, 0.48), (0.95, 1.17), (1.05, 1.27)]
WIDTH = 0.94
NEW_AX, K, WZ = {"front": -1.5, "rear": 1.586}, 0.373 / 0.366, 0.373
ARCH_R = 0.412 * K
BED = (0.97, 2.56, 0.80, 0.82)  # x0, x1, inner half width, floor z (clears the wheel tubs)


def warp(p):
    return Vector((pw(XMAP, p.x), p.y * WIDTH, pw(ZMAP, p.z)))


gh_warp = make_gh_warp([(-0.909, 1.20), (-0.459, 1.755), (0.0, 1.77), (0.45, 1.77), (0.70, 1.765), (0.86, 1.74), (0.905, 1.25)], XMAP, ZMAP)
wheel_warp = make_wheel_warp(NEW_AX, WIDTH, K, WZ)


def obj_warp(short):
    return wheel_warp if short.startswith("wheel_") else None


DROP = ("hood_scoop", "spoiler_carbon", "rear_carbon_band", "gill_", "rear_vent", "splitter")
MOVE_TO = {"door_seam_left_0": -0.882, "door_seam_right_0": -0.882, "door_seam_left_1": 0.022, "door_seam_right_1": 0.022,
           "door_seam_left_2": 0.864, "door_seam_right_2": 0.864, "door_handle_left_0": -0.19, "door_handle_right_0": -0.19,
           "door_handle_left_1": 0.67, "door_handle_right_1": 0.67, "b_pillar_left": 0.0, "b_pillar_right": 0.0}


def edit(name, o, lo):
    if name.startswith(DROP) or (name.startswith("exhaust_") and not name.startswith("exhaust_l0.63")):
        return False
    if o is None:
        return True
    if name in MOVE_TO:
        o.matrix_basis.translation.x += MOVE_TO[name] - centre(o).x
    if name.startswith("mirror"):
        o.matrix_basis.translation.x += -0.33
    if name.startswith("seat_back_"):  # two rows inside the long cab
        o.matrix_basis.translation.x += (0.62 if lo.x > 0.7 else -0.15) - centre(o).x
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
    for s, side in ((-1, "left"), (1, "right")):
        ya, yb = sorted((s * w, s * (w + 0.02)))
        add_mesh(f"bed_wall_{side}", quads_mesh("bed_wall", slab(x0, x1, ya, yb, fl, rail), liner), f"fender_rear_{side}")
        ya, yb = sorted((s * (w - 0.005), s * (outer + 0.01)))
        add_mesh(f"bed_rail_cap_{side}", quads_mesh("bed_rail_cap", slab(x0 - 0.02, x1 + 0.02, ya, yb, rail - 0.005, rail + 0.022), liner),
                 f"fender_rear_{side}")
    return made


def extra(g):
    return bed(g) + cladding(g, NEW_AX, ARCH_R, WZ)


CFG = {"dst": "doublecab_hd", "root": "car_doublecab_hd", "dy": -19.2, "warp": warp, "gh_warp": gh_warp, "edit": edit,
       "obj_warp": obj_warp, "cutter_warp": wheel_warp, "extra": extra,
       "body_boxes": [((BED[0], -BED[2], BED[3]), (BED[1], BED[2], 3.0))],
       "cuts": (-1.93, -0.909, -0.882, 0.022, 0.864, 2.54, 2.01), "z": (0.30, 0.95, 0.545, 0.70)}
