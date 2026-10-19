"""Render the review shot of one car through a temporary camera, then restore the scene."""
import bpy, math
from mathutils import Vector
sc = bpy.context.scene
target = bpy.data.objects[TARGET]
c = target.matrix_world.translation + Vector((0, 0, 0.55))
old = (sc.camera, sc.render.engine, sc.render.resolution_x, sc.render.resolution_y, sc.render.filepath, sc.render.resolution_percentage)
cam_data = bpy.data.cameras.new("review_cam")
cam_data.lens = 50
cam = bpy.data.objects.new("review_cam", cam_data)
sc.collection.objects.link(cam)
yaw = math.radians(YAW)
d = DIST
cam.location = c + Vector((math.sin(yaw) * d, -math.cos(yaw) * d, d * 0.32))
cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
sc.camera = cam
items = {i.identifier for i in sc.render.bl_rna.properties["engine"].enum_items}
sc.render.engine = ENGINE if ENGINE in items else next(e for e in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT") if e in items)
if "EEVEE" in sc.render.engine:
    sc.eevee.taa_render_samples = 32
sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = 1400, 800, 100
sc.render.filepath = OUT
hidden = []
if SOLO:
    for col in bpy.context.view_layer.layer_collection.children:
        if col.name not in SOLO and not col.exclude and not col.hide_viewport:
            col.hide_viewport = True
            hidden.append(col)
    for o in sc.objects:
        pass
shade = sc.display.shading
prev = (shade.color_type, shade.light)
if ENGINE == "BLENDER_WORKBENCH":
    shade.color_type = COLOR
bpy.ops.render.render(write_still=True)
shade.color_type, shade.light = prev
for col in hidden:
    col.hide_viewport = False
sc.camera, sc.render.engine, sc.render.resolution_x, sc.render.resolution_y, sc.render.filepath, sc.render.resolution_percentage = old
bpy.data.objects.remove(cam)
bpy.data.cameras.remove(cam_data)
print("rendered", OUT)
