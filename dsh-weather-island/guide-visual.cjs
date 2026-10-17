/**
 * 指引视觉检查（可选，需要本机 Edge/Chrome）。
 * 用真实浏览器测量欢迎指引卡片的几何与配色，替代「肉眼看图」：
 *   · 5 步 × 深/浅两套主题尺寸必须完全一致（否则切步时卡片抖动）
 *   · 内容不溢出、标题不裁切、图标与文字不重叠、按钮不停闪错
 *   · 玻璃模糊（::before 的 backdrop-filter）确实生效
 *   · 降级：末步「开始使用」按钮的高光必须停
 *
 * 找不到浏览器时打印 SKIP 并以 0 退出，便于在无浏览器环境里跑全量自检。
 *   node guide-visual.cjs
 */
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path");
const os = require("os");

const dir = __dirname;
const CANDIDATES = [
  process.env.DSH_BROWSER,
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);
const browser = CANDIDATES.find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
if (!browser) {
  console.log("SKIP: 未找到 Edge/Chrome，跳过指引视觉检查（可用 DSH_BROWSER 指定路径）");
  process.exit(0);
}

/* ── 1. 从 index.js 抽真实 CSS 与步骤文案，构造与线上同构的预览页 ── */
const src = fs.readFileSync(path.join(dir, "index.js"), "utf8");
const cssM = src.match(/const css = `([\s\S]*?)`;\s*\n/);
const stepsM = src.match(/const GUIDE_STEPS = (\[[\s\S]*?\n    \]);/);
if (!cssM || !stepsM) { console.error("✗ 无法从 index.js 抽取 css / GUIDE_STEPS"); process.exit(1); }
const css = cssM[1];
// 仅做静态求值，不执行任意代码
const GUIDE_STEPS = new Function("return " + stepsM[1])();
const TONE = { accent: "var(--dwi-accent)", accent2: "var(--dwi-accent2)", teal: "#36d6c4", warn: "var(--dwi-warn)", ok: "var(--dwi-ok)" };

const card = (theme, i) => {
  const s = GUIDE_STEPS[i], last = i === GUIDE_STEPS.length - 1;
  const dots = GUIDE_STEPS.map((_, n) =>
    `<button class="dwi-guide-dot${n === i ? " dwi-on" : (n < i ? " dwi-done" : "")}"></button>`).join("");
  return `<div class="dwi-root dwi-theme-${theme}" style="width:412px;margin:0 0 22px">
    <div class="dwi-anchor" style="position:relative;left:auto;top:auto;transform:none;animation:none;width:412px">
    <div class="dwi-guide" style="--dwi-gc:${TONE[s.tone] || TONE.accent}">
      <div class="dwi-guide-card">
        <div class="dwi-guide-tint" style="background:linear-gradient(180deg,color-mix(in srgb,${TONE[s.tone] || TONE.accent} 22%,transparent),transparent)"></div>
        <div class="dwi-guide-body">
          <div class="dwi-guide-top"><span class="dwi-guide-badge"><i></i>首次使用指引</span><button class="dwi-guide-skip">跳过 ✕</button></div>
          <div class="dwi-guide-stage dwi-guide-anim">
            <span class="dwi-guide-orb"><span class="dwi-guide-ring"></span>${s.orb}</span>
            <div class="dwi-guide-text"><div class="dwi-guide-title">${s.title}</div><div class="dwi-guide-desc">${s.desc}</div></div>
          </div>
          <div class="dwi-guide-dots">${dots}</div>
          <div class="dwi-guide-acts"><button class="dwi-guide-ghost"${i === 0 ? " disabled" : ""}>上一步</button><button class="dwi-guide-go${last ? " dwi-plain" : ""}">${last ? "开始使用 ✓" : "下一步"}</button></div>
        </div>
      </div>
    </div></div></div>`;
};

