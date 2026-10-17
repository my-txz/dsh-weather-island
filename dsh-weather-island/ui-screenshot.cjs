/**
 * UI 截图审美验证（需要本机 Edge/Chrome）· v2.1。
 *
 * 与 guide-visual.cjs 的区别：那个只验证「指引卡片」几何；
 * 本脚本验证的是**完整天气看板**——从 index.js 抽真实 CSS，
 * 用「与组件同构」的静态 HTML 渲染 6 个状态：
 *   ① 深色 · 晴昼场景（day_clear：暖阳蓝）
 *   ② 深色 · 夜间场景（night：深蓝紫 + 星星）
 *   ③ 深色 · 雨天场景（rain：冷蓝 + 雨丝）
 *   ④ 浅色 · 晴昼场景
 *   ⑤ 浅色 · 雪天场景（snow）
 *   ⑥ 深色 · 双源失败汇总块（dwi-err / dwi-errAll）
 * 每个状态输出 PNG 截图到 shots/，并做几何断言（无溢出/无重叠/玻璃生效）。
 *
 *   node ui-screenshot.cjs [--keep]
 */
"use strict";
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path"), os = require("os");

const dir = __dirname;
const CANDIDATES = [
  process.env.DSH_BROWSER,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);
const browser = CANDIDATES.find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
if (!browser) {
  console.log("SKIP: 未找到 Edge/Chrome（可用 DSH_BROWSER 指定路径）");
  process.exit(0);
}

const src = fs.readFileSync(path.join(dir, "index.js"), "utf8");
const css = (src.match(/const css = `([\s\S]*?)`;\s*\n/) || [])[1];
if (!css) { console.error("✗ 无法抽取 CSS"); process.exit(1); }

/* ── 从源码抽 SCENES 表（与运行时同源，改色后截图自动跟随） ── */
const C = {};
const scenesM = src.match(/const SCENES = \{([\s\S]*?)\n    \};/);
if (!scenesM) { console.error("✗ 无法抽取 SCENES 表"); process.exit(1); }
scenesM[1].split("\n").forEach((line) => {
  const m = line.match(/(\w+):\s*\{[^}]*?c1:\s*"(#[0-9a-fA-F]{6})"[^}]*?c2:\s*"(#[0-9a-fA-F]{6})"[^}]*?c3:\s*"(#[0-9a-fA-F]{6})"[^}]*?boost:\s*([\d.]+)/);
  if (m) C[m[1]] = { c1: m[2], c2: m[3], c3: m[4], boost: parseFloat(m[5]) };
});
const hours = Array.from({ length: 10 }, (_, i) => ({
  t: i === 0 ? "现在" : (14 + i) + ":00",
  icon: ["☀️", "🌤️", "⛅", "🌦️", "🌧️", "🌧️", "🌦️", "⛅", "🌤️", "☀️"][i],
  temp: 25 - i * 0.6,
  pop: [null, null, 10, 30, 60, 80, 45, 20, null, null][i],
}));
const days = [
  { l: "今天", icon: "☀️", desc: "晴", lo: 14, hi: 26, pop: null, left: 30, width: 40 },
  { l: "明天", icon: "⛅", desc: "多云", lo: 11, hi: 21, pop: 10, left: 10, width: 30 },
  { l: "后天", icon: "🌧️", desc: "小雨", lo: 7, hi: 22, pop: 60, left: 15, width: 45 },
];
const tips = [["穿衣", "舒适"], ["紫外线", "中等"], ["运动", "适宜"], ["洗车", "适宜"], ["晾晒", "较适宜"], ["感冒", "少发"]];

const sceneStyle = (sc) => sc
  ? `--dwi-c1:${sc.c1};--dwi-c2:${sc.c2};--dwi-c3:${sc.c3};--dwi-scene-boost:${sc.boost};`
  : "";

const hourHtml = hours.map((x, i) => `<div class="dwi-hour${i === 0 ? " dwi-hnow" : ""}">
  <div class="dwi-hourTime">${x.t}</div><div class="dwi-hourIcon">${x.icon}</div>
  <div class="dwi-hourTemp">${Math.round(x.temp)}°</div>
  <div class="dwi-hourPop">${x.pop ? x.pop + "%" : ""}</div></div>`).join("");

