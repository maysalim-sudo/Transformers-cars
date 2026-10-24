"""Pack garage images for the web.

usage:
  python3 -I scripts/pack-assets.py <src> <dest.webp> --max <px> [--quality 82] [--tile]
  python3 -I scripts/pack-assets.py --sheet <dir> <dest.jpg>

--max   longest side in pixels after resizing (never upscales)
--tile  make the image tile seamlessly: blend each edge with the opposite one (half-offset crossfade)
--sheet contact sheet of every PNG in <dir>, labelled with the file name, for picking candidates
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw


def make_tileable(img: Image.Image) -> Image.Image:
    """Crossfade the image with a copy shifted by half its size, weighted toward the shifted copy at the edges."""
    w, h = img.size
    shifted = Image.new(img.mode, (w, h))
    shifted.paste(img.crop((w // 2, h // 2, w, h)), (0, 0))
    shifted.paste(img.crop((0, h // 2, w // 2, h)), (w - w // 2, 0))
    shifted.paste(img.crop((w // 2, 0, w, h // 2)), (0, h - h // 2))
    shifted.paste(img.crop((0, 0, w // 2, h // 2)), (w - w // 2, h - h // 2))
    mask = Image.new("L", (w, h))
    px = mask.load()
    for y in range(h):
        for x in range(w):
            # 255 at the centre (keep the original), 0 at the borders (use the seamless shifted copy)
            d = min(x, w - 1 - x, y, h - 1 - y) / (min(w, h) / 4)
            px[x, y] = int(255 * min(1.0, d))
    return Image.composite(img, shifted, mask)


def pack(src: str, dest: str, max_px: int, quality: int, tile: bool) -> None:
    img = Image.open(src).convert("RGB")
    if tile:
        img = make_tileable(img)
    img.thumbnail((max_px, max_px), Image.LANCZOS)
    Path(dest).parent.mkdir(parents=True, exist_ok=True)
    if dest.endswith(".jpg"):
        img.save(dest, "JPEG", quality=quality, optimize=True, progressive=True)
    else:
        img.save(dest, "WEBP", quality=quality, method=6)
    print(f"{dest} {img.size[0]}x{img.size[1]} {Path(dest).stat().st_size // 1024} KB")


def sheet(folder: str, dest: str) -> None:
    files = sorted(p for p in Path(folder).glob("*.png") if not p.name.endswith("-up.png"))
    cell = 360
    cols = 4
    rows = (len(files) + cols - 1) // cols
    out = Image.new("RGB", (cols * cell, rows * (cell + 28)), "#111")
    draw = ImageDraw.Draw(out)
    for i, f in enumerate(files):
        im = Image.open(f).convert("RGB")
        im.thumbnail((cell - 8, cell - 8))
        x, y = (i % cols) * cell, (i // cols) * (cell + 28)
        out.paste(im, (x + 4, y + 4))
        draw.text((x + 6, y + cell + 4), f.stem, fill="#eee")
    out.save(dest, quality=85)
    print(f"{dest} ({len(files)} images)")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a and a[0] == "--sheet":
        sheet(a[1], a[2])
    else:
        opt = lambda k, d: a[a.index(k) + 1] if k in a else d
        pack(a[0], a[1], int(opt("--max", "2048")), int(opt("--quality", "82")), "--tile" in a)
