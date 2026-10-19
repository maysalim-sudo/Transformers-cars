"""
Rebuilds the cars in cars.blend from the GLBs that scripts/export-cars.ts writes to blender/source.

Run inside Blender (Blender MCP or the Text editor) with cars.blend open:
    exec(open(r"<repo>/garage-site/blender/build_cars.py").read(), {"ONLY": ["suv"]})  # or {} for all

Per class: import into its own collection, merge the duplicate vertices of the split-normal export,
clear the imported custom normals (they go stale once vertices merge), cut the wheel arches with one
cutter per wheel, then bevel and smooth by angle. Everything after the clean-up is a modifier, so
widths and angles stay adjustable. In Blender the car's left side faces -Y (glTF +Z) and its nose -X.
"""
import json
import os
import bmesh
import bpy
import mathutils

SRC = os.path.join(os.path.dirname(bpy.data.filepath), "source")
TEX = os.path.join(os.path.dirname(bpy.data.filepath), "textures")
# material role -> (texture written by export-cars.ts, how it is used)
ROLE_TEX = {
    "tread": ("tread", "color"),
    "sidewall": ("sidewall", "color"),
    "discFace": ("disc_face", "color"),
    "grille": ("honeycomb", "color"),
    "carbon": ("carbon", "color"),
    "led": ("lens", "color"),
    "tail": ("lens", "color"),
    "paint": ("paint_flake", "normal"),
}
# set ONLY = ["suv"] before exec() to rebuild just those classes
CLASSES = globals().get("ONLY") or ["hatchback", "sedan", "coupe", "suv", "pickup", "doublecab", "offroad", "desert", "trail"]
OFFSET = {"hatchback": -3.2, "sedan": 0.0, "coupe": 3.2, "suv": 6.4, "pickup": 9.6, "doublecab": 12.8, "offroad": 16.0, "desert": 19.4, "trail": 22.6}  # side by side along Y
PAINT_PARTS = ("fender_", "door_", "bumper_", "body_shell", "hood", "trunk")
# bevel width in model units (220 per metre), by part id prefix
WIDTH = [
    (("fender_", "door_", "mirror_", "side_windows_"), 2.0),
    (("hood", "trunk", "roof", "bumper_", "body_shell"), 6.0),
    (("windshield", "rear_window", "diffuser"), 2.5),
    (("headlight_", "taillight_"), 1.5),
]
CREASE = 0.61  # 35 degrees: only real creases stay sharp
ARCH_GAP = 1.13  # arch radius over tyre radius


def find_lc(lc, name):
    if lc.name == name:
        return lc
    for c in lc.children:
        r = find_lc(c, name)
        if r:
            return r


def wbox(objs):
    pts = [o.matrix_world @ mathutils.Vector(c) for o in objs for c in o.bound_box]
    return (
        mathutils.Vector([min(p[i] for p in pts) for i in range(3)]),
        mathutils.Vector([max(p[i] for p in pts) for i in range(3)]),
    )


def liner_material():
    m = bpy.data.materials.get("arch_liner")
    if not m:
        m = bpy.data.materials.new("arch_liner")
        m.diffuse_color = (0.04, 0.05, 0.06, 1)
    return m


def texture_material(mat, tiling):
    """Wire the role's PNG into a glTF-imported material: tiled on the model-unit UVs, colour maps
    multiplied into the existing base colour, the paint flake as a faint normal map."""
    role = mat.name.split(".")[0]
    if role not in ROLE_TEX or not mat.use_nodes or mat.get("textured"):
        return
    name, use = ROLE_TEX[role]
    path = os.path.join(TEX, name + ".png")
    if not os.path.exists(path):
        return
    img = bpy.data.images.load(path, check_existing=True)
    if not img.packed_file:
        img.pack()  # keeps cars.blend self-contained; blender/textures is regenerated, not committed
    img.colorspace_settings.name = "sRGB" if use == "color" else "Non-Color"
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = next((n for n in nodes if n.type == "BSDF_PRINCIPLED"), None)
    if not bsdf:
        return
    info = tiling.get(name, {"tile": 0, "repeat": [1, 1]})
    sx, sy = info["repeat"]
    if info["tile"]:
        sx = sy = 1 / info["tile"]
    uv = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (sx, sy, 1)
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = img
    links.new(uv.outputs["UV"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], tex.inputs["Vector"])
    if use == "color":
        mix = nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs["Factor"].default_value = 1
        mix.inputs["A"].default_value = bsdf.inputs["Base Color"].default_value
        links.new(tex.outputs["Color"], mix.inputs["B"])
        links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
        if role in ("led", "tail") and "Emission Color" in bsdf.inputs:
            links.new(mix.outputs["Result"], bsdf.inputs["Emission Color"])
    else:
        nm = nodes.new("ShaderNodeNormalMap")
        nm.inputs["Strength"].default_value = 0.06
        links.new(tex.outputs["Color"], nm.inputs["Color"])
        links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    mat["textured"] = True


