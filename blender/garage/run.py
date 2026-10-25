"""Run a garage script in Blender.
Usage: python -I run.py <script.py> [key=value ...] [--timeout seconds] [--mcp]

Default: headless `blender -b blender/garage/garage.blend --python <script>` (factory startup if the .blend does
not exist yet); scripts that change the scene save it themselves. --mcp sends the script to the open Blender
through the MCP for Blender add-on (socket on 127.0.0.1:9876) instead.

The script receives LAYOUT (src/garage/layout.json as a dict), ROOT (the repo root, absolute) and ARGS
(the key=value pairs as a dict of strings), prepended as Python globals."""
import json, os, subprocess, sys, tempfile

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.abspath(os.path.join(here, "..", ".."))
argv = [a for a in sys.argv[1:] if a != "--mcp"]
timeout = "600"
if "--timeout" in argv:
    i = argv.index("--timeout")
    timeout = argv[i + 1]
    del argv[i : i + 2]
script, *pairs = argv
layout = json.load(open(os.path.join(root, "src", "garage", "layout.json"), encoding="utf8"))
args = dict(p.split("=", 1) for p in pairs)
head = f"LAYOUT = {json.dumps(layout)}\nROOT = {json.dumps(root)}\nARGS = {json.dumps(args)}\nBLEND = {json.dumps(os.path.join(here, 'garage.blend'))}\n"
code = head + open(script, encoding="utf8").read()
fd, tmp = tempfile.mkstemp(suffix=".py", prefix="garage_")
with os.fdopen(fd, "w", encoding="utf8") as f:
    f.write(code)
blend = os.path.join(here, "garage.blend")
try:
    if "--mcp" in sys.argv:
        subprocess.run([sys.executable, "-I", os.path.join(here, "..", "hd", "bl.py"), tmp, timeout], check=True)
    else:
        cmd = ["blender", "-b"] + ([blend] if os.path.exists(blend) else ["--factory-startup"])
        cmd += ["--python-exit-code", "1", "--python", tmp]
        subprocess.run(cmd, check=True, timeout=float(timeout))
finally:
    os.remove(tmp)
