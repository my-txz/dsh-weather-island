# -*- coding: utf-8 -*-
"""Final re-review: A) 8 shots distinct? B) scene hue differentiation C) snow particles D) light secondary text contrast."""
import sys, io
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
S = r"E:\opencode项目\DSH自制天气插件\dsh-weather-island\shots"
FILES = ["01-dark-sunny.png","02-dark-night.png","03-dark-rain.png","04-light-sunny.png",
         "05-light-snow.png","06-dark-storm.png","07-dark-failall.png","08-light-failone.png"]

def lum(px):
    c = px / 255.0
    c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126*c[...,0] + 0.7152*c[...,1] + 0.0722*c[...,2]

def hue_sat(c):
    mxc = c.max(axis=2); mnc = c.min(axis=2); sc = (mxc-mnc)/(mxc+1e-6)
    r, g, b = c[...,0], c[...,1], c[...,2]
    hue = np.zeros_like(r)
    m = mxc == r; hue[m] = (((g-b)/(mxc-mnc+1e-6))[m]) % 6
    m2 = (mxc == g) & ~m; hue[m2] = (((b-r)/(mxc-mnc+1e-6))[m2]) + 2
    m3 = (mxc == b) & ~m & ~m2; hue[m3] = (((r-g)/(mxc-mnc+1e-6))[m3]) + 4
    return hue*60, sc

# ---- A. pairwise distinctness
print("A. pairwise mean-abs-diff matrix (0=identical):")
imgs = {f: np.asarray(Image.open(f"{S}\\{f}").convert("RGB"), dtype=np.float64) for f in FILES}
for i, a in enumerate(FILES):
    row = []
    for j, b in enumerate(FILES):
        if j < i: row.append("   -   ")
        else:
            row.append(f"{np.abs(imgs[a]-imgs[b]).mean():6.1f}")
    print(f"  {a[:16]:16s} " + " ".join(row))

# ---- B. scene hue per card (bg = pixels away from text; use sat>0.2 region)
print("\nB. background character per card (card region y40..760, x24..436):")
for f in FILES:
    c = imgs[f]
    H, W = c.shape[:2]
    card = c[40:H-40, 24:436, :]
    L = lum(card)
    is_light = L.mean() > 0.3
    hue, sat = hue_sat(card)
    sm = sat > (0.15 if is_light else 0.2)
    if sm.sum() > 100:
        hm = np.median(hue[sm])
        # weighted hue histogram to catch multi-hue scenes
        hist, edges = np.histogram(hue[sm], bins=24, range=(0,360), weights=sat[sm])
        tot = hist.sum()
        top = np.argsort(hist)[::-1][:3]
        tops = " | ".join(f"{int(edges[k])}-{int(edges[k+1])}° {hist[k]/tot*100:.0f}%" for k in top if hist[k] > 0)
    else:
        hm = -1; tops = ""
    print(f"  {f:22s} {'LIGHT' if is_light else 'DARK '} lum={L.mean():.3f} satmed={np.median(sat[sm]) if sm.sum()>100 else 0:.2f} hue_med={hm:5.0f}°  [{tops}]")

# hue of the most saturated 10% (dominant aurora color, robust to gray areas)
print("\n   dominant aurora hue (top-10% saturation pixels):")
for f in FILES:
    c = imgs[f]
    card = c[40:-40, 24:436, :]
    hue, sat = hue_sat(card)
    thr = np.percentile(sat, 90)
    m = sat >= max(thr, 0.2)
    if m.sum() > 50:
        hm = np.median(hue[m])
        print(f"  {f:22s} hue_med(top10%sat)={hm:5.0f}°  n={int(m.sum())}")

# ---- C. snow particles in 05 (white small dots on light-blue bg)
print("\nC. 05-light-snow snow-particle detection:")
c = imgs["05-light-snow.png"]
card = c[40:-40, 24:436, :]
L = lum(card)
# particles: brighter than local bg (bg~0.65); mask lum>0.80 AND small: check 5x5 neighborhood
bright = L > 0.80
# exclude text/ink (dark) zones irrelevant; count tiny components via BFS on bright mask
from collections import deque
def count_tiny(mask, maxsize=40):
    Hh, Ww = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    n = 0; sizes = []
    ys, xs = np.where(mask)
    for y, x in zip(ys, xs):
        if seen[y, x]: continue
        q = deque([(y,x)]); seen[y,x]=True; size=0
        while q and size <= maxsize:
            cy,cx = q.popleft(); size += 1
            for dy in (-1,0,1):
                for dx in (-1,0,1):
                    ny,nx = cy+dy,cx+dx
                    if 0<=ny<Hh and 0<=nx<Ww and mask[ny,nx] and not seen[ny,nx]:
                        seen[ny,nx]=True; q.append((ny,nx))
        sizes.append(size)
        if 1 <= size <= maxsize: n += 1
    return n, sizes