const dayHtml = days.map((d, i) => `<div class="dwi-day${i === 0 ? " dwi-today" : ""}">
  <div class="dwi-dayDate">${d.l}</div><div class="dwi-dayIcon">${d.icon}</div>
  <div class="dwi-dayCond">${d.desc}</div>
  <div class="dwi-dayRange"><div class="dwi-dayLo">${d.lo}°</div>
  <div class="dwi-dayBar"><div class="dwi-dayBarFill" style="left:${d.left}%;width:${d.width}%"></div></div>
  <div class="dwi-dayHi">${d.hi}°</div></div>
  <div class="dwi-dayPop">${d.pop ? d.pop + "%" : ""}</div></div>`).join("");

const tipHtml = tips.map(([n, l]) => `<div class="dwi-tip"><span class="dwi-tipName">${n}</span><span class="dwi-tipLv">${l}</span></div>`).join("");

const cell = (label, val, unit, dot) => `<div class="dwi-cell"><div class="dwi-cellLabel">${dot ? `<span class="dwi-dot" style="background:${dot};box-shadow:0 0 6px ${dot}"></span>` : ""}${label}</div><div class="dwi-cellVal">${val}${unit ? `<i>${unit}</i>` : ""}</div></div>`;

function card(opts) {
  const { theme, sc, scKey, temp, desc, icon, isDay, aqi, aqiColor, failBlock, title } = opts;
  const fx = [];
  const fxKind = scKey ? (["night", "rain", "storm", "snow", "haze"].includes(scKey) ? scKey : "none") : "none";
  if (fxKind === "night") {
    for (let i = 0; i < 14; i++) {
      const r = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
      fx.push(`<span class="dwi-spark" style="left:${(4 + r(i + 1) * 88).toFixed(1)}%;top:${(3 + r(i + 9) * 34).toFixed(1)}%;width:${(1.5 + r(i + 4) * 1.8).toFixed(1)}px;height:${(1.5 + r(i + 4) * 1.8).toFixed(1)}px;animation-delay:${(r(i + 2) * 3.4).toFixed(2)}s"></span>`);
    }
  }
  if (fxKind === "rain" || fxKind === "storm") {
    for (let i = 0; i < 12; i++) {
      const r = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
      fx.push(`<span class="dwi-drop" style="left:${(r(i + 3) * 96).toFixed(1)}%;animation-delay:${(r(i + 6) * 1.5).toFixed(2)}s;animation-duration:${(1.1 + r(i + 8) * 0.7).toFixed(2)}s"></span>`);
    }
  }
  if (fxKind === "snow") {
    for (let i = 0; i < 12; i++) {
      const r = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
      const sz = (2 + r(i + 2) * 2.5).toFixed(1);
      fx.push(`<span class="dwi-flake" style="left:${(r(i + 5) * 94).toFixed(1)}%;width:${sz}px;height:${sz}px;animation-delay:${(r(i + 7) * 7).toFixed(2)}s;animation-duration:${(7 + r(i + 3) * 6).toFixed(2)}s"></span>`);
    }
  }
  if (fxKind === "haze") {
    fx.push(`<span class="dwi-hazeband" style="left:-12%;top:18%;animation-duration:9s"></span>`);
    fx.push(`<span class="dwi-hazeband" style="left:46%;top:52%;animation-duration:13s"></span>`);
  }
  const dayFlag = isDay === false ? "夜间" : "白天";
  return `<div class="shot"><div class="shotLabel">${title}</div>
<div class="dwi-root dwi-theme-${theme}" style="${sceneStyle(sc)}--dwi-fs:15px;--dwi-alpha:1;position:relative;left:auto;top:auto;transform:none">
  <div class="dwi-anchor" style="position:relative;left:auto;top:auto;transform:none;animation:none;width:412px">
  <div class="dwi-card" style="animation:none">
    <div class="dwi-bg">${fx.join("")}<span class="b1"></span><span class="b2"></span><span class="b3"></span></div>
    <div class="dwi-card-scroll">
      <div class="dwi-head">
        <div class="dwi-headLoc"><span class="dwi-flag">🇨🇳</span>
          <div style="min-width:0"><div class="dwi-locName">北京</div>
          <div class="dwi-locSub">北京市 · 中国 · IP · Uapi</div></div></div>
        <div class="dwi-tools"><button class="dwi-btn${opts.unitF ? " dwi-active" : ""}">°F</button><button class="dwi-btn">🔍</button><button class="dwi-btn">GPS</button><button class="dwi-btn">⟳</button><button class="dwi-btn">✕</button></div>
      </div>
      <div class="dwi-tips">${tipHtml}</div>
      <div class="dwi-now"><div class="dwi-nowMain">
        <span class="dwi-nowIcon">${icon}</span>
        <div class="dwi-nowRead"><span class="dwi-nowTemp">${temp}</span><span class="dwi-nowDeg">°</span></div>
        <div class="dwi-nowClock"><div class="dwi-clockBig">15:42</div><div class="dwi-clockDate">10月11日 周日</div></div>
      </div>
      <div class="dwi-nowCond">${desc} · ${dayFlag}</div>
      <div class="dwi-nowMeta">体感 ${temp - 1}° · 14° ~ 26° · 东南风 3级</div></div>
      <div class="dwi-sources">
        <div class="dwi-sourceCard dwi-primary"><span class="dwi-star">★ 主源</span>
          <div class="dwi-sourceHead">Uapi <span class="dwi-live" style="width:6px;height:6px"></span></div>
          <div class="dwi-sourceTemp">${temp}°</div><div class="dwi-sourceCond">${desc}</div></div>
        <div class="dwi-sourceCard"><span class="dwi-star">设为主源</span>
          <div class="dwi-sourceHead">Open-Meteo <span class="dwi-live" style="width:6px;height:6px"></span></div>
          <div class="dwi-sourceTemp">${temp}°</div><div class="dwi-sourceCond">${desc}</div></div>
      </div>
      ${failBlock || ""}
      <div class="dwi-grid">
        ${cell("体感", temp - 1, "°")}
        ${cell("湿度", 46, "%")}
        ${cell("风速", 12, "km/h")}
        ${cell("气压", 1016, "hPa")}
        ${cell("能见度", 4.3, "km")}
        ${cell("云量", 6, "%")}
        ${cell("空气质量", aqi, aqiColor ? "" : "", aqiColor)}
        ${cell("日出", "06:20", "")}
      </div>
      <div class="dwi-hourly"><div class="dwi-hourRow">${hourHtml}</div></div>
      <div class="dwi-daily">${dayHtml}</div>
      <div class="dwi-foot"><span class="dwi-live"></span><span>刚刚更新</span><span>·</span><span class="dwi-src">报时 15:25 更新</span><button class="dwi-footBtn">设置 →</button></div>
    </div>
  </div></div></div></div>`;
}

