# -*- coding: utf-8 -*-
"""Per-card deep analysis v2 (no scipy): the 8 REAL cards inside _full.png + 09-settings.png."""
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

CARDS = {
    "01-dark-sunny":   (47, 771, 24, 436),
    "02-dark-night":   (47, 771, 462, 874),
    "03-dark-rain":    (47, 771, 900, 1312),
    "04-light-sunny":  (47, 771, 1338, 1750),
    "05-light-snow":   (820, 1406, 24, 436),
    "06-dark-storm":   (820, 1406, 462, 874),
    "07-dark-failall": (820, 1406, 900, 1312),
    "08-light-failone":(820, 1406, 1338, 1750),
}

def hue_sat(c):
    mxc = c.max(axis=2); mnc = c.min(axis=2); sc = (mxc-mnc)/(mxc+1e-6)
    r, g, b = c[...,0], c[...,1], c[...,2]
    hue = np.zeros_like(r)
    m = mxc == r; hue[m] = (((g-b)/(mxc-mnc+1e-6))[m]) % 6
    m2 = (mxc == g) & ~m; hue[m2] = (((b-r)/(mxc-mnc+1e-6))[m2]) + 2
    m3 = (mxc == b) & ~m & ~m2; hue[m3] = (((r-g)/(mxc-mnc+1e-6))[m3]) + 4
    return hue*60, sc

def tiny_blob_count(bright):
    """count isolated bright blobs of size 1-10px via iterative flood fill on downsampled mask."""
    from collections import deque
    H, W = bright.shape
    seen = np.zeros_like(bright, dtype=bool)
    count = 0
    ys, xs = np.where(bright)
    for y, x in zip(ys, xs):
        if seen[y, x]:
            continue
        # BFS
        q = deque([(y, x)]); seen[y, x] = True; size = 0
        while q and size <= 12:
            cy, cx = q.popleft(); size += 1
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = cy+dy, cx+dx
                    if 0 <= ny < H and 0 <= nx < W and bright[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True; q.append((ny, nx))
        if 1 <= size <= 12:
            count += 1
    return count

def edge_clip_check(bright, margins=(3, 3, 3, 3)):
    t, bo, l, r = bright[:4].sum(), bright[-4:].sum(), bright[:, :4].sum(), bright[:, -4:].sum()
    return int(t), int(bo), int(l), int(r)

for name, (y0, y1, x0, x1) in CARDS.items():
    c = full[y0:y1, x0:x1, :]
    h, w = c.shape[:2]
    L = lum(c)
    r, g, b = c[...,0], c[...,1], c[...,2]
    hue, sat = hue_sat(c)
    is_light = L.mean() > 0.3
    print(f"\n{'='*74}\n{name}  {w}x{h}  {'LIGHT' if is_light else 'DARK'}")

    # background thirds
    for lab, seg in [("top", c[:h//3]), ("mid", c[h//3:2*h//3]), ("bot", c[2*h//3:])]:
        m = seg.reshape(-1,3).mean(axis=0)
        hh, ss = hue_sat(seg)
        sm = ss > 0.25
        hm = np.median(hh[sm]) if sm.sum() > 50 else -1
        print(f"  bg {lab}: rgb({m[0]:.0f},{m[1]:.0f},{m[2]:.0f}) hue={hm:5.0f}° sat={(ss[sm].mean() if sm.sum()>50 else 0):.2f} lum={lum(seg).mean():.3f}")

    # aurora hue diversity across the card (is scenario bg truly differentiated?)
    sm = sat > 0.2
    if sm.sum() > 100:
        hist, edges = np.histogram(hue[sm], bins=12, range=(0, 360))
        idx = np.argsort(hist)[::-1][:4]
        print("  hue hist:", " | ".join(f"{int(edges[i])}-{int(edges[i+1])}°:{int(hist[i])}" for i in idx))

    # stars: isolated tiny bright dots, upper half, dark cards only
    if not is_light:
        upper = L[:h//2] > 0.5
        # exclude rows known to be text? do generic: just count tiny blobs
        n_tiny = tiny_blob_count(upper)
        print(f"  star-like tiny bright blobs (upper half): {n_tiny}")

    # rain streaks: vertical bright lines - detect columns with long vertical bright runs in mid card
    # approximate: for each x, count rows where lum > bg+0.05 continuous runs > 15px, hue in blue range
    if not is_light:
        bgL = np.median(L)
        streak_cols = 0
        for x in range(0, w, 2):
            col = L[:, x] > bgL + 0.06
            run = 0; found = False
            for v in col:
                if v: run += 1
                else:
                    if run >= 14: found = True
                    run = 0
            if run >= 14: found = True
            if found: streak_cols += 1
        print(f"  vertical streak columns (runs>=14px): {streak_cols}")

    # error block: red-dominant pixels
    redm = (r > g*1.5) & (r > b*1.5) & (r > 80)
    if redm.sum() > 30:
        yy, xx = np.where(redm)
        print(f"  RED block: {int(redm.sum())}px bbox x[{xx.min()}..{xx.max()}] y[{yy.min()}..{yy.max()}]")
        # red bg vs text contrast inside bbox
        blk = c[yy.min():yy.max(), xx.min():xx.max()]
        bl = lum(blk)
        print(f"    block lum min={bl.min():.3f} max={bl.max():.3f} ratio={(bl.max()+0.05)/(bl.min()+0.05):.1f}:1")

    # text contrast: brightest 2% vs darkest 2% per horizontal band of the card
    print("  text contrast per band (brightest vs bg):")
    bright_thr = 0.55 if not is_light else 0.78
    textish = L > bright_thr
    for i in range(6):
        seg = L[i*h//6:(i+1)*h//6]
        tseg = textish[i*h//6:(i+1)*h//6]
        if tseg.sum() > 20:
            # text pixels vs local bg (non-text pixels)
            bgpx = seg[~tseg]
            tpx = seg[tseg]
            cr = (tpx.max()+0.05)/(min(bgpx.mean(), tpx.min())+0.05)
            print(f"    band{i} y[{i*h//6}..{(i+1)*h//6}]: textpx={int(tseg.sum())} text_lum_max={tpx.max():.2f} bg_mean={bgpx.mean():.3f} CR≈{cr:.1f}:1")

    # edge clipping
    t_, b_, l_, r_ = edge_clip_check(textish)
    print(f"  text-touching-edge pixels (T/B/L/R): {t_}/{b_}/{l_}/{r_}")

    # gradient cleanliness: check saturation spikes (muddy gradient artifacts)
    satspike = (sat > 0.85).sum()
    print(f"  over-saturated(>0.85) px: {int(satspike)}  sat p95={np.percentile(sat,95):.2f}")
