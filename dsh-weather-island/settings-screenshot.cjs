/**
 * 设置页截图审美验证（需要本机 Edge/Chrome）· v2.1。
 * 用真实 DSH 令牌兜底渲染 SettingsPage 的静态同构版（含 hero 横幅、
 * 分段控件、滑杆、数据源卡片、危险按钮），深浅两套主题各截一张，
 * 并断言：hero 圆角生效、分段按钮选中态为渐变、开关选中为渐变。
 *   node settings-screenshot.cjs
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
].filter(Boolean);
const browser = CANDIDATES.find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
if (!browser) { console.log("SKIP: 未找到浏览器"); process.exit(0); }

const src = fs.readFileSync(path.join(dir, "index.js"), "utf8");
const css = (src.match(/const css = `([\s\S]*?)`;\s*\n/) || [])[1];

const row = (label, hint, ctl) => `<div class="dwis-row"><div style="min-width:0">
  <div class="dwis-rowLabel">${label}</div>${hint ? `<div class="dwis-rowHint">${hint}</div>` : ""}</div>
  <div class="dwis-ctl">${ctl}</div></div>`;

const page = (theme) => `<div class="dwis-wrap" style="
  --dwis-txt:${theme === "dark" ? "#f4f6fb" : "#1f2430"};
  --dwis-sub:${theme === "dark" ? "#aeb8c8" : "#555"};
  --dwis-cap:#7b8698;
  --dwis-br:${theme === "dark" ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.12)"};
  --dwis-br-soft:${theme === "dark" ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.07)"};
  --dwis-bg:${theme === "dark" ? "rgba(30,33,44,.6)" : "rgba(255,255,255,.6)"};
  --dwis-bg2:${theme === "dark" ? "rgba(40,44,58,.7)" : "rgba(255,255,255,.75)"};
  --dwis-accent:#5b9bff;--dwis-warn:#cf8a00;--dwis-ok:#1ea966;--dwis-err:#d33;">
  <div class="dwis-hero">
    <div class="dwis-heroTitle"><span class="dwis-heroOrb">🌤️</span>天气看板 · dsh-weather-island</div>
    <div class="dwis-heroSub"><span class="dwis-chip"><i></i>灵动岛悬浮看板</span>
      所有修改即时生效 · 界面跟随 DSH 深浅主题 · 默认 Uapi + Open-Meteo 双源（免 Key 开箱可用）</div>
  </div>
  <div class="dwis-sec"><div class="dwis-secT">外观</div>
    ${row("界面主题", "自动 = 跟随 DSH 与系统深浅色；也可在此强制指定。",
      `<div class="dwis-seg"><button>自动</button><button class="dwis-on">深色</button><button>浅色</button></div>`)}
    ${row("字体大小", "看板内所有文字按此基准等比缩放。",
      `<input type="range" class="dwis-range" min="12" max="22" value="15" style="--dwis-fill:30%"><span class="dwis-val">15px</span>`)}
    ${row("玻璃透明度", "只影响毛玻璃背板，文字始终满不透明。",
      `<input type="range" class="dwis-range" min="45" max="100" value="80" style="--dwis-fill:63.6%"><span class="dwis-val">80%</span>`)}
    ${row("场景化背景", "卡片背景随当前天气与昼夜自动切换配色（晴/夜/雨/雪/雷/霾各有一套极光），关闭则固定蓝紫。",
      `<button role="switch" aria-checked="true" class="dwis-switch dwis-on"><span></span></button>`)}
    ${row("温度单位", "也可在胶囊聚焦时按 U 键快速切换。",
      `<div class="dwis-seg"><button class="dwis-on">°C</button><button>°F</button></div>`)}
    ${row("实时时钟显示秒", "", `<button role="switch" class="dwis-switch"><span></span></button>`)}
    ${row("预报天数", "", `<div class="dwis-seg"><button class="dwis-on">三日</button><button>五日</button><button>七日</button></div>`)}
    ${row("悬停即展开", "鼠标移到胶囊上自动展开，移开自动收起。",
      `<button role="switch" class="dwis-switch"><span></span></button>`)}
  </div>
  <div class="dwis-sec"><div class="dwis-secT">数据源（最多 2 个 · 勾选顺序即主源顺序）<span class="dwis-srcTag dwis-primary" style="margin-left:auto">已选 2/2</span></div>
    <div class="dwis-src"><input type="checkbox" class="dwis-check" checked>
      <div class="dwis-srcMain"><span class="dwis-srcName">Uapi</span><span class="dwis-srcTag dwis-primary">主源</span><span class="dwis-srcTag">免 Key</span>
      <div class="dwis-srcDesc">国内免费聚合：实况 + 体感/AQI及污染物 + 最多 7 日预报 + 逐时 + 分钟级降水；本插件主数据源。</div></div>
      <a class="dwis-link">🔗 文档 ↗</a></div>
    <div class="dwis-src"><input type="checkbox" class="dwis-check" checked>
      <div class="dwis-srcMain"><span class="dwis-srcName">Open-Meteo</span><span class="dwis-srcTag">免 Key</span>
      <div class="dwis-srcDesc">免注册开放气象，按经纬度取数；无城市名时（GPS 反查失败）也能工作。</div></div>
      <a class="dwis-link">🔗 文档 ↗</a></div>
    <div class="dwis-src"><input type="checkbox" class="dwis-check" disabled>
      <div class="dwis-srcMain"><span class="dwis-srcName">彩云天气</span><span class="dwis-srcTag dwis-key">需 Key</span>
      <div class="dwis-srcDesc">分钟级降水与短临预报见长；接口按「经度,纬度」取数。</div></div>
      <a class="dwis-link">🔗 文档 ↗</a></div>
    <div class="dwis-tip">主数据源决定大字温度、详细数据与多日预报的取数；该源失败时自动回退到另一个已启用源。<br>当前优先序：Uapi → Open-Meteo</div>
  </div>
  <div class="dwis-sec"><div class="dwis-secT">定位与网络</div>
    ${row("启动时定位方式", "", `<div class="dwis-seg"><button class="dwis-on">IP</button><button>GPS</button><button>上次手动</button></div>`)}
    ${row("CORS 代理", "留空 = 全部直连（默认，最快）。支持 {{url}} 占位符。",
      `<input class="dwis-input" placeholder="https://your-worker.example.dev/?url={{url}}">`)}
  </div>
  <div class="dwis-sec"><div class="dwis-secT">操作方式与本地数据</div>
    <div class="dwis-row"><div style="min-width:0"><div class="dwis-rowLabel">恢复默认设置</div>
    <div class="dwis-rowHint">外观、数据源、Key、位置全部回到出厂状态。</div></div>
    <button class="dwis-btn dwis-danger">恢复默认</button></div>
  </div>
</div>`;

const probe = `
<script>
window.addEventListener("load", () => {
  const out = [];
  document.querySelectorAll(".dwis-wrap").forEach((w) => {
    const hero = w.querySelector(".dwis-hero");
    const segOn = w.querySelector(".dwis-seg .dwis-on");
    const swOn = w.querySelector(".dwis-switch.dwis-on");
    const range = w.querySelector(".dwis-range");
    out.push({
      heroRadius: hero ? getComputedStyle(hero).borderRadius : "",
      // hero 的装饰光斑本来就「伸出容器再被 overflow:hidden 裁掉」，
      // 所以这里检查的是 overflow 是否确实为 hidden（保证视觉不破版），
      // 而不是 scrollWidth（它会把被裁掉的装饰也算进去）。
      heroOverflow: hero ? getComputedStyle(hero).overflow : "",
      heroClip: hero ? hero.scrollWidth - hero.clientWidth : 0,
      segBg: segOn ? getComputedStyle(segOn).backgroundImage : "",
      segShadow: segOn ? getComputedStyle(segOn).boxShadow.slice(0, 60) : "",
      swBg: swOn ? getComputedStyle(swOn).backgroundImage : "",
      rangeThumb: range ? (getComputedStyle(range, "::-webkit-slider-thumb") || {}).width || "?" : "?",
      wrapW: +w.getBoundingClientRect().width.toFixed(1),
    });
  });
  const pre = document.createElement("pre"); pre.id = "M"; pre.textContent = JSON.stringify(out);
  document.body.appendChild(pre);
});
</script>`;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:28px;display:flex;gap:34px;background:${""}#10131a;font-family:system-ui,"Segoe UI","Microsoft YaHei",sans-serif}
pre#M{position:fixed;left:-99999px}
${css}
</style></head><body>
${page("dark")}${page("light")}
${probe}</body></html>`;

const tmp = path.join(os.tmpdir(), "dwi-settings-" + process.pid + ".html");
fs.writeFileSync(tmp, html, "utf8");
const shotDir = path.join(dir, "shots");
fs.mkdirSync(shotDir, { recursive: true });

try {
  execFileSync(browser, [
    "--headless", "--disable-gpu", "--virtual-time-budget=2500",
    "--window-size=1560,1100",
    "--screenshot=" + path.join(shotDir, "09-settings.png"),
    "file:///" + tmp.replace(/\\/g, "/"),
  ], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });

  const dom = execFileSync(browser, [
    "--headless", "--disable-gpu", "--virtual-time-budget=2500", "--dump-dom",
    "file:///" + tmp.replace(/\\/g, "/"),
  ], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  const m = dom.match(/<pre id="M">([\s\S]*?)<\/pre>/);
  const data = m ? JSON.parse(m[1].replace(/"/g, '"').replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">")) : [];

  const fails = [];
  data.forEach((d, i) => {
    const tag = i === 0 ? "dark" : "light";
    if (d.heroRadius !== "16px") fails.push(`${tag} hero 圆角应 16px，实际 ${d.heroRadius}`);
    if (d.heroOverflow !== "hidden") fails.push(`${tag} hero overflow 应为 hidden（装饰光斑须被裁掉），实际 ${d.heroOverflow || "(空)"}`);
    if (!/gradient/i.test(d.segBg)) fails.push(`${tag} 分段选中态应为渐变，实际 ${d.segBg}`);
    if (!/gradient/i.test(d.swBg)) fails.push(`${tag} 开关选中态应为渐变，实际 ${d.swBg}`);
  });
  console.log(`已截图 → shots\\09-settings.png`);
  data.forEach((d, i) => console.log(`  ${i === 0 ? "dark" : "light"}: hero ${d.heroRadius}/${d.heroOverflow}（装饰裁切余量 ${d.heroClip}px 属预期）· 分段 ${d.segBg.slice(0, 46)} · 开关 ${d.swBg ? "渐变✓" : "?"} · 宽 ${d.wrapW}`));
  if (fails.length) { console.error("\n✗ 设置页检查失败:"); fails.forEach((f) => console.error("  - " + f)); process.exit(1); }
  console.log("✓ 设置页截图完成：hero/渐变分段/渐变开关均生效");
} finally {
  try { fs.unlinkSync(tmp); } catch { /* ignore */ }
}