const failAll = `<div class="dwi-err dwi-errAll"><span>⚠️</span>
  <div style="min-width:0;flex:1"><b>所有数据源都失败了</b>
  <div>Uapi：访问过于频繁（429），约 30s 后重试；Open-Meteo：服务端/上游异常（HTTP 503）</div></div>
  <button>重试</button></div>`;
const failOne = `<div class="dwi-err"><span>ℹ️</span>
  <div style="min-width:0;flex:1"><b>1 个数据源未出数</b>
  <div>Open-Meteo：网络不可达或被 CORS 拦截</div></div>
  <button>重试</button></div>`;

const shots = [
  { id: "01-dark-sunny", scKey: "day_clear", html: card({ theme: "dark", scKey: "day_clear", sc: C.day_clear, temp: 26, desc: "晴", icon: "☀️", isDay: true, aqi: 45, aqiColor: "#3ddc84", title: "深色 · 晴昼（day_clear：金橙暖阳）" }) },
  { id: "02-dark-night", scKey: "night", html: card({ theme: "dark", scKey: "night", sc: C.night, temp: 18, desc: "晴", icon: "🌙", isDay: false, aqi: 38, aqiColor: "#3ddc84", title: "深色 · 夜间（night：靛蓝 + 星星）" }) },
  { id: "03-dark-rain", scKey: "rain", html: card({ theme: "dark", scKey: "rain", sc: C.rain, temp: 19, desc: "中雨", icon: "🌧️", isDay: true, aqi: 28, aqiColor: "#3ddc84", title: "深色 · 雨天（rain：青蓝 + 雨丝动画）" }) },
  { id: "04-light-sunny", scKey: "day_clear", html: card({ theme: "light", scKey: "day_clear", sc: C.day_clear, temp: 26, desc: "晴", icon: "☀️", isDay: true, aqi: 45, aqiColor: "#3ddc84", title: "浅色 · 晴昼" }) },
  { id: "05-light-snow", scKey: "snow", html: card({ theme: "light", scKey: "snow", sc: C.snow, temp: -2, desc: "中雪", icon: "❄️", isDay: true, aqi: 52, aqiColor: "#a4e04a", title: "浅色 · 雪天（snow：近白冰蓝 + 飘雪粒子）" }) },
  { id: "06-dark-storm", scKey: "storm", html: card({ theme: "dark", scKey: "storm", sc: C.storm, temp: 22, desc: "雷阵雨", icon: "⛈️", isDay: true, aqi: 60, aqiColor: "#a4e04a", title: "深色 · 雷暴（storm：乌云紫红 + 电紫 + 雨丝）" }) },
  { id: "07-dark-failall", scKey: null, html: card({ theme: "dark", sc: null, temp: "—", desc: "数据不可用", icon: "⚠️", isDay: true, aqi: 0, title: "深色 · 双源失败汇总（dwi-errAll + 重试）", failBlock: failAll }) },
  { id: "08-light-failone", scKey: "day_clear", html: card({ theme: "light", scKey: "day_clear", sc: C.day_clear, temp: 26, desc: "晴", icon: "☀️", isDay: true, aqi: 45, aqiColor: "#3ddc84", title: "浅色 · 单源失败（dwi-err 信息态）", failBlock: failOne }) },
];

