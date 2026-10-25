"""Static workshop props, baked into the workshop lightmap (run by build_garage.py, sharing its globals:
box, cylinder, M, BAYS, W, ...). Sparse on purpose: at most three per bay, never between the car and the
camera paths (the near side, +z, stays clear beyond the carts).

Each tool bay gets a rolling cart; its tool rests on the top shelf (tools.py places the tools on CART_TOP)."""

CART_TOP = 0.92
# where each bay's cart stands (web x, z): behind the tail, except the body-kit bay, whose camera circles the tail
CARTS = {
    "wheels": (BAYS["wheels"] + 2.9, 1.5),
    "stance": (BAYS["stance"] + 2.9, 1.5),
    "kit": (BAYS["kit"] - 3.0, 1.5),
    "tint": (BAYS["tint"] + 2.9, 1.5),
}
M["tool_amber"] = material("tool_amber", (0.8, 0.38, 0.04), rough=0.45)
M["tool_red"] = material("tool_red", (0.35, 0.03, 0.02), rough=0.4)
M["rubber"] = material("rubber", (0.015, 0.015, 0.016), rough=0.9)


def cart(name, x, z):
    for y in (0.3, CART_TOP - 0.02):
        box(f"{name}_shelf_{y:.1f}", (0.9, 0.04, 0.5), (x, y, z), M["tool_red"], "workshop")
    for sx in (-1, 1):
        for sz in (-1, 1):
            box(f"{name}_leg_{sx:+d}{sz:+d}", (0.03, CART_TOP - 0.06, 0.03), (x + sx * 0.42, (CART_TOP - 0.06) / 2 + 0.06, z + sz * 0.22), M["matte_black"], "workshop")
            cylinder(f"{name}_wheel_{sx:+d}{sz:+d}", 0.03, 0.025, (x + sx * 0.42, 0.03, z + sz * 0.22), M["rubber"], "workshop", segs=12, axis="Z")
    box(f"{name}_handle", (0.03, 0.03, 0.5), (x + 0.5, CART_TOP + 0.05, z), M["chrome"], "workshop")


def compressor(name, x, z):
    cylinder(f"{name}_tank", 0.2, 0.75, (x, 0.32, z), M["tool_red"], "workshop", segs=20, axis="X")
    box(f"{name}_motor", (0.3, 0.2, 0.22), (x - 0.12, 0.6, z), M["matte_black"], "workshop")
    cylinder(f"{name}_gauge", 0.045, 0.02, (x + 0.15, 0.56, z + 0.05), M["chrome"], "workshop", segs=12, axis="Z")
    for sz in (-1, 1):
        cylinder(f"{name}_wheel_{sz:+d}", 0.08, 0.04, (x + 0.3, 0.08, z + sz * 0.2), M["rubber"], "workshop", segs=16, axis="Z")


def jack_stand(name, x, z):
    cylinder(f"{name}_base", 0.12, 0.04, (x, 0.02, z), M["tool_red"], "workshop", segs=16)
    cylinder(f"{name}_post", 0.025, 0.42, (x, 0.25, z), M["chrome"], "workshop", segs=12)
    box(f"{name}_saddle", (0.1, 0.04, 0.06), (x, 0.47, z), M["tool_red"], "workshop")


def cable_reel(name, x, z):
    cylinder(f"{name}_drum", 0.22, 0.12, (x, 0.3, z), M["tool_amber"], "workshop", segs=20, axis="Z")
    cylinder(f"{name}_hub", 0.1, 0.16, (x, 0.3, z), M["rubber"], "workshop", segs=16, axis="Z")
    box(f"{name}_frame", (0.5, 0.04, 0.2), (x, 0.02, z), M["matte_black"], "workshop")


for bay, (cx, cz) in CARTS.items():
    cart(f"cart_{bay}", cx, cz)
compressor("compressor_wheels", BAYS["wheels"] + 3.6, -3.4)
jack_stand("jack_stand_a", BAYS["stance"] + 1.5, -3.3)
jack_stand("jack_stand_b", BAYS["stance"] + 2.1, -3.3)
cable_reel("reel_stance", BAYS["stance"] - 3.4, -3.3)
compressor("compressor_paint", BAYS["paint"] + 4.4, -3.4)
cable_reel("reel_tint", BAYS["tint"] - 3.0, -3.4)


def wall_image(name, tex, x, y, w, h):
    """a picture panel on the far wall (-z), facing into the hall: ComfyUI art from art/comfy/picked/<tex>.
    Dimly self-lit so it reads in the dark between the pools. Skipped until the image is picked."""
    if not image(tex):
        return None
    mat = material(f"panel_{name}", (0.1, 0.1, 0.1), rough=0.8, emit=(1, 1, 1), strength=0.25, tex=tex)
    bm = bmesh.new()
    z = -HW + 0.03
    vs = [bm.verts.new(W(px, py, z)) for px, py in ((x - w / 2, y - h / 2), (x + w / 2, y - h / 2), (x + w / 2, y + h / 2), (x - w / 2, y + h / 2))]
    f = bm.faces.new(vs)
    uv = bm.loops.layers.uv.verify()
    for loop, c in zip(f.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        loop[uv].uv = c
    bm.normal_update()
    return finish(bm, f"panel_{name}", mat, "workshop")


# the far background between bays: a tool wall over the tool chest, a parts shelf between the first two bays
wall_image("tool_wall", "tool_wall.jpg", BAYS["kit"] + 4.6, 2.3, 3.2, 1.6)
wall_image("parts_shelf", "parts_shelf.jpg", (BAYS["wheels"] + BAYS["stance"]) / 2, 2.0, 3.2, 1.6)
