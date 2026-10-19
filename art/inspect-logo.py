from PIL import Image, ImageChops
from collections import Counter

src = r"C:\Users\Torinou\AppData\Roaming\Hermes\composer-images\ComfyUI_temp_qdxri_00001_a68318.png"
im = Image.open(src)
print("mode:", im.mode, "size:", im.size)

rgba = im.convert("RGBA")
px = list(rgba.getdata())
alphas = [p[3] for p in px]
print("alpha min/max:", min(alphas), max(alphas))
print("corner pixels:", rgba.getpixel((0, 0)), rgba.getpixel((im.size[0] - 1, 0)))

rgb = rgba.convert("RGB")
bg = Image.new("RGB", rgb.size, (255, 255, 255))
diff = ImageChops.difference(rgb, bg).convert("L")
mask = diff.point(lambda p: 255 if p > 16 else 0)
print("content bbox (vs white):", mask.getbbox())

c = Counter(px)
print("\ntop colours:")
for col, n in c.most_common(10):
    print("  rgba(%d,%d,%d,%d)  %d" % (col[0], col[1], col[2], col[3], n))

# gold, on pixels that are actually opaque
golds = [(n, col) for col, n in c.items() if col[3] > 200 and col[0] > 140 and 80 < col[1] < 215 and col[2] < 130 and col[0] > col[2] + 55 and col[0] > col[1] + 20]
golds.sort(reverse=True)
if golds:
    tot = [0, 0, 0]
    k = 0
    for n, col in golds:
        for i in range(3):
            tot[i] += col[i] * n
        k += n
    avg = [round(v / k) for v in tot]
    print("\nweighted average gold: #%02x%02x%02x over %d px" % (avg[0], avg[1], avg[2], k))
    print("top golds:", ["#%02x%02x%02x" % (c2[0], c2[1], c2[2]) for _, c2 in golds[:6]])
