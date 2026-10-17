# -*- coding: utf-8 -*-
"""Verify whether the 8 screenshots are pixel-identical."""
import sys, io
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
SHOT = r"E:\opencode项目\DSH自制天气插件\dsh-weather-island\shots"
FILES = ["01-dark-sunny.png","02-dark-night.png","03-dark-rain.png","04-light-sunny.png",
         "05-light-snow.png","06-dark-storm.png","07-dark-failall.png","08-light-failone.png"]

imgs = {f: np.asarray(Image.open(f"{SHOT}\\{f}").convert("RGB"), dtype=np.int16) for f in FILES}
base = "01-dark-sunny.png"
for f in FILES[1:]:
    d = np.abs(imgs[f] - imgs[base])
    print(f"{base} vs {f}: maxdiff={d.max()}  ndiff_pixels={(d.sum(axis=2)>0).sum()}  meandiff={d.mean():.6f}")

# also vs _full.png top-left quadrant
full = np.asarray(Image.open(f"{SHOT}\\_full.png").convert("RGB"), dtype=np.int16)
print(f"\n_full.png size: {full.shape}")
q = full[0:imgs[base].shape[0], 0:imgs[base].shape[1], :]
d = np.abs(q - imgs[base])
print(f"_full[0:900,0:460] vs 01: maxdiff={d.max()} ndiff={(d.sum(axis=2)>0).sum()}")
