# -*- coding: utf-8 -*-
"""Extract the 8 real cards from _full.png as enlarged PNGs for visual archive + zoom on key areas."""
import sys, io, os
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
S = r"E:\opencode项目\DSH自制天气插件\dsh-weather-island\shots"
OUT = r"E:\opencode项目\DSH自制天气插件\shots\_extracted"
os.makedirs(OUT, exist_ok=True)

full = Image.open(f"{S}\\_full.png").convert("RGB")
CARDS = {
    "01-dark-sunny":   (47, 771, 24, 436),
    "02-dark-night":   (47, 771, 462, 874),
    "03-dark-rain":    (47, 771, 900, 1312),
    "04-light-sunny":  (47, 771, 838+500, 1750),
    "05-light-snow":   (820, 1406, 24, 436),
    "06-dark-storm":   (820, 1406, 462, 874),
    "07-dark-failall": (820, 1907-500, 900, 1312),
    "08-light-failone":(820, 1406, 1338, 1750),
}
for name, (y0, y1, x0, x1) in CARDS.items():
    c = full.crop((x0, y0, x1, y1))
    c.save(f"{OUT}\\{name}.png")
    print(f"saved {OUT}\\{name}.png {c.size}")
