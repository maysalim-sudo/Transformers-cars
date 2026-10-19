"""Send a Python file to the MCP for Blender add-on (execute_code) and print the result.
Usage: python -I bl.py <code.py> [timeout_s]   |   python -I bl.py --cmd <type> [json params]"""
import json, socket, sys

if sys.argv[1] == "--cmd":
    msg = {"type": sys.argv[2], "params": json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}}
    timeout = 120
else:
    msg = {"type": "execute_code", "params": {"code": open(sys.argv[1], encoding="utf8").read()}}
    timeout = float(sys.argv[2]) if len(sys.argv) > 2 else 600

s = socket.create_connection(("127.0.0.1", 9876), timeout=5)
s.sendall(json.dumps(msg).encode())
s.settimeout(timeout)
buf = b""
while True:
    chunk = s.recv(1 << 20)
    if not chunk:
        break
    buf += chunk
    try:
        json.loads(buf)
        break
    except ValueError:
        pass
s.close()
r = json.loads(buf)
res = r.get("result", r)
if isinstance(res, dict) and "result" in res:
    res = res["result"]
print(res if isinstance(res, str) else json.dumps(res, indent=1))
