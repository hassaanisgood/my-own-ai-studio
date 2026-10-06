#!/usr/bin/env python3
"""Render the original placeholder imagery and video clips used by the mock provider.

Everything here is procedurally generated (numpy + Pillow + ffmpeg) so the
mock gallery contains no third-party or copyrighted imagery.

    python3 scripts/generate_assets.py            # images + videos
    python3 scripts/generate_assets.py images     # images only
    python3 scripts/generate_assets.py webm       # VP9 alternates for existing MP4s
"""
from __future__ import annotations

import math
import os
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "mock")

IMAGE_SIZES = {
    "1x1": (1200, 1200),
    "4x5": (1080, 1350),
    "3x2": (1500, 1000),
    "16x9": (1600, 900),
    "9x16": (900, 1600),
}
VIDEO_SIZES = {
    "16x9": (960, 540),
    "9x16": (540, 960),
    "1x1": (720, 720),
}
FPS = 24
VIDEO_SECONDS = 10


# ----------------------------------------------------------------- helpers
def hexc(h: str) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)], dtype=np.float32)


def grid(w, h):
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    return x / w, y / h


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0 + 1e-9), 0, 1)
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    t = t[..., None] if np.ndim(t) and np.ndim(t) == 2 else t
    return a + (b - a) * t


def gradient(t, stops):
    """Multi-stop gradient. t: HxW in 0..1, stops: [(pos, hex)]."""
    out = np.zeros(t.shape + (3,), np.float32)
    pos = [p for p, _ in stops]
    cols = [hexc(c) for _, c in stops]
    for ch in range(3):
        out[..., ch] = np.interp(t, pos, [c[ch] for c in cols])
    return out


def noise2(w, h, cells, seed, offset=(0.0, 0.0)):
    """Bicubic value noise. `offset` pans the field (in cells) continuously."""
    rng = np.random.default_rng(seed)
    cx = max(1, int(cells * w / max(w, h)))
    cy = max(1, int(cells * h / max(w, h)))
    gx, gy = cx + 4, cy + 4
    g = rng.random((gy, gx)).astype(np.float32)
    kx, ky = int(math.floor(offset[0])), int(math.floor(offset[1]))
    fx, fy = offset[0] - kx, offset[1] - ky
    g = np.roll(g, (-ky, -kx), axis=(0, 1))
    cw, ch = w / cx, h / cy
    big = Image.fromarray(g, mode="F").resize((int(round(cw * gx)), int(round(ch * gy))), Image.BICUBIC)
    ox, oy = int((1 + fx) * cw), int((1 + fy) * ch)
    arr = np.asarray(big, dtype=np.float32)[oy : oy + h, ox : ox + w]
    if arr.shape != (h, w):
        arr = np.asarray(big.resize((w, h), Image.BICUBIC), dtype=np.float32)
    return arr


def fbm(w, h, cells, seed, octaves=4, offset=(0.0, 0.0)):
    total = np.zeros((h, w), np.float32)
    amp, norm = 1.0, 0.0
    for o in range(octaves):
        total += amp * noise2(w, h, cells * 2**o, seed + o * 17, (offset[0] * 2**o, offset[1] * 2**o))
        norm += amp
        amp *= 0.5
    return total / norm


def noise1(n, cells, seed, phase=0.0):
    rng = np.random.default_rng(seed)
    pts = rng.random(cells + 3)
    x = np.linspace(0, cells, n) + phase
    i = np.floor(x).astype(int) % (cells + 2)
    f = x - np.floor(x)
    f = f * f * (3 - 2 * f)
    return pts[i] * (1 - f) + pts[(i + 1) % (cells + 3)] * f


def fbm1(n, cells, seed, octaves=5, phase=0.0, ridged=False):
    total = np.zeros(n)
    amp, norm = 1.0, 0.0
    for o in range(octaves):
        v = noise1(n, cells * 2**o, seed + o * 31, phase * 2**o)
        if ridged:
            v = 1 - np.abs(v * 2 - 1)
        total += amp * v
        norm += amp
        amp *= 0.5
    return total / norm


def blur(img, radius):
    pil = Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))
    return np.asarray(pil.filter(ImageFilter.GaussianBlur(radius)), np.float32) / 255


