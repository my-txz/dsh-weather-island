# -*- coding: utf-8 -*-
"""Locate the few differing pixels between shots; analyze the single actual card."""
import sys, io
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
SHOT = r"E:\opencode项目\DSH自制天气插件\dsh-weather-island\shots"
FILES = ["01-dark-sunny.png","02-dark-night.png","03-dark-rain.png","04-light-sunny.png",
         "05-light-snow.png","06-dark-storm.png","07-dark-failall.png","08-light-failone.png"]
base = np.asarray(Image.open(f"{SHOT}\\01-dark-sunny.png").convert("RGB"), dtype=np.int16)

def loc(name):
    img = np.asarray(Image.open(f"{SHOT}\\{name}").convert("RGB"), dtype=np.int16)
    d = np.abs(img - base).sum(axis=2)
    ys, xs = np.where(d > 0)
    print(f"\n{name}: {len(xs)} diff pixels")
    if len(xs):
        # cluster
        pts = sorted(zip(xs, ys))
        print("  x-range:", xs.min(), "-", xs.max(), " y-range:", ys.min(), "-", ys.max())
        # sample colors at a few diff points (from the other image)
        for i in range(0, min(len(pts), 6), max(1, len(pts)//6)):
            x, y = pts[i]
            print(f"    ({x},{y}) base=rgb{tuple(base[y,x])} other=rgb{tuple(img[y,x])}")

for f in FILES[1:]:
    loc(f)
