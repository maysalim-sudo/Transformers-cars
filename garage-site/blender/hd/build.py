"""Rebuild one HD class in the open Blender through the MCP for Blender add-on (socket on 127.0.0.1:9876).
Usage: python -I build.py sedan|coupe|hatchback|suv|pickup|doublecab|offroad|desert|trail
The script sent is hd_lib.py + classes/<class>_cfg.py + hd_build.py; sedan uses hd_build.py's defaults."""
import os, subprocess, sys, tempfile

here = os.path.dirname(os.path.abspath(__file__))
cls = sys.argv[1]
parts = [os.path.join(here, "hd_lib.py")]
if cls != "sedan":
    parts.append(os.path.join(here, "classes", f"{cls}_cfg.py"))
parts.append(os.path.join(here, "hd_build.py"))
code = "\n".join(open(p, encoding="utf8").read() for p in parts)
fd, tmp = tempfile.mkstemp(suffix=".py", prefix=f"hd_{cls}_")
with os.fdopen(fd, "w", encoding="utf8") as f:
    f.write(code)
try:
    subprocess.run([sys.executable, "-I", os.path.join(here, "bl.py"), tmp], check=True)
finally:
    os.remove(tmp)