def blur_mask(mask, radius):
    pil = Image.fromarray(np.clip(mask * 255, 0, 255).astype(np.uint8), mode="L")
    return np.asarray(pil.filter(ImageFilter.GaussianBlur(radius)), np.float32) / 255


def finish(img, seed, grain=0.018, vignette=0.28):
    h, w = img.shape[:2]
    x, y = grid(w, h)
    d = np.sqrt((x - 0.5) ** 2 + (y - 0.5) ** 2) / 0.7071
    img = img * (1 - vignette * smooth(0.35, 1.0, d))[..., None]
    rng = np.random.default_rng(seed + 999)
    img = img + rng.normal(0, grain, img.shape[:2])[..., None].astype(np.float32)
    return np.clip(img, 0, 1)


def to_pil(img):
    return Image.fromarray(np.clip(img * 255 + 0.5, 0, 255).astype(np.uint8))


def comp(base, color, mask):
    m = mask[..., None]
    return base * (1 - m) + color * m


def ridge_mask(w, h, line):
    """Pixels below a 1D ridge line (values in px rows) with ~1px antialias."""
    y = np.arange(h, dtype=np.float32)[:, None]
    return np.clip(y - line[None, :] + 0.5, 0, 1)


# ----------------------------------------------------------------- scenes
def scene_dunes(w, h, seed, t=0.0):
    x, y = grid(w, h)
    s = max(w, h)
    horizon = 0.56 if h <= w else 0.52
    sky = gradient(y / horizon, [(0, "#1b1840"), (0.45, "#5b3a6e"), (0.78, "#d9776a"), (1, "#f6c58f")])
    sun_x, sun_y = 0.68, horizon - 0.11
    d = np.sqrt(((x - sun_x) * w) ** 2 + ((y - sun_y) * h) ** 2) / s
    sky = sky + hexc("#ffd8a8") * (np.exp(-d * 9) * 0.55)[..., None]
    sky = comp(sky, hexc("#fff1d6"), smooth(0.052, 0.048, d))
    img = sky
    layers = [
        ("#c9705a", "#7d3c45", 0.0, 0.035, 0.6),
        ("#b85f4c", "#5e2b3a", 0.09, 0.05, 0.75),
        ("#a14f40", "#3d1c2c", 0.2, 0.07, 0.9),
        ("#8a3f35", "#24111d", 0.34, 0.09, 1.0),
    ]
    for i, (lit, shade, off, amp, sharp) in enumerate(layers):
        base = (horizon + off) * h
        n = fbm1(w, 3 + i, seed + i * 7, 4, phase=t * 0.05 * (i + 1))
        crest = base - (np.sin(np.linspace(0, math.pi * (1.3 + i * 0.4), w) + seed + i) * 0.5 + n) * amp * h
        mask = ridge_mask(w, h, crest)
        depth = np.clip((np.arange(h)[:, None] - crest[None, :]) / (0.16 * h), 0, 1)
        # rim light along the crest, falling into shade below
        rim = smooth(0.25, 0.0, depth) * (0.35 + 0.65 * smooth(0.2, 0.8, x))
        col = lerp(hexc(lit), hexc(shade), np.clip(depth * 0.9, 0, 1))
        col = col + hexc("#ffb58a") * (rim * 0.22 * sharp)[..., None]
        if i == len(layers) - 1:
            warp = fbm(w, h, 3, seed + 40, 3)
            phase = (y * h / max(w, h)) * 34 + warp * 3.5 + x * 2.2
            saw = phase % 1.0
            ridges = np.where(saw < 0.82, saw / 0.82, (1 - saw) / 0.18)
            col = col * (0.9 + 0.16 * ridges * depth)[..., None]
        haze = (1 - i / len(layers)) * 0.35
        col = lerp(col, hexc("#e4927a"), haze)
        img = comp(img, col, mask)
    return finish(img, seed)


