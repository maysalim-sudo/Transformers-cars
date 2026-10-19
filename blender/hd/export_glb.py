"""Export each HD car (collection <class>_hd) to garage-site/public/models/hd/<class>.glb.
Send through bl.py with OUT set, e.g. via export.py. The car's root is moved to the origin for the export and put
back afterwards. glTF is y-up, so the car's left side (-Y in Blender) lands on +z and its nose on -x, as in buildCar.
Part ids travel as node extras (glTF 'extras' -> three.js userData.partId)."""
import bpy, json, os

CLASSES = ["hatchback", "sedan", "coupe", "suv", "pickup", "doublecab", "offroad", "desert", "trail"]
bpy.context.window.scene = bpy.data.scenes["Scene"]
os.makedirs(OUT, exist_ok=True)
sizes = {}
for cls in CLASSES:
    col = bpy.data.collections[f"{cls}_hd"]
    root = bpy.data.objects[f"car_{cls}_hd"]
    keep = root.location.copy()
    root.location = (0, 0, 0)
    bpy.context.view_layer.update()
    bpy.ops.object.select_all(action="DESELECT")
    for o in col.all_objects:
        o.hide_set(False)
        o.select_set(True)
    path = os.path.join(OUT, f"{cls}.glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True,
                              export_extras=True, export_yup=True, export_cameras=False, export_lights=False,
                              export_animations=False)
    root.location = keep
    sizes[cls] = round(os.path.getsize(path) / 1024)
bpy.ops.object.select_all(action="DESELECT")
print(json.dumps(sizes))
