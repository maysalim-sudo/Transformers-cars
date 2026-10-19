from PIL import Image
from collections import Counter

paths = {
    "instagram (large)": r"C:\Users\Torinou\AppData\Roaming\Hermes\composer-images\image_e92ccb.png",
    "tiktok (large)": r"C:\Users\Torinou\AppData\Roaming\Hermes\composer-images\image_223e1b.png",
}

for label, p in paths.items():
    im = Image.open(p).convert("RGB")
    c = Counter(im.getdata())
    golds = []
    for col, n in c.items():
        r, g, b = col
        if r > 140 and 80 < g < 215 and b < 130 and r > b + 55 and r > g + 20:
            golds.append((n, col))
    golds.sort(reverse=True)
    print("=== %s (%dx%d) ===" % (label, im.size[0], im.size[1]))
    if not golds:
        print("  no gold found")
        continue
    tot = [0, 0, 0]
    k = 0
    for n, col in golds:
        for i, v in enumerate(col):
            tot[i] += v * n
        k += n
    avg = [round(v / k) for v in tot]
    print("  gold pixels: %d" % k)
    print("  weighted average gold: #%02x%02x%02x" % tuple(avg))
    print("  top discrete golds:")
    for n, col in golds[:8]:
        print("    #%02x%02x%02x  %d" % (col[0], col[1], col[2], n))
    print()