def scene_alpine(w, h, seed, t=0.0):
    x, y = grid(w, h)
    sky = gradient(y, [(0, "#0d1b2a"), (0.35, "#21405a"), (0.62, "#8fb3c4"), (1, "#d9e6ea")])
    img = sky
    rng = np.random.default_rng(seed)
    stars = (rng.random((h, w)) > 0.9993).astype(np.float32) * smooth(0.45, 0.0, y)
    img = img + blur_mask(stars, 0.6)[..., None] * 1.8
    palette = ["#6f8fa3", "#4f6f84", "#36546a", "#223b4f", "#132636"]
    for i, c in enumerate(palette):
        base = (0.42 + i * 0.1) * h
        ridge = fbm1(w, 2 + i, seed + i * 11, 6, ridged=True)
        line = base - ridge * (0.28 - i * 0.03) * h
        mask = ridge_mask(w, h, line)
        depth = np.clip((np.arange(h)[:, None] - line[None, :]) / (0.35 * h), 0, 1)
        col = lerp(hexc(c), hexc(c) * 0.55, depth)
        # snow caps on the far ridges
        if i < 2:
            snow = smooth(0.06 * h, 0.0, np.arange(h)[:, None] - line[None, :]) * smooth(0.5, 0.8, ridge)[None, :]
            col = lerp(col, hexc("#e8f0f2"), snow * 0.8)
        img = comp(img, col, mask)
        fog_y = base + 0.02 * h
        fog = smooth(0.09, 0.0, np.abs(y - fog_y / h)) * fbm(w, h, 4, seed + 70 + i, 3, (t * 0.04 * (i + 1), 0)) * 0.55
        img = lerp(img, hexc("#c9d9df"), fog)
    return finish(img, seed, vignette=0.32)


def blobs_field(w, h, seed, t=0.0, palette=None, warp=0.22):
    x, y = grid(w, h)
    aspect = w / h
    xs = x * aspect
    wx = fbm(w, h, 2.5, seed + 1, 3, (t * 0.07, t * 0.03)) - 0.5
    wy = fbm(w, h, 2.5, seed + 2, 3, (t * 0.03, t * 0.06)) - 0.5
    xs = xs + wx * warp * 2
    ys = y + wy * warp * 2
    rng = np.random.default_rng(seed)
    palette = palette or ["#ff5e7e", "#ffb15c", "#7b5cff", "#1fd1c1", "#2a1b5c"]
    acc = np.zeros((h, w, 3), np.float32)
    wsum = np.zeros((h, w), np.float32)
    for i, c in enumerate(palette * 2):
        cx = rng.random() * aspect + math.sin(t * 0.6 + i) * 0.08
        cy = rng.random() + math.cos(t * 0.5 + i * 1.7) * 0.08
        r = 0.18 + rng.random() * 0.3
        wgt = np.exp(-(((xs - cx) ** 2 + (ys - cy) ** 2) / (r * r)))
        acc += hexc(c) * wgt[..., None]
        wsum += wgt
    img = acc / (wsum[..., None] + 0.08)
    return img, xs, ys


def scene_fluid(w, h, seed, t=0.0):
    img, xs, ys = blobs_field(w, h, seed, t)
    # silky contour highlights
    f = fbm(w, h, 3, seed + 9, 3, (t * 0.05, 0))
    bands = np.sin((xs * 3 + ys * 5 + f * 6) * math.pi * 1.6)
    img = img + (smooth(0.92, 1.0, bands) * 0.12)[..., None]
    img = img * (0.85 + 0.25 * smooth(0.2, 0.9, f))[..., None]
    return finish(img, seed, grain=0.022, vignette=0.2)


