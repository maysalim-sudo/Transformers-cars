from PIL import Image

src = r"C:\Users\Torinou\AppData\Roaming\Hermes\composer-images\ComfyUI_temp_qdxri_00001_a68318.png"
dst = r"E:\Data From Desktop\Coding\Car webste\test with GLM\public\logo.png"
ref = r"E:\Data From Desktop\Coding\Car webste\test with GLM\art\logo-source.png"

im = Image.open(src).convert("RGBA")
alpha = im.split()[3]
bbox = alpha.getbbox()
print("canvas:", im.size, "alpha bbox:", bbox)

pad = 4
l, t, r, b = bbox
l = max(0, l - pad)
t = max(0, t - pad)
r = min(im.width, r + pad)
b = min(im.height, b + pad)
out = im.crop((l, t, r, b))

out.save(dst)
out.save(ref)
print("installed logo:", out.size, "->", dst)

# also keep an opaque white-backed copy for places that need a flat raster
flat = Image.new("RGB", out.size, (255, 255, 255))
flat.paste(out, (0, 0), out)
flat.save(r"E:\Data From Desktop\Coding\Car webste\test with GLM\art\logo-flat.png")
print("flat copy:", flat.size)