def build(cls):
    col = bpy.data.collections.get(cls) or bpy.data.collections.new(cls)
    if col.name not in bpy.context.scene.collection.children:
        bpy.context.scene.collection.children.link(col)
    for o in list(col.all_objects):
        bpy.data.objects.remove(o)
    for c in list(col.children):
        bpy.data.collections.remove(c)
    bpy.context.view_layer.active_layer_collection = find_lc(bpy.context.view_layer.layer_collection, cls)

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, cls + ".glb"))
    new = [o for o in bpy.data.objects if o not in before]
    root = [o for o in new if o.parent is None][0]
    root.location.y = OFFSET[cls]

    for o in new:
        if o.type != "MESH":
            continue
        if o.data.users > 1:
            o.data = o.data.copy()
        bm = bmesh.new()
        bm.from_mesh(o.data)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.05)
        bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.01)
        bmesh.ops.join_triangles(bm, faces=bm.faces, angle_face_threshold=0.35, angle_shape_threshold=0.7)
        bm.to_mesh(o.data)
        bm.free()
        for p in o.data.polygons:
            p.use_smooth = True
        if o.data.has_custom_normals:
            with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o], selected_editable_objects=[o]):
                bpy.ops.mesh.customdata_custom_splitnormals_clear()
    bpy.context.view_layer.update()

    # one cutter per wheel, from 12 cm inboard of the tyre to well outside the body
    cc = bpy.data.collections.new(f"{cls}_cutters")
    col.children.link(cc)
    cc.hide_render = True
    for axle in ["front", "rear"]:
        for side in ["left", "right"]:
            w = [o for o in new if o.get("partId") == f"wheel_{axle}_{side}" and o.type == "EMPTY"][0]
            mn, mx = wbox([c for c in w.children_recursive if c.type == "MESH"])
            c = (mn + mx) / 2
            r = (mx.z - mn.z) / 2
            sgn = 1 if side == "right" else -1
            inner = mn.y if side == "right" else mx.y
            outer = mx.y if side == "right" else mn.y
            y0 = inner - sgn * 0.12
            y1 = outer + sgn * 0.6
            bpy.ops.mesh.primitive_cylinder_add(
                vertices=64, radius=r * ARCH_GAP, depth=abs(y1 - y0),
                location=(c.x, (y0 + y1) / 2, c.z + r * 0.04), rotation=(1.5707963, 0, 0),
            )
            cut = bpy.context.active_object
            cut.name = f"{cls}_arch_{axle}_{side}"
            for x in cut.users_collection:
                x.objects.unlink(cut)
            cc.objects.link(cut)
            cut.display_type = "WIRE"
            cut.hide_render = True
            cut.data.materials.append(liner_material())
    # hidden with the eye icon, so the booleans still see the cutters
    find_lc(bpy.context.view_layer.layer_collection, cc.name).hide_viewport = True

    objs = [o for o in new if o.type == "MESH" and o.parent and o.parent.get("partId")]
    for o in objs:
        pid = o.parent["partId"]
        if pid.startswith(PAINT_PARTS) and any(m and m.name.startswith("paint") for m in o.data.materials):
            m = o.modifiers.new("arches", "BOOLEAN")
            m.operation = "DIFFERENCE"
            m.operand_type = "COLLECTION"
            m.collection = cc
            m.solver = "EXACT"
            m.material_mode = "TRANSFER"  # the well takes the cutter's dark liner
            m.use_hole_tolerant = True  # some panels are open shells
        w = next((w for p, w in WIDTH if pid.startswith(p)), None)
        if w:
            b = o.modifiers.new("round", "BEVEL")
            b.width = w
            b.segments = 3
            b.limit_method = "ANGLE"
            b.angle_limit = CREASE
            b.use_clamp_overlap = True
            b.miter_outer = "MITER_SHARP"  # arc mitres spike on the thin faces along the arch cut
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.shade_auto_smooth(use_auto_smooth=True, angle=CREASE)
    bpy.ops.object.select_all(action="DESELECT")

    tiling_path = os.path.join(TEX, "textures.json")
    tiling = json.load(open(tiling_path)) if os.path.exists(tiling_path) else {}
    for o in new:
        if o.type == "MESH":
            for mat in o.data.materials:
                if mat:
                    texture_material(mat, tiling)

    # a panel that grows past its source shape means a boolean or bevel went wrong
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    bad = []
    for o in objs:
        mw = o.matrix_world

        def ext(vs):
            ps = [mw @ v.co for v in vs]
            return [min(p[i] for p in ps) for i in range(3)] + [max(p[i] for p in ps) for i in range(3)]

        a = ext(o.data.vertices)
        e = ext(o.evaluated_get(dg).data.vertices)
        g = max(max(a[i] - e[i] for i in range(3)), max(e[i + 3] - a[i + 3] for i in range(3)))
        if g > 0.005:
            bad.append((o.name, round(g, 3)))
    return {"objects": len(new), "growing": bad}


bpy.ops.wm.save_mainfile()
result = {cls: build(cls) for cls in CLASSES}
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.wm.save_mainfile()