def sphere_shade(w, h, cx, cy, r, env_rot=0.0, tint="#d7dde6"):
    """Chrome sphere using a procedural environment map. Returns (rgb, mask)."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    nx = (x - cx) / r
    ny = (y - cy) / r
    rr = nx * nx + ny * ny
    mask = np.clip((1 - np.sqrt(rr)) * r, 0, 1)
    nz = np.sqrt(np.clip(1 - rr, 0, 1))
    # reflect view vector (0,0,-1) about the normal
    rx, ry, rz = 2 * nz * nx, 2 * nz * ny, 2 * nz * nz - 1
    ang = np.arctan2(rx, rz) + env_rot
    elev = -ry
    env = gradient(np.clip(0.5 - elev * 0.5, 0, 1), [(0, "#fbf6ee"), (0.45, "#9fb4cc"), (0.5, "#20242c"), (0.62, "#c78f6a"), (1, "#3a2a24")])
    stripes = smooth(0.9, 0.97, np.cos(ang * 3)) * smooth(-0.1, 0.4, elev)
    env = env + stripes[..., None] * 0.6
    fres = (1 - nz) ** 3
    col = env * hexc(tint) + fres[..., None] * 0.25
    return col, mask


def scene_chrome(w, h, seed, t=0.0):
    x, y = grid(w, h)
    bg = gradient(y, [(0, "#e9e2d8"), (0.62, "#cfc3b3"), (0.621, "#b9a894"), (1, "#8f7b67")])
    img = bg
    s = min(w, h)
    rng = np.random.default_rng(seed)
    floor = 0.62 * h
    spheres = [(0.5 * w, floor - 0.2 * s, 0.2 * s), (0.5 * w - 0.33 * s, floor - 0.08 * s, 0.08 * s), (0.5 * w + 0.3 * s, floor - 0.11 * s, 0.11 * s)]
    for i, (cx, cy, r) in enumerate(sorted(spheres, key=lambda v: v[2])):
        cx += rng.normal(0, 0.01) * w
        sh = np.exp(-(((x * w - cx) / (r * 1.3)) ** 2 + ((y * h - floor - r * 0.04) / (r * 0.18)) ** 2))
        img = img * (1 - 0.55 * sh)[..., None]
    for i, (cx, cy, r) in enumerate(spheres):
        col, mask = sphere_shade(w, h, cx, cy, r, env_rot=t * 0.5 + i)
        img = comp(img, col, mask)
    return finish(img, seed, grain=0.012, vignette=0.25)


def scene_product(w, h, seed, t=0.0):
    x, y = grid(w, h)
    X, Y = x * w, y * h
    s = min(w, h)
    horizon = 0.64
    wall = gradient(y / horizon, [(0, "#c7b6a3"), (1, "#e8dccd")])
    flo = gradient((y - horizon) / (1 - horizon), [(0, "#d9cab8"), (1, "#a8937e")])
    img = np.where((y < horizon)[..., None], wall, flo)
    # window light patch
    lx = 0.28 + 0.03 * math.sin(t * 0.4)
    patch = smooth(0.06, 0.0, np.abs(x - lx - (y - 0.2) * 0.25) - 0.08) * smooth(0.75, 0.6, y) * smooth(0.1, 0.25, y)
    img = img + blur_mask(patch, s * 0.01)[..., None] * hexc("#fff4e2") * 0.18
    cx = 0.5 * w
    top = horizon * h + 0.02 * s
    pw, ph = 0.26 * s, 0.17 * s
    # plinth shadow
    shadow = np.exp(-(((X - cx - 0.12 * s) / (pw * 1.3)) ** 2 + ((Y - top - ph - 0.01 * s) / (0.03 * s)) ** 2))
    img = img * (1 - 0.35 * shadow)[..., None]
    # plinth (cylinder)
    u = (X - cx) / pw
    inside = (np.abs(u) < 1) & (Y > top) & (Y < top + ph)
    lam = np.clip(0.5 - u * 0.45, 0.1, 1)
    plinth = lerp(hexc("#8a7967"), hexc("#efe6da"), lam)
    img = np.where(inside[..., None], plinth, img)
    bottom_ell = ((X - cx) / pw) ** 2 + ((Y - top - ph) / (pw * 0.18)) ** 2 < 1
    img = np.where((bottom_ell & (Y > top + ph))[..., None], plinth, img)
    top_ell = ((X - cx) / pw) ** 2 + ((Y - top) / (pw * 0.18)) ** 2 < 1
    img = np.where(top_ell[..., None], hexc("#f4ece2"), img)
    # vessel: revolved profile
    vh = 0.5 * s
    vbase = top + 0.01 * s
    v = np.clip((vbase - Y) / vh, 0, 1)
    prof = 0.07 + 0.11 * np.sin(np.clip(v, 0, 1) * math.pi * 0.95) ** 1.4 - 0.05 * smooth(0.75, 1.0, v) + 0.02 * smooth(0.93, 1.0, v)
    rpx = prof * s
    uu = (X - cx) / np.maximum(rpx, 1)
    vessel = (np.abs(uu) < 1) & (Y < vbase) & (Y > vbase - vh)
    nz = np.sqrt(np.clip(1 - uu * uu, 0, 1))
    light = np.array([-0.55, -0.3, 0.78])
    light = light / np.linalg.norm(light)
    ndl = np.clip(uu * light[0] + nz * light[2] + (-0.2) * light[1], 0, 1)
    spec = np.clip(uu * 0.4 + nz * 0.9, 0, 1) ** 40
    glaze = lerp(hexc("#1f3b3a"), hexc("#5f8f86"), ndl) + spec[..., None] * 0.55
    speck = (fbm(w, h, 60, seed + 3, 2) > 0.72).astype(np.float32) * 0.06
    glaze = glaze - speck[..., None]
    edge = np.clip((1 - np.abs(uu)) * rpx, 0, 1)
    img = comp(img, glaze, vessel * edge)
    rim = (((X - cx) / (rpx + 1)) ** 2 + ((Y - (vbase - vh)) / (rpx * 0.16 + 1)) ** 2) < 1
    img = np.where((rim & (Y < vbase - vh + 0.02 * s) & (Y > vbase - vh - 0.03 * s))[..., None], hexc("#0f1f1f"), img)
    return finish(img, seed, grain=0.01, vignette=0.22)


def scene_arches(w, h, seed, t=0.0):
    x, y = grid(w, h)
    X, Y = x * w, y * h
    s = min(w, h)
    sky = gradient(y, [(0, "#7fb3d5"), (1, "#f2d4b8")])
    wall = gradient(y, [(0, "#e7a98a"), (1, "#c97a5f")])
    img = wall
    n = 3 if w >= h else 2
    aw = w / (n + 1.2)
    opening = np.zeros((h, w), np.float32)
    for i in range(n):
        cx = (i + 0.6) * (w / n) + (w / n - aw) * 0
        cx = w * (i + 0.5) / n
        half = aw * 0.32
        top = 0.28 * h
        rect = (np.abs(X - cx) < half) & (Y > top) & (Y < 0.86 * h)
        circ = ((X - cx) ** 2 + (Y - top) ** 2) < half**2
        opening = np.maximum(opening, (rect | circ).astype(np.float32))
    opening = blur_mask(opening, 0.8)
    # inner depth (reveal) on the shadow side
    reveal = blur_mask(np.roll(opening, int(0.03 * s), axis=1), 0.8) * (1 - opening)
    img = comp(img, hexc("#a85e48"), np.clip(reveal, 0, 1))
    img = comp(img, sky, opening)
    # distant sea + sun through the arches
    sea = smooth(0.66, 0.665, y)
    img = comp(img, lerp(hexc("#2f6d8f"), hexc("#16384f"), smooth(0.66, 0.86, y)), sea * opening)
    # floor
    floor = smooth(0.86, 0.862, y)
    img = comp(img, gradient(np.clip((y - 0.86) / 0.14, 0, 1), [(0, "#d99a7c"), (1, "#a4644d")]), floor)
    # long diagonal cast shadow
    shade = ((X - Y * 0.6 + t * 30) % (w / n)) < (w / n) * 0.45
    img = img * (1 - 0.18 * blur_mask(shade.astype(np.float32), s * 0.01) * (1 - opening * (1 - floor)))[..., None]
    return finish(img, seed, grain=0.014, vignette=0.24)


def scene_ocean(w, h, seed, t=0.0):
    x, y = grid(w, h)
    horizon = 0.55
    sky = gradient(y / horizon, [(0, "#060b1d"), (0.6, "#1a2a52"), (1, "#4d5d8c")])
    rng = np.random.default_rng(seed)
    stars = (rng.random((h, w)) > 0.9992).astype(np.float32) * smooth(0.9, 0.3, y / horizon)
    tw = 0.6 + 0.4 * np.sin(rng.random((h, w)) * 6.28 + t * 3)
    sky = sky + blur_mask(stars * tw, 0.7)[..., None] * 1.6
    mx, my = 0.62, 0.24
    d = np.sqrt(((x - mx) * w) ** 2 + ((y - my) * h) ** 2) / min(w, h)
    sky = sky + hexc("#c9d6ff") * (np.exp(-d * 7) * 0.35)[..., None]
    moon = smooth(0.062, 0.058, d)
    crater = fbm(w, h, 30, seed + 5, 3) * 0.15
    sky = comp(sky, hexc("#f4f1e6") - crater[..., None], moon)
    sea_t = np.clip((y - horizon) / (1 - horizon), 0, 1)
    sea = gradient(sea_t, [(0, "#2a3866"), (1, "#060a18")])
    # reflection column made of horizontally stretched noise
    n = noise2(max(8, w // 12), h, 90, seed + 8, (t * 0.4, t * 0.9))
    n = np.asarray(Image.fromarray(n, mode="F").resize((w, h), Image.BICUBIC))
    col = np.exp(-(((x - mx) * w / min(w, h)) ** 2) / (0.004 + sea_t * 0.03))
    glints = smooth(0.62, 0.8, n) * col
    sea = sea + hexc("#e8ecff") * (glints * 0.9)[..., None]
    img = np.where((y < horizon)[..., None], sky, sea)
    return finish(img, seed, grain=0.016, vignette=0.3)


def scene_bloom(w, h, seed, t=0.0):
    x, y = grid(w, h)
    s = min(w, h)
    X, Y = (x - 0.5) * w / s, (y - 0.5) * h / s
    bg = gradient(np.clip(np.sqrt(X * X + Y * Y) * 1.4, 0, 1), [(0, "#2b1d3a"), (1, "#0e0b16")])
    img = bg
    rng = np.random.default_rng(seed)
    rings = [(14, 0.36, "#f28c8c"), (11, 0.27, "#f6b48b"), (8, 0.18, "#ffd9a0"), (6, 0.09, "#fff0c9")]
    for k, (count, rad, c) in enumerate(rings):
        for i in range(count):
            a = 2 * math.pi * i / count + k * 0.3 + t * 0.05 * (1 if k % 2 else -1)
            px, py = math.cos(a) * rad * 0.55, math.sin(a) * rad * 0.55
            # rotate coords into petal frame
            dx, dy = X - px, Y - py
            u = dx * math.cos(a) + dy * math.sin(a)
            v = -dx * math.sin(a) + dy * math.cos(a)
            petal = (u / (rad * 0.62)) ** 2 + (v / (rad * 0.26)) ** 2
            m = smooth(1.0, 0.94, petal)
            shade = np.clip(0.55 + u / (rad * 0.62) * 0.45, 0, 1)
            col = lerp(hexc(c) * 0.55, hexc(c), shade)
            img = comp(img, col, m * 0.92)
    core = smooth(0.05, 0.0, np.sqrt(X * X + Y * Y) - 0.02)
    img = comp(img, hexc("#fff7e0"), core)
    return finish(img, seed, grain=0.016, vignette=0.3)


def scene_aurora(w, h, seed, t=0.0):
    x, y = grid(w, h)
    img = gradient(y, [(0, "#030712"), (0.6, "#0b1730"), (1, "#122544")])
    rng = np.random.default_rng(seed)
    stars = (rng.random((h, w)) > 0.9992).astype(np.float32)
    tw = 0.55 + 0.45 * np.sin(rng.random((h, w)) * 6.28 + t * 2.5)
    img = img + blur_mask(stars * tw, 0.6)[..., None] * 1.4
    for k, c in enumerate(["#3ef0a8", "#5ad1ff", "#b07cff"]):
        ph = t * (0.08 + k * 0.03)
        line = 0.28 + k * 0.07 + (fbm1(w, 3, seed + k * 5, 4, phase=ph) - 0.5) * 0.3
        curtain_y = line[None, :]
        dist = y - curtain_y
        streak = noise2(w, 8, 60, seed + 20 + k, (t * 0.12 * (k + 1), 0))
        streak = np.asarray(Image.fromarray(streak, mode="F").resize((w, h), Image.BICUBIC))
        intensity = np.exp(-np.maximum(dist, 0) * 9) * smooth(-0.015, 0.0, dist) * (0.3 + 0.9 * streak)
        img = img + hexc(c) * (intensity * (0.55 - k * 0.1))[..., None]
    ridge = fbm1(w, 3, seed + 99, 6, ridged=True)
    line = (0.8 - ridge * 0.16) * h
    img = comp(img, hexc("#040810"), ridge_mask(w, h, line))
    return finish(img, seed, grain=0.02, vignette=0.32)


def scene_tide(w, h, seed, t=0.0):
    x, y = grid(w, h)
    horizon = 0.48
    sun_y = 0.36 + t * 0.008
    sky = gradient(y / horizon, [(0, "#3b2d5c"), (0.5, "#c35f6b"), (1, "#ffb27a")])
    d = np.sqrt(((x - 0.5) * w) ** 2 + ((y - sun_y) * h) ** 2) / min(w, h)
    sky = sky + hexc("#ffd29a") * (np.exp(-d * 6) * 0.5)[..., None]
    sky = comp(sky, hexc("#fff0d0"), smooth(0.075, 0.07, d) * (y < horizon))
    st = np.clip((y - horizon) / (1 - horizon), 0, 1)
    sea = gradient(st, [(0, "#e48a6a"), (0.3, "#6c3f62"), (1, "#1a1530")])
    freq = 30 + st * 0
    waves = np.sin((np.clip(y - horizon, 0, 1) ** 0.6) * 220 - t * 2.2 + fbm(w, h, 5, seed + 3, 2, (t * 0.05, 0)) * 6)
    sea = sea * (1 + 0.08 * waves * (0.3 + st))[..., None]
    n = noise2(max(8, w // 10), h, 120, seed + 8, (t * 0.5, t * 1.1))
    n = np.asarray(Image.fromarray(n, mode="F").resize((w, h), Image.BICUBIC))
    column = np.exp(-(((x - 0.5) * w / min(w, h)) ** 2) / (0.006 + st * 0.05))
    sea = sea + hexc("#ffd9a8") * (smooth(0.6, 0.78, n) * column * 0.9)[..., None]
    img = np.where((y < horizon)[..., None], sky, sea)
    return finish(img, seed, grain=0.016, vignette=0.28)


IMAGE_SCENES = {
    "dunes": scene_dunes,
    "alpine": scene_alpine,
    "fluid": scene_fluid,
    "chrome": scene_chrome,
    "vessel": scene_product,
    "arches": scene_arches,
    "nocturne": scene_ocean,
    "bloom": scene_bloom,
}
VIDEO_SCENES = {
    "aurora": (scene_aurora, 1.0),
    "liquid": (scene_fluid, 1.0),
    "orbit": (scene_chrome, 1.0),
    "tide": (scene_tide, 1.0),
}


def render_images():
    out = os.path.join(ROOT, "images")
    os.makedirs(out, exist_ok=True)
    for i, (name, fn) in enumerate(IMAGE_SCENES.items()):
        for ratio, (w, h) in IMAGE_SIZES.items():
            path = os.path.join(out, f"{name}-{ratio}.jpg")
            img = fn(w, h, seed=100 + i * 13)
            to_pil(img).save(path, quality=86, optimize=True, progressive=True)
            print("image", path, flush=True)


def render_videos():
    out = os.path.join(ROOT, "videos")
    os.makedirs(out, exist_ok=True)
    frames = FPS * VIDEO_SECONDS
    for i, (name, (fn, speed)) in enumerate(VIDEO_SCENES.items()):
        for ratio, (w, h) in VIDEO_SIZES.items():
            tmp = tempfile.mkdtemp()
            try:
                for f in range(frames):
                    t = f / FPS * speed
                    img = fn(w, h, seed=300 + i * 7, t=t)
                    to_pil(img).save(os.path.join(tmp, f"{f:04d}.png"), compress_level=1)
                for secs in (5, 10):
                    path = os.path.join(out, f"{name}-{ratio}-{secs}s.mp4")
                    subprocess.run(
                        ["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", os.path.join(tmp, "%04d.png"),
                         "-t", str(secs), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "26", "-preset", "slow",
                         "-movflags", "+faststart", path],
                        check=True,
                    )
                    print("video", path, flush=True)
                    encode_webm(path)
                poster = os.path.join(out, f"{name}-{ratio}.jpg")
                Image.open(os.path.join(tmp, "0000.png")).convert("RGB").save(poster, quality=84, optimize=True)
            finally:
                shutil.rmtree(tmp)


def encode_webm(mp4_path):
    """VP9 alternate for browsers without an H.264 decoder (e.g. open-source Chromium)."""
    webm = mp4_path[:-4] + ".webm"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", mp4_path, "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36",
         "-deadline", "good", "-cpu-used", "4", "-row-mt", "1", "-an", webm],
        check=True,
    )
    print("video", webm, flush=True)


def render_webm_alternates():
    out = os.path.join(ROOT, "videos")
    for name in sorted(os.listdir(out)):
        if name.endswith(".mp4"):
            encode_webm(os.path.join(out, name))


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what in ("all", "images"):
        render_images()
    if what in ("all", "videos"):
        render_videos()
    if what == "webm":
        render_webm_alternates()
