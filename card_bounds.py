# -*- coding: utf-8 -*-
"""Precisely detect each card's true bounds via glass background vs page bg."""
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
FH, FW = full.shape[:2]
L = lum(full)

# LIGHT cards: bg lum ~0.65; page bg ~0.005 -> threshold 0.3
# find all large light regions
lightm = L > 0.3
# column/row profiles in left half vs right half
# 04 is at row1 x1338-1750; 05 row2 x24-436; 08 row2 x1338-1750
def bbox_of(mask, y0, y1, x0, x1, name):
    seg = mask[y0:y1, x0:x1]
    ys, xs = np.where(seg)
    if len(ys) == 0:
        print(f"{name}: none")
        return
    # ignore tiny specks: use row/col sums
    rows = seg.sum(axis=1); cols = seg.sum(axis=0)
    ry = np.where(rows > 30)[0]; rx = np.where(cols > 30)[0]
    print(f"{name}: x[{x0+rx.min()}..{x0+rx.max()}] y[{y0+ry.min()}..{y0+ry.max()}]  w={rx.max()-rx.min()+1} h={ry.max()-ry.min()+1}")

print("LIGHT card precise bounds:")
bbox_of(lightm, 23, 780, 1300, 1800, "04-light-sunny (row1)")
bbox_of(lightm, 790, 1500, 0, 500, "05-light-snow (row2)")
bbox_of(lightm, 790, 1500, 1300, 1800, "08-light-failone (row2)")

# DARK cards: aurora bg lum ~0.02-0.06 vs page 0.005 -> threshold 0.012
darkbg = L > 0.012
# but text also qualifies; fine — bbox is what we want (card incl. bg)
print("\nDARK card precise bounds (bg threshold 0.012):")
for name, (x0, x1) in {"01": (0, 500), "02": (440, 900), "03": (880, 1340), "06": (440, 900), "07": (880, 1340)}.items():
    seg = darkbg[:, x0:x1]
    # rows where >200 px above threshold (card interior is wide)
    rows = seg.sum(axis=1)
    ry = np.where(rows > 200)[0]
    if len(ry) == 0:
        print(f"  {name}: none"); continue
    # split contiguous
    groups = []
    g = [ry[0]]
    for v in ry[1:]:
        if v - g[-1] <= 3: g.append(v)
        else: groups.append(g); g = [v]
    groups.append(g)
    for g in groups:
        yA, yB = g[0], g[-1]
        # within this y range, find x extent
        sub = darkbg[yA:yB+1, x0:x1]
        cols = sub.sum(axis=0)
        cx = np.where(cols > 30)[0]
        print(f"  {name}: y[{yA}..{yB}] h={yB-yA+1} x[{x0+cx.min()}..{x0+cx.max()}] w={cx.max()-cx.min()+1}")

# Vertical extent of page: what's at y1400..1500?
print("\nbottom area rows y1380..1500, cols 0..460 (card 05 zone): max lum per row:")
for y in range(1380, 1500, 10):
    print(f"  y={y}: maxlum={L[y:y+10, 0:460].max():.3f}  n>0.3: {(L[y:y+10, 0:460]>0.3).sum()}")

# 05 card: does the glass rect end before 1406?
seg = lightm[790:1500, 0:500]
rows = seg.sum(axis=1)
nz = np.where(rows > 50)[0]
print(f"\n05 light region rows (790+rel): first={790+nz.min()} last={790+nz.max()}")
# check gap: is there a clean bottom edge?
r = rows[nz.max()-3:nz.max()+3]
print("row sums near bottom edge:", [int(v) for v in rows[max(0,nz.max()-5):nz.max()+6]])

# 06 storm: find its exact bottom via bg (aurora still above 0.012?)
seg2 = darkbg[790:1500, 440:900]
rows2 = (L[790:1500, 440:900] > 0.012).sum(axis=1)
nz2 = np.where(rows2 > 100)[0]
print(f"06 dark-bg region: first={790+nz2.min()} last={790+nz2.max()}")
print("06 row sums near bottom:", [int(v) for v in rows2[max(0,nz2.max()-5):nz2.max()+6]])