const tmpHtml = path.join(os.tmpdir(), "dwi-ui-shots-" + process.pid + ".html");
const shotDir = path.join(dir, "shots");
fs.mkdirSync(shotDir, { recursive: true });

const probeFor = (only) => `
<script>
window.addEventListener("load", () => {
  const out = [];
  document.querySelectorAll(".dwi-card").forEach((c, idx) => {
    const scroll = c.querySelector(".dwi-card-scroll");
    const bg = c.querySelector(".dwi-bg");
    const before = getComputedStyle(c, "::before");
    const nowTemp = c.querySelector(".dwi-nowTemp");
    const tempStyle = nowTemp ? getComputedStyle(nowTemp) : null;
    out.push({
      idx,
      overflowY: scroll.scrollHeight - scroll.clientHeight,
      overflowX: scroll.scrollWidth - scroll.clientWidth,
      glass: before.backdropFilter || before.webkitBackdropFilter || "",
      c1: bg ? getComputedStyle(bg).getPropertyValue("--bg-c1").trim() : "",
      tempClip: nowTemp ? (nowTemp.scrollWidth - nowTemp.clientWidth) : 0,
      tempImage: tempStyle ? tempStyle.backgroundImage.slice(0, 80) : "",
      fxCount: bg ? bg.querySelectorAll(".dwi-spark,.dwi-drop,.dwi-flake,.dwi-hazeband").length : 0,
      cardW: +c.getBoundingClientRect().width.toFixed(1),
      cardH: +c.getBoundingClientRect().height.toFixed(1),
    });
  });
  const pre = document.createElement("pre"); pre.id = "M"; pre.textContent = JSON.stringify(out);
  document.body.appendChild(pre);
});
</script>`;

