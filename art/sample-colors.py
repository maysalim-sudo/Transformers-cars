from PIL import Image
from collections import Counter
import sys

path = r"C:\Users\Torinou\AppData\Roaming\Hermes\composer-images\image_189db3.png"
im = Image.open(path).convert("RGB")
w, h = im.size
print("size:", w, h)

px = list(im.getdata())
c = Counter(px)

def is_bg(rgb):
    r, g, b = rgb
    return r > 240 and g > 240 and b > 240

print("\n--- top 14 colours (discrete) ---")
for col, n in c.most_common(40):
    if is_bg(col):
        continue
    print("  #%02x%02x%02x  %6d  %s" % (col[0], col[1], col[2], n, "(near-white)" if is_bg(col) else ""))
    if n < 40:
        break

print("\n--- most saturated colours (the brand accent) ---")
best = []
for col, n in c.most_common(3000):
    r, g, b = [v / 255 for v in col]
    mx, mn = max(r, g, b), min(r, g, b)
    if mx == 0:
        continue
    sat = (mx - mn) / mx
    if sat > 0.45 and n > 25:
        best.append((sat, n, col))
best.sort(key=lambda t: (-t[0], -t[1]))
for sat, n, col in best[:10]:
    print("  #%02x%02x%02x  sat=%.2f  count=%d" % (col[0], col[1], col[2], sat, n))

print("\n--- average of strongly gold pixels ---")
tot = [0, 0, 0]
k = 0
for col, n in c.items():
    r, g, b = col
    if r > 150 and 90 < g < 210 and b < 110 and r > b + 60:
        for i, v in enumerate(col):
            tot[i] += v * n
        k += n
if k:
    avg = [round(v / k) for v in tot]
    print("  #%02x%02x%02x  over %d px" % (avg[0], avg[1], avg[2], k))
