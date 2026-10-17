# -*- coding: utf-8 -*-
"""Per-card deep analysis of the 8 REAL cards inside _full.png."""
import sys, io
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
S = r"E:\opencode项目\DSH自制天气插件\dsh-weather-island\shots"

def lum(px):
    c = px / 255.0
    c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126*c[...,0] + 0.7152*c[...,1] + 0.0722*c[...,2]

full = np.asarray(Image.open(f"{S}\\_full.png").convert("RGB"), dtype=np.float64)

# Real card regions (2 rows x 4 cols). Use generous bounds incl. glass edge.
# col x-centers from grid analysis; rows: row1 y47-771 (expanded), row2 y820-1406 (collapsed)
CARDS = {
    "01 dark-sunny  ": (47, 771, 24, 436),
    "02 dark-night  ": (47, 771, 462, 874),
    "03 dark-rain   ": (47, 771, 900, 1312),
    "04 light-sunny ": (47, 771, 1338, 1750),
    "05 light-snow  ": (820, 1406, 24, 436),
    "06 dark-storm  ": (820, 1406, 462, 874),
    "07 dark-failall": (820, 1406, 900, 1312),
    "08 light-failone": (820, 1406, 1338, 1750),
}

def hue_of(c):
    mxc = c.max(axis=2); mnc = c.min(axis=2); sc = (mxc-mnc)/(mxc+1e-6)
    r, g, b = c[...,0], c[...,1], c[...,2]
    hue = np.zeros_like(r)
    mask = mxc == r; hue[mask] = (((g-b)/(mxc-mnc+1e-6))[mask]) % 6
    mask2 = (mxc == g) & ~mask; hue[mask2] = (((b-r)/(mxc-mnc+1e-6))[mask2]) + 2
    mask3 = (mxc == b) & ~mask & ~mask2; hue[mask3] = (((r-g)/(mxc-mnc+1e-6))[mask3]) + 4
    return hue*60, sc

for name, (y0, y1, x0, x1) in CARDS.items():
    c = full[y0:y1, x0:x1, :]
    h, w = c.shape[:2]
    L = lum(c)
    r, g, b = c[...,0], c[...,1], c[...,2]
    hue, sat = hue_of(c)
    print(f"\n{'='*72}\n{name}  region y[{y0}:{y1}] x[{x0}:{x1}]  {w}x{h}")

    # --- background character: top/mid/bottom thirds avg color & hue
    for lab, seg in [("top", c[:h//3]), ("mid", c[h//3:2*h//3]), ("bot", c[2*h//3:])]:
        m = seg.reshape(-1,3).mean(axis=0)
        hh, ss = hue_of(seg)
        sm = ss > 0.25
        hmean = np.median(hh[sm]) if sm.sum() > 50 else -1
        print(f"  bg {lab}: rgb({m[0]:.0f},{m[1]:.0f},{m[2]:.0f}) hue_med={hmean:.0f}deg sat={ss[sm].mean() if sm.sum()>50 else 0:.2f} lum={lum(seg).mean():.3f}")

    # --- star specks: isolated bright dots (3-6px) in upper half, not part of text lines
    upper = L[:h//2]
    bright = upper > 0.55
    # find connected tiny blobs via simple dilation logic using sums in 5x5 windows
    from scipy import ndimage  # may not exist
    # fallback: count bright pixels whose 7x7 neighborhood bright count <= 6 (isolated)
    print("  (scipy unavailable? trying)")
    try:
        lbl, n = ndimage.label(bright)
        sizes = ndimage.sum(bright, lbl, range(1, n+1))
        tiny = (sizes >= 1) & (sizes <= 8)
        print(f"  bright blobs upper-half: total={n}, tiny(1-8px)={int(tiny.sum())}")
    except Exception as e:
        print(f"  scipy missing: {e}")
        break