n05, sizes05 = count_tiny(bright)
print(f"  bright(>0.80) px={int(bright.sum())}, tiny blobs(<=40px)={n05}")
# control: same test on 04 (light-sunny, no snow expected)
c4 = imgs["04-light-sunny.png"]; card4 = c4[40:-40, 24:436, :]
b4 = lum(card4) > 0.80
n04, _ = count_tiny(b4)
print(f"  control 04-light-sunny: bright px={int(b4.sum())}, tiny blobs={n04}")
# sample colors of 05 tiny blobs
print(f"  05 sample blob sizes (first 20): {sizes05[:20]}")

# ---- D. light secondary text contrast (04/05/08): muted gray vs bg
print("\nD. light-card secondary text contrast:")
for f in ["04-light-sunny.png", "05-light-snow.png", "08-light-failone.png"]:
    c = imgs[f]
    card = c[40:-40, 24:436, :]
    L = lum(card)
    bgm = L > 0.55
    bgL = L[bgm].mean() if bgm.sum() else L.mean()
    # gray text band: look at pixels darker than bg but not ink-black
    # ink (primary text) assumed < 0.30; secondary gray ~0.30..0.55
    gray = (L >= 0.28) & (L < 0.55)
    if gray.sum():
        # restrict to pixels surrounded mostly by bg (text-like): approximate via erosion skip
        gL = L[gray]
        cr_median = (bgL + 0.05) / (np.median(gL) + 0.05)
        cr_p25 = (bgL + 0.05) / (np.percentile(gL, 75) + 0.05)
        print(f"  {f:22s} bgL={bgL:.3f} gray-band px={int(gray.sum())} medianCR={cr_median:.2f}:1 p75CR={cr_p25:.2f}:1")
    else:
        print(f"  {f:22s} no gray band found")

# contrast of the actual new gray #5f6a79 vs light bg #eef1f5-ish for reference:
for gcol, bg in [((0x5f,0x6a,0x79), (0xe8,0xec,0xf2)), ((0x87,0x91,0x9f), (0xe8,0xec,0xf2))]:
    print(f"  reference CR {gcol} vs {bg}: {contrast(gcol, bg):.2f}:1" if False else "")
def contrast(a, b):
    la, lb = lum(np.array(a, dtype=np.float64)), lum(np.array(b, dtype=np.float64))
    return (max(la,lb)+0.05)/(min(la,lb)+0.05)
print(f"  ref #5f6a79 vs #e8ecf2: {contrast((0x5f,0x6a,0x79),(0xe8,0xec,0xf2)):.2f}:1")
print(f"  ref #87919f vs #e8ecf2: {contrast((0x87,0x91,0x9f),(0xe8,0xec,0xf2)):.2f}:1")

# ---- E. error blocks & misc re-check
print("\nE. misc: error block + clipping + footer presence")
for f in FILES:
    c = imgs[f]
    H, W = c.shape[:2]
    card = c[:, 24:436, :]
    L = lum(card)
    is_light = L.mean() > 0.3
    ink = (L < 0.35) if is_light else (L > 0.55)
    r, g, b = card[...,0], card[...,1], card[...,2]
    redm = (r > g*1.45) & (r > b*1.35) & (r > 90)
    # edge clip
    t,bo,l,rt = int(ink[:3].sum()), int(ink[-3:].sum()), int(ink[:,:3].sum()), int(ink[:,-3:].sum())
    # bottom 40 rows content (footer) — need card true bottom; use last ink row
    rows = np.where(ink.any(axis=1))[0]
    lastink = rows.max() if len(rows) else -1
    print(f"  {f:22s} red_px={int(redm.sum()):5d} inkEdgeT/B/L/R={t}/{bo}/{l}/{rt} lastInkRow={lastink}/{card.shape[0]-1}")
