"""python -I run_shot.py <target> <yaw> <dist> <workbench|eevee> <out.png> [partcolours]"""
import os, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
target, yaw, dist, eng, out = sys.argv[1:6]
colours = len(sys.argv) > 6
pre = f"TARGET={target!r}; YAW={float(yaw)}; DIST={float(dist)}; ENGINE={'BLENDER_WORKBENCH' if eng == 'workbench' else 'BLENDER_EEVEE_NEXT'!r}; COLOR={'OBJECT' if colours else 'MATERIAL'!r}; SOLO=None; OUT={os.path.join(here, out)!r}\n"
if colours:
    pre += """
import bpy, hashlib
for o in bpy.data.objects[TARGET].children_recursive:
    if o.type == "MESH" and o.parent:
        h = hashlib.md5(o.parent.name.split(".")[0].encode()).digest()
        o.color = (h[0] / 255, h[1] / 255, h[2] / 255, 1)
"""
code = pre + open(os.path.join(here, "shot.py"), encoding="utf8").read()
tmp = os.path.join(here, "_shot_run.py")
open(tmp, "w", encoding="utf8").write(code)
subprocess.run([sys.executable, "-I", os.path.join(here, "bl.py"), tmp])