const probe = `
<script>
window.addEventListener("load", () => {
  const R = (e) => { const r = e.getBoundingClientRect(); return { w: +r.width.toFixed(2), h: +r.height.toFixed(2), l: +r.left.toFixed(2), r: +r.right.toFixed(2), t: +r.top.toFixed(2) }; };
  const out = [];
  document.querySelectorAll(".dwi-guide-card").forEach((c, idx) => {
    const q = (s) => c.querySelector(s);
    const orb = R(q(".dwi-guide-orb")), txt = R(q(".dwi-guide-text"));
    const go = R(q(".dwi-guide-go")), gh = R(q(".dwi-guide-ghost"));
    const dots = [...c.querySelectorAll(".dwi-guide-dot")].map((d) => +d.getBoundingClientRect().width.toFixed(2));
    const before = getComputedStyle(c, "::before");
    const goAfter = getComputedStyle(q(".dwi-guide-go"), "::after");
    const title = q(".dwi-guide-title");
    const body = q(".dwi-guide-body");
    out.push({
      idx, theme: c.closest(".dwi-root").className.match(/dwi-theme-\\w+/)[0],
      card: R(c), orb, textGap: +(txt.l - orb.r).toFixed(2), btnGap: +(go.l - gh.r).toFixed(2),
      dots, activeDots: dots.filter((w) => w > 20).length,
      overflowY: body.scrollHeight - body.clientHeight,
      overflowX: body.scrollWidth - body.clientWidth,
      titleClip: title.scrollWidth - title.clientWidth,
      glass: before.backdropFilter || before.webkitBackdropFilter || "",
      radius: getComputedStyle(c).borderRadius,
      ringAnim: getComputedStyle(q(".dwi-guide-ring")).animationName,
      plain: q(".dwi-guide-go").className.indexOf("dwi-plain") >= 0,
      goAfterDisplay: goAfter.display,
      descLines: Math.round(R(q(".dwi-guide-desc")).h / (parseFloat(getComputedStyle(q(".dwi-guide-desc")).fontSize) * 1.62)),
    });
  });
  const pre = document.createElement("pre"); pre.id = "M"; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
});
</script>`;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:0;background:#0d0f14;font-family:system-ui,"Segoe UI","Microsoft YaHei",sans-serif}
${css}
</style></head><body>
${["dark", "light"].map((t) => GUIDE_STEPS.map((_, i) => card(t, i)).join("")).join("")}
${probe}</body></html>`;

const tmp = path.join(os.tmpdir(), "dwi-guide-visual-" + process.pid + ".html");
fs.writeFileSync(tmp, html, "utf8");

let dom;
try {
  dom = execFileSync(browser, [
    "--headless", "--disable-gpu", "--virtual-time-budget=3000", "--dump-dom",
    "file:///" + tmp.replace(/\\/g, "/"),
  ], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
} finally {
  try { fs.unlinkSync(tmp); } catch { /* 清理失败不影响结论 */ }
}

const m = dom.match(/<pre id="M">([\s\S]*?)<\/pre>/);
if (!m) { console.error("✗ 未拿到浏览器测量结果"); process.exit(1); }
const data = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));

/* ── 2. 断言 ── */
const fails = [];
const perTheme = {};
data.forEach((d, gi) => {
  // idx 是全局序号（深 0-4、浅 5-9），判断「是否末步」必须用主题内序号
  const local = perTheme[d.theme] ? perTheme[d.theme].length : 0;
  const isLast = local === GUIDE_STEPS.length - 1;
  const tag = `${d.theme}#${local + 1}`;
  (perTheme[d.theme] = perTheme[d.theme] || []).push(d);
  d._local = local; d._isLast = isLast;
  if (d.overflowY > 1) fails.push(`${tag} 内容纵向溢出 ${d.overflowY}px`);
  if (d.overflowX > 1) fails.push(`${tag} 内容横向溢出 ${d.overflowX}px`);
  if (d.titleClip > 1) fails.push(`${tag} 标题被裁切 ${d.titleClip}px`);
  if (Math.abs(d.orb.w - d.orb.h) > 0.5) fails.push(`${tag} 图标非正方形 ${d.orb.w}×${d.orb.h}`);
  if (d.textGap < 8) fails.push(`${tag} 图标与文字间距过小 ${d.textGap}px`);
  if (d.btnGap < 6) fails.push(`${tag} 按钮重叠/过近 ${d.btnGap}px`);
  if (d.activeDots !== 1) fails.push(`${tag} 高亮进度点应为 1，实际 ${d.activeDots}`);
  if (!String(d.glass).includes("blur")) fails.push(`${tag} 玻璃模糊未生效（::before backdrop-filter=${d.glass}）`);
  if (d.radius !== "26px") fails.push(`${tag} 圆角应与卡片一致(26px)，实际 ${d.radius}`);
  if (d.ringAnim !== "dwi-orbit") fails.push(`${tag} 环绕光弧动画异常：${d.ringAnim}`);
  if (d.descLines < 2 || d.descLines > 5) fails.push(`${tag} 说明行数异常 ${d.descLines}`);
  if (isLast) {
    if (d.goAfterDisplay !== "none") fails.push(`${tag} 末步「开始使用」高光未停`);
  } else if (d.goAfterDisplay === "none") {
    fails.push(`${tag} 非末步按钮高光被误关`);
  }
});
// 同主题内所有步骤尺寸必须一致（否则切换步骤会抖动）
Object.keys(perTheme).forEach((theme) => {
  const list = perTheme[theme];
  const w0 = list[0].card.w, h0 = list[0].card.h;
  list.forEach((d) => {
    if (Math.abs(d.card.w - w0) > 0.5 || Math.abs(d.card.h - h0) > 0.5) {
      fails.push(`${theme}#${d._local + 1} 尺寸与同主题首步不一致（切步会抖动）：${w0}×${h0} → ${d.card.w}×${d.card.h}`);
    }
  });
});

console.log(`用 ${path.basename(browser)} 测量 ${data.length} 张指引卡片（${Object.keys(perTheme).join("/")} 各 ${GUIDE_STEPS.length} 步）`);
const d0 = data[0];
console.log(`  尺寸 ${d0.card.w}×${d0.card.h} · 圆角 ${d0.radius} · 玻璃 ${d0.glass}`);
console.log(`  图标 ${d0.orb.w}px · 图标↔文字 ${d0.textGap}px · 按钮间距 ${d0.btnGap}px`);
console.log(`  进度点宽 ${d0.dots.join("/")} · 光弧 ${d0.ringAnim}`);
if (fails.length) { console.error("\n✗ 指引视觉检查失败:"); fails.forEach((f) => console.error("  - " + f)); process.exit(1); }
console.log("✓ 指引视觉检查通过：无溢出/裁切/重叠，深浅主题各步尺寸一致，末步停闪 ✓");
