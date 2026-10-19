from PIL import Image, ImageChops

src = r"E:\Data From Desktop\Coding\Car webste\test with GLM\public\logo.png"
dst = r"E:\Data From Desktop\Coding\Car webste\test with GLM\public\logo.png"

im = Image.open(src).convert("RGB")
w, h = im.size
bg = Image.new("RGB", im.size, (255, 255, 255))
diff = ImageChops.difference(im, bg).convert("L")
mask = diff.point(lambda p: 255 if p > 16 else 0)
bbox = mask.getbbox()
print("source:", w, h, "content bbox:", bbox)

if bbox:
    pad = 4
    l = max(0, bbox[0] - pad)
    t = max(0, bbox[1] - pad)
    r = min(w, bbox[2] + pad)
    b = min(h, bbox[3] + pad)
    cropped = im.crop((l, t, r, b))
    cropped = cropped.resize((cropped.width * 3, cropped.height * 3), Image.LANCZOS)
    cropped.save(dst)
    print("saved:", cropped.size)
else:
    print("no content found; left as-is")
