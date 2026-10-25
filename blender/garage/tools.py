"""Working tools (run by build_garage.py after props.py, sharing its globals). Each tool is an empty named
tool_<name> holding its parts, placed at rest on its bay's cart, plus an empty tool_<name>_work at the pose it
takes on the part. The site moves each tool from rest to work by GarageState.tools (scene/world.ts).

A tool's origin is its working tip; its parts extend along +z (web) from there, so at work, with no rotation,
the tip touches a part on the car's left side (+z) pointing in at it. Work poses are with the car on the floor
(the scene adds the lift's height). Car-local part points are measured from suv.glb (as in timeline.ts AT)."""
from mathutils import Matrix


def tool_part(parent, name, kind, size, at, mat, axis="Z"):
    """a part in the tool's own web coordinates (tip at the origin): kind box (size w, h, d) or cyl (r, length)"""
    bm = bmesh.new()
    if kind == "box":
        sx, sy, sz = size
        bmesh.ops.create_cube(bm, size=1, matrix=Matrix.Diagonal((sx, sz, sy, 1)))
    else:
        r, h = size
        rot = {"Z": Matrix.Rotation(math.pi / 2, 4, "X"), "X": Matrix.Rotation(math.pi / 2, 4, "Y"), "Y": Matrix.Identity(4)}[axis]
        bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=r, radius2=r, depth=h, matrix=rot)
    ob = finish(bm, name, mat)
    ob.parent = parent
    ob.location = W(*at)
    return ob


def empty(name, at):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.1
    e.location = W(*at)
    GARAGE.objects.link(e)
    return e


def tool(name, rest_at, work_at):
    t = empty(f"tool_{name}", rest_at)
    empty(f"tool_{name}_work", work_at)
    return t


def on_cart(bay, height):
    """rest pose: standing on the cart's top shelf, tip `height` above it"""
    cx, cz = CARTS[bay]
    return (cx - 0.15, CART_TOP + height, cz)


# impact wrench at the front wheel's hub
wrench = tool("wrench", on_cart("wheels", 0.24), (BAYS["wheels"] - 1.282, 0.36, 0.804 + 0.33))
tool_part(wrench, "wrench_socket", "cyl", (0.025, 0.06), (0, 0, 0.03), M["chrome"])
tool_part(wrench, "wrench_body", "cyl", (0.045, 0.2), (0, 0, 0.16), M["matte_black"])
tool_part(wrench, "wrench_band", "cyl", (0.047, 0.03), (0, 0, 0.1), M["tool_amber"])
tool_part(wrench, "wrench_grip", "box", (0.045, 0.16, 0.05), (0, -0.1, 0.22), M["matte_black"])
tool_part(wrench, "wrench_battery", "box", (0.08, 0.06, 0.11), (0, -0.21, 0.22), M["tool_amber"])

# spring compressor at the front arch (coilovers go in)
spring = tool("spring", on_cart("stance", 0.2), (BAYS["stance"] - 1.269, 0.62, 0.765 + 0.38))
tool_part(spring, "spring_rod", "cyl", (0.012, 0.42), (0, 0, 0.05), M["chrome"], axis="Y")
for i, y in enumerate((-0.15, 0.15)):
    tool_part(spring, f"spring_hook_{i}", "box", (0.12, 0.02, 0.08), (0, y, 0.04), M["tool_amber"])
tool_part(spring, "spring_handle", "box", (0.18, 0.02, 0.02), (0, 0.22, 0.05), M["matte_black"])

# rivet gun at the side skirt
rivet = tool("rivet", on_cart("kit", 0.22), (BAYS["kit"] + 0.311, 0.33, 0.95 + 0.06))
tool_part(rivet, "rivet_nozzle", "cyl", (0.01, 0.08), (0, 0, 0.04), M["chrome"])
tool_part(rivet, "rivet_body", "cyl", (0.035, 0.18), (0, 0, 0.17), M["tool_amber"])
tool_part(rivet, "rivet_grip", "box", (0.04, 0.15, 0.05), (0, -0.09, 0.22), M["matte_black"])
tool_part(rivet, "rivet_trigger", "box", (0.015, 0.05, 0.02), (0, -0.05, 0.18), M["chrome"])

# squeegee on the side windows (the scene sweeps it along with the tint)
squeegee = tool("squeegee", on_cart("tint", 0.07), (BAYS["tint"] + 0.777, 1.22, 0.74 + 0.05))
tool_part(squeegee, "squeegee_blade", "box", (0.2, 0.07, 0.012), (0, 0, 0.006), M["rubber"])
tool_part(squeegee, "squeegee_handle", "box", (0.05, 0.1, 0.025), (0, -0.07, 0.025), M["tool_amber"])
# its heat gun stays on the cart
cx, cz = CARTS["tint"]
box("heat_gun_body", (0.22, 0.07, 0.07), (cx + 0.2, CART_TOP + 0.035 + 0.05, cz - 0.1), M["tool_amber"], "workshop")
box("heat_gun_grip", (0.05, 0.1, 0.05), (cx + 0.26, CART_TOP + 0.05, cz - 0.1), M["matte_black"], "workshop")

# spray heads on the paint gantry, aimed down at the car's flanks (they ride the gantry: no tool state)
gantry_ob = bpy.data.objects["gantry"]
for i, side in enumerate((-1, 1)):
    head = bpy.data.objects.new(f"spray_head_{i}", None)
    GARAGE.objects.link(head)
    head.parent = gantry_ob
    head.location = W(0, 2.3, side * 1.15)
    tool_part(head, f"spray_body_{i}", "box", (0.08, 0.14, 0.08), (0, 0, 0), M["matte_black"])
    tool_part(head, f"spray_cup_{i}", "cyl", (0.04, 0.1), (0, 0.11, 0), M["chrome"], axis="Y")
    tool_part(head, f"spray_nozzle_{i}", "cyl", (0.012, 0.06), (0, -0.09, 0), M["tool_amber"], axis="Y")
