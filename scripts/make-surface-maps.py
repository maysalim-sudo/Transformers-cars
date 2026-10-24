"""Make the garage's surface maps from the picked ComfyUI albedos, for the live scene.

usage: python3 -I scripts/make-surface-maps.py

The picked epoxy is almost uniform (std-dev 4/255), so on screen the floor read as a flat grey sheet.
From art/comfy/picked/{epoxy_floor,wall_panel}.jpg this writes to public/garage/:
  floor_albedo.webp  speckle lifted out of the flat albedo, a touch darker so the LED reflections read
  floor_rough.webp   roughness: glossy epoxy broken up by speckle and large soft wear patches
  floor_normal.webp  fine relief from the speckle (512 px)
  wall_normal.webp   relief of the acoustic panels
All filtering is periodic (FFT), so the tiles stay seamless.
"""
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path("art/comfy/picked")
OUT = Path("public/garage")
SIZE = 1024


def load(name: str) -> np.ndarray:
    return np.asarray(Image.open(SRC / f"{name}.jpg").convert("RGB").resize((SIZE, SIZE), Image.LANCZOS), dtype=np.float64) / 255


def blur(a: np.ndarray, sigma: float) -> np.ndarray:
    """Gaussian blur with wrap-around edges (multiplication in the frequency domain)."""
    f = np.fft.fftfreq(a.shape[0])
    g = np.exp(-2 * (np.pi * sigma) ** 2 * (f[:, None] ** 2 + f[None, :] ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(a) * g))


def noise(sigma: float, seed: int) -> np.ndarray:
    """Seamless soft noise in -1..1."""
    n = blur(np.random.default_rng(seed).standard_normal((SIZE, SIZE)), sigma)
    return n / np.abs(n).max()


def normal_map(height: np.ndarray, strength: float) -> np.ndarray:
    dx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * strength
    dy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * strength
    n = np.stack([-dx, -dy, np.ones_like(height)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n * 0.5 + 0.5


def save(a: np.ndarray, name: str, quality: int = 85, size: int = SIZE) -> None:
    img = Image.fromarray((np.clip(a, 0, 1) * 255).round().astype(np.uint8)).resize((size, size), Image.LANCZOS)
    path = OUT / f"{name}.webp"
    img.save(path, "WEBP", quality=quality, method=6)
    print(f"{path} {path.stat().st_size // 1024} KB")


floor = load("epoxy_floor")
luma = floor.mean(-1)
speckle = luma - blur(luma, 6)
speckle /= np.abs(speckle).max()
wear = noise(60, 7)
# albedo: the original grey, lifted speckle, faint large-scale variation
albedo = floor * 0.86 + speckle[..., None] * 0.07 + wear[..., None] * 0.025
save(albedo, "floor_albedo")
# roughness (three.js reads the green channel): glossy base, speckle and wear patches
rough = 0.3 + speckle * 0.06 + np.maximum(wear, 0) * 0.22
save(np.repeat(rough[..., None], 3, -1), "floor_rough")
# fine relief: half resolution is plenty over a 2 m tile, and a quarter of the bytes
save(normal_map(speckle * 0.5 + blur(noise(2, 11), 1) * 0.15, 3.0), "floor_normal", quality=80, size=512)

wall = load("wall_panel").mean(-1)
save(normal_map(blur(wall, 1.2) - blur(wall, 24), 9.0), "wall_normal")
