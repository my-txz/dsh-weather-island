# -*- coding: utf-8 -*-
"""Pixel-level analysis of dsh-weather-island UI screenshots (460x900, card 412px wide centered => margins 24px)."""
import sys, io
from PIL import Image
import numpy as np

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

SHOT = r"E:\opencode项目\DSH自制天气插件\dsh-weather-island\shots"

FILES = [
    "01-dark-sunny.png", "02-dark-night.png", "03-dark-rain.png",
    "04-light-sunny.png", "05-light-snow.png", "06-dark-storm.png",
    "07-dark-failall.png", "08-light-failone.png",
]

def luminance(rgb):
    r, g, b = [x / 255.0 for x in rgb]
    def f(c): return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def contrast_ratio(a, b):
    la, lb = luminance(a), luminance(b)
    lo, hi = min(la, lb), max(la, lb)
    return (hi + 0.05) / (lo + 0.05)

def analyze(name):
    img = Image.open(SOT := f"{SHOT}\\{name}").convert("RGB")
    a = np.asarray(img).astype(np.float64)
    H, W = a.shape[:2]
    print(f"\n{'='*70}\n{name}  ({W}x{H})")

    # card bounds: assume margins ~24px left/right (412 + 48 = 460)
    L, R = 24, W - 24
    card = a[:, L:R, :]

    # background (outside card) average color top / middle / bottom
    for y in (30, 450, 870):
        strip = a[y, :22, :].mean(axis=0)
        print(f"  bg row y={y}: rgb({strip[0]:.0f},{strip[1]:.0f},{strip[2]:.0f})")

    # card average color per horizontal band (10 bands)
    print("  card bands (avg rgb):")
    for i in range(10):
        y0, y1 = i * H // 10, (i + 1) * H // 10
        m = card[y0:y1, :, :].reshape(-1, 3).mean(axis=0)
        print(f"    band {i} y[{y0}:{y1}]: rgb({m[0]:.0f},{m[1]:.0f},{m[2]:.0f})  lum={luminance(m):.3f}")

    # detect scenario accents: saturation map
    mx = card.max(axis=2); mn = card.min(axis=2)
    sat = np.where(mx > 0, (mx - mn) / (mx + 1e-6), 0)
    print(f"  saturation: mean={sat.mean():.3f} p95={np.percentile(sat,95):.3f} max={sat.max():.3f}")
    hsv = np.asarray(Image.open(SOT).convert("RGB").resize((W//4, H//4))).astype(np.float64)
    # hue histogram of saturated pixels
    m2 = hsv.max(axis=2); n2 = hsv.min(axis=2); s2 = (m2 - n2) / (m2 + 1e-6)
    r, g, b = hsv[...,0], hsv[...,1], hsv[...,2]
    hue = np.zeros_like(r)
    mask = m2 == r
    hue[mask] = ((g - b) / (m2 - n2 + 1e-6))[mask] % 6
    mask = (m2 == g) & ~mask
    hue[mask] = ((b - r) / (m2 - n2 + 1e-6))[mask] + 2
    mask = (m2 == b) & ~mask
    hue[mask] = ((r - g) / (m2 - n2 + 1e-6))[mask] + 4
    hue = hue * 60
    satpix = hue[s2 > 0.25]
    if len(satpix):
        hist, edges = np.histogram(satpix, bins=12, range=(0, 360))
        top = np.argsort(hist)[::-1][:4]
        print("  dominant hue buckets (deg, count):", [(int(edges[i]), int(hist[i])) for i in top if hist[i] > 0])

    # text/bg contrast in card: sample darkest vs lightest pixels per band
    print("  per-band extreme luminance & implied contrast:")
    for i in range(10):
        y0, y1 = i * H // 10, (i + 1) * H // 10
        band = card[y0:y1, :, :].reshape(-1, 3)
        lums = np.array([luminance(p) for p in band[::37]])
        print(f"    band {i}: minlum={lums.min():.3f} maxlum={lums.max():.3f} ratio={(lums.max()+0.05)/(lums.min()+0.05):.1f}:1")

    # edge clipping: check rightmost/leftmost card columns for content touching card edge (anti-alias gray)
    edgeL = card[:, :3, :]; edgeR = card[:, -3:, :]
    # content = pixels notably different from band-local background is hard; instead report edge stddev
    print(f"  edge stddev L={edgeL.std():.1f} R={edgeR.std():.1f} (high >40 may mean content clipping at border)")

for f in FILES:
    try:
        analyze(f)
    except Exception as e:
        print(f"\n{f}: ERROR {e}")
