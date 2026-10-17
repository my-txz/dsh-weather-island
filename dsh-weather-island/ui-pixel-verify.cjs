/**
 * 独立像素验证（PIL/numpy）：不依赖任何主观评审——
 * A. 8 张单图两两像素差 > 0（唯一性，防「全同副本」回归）
 * B. 01/02/03/06 顶部背景区的主色 hue 两两错开 ≥ 20°（色相区分）
 * C. 05 雪卡可检测到白色粒子像素
 * D. 04/08 浅色卡文字区对比度 ≥ 3:1
 * 用 DSH 自带 Python（含 Pillow/numpy）跑。node ui-pixel-verify.cjs 会转调 python。
 */
"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs"), path = require("path");

const py = process.env.DSH_PYTHON ||
  "C:\\Users\\mytxz\\.dsh\\dsh-runtimes\\dsh-primary-runtime\\dependencies\\python\\python.exe";

const script = `
import json, sys
from PIL import Image
import numpy as np

base = sys.argv[1]
ids = ["01-dark-sunny","02-dark-night","03-dark-rain","04-light-sunny",
       "05-light-snow","06-dark-storm","07-dark-failall","08-light-failone"]

def load(i):
    return np.asarray(Image.open(base + "\\\\" + ids[i] + ".png").convert("RGB"), dtype=np.int32)

imgs = [load(i) for i in range(8)]

# A. 唯一性：两两像素差
pairs_diff = []
for a in range(8):
    for b in range(a+1, 8):
        d = int(np.abs(imgs[a].astype(int) - imgs[b].astype(int)).sum())
        pairs_diff.append(d)
min_pair = min(pairs_diff)

# B. 场景色相：取 01/02/03/06 顶部 200x412 区域（避开文字），
#    用「高饱和像素的 hue 直方图峰值」判定主色相——比向量均值更稳健
#    （01 卡有暖橙主峰 + 蓝色副峰，向量均值会被副峰拖偏）。
def peak_hue(img):
    region = img[40:200, 0:412].astype(float)/255.0
    mx = region.max(axis=2); mn = region.min(axis=2)
    delta = mx - mn + 1e-9
    r, g, b = region[:,:,0], region[:,:,1], region[:,:,2]
    h = np.zeros_like(mx)
    m = (mx == r); h[m] = ((g-b)[m]/delta[m]) % 6
    m = (mx == g); h[m] = ((b-r)[m]/delta[m]) + 2
    m = (mx == b); h[m] = ((r-g)[m]/delta[m]) + 4
    h = h*60
    sat = delta/(mx+1e-9)
    mask = (sat > 0.3) & (mx > 0.1)
    if mask.sum() < 50: return -1
    hh = h[mask]
    hist, edges = np.histogram(hh, bins=36, range=(0,360))
    return edges[hist.argmax()]

hues = {}
for i in [0,1,2,5]:
    h = peak_hue(imgs[i])
    hues[ids[i]] = [round(h,1)]

# hue 两两角距
def ang_dist(a, b):
    d = abs(a-b) % 360
    return min(d, 360-d)
hue_list = [hues[ids[i]][0] for i in [0,1,2,5]]
hue_dists = []
for a in range(4):
    for b in range(a+1,4):
        hue_dists.append(round(ang_dist(hue_list[a], hue_list[b]),1))
min_hue = min(hue_dists)

# C. 05 雪粒子：在背景区找「近白高亮小点」（亮度 > 0.92 且孤立）
snow = imgs[4].astype(float)/255.0
region = snow[40:300, 0:412]
bright = (region.max(axis=2) > 0.93) & (region.min(axis=2) > 0.8)
snow_px = int(bright.sum())

# D. 04/08 文字对比度：文字区（y 210~330 为大温度行附近）最暗 vs 背景最亮
def txt_contrast(img):
    r = img[180:400, 0:412].astype(float)/255.0
    lum = 0.2126*r[:,:,0] + 0.7152*r[:,:,1] + 0.0722*r[:,:,2]
    dark = np.percentile(lum, 2)   # 文字像素
    light = np.percentile(lum, 98)  # 背景像素
    return round((light+0.05)/(dark+0.05), 2)

cr04 = txt_contrast(imgs[3])
cr08 = txt_contrast(imgs[7])

out = {
  "min_pair_pixel_diff": min_pair,
  "hues": hues,
  "min_hue_dist": min_hue,
  "snow_bright_px": snow_px,
  "contrast_04": cr04,
  "contrast_08": cr08,
}
print("RESULT_JSON:" + json.dumps(out))

fails = []
if min_pair < 10000: fails.append("A: 存在几乎相同的单图对（diff=%d）" % min_pair)
if min_hue < 20: fails.append("B: 场景色相最小角距 %s° < 20°" % min_hue)
if snow_px < 30: fails.append("C: 雪粒子像素 %d < 30（不可见）" % snow_px)
if cr04 < 3: fails.append("D: 04 文字对比 %.2f < 3" % cr04)
if cr08 < 3: fails.append("D: 08 文字对比 %.2f < 3" % cr08)
if fails:
    print("FAILS:" + "; ".join(fails))
    sys.exit(1)
print("ALL_PIXEL_CHECKS_PASS")
`;

const tmp = path.join(__dirname, "_pixel_verify.py");
fs.writeFileSync(tmp, script, "utf8");
try {
  const r = spawnSync(py, [tmp, path.join(__dirname, "shots")], { encoding: "utf8", timeout: 120000 });
  (r.stdout || "").split("\n").forEach((l) => l && console.log("  " + l));
  if (r.stderr) (r.stderr || "").split("\n").forEach((l) => l && console.error("  [py] " + l));
  if (r.status !== 0) { console.error("✗ 像素验证失败"); process.exit(1); }
  console.log("✓ 像素级独立验证通过：单图唯一 / 场景色相可辨 / 雪粒子可见 / 浅色文字对比达标");
} finally {
  try { fs.unlinkSync(tmp); } catch { /* ignore */ }
}