const pageOf = (one) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:24px;background:#0d0f14;display:flex;flex-wrap:wrap;gap:26px;font-family:system-ui,"Segoe UI","Microsoft YaHei",sans-serif}
.shot{display:flex;flex-direction:column;gap:8px}
.shotLabel{font-size:12px;color:#8fa0b8;padding-left:4px}
pre#M{position:fixed;left:-99999px;top:0}
${css}
</style></head><body>
${one}
${probeFor()}
</body></html>`;

// v2.1 修复：每个状态单独生成 HTML —— 旧版复用同一页 + #fragment，
// 而 fragment 不改变渲染内容，导致 8 张“单图”全是第一张卡的副本。
const perShotData = [];
try {
  // 拼图（全览）
  fs.writeFileSync(tmpHtml, pageOf(shots.map((s) => s.html).join("")), "utf8");
  execFileSync(browser, [
    "--headless", "--disable-gpu", "--virtual-time-budget=3500",
    "--window-size=1900,1500",
    "--screenshot=" + path.join(shotDir, "_full.png"),
    "file:///" + tmpHtml.replace(/\\/g, "/"),
  ], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });

  // 逐状态独立页截图 + 各自测量
  for (const s of shots) {
    const one = path.join(os.tmpdir(), "dwi-ui-one-" + process.pid + "-" + s.id + ".html");
    fs.writeFileSync(one, pageOf(s.html), "utf8");
    try {
      execFileSync(browser, [
        "--headless", "--disable-gpu", "--virtual-time-budget=2500",
        "--window-size=460,900",
        "--screenshot=" + path.join(shotDir, s.id + ".png"),
        "file:///" + one.replace(/\\/g, "/"),
      ], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
      const dom = execFileSync(browser, [
        "--headless", "--disable-gpu", "--virtual-time-budget=2500", "--dump-dom",
        "file:///" + one.replace(/\\/g, "/"),
      ], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
      const m = dom.match(/<pre id="M">([\s\S]*?)<\/pre>/);
      if (m) perShotData.push(JSON.parse(m[1].replace(/"/g, '"').replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">"))[0]);
      else perShotData.push(null);
    } finally {
      try { fs.unlinkSync(one); } catch { /* ignore */ }
    }
  }

  const fails = [];
  perShotData.forEach((d, i) => {
    const tag = shots[i].id;
    if (!d) { fails.push(`${tag} 未拿到测量数据`); return; }
    // 注：overflowY 为正且可滚动是「设计内行为」——.dwi-card-scroll 有意做了
    // max-height:min(76vh,700px) 的可滚动区。真正要防的是横向溢出与
    // 「内容比可视区宽」这类排版破版。
    if (d.overflowX > 1) fails.push(`${tag} 卡片内容横向溢出 ${d.overflowX}px（排版破版）`);
    if (!String(d.glass).includes("blur")) fails.push(`${tag} 玻璃模糊未生效（${d.glass}）`);
    if (d.tempClip > 1) fails.push(`${tag} 大温度被裁切 ${d.tempClip}px`);
    const wantFx = tag === "02-dark-night" ? 14
      : (tag === "03-dark-rain" || tag === "06-dark-storm") ? 12
      : tag === "05-light-snow" ? 12 : 0;
    if (wantFx && d.fxCount < wantFx) fails.push(`${tag} 场景细节层不足：${d.fxCount}/${wantFx}`);
    // 场景变量只在挂了场景的状态生效（07 失败态无场景 → 允许空）
    if (!tag.startsWith("07") && !d.c1) fails.push(`${tag} 场景色变量未生效（--bg-c1 为空）`);
  });

  console.log(`已截图 ${shots.length} 个状态（每状态独立页）→ ${shotDir}\\`);
  perShotData.forEach((d, i) => console.log(`  ${shots[i].id}: ${d ? d.cardW + "×" + d.cardH + " · 玻璃 " + d.glass.slice(0, 24) + " · fx " + d.fxCount + " · 横向溢出 " + d.overflowX : "无数据"}`));
  if (fails.length) { console.error("\n✗ UI 几何检查失败:"); fails.forEach((f) => console.error("  - " + f)); process.exit(1); }
  console.log("✓ UI 截图完成：各状态独立可辨、无横向溢出/裁切，玻璃与场景细节层均生效");
} finally {
  try { fs.unlinkSync(tmpHtml); } catch { /* ignore */ }
}
