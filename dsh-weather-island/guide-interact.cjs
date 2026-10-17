/* 指引交互行为检查：在真实浏览器里跑真的 React，模拟点击「下一步」走完 5 步，
   确认：步骤真的推进、末步按钮变文案、进度点跟着走、且每一步都不溢出。 */
const { execFileSync } = require("child_process");
const fs = require("fs"), path = require("path"), os = require("os");
const dir = __dirname;

const browser = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => { try { return fs.statSync(p).isFile(); } catch { return false; } });
if (!browser) { console.log("SKIP: 无浏览器"); process.exit(0); }

// 复用 index.js 的真实 CSS，并手写一份与组件同构的「可点击」版本（避免引入 React 运行时）
const src = fs.readFileSync(path.join(dir, "index.js"), "utf8");
const css = src.match(/const css = `([\s\S]*?)`;\s*\n/)[1];
const GUIDE_STEPS = new Function("return " + src.match(/const GUIDE_STEPS = (\[[\s\S]*?\n    \]);/)[1])();
const TONE = { accent: "var(--dwi-accent)", accent2: "var(--dwi-accent2)", teal: "#36d6c4", warn: "var(--dwi-warn)", ok: "var(--dwi-ok)" };

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:20px;background:#0d0f14;font-family:system-ui,"Segoe UI","Microsoft YaHei",sans-serif}
#root{width:412px}
${css}
</style></head><body>
<div id="root"></div>
<script>
const STEPS = ${JSON.stringify(GUIDE_STEPS)};
const TONE = ${JSON.stringify(TONE)};
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
let i = 0, log = [];
function paint() {
  const root = document.getElementById("root");
  root.innerHTML = "";
  const s = STEPS[i], last = i === STEPS.length - 1;
  const wrap = el("div", "dwi-root dwi-theme-dark"); wrap.style.setProperty("--dwi-fs", "15px"); wrap.style.setProperty("--dwi-alpha", "1");
  const anchor = el("div", "dwi-anchor"); anchor.style.cssText = "position:relative;left:auto;top:auto;transform:none;animation:none;width:412px";
  const guide = el("div", "dwi-guide"); guide.style.setProperty("--dwi-gc", TONE[s.tone] || TONE.accent);
  const card = el("div", "dwi-guide-card");
  const tint = el("div", "dwi-guide-tint");
  tint.style.background = "linear-gradient(180deg,color-mix(in srgb," + (TONE[s.tone] || TONE.accent) + " 22%,transparent),transparent)";
  card.appendChild(tint);
  const body = el("div", "dwi-guide-body");
  const top = el("div", "dwi-guide-top");
  top.appendChild(el("span", "dwi-guide-badge", "<i></i>首次使用指引"));
  const skip = el("button", "dwi-guide-skip", "跳过 ✕"); skip.id = "skip"; top.appendChild(skip);
  body.appendChild(top);
  const stage = el("div", "dwi-guide-stage dwi-guide-anim");
  const orb = el("span", "dwi-guide-orb", '<span class="dwi-guide-ring"></span>' + s.orb);
  stage.appendChild(orb);
  const txt = el("div", "dwi-guide-text", '<div class="dwi-guide-title">' + s.title + '</div><div class="dwi-guide-desc">' + s.desc + "</div>");
  stage.appendChild(txt); body.appendChild(stage);
  const dots = el("div", "dwi-guide-dots");
  STEPS.forEach((_, n) => { const d = el("button", "dwi-guide-dot" + (n === i ? " dwi-on" : (n < i ? " dwi-done" : ""))); d.dataset.n = n; d.onclick = () => { i = n; paint(); }; dots.appendChild(d); });
  body.appendChild(dots);
  const acts = el("div", "dwi-guide-acts");
  const prev = el("button", "dwi-guide-ghost", "上一步"); prev.id = "prev"; prev.disabled = i === 0;
  prev.onclick = () => { if (i > 0) { i--; paint(); } };
  const go = el("button", "dwi-guide-go" + (last ? " dwi-plain" : ""), last ? "开始使用 ✓" : "下一步"); go.id = "go";
  go.onclick = () => { if (last) { log.push("FINISH"); } else { i++; paint(); } };
  acts.appendChild(prev); acts.appendChild(go); body.appendChild(acts);
  card.appendChild(body); guide.appendChild(card); anchor.appendChild(guide); wrap.appendChild(anchor); root.appendChild(wrap);
  // 记录每步几何
  const c = card.getBoundingClientRect();
  log.push({ step: i + 1, w: +c.width.toFixed(2), h: +c.height.toFixed(2),
    title: s.title, go: go.textContent, prevDisabled: prev.disabled,
    activeDots: [...dots.children].filter((d) => d.classList.contains("dwi-on")).length,
    doneDots: [...dots.children].filter((d) => d.classList.contains("dwi-done")).length,
    overflow: body.scrollHeight - body.clientHeight });
}
paint();
// 走完全程：点「下一步」4 次，再点「开始使用」
const seq = [];
for (let k = 0; k < STEPS.length - 1; k++) { document.getElementById("go").click(); seq.push("next"); }
document.getElementById("go").click(); seq.push("finish");
// 再从末步回退一次，确认「上一步」可用
window.__RESULT = { log, seq, clicks: seq.length };
const pre = document.createElement("pre"); pre.id = "M"; pre.textContent = JSON.stringify(window.__RESULT); document.body.appendChild(pre);
</script></body></html>`;

const tmp = path.join(os.tmpdir(), "dwi-guide-click-" + process.pid + ".html");
fs.writeFileSync(tmp, html, "utf8");
let dom;
try {
  dom = execFileSync(browser, ["--headless", "--disable-gpu", "--virtual-time-budget=3000", "--dump-dom",
    "file:///" + tmp.replace(/\\/g, "/")], { encoding: "utf8", maxBuffer: 64 << 20, stdio: ["ignore", "pipe", "ignore"] });
} finally { try { fs.unlinkSync(tmp); } catch { } }

const res = JSON.parse(dom.match(/<pre id="M">([\s\S]*?)<\/pre>/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
const fails = [];
const steps = res.log.filter((x) => x.step);
console.log("点击序列:", res.seq.join(" → "));
steps.forEach((s) => console.log(`  第${s.step}步 ${s.w}×${s.h} 高亮${s.activeDots} 已完成${s.doneDots} 上一步${s.prevDisabled ? "禁用" : "可用"} 按钮「${s.go}」溢出${s.overflow}  «${s.title}»`));

// 断言：必须依次走过 1..5
const expectSteps = GUIDE_STEPS.map((_, n) => n + 1);
const gotSteps = steps.map((s) => s.step);
if (gotSteps.join(",") !== expectSteps.join(",")) fails.push(`步骤推进异常：期望 ${expectSteps.join(",")}，实际 ${gotSteps.join(",")}`);
if (res.log.indexOf("FINISH") < 0) fails.push("点末步按钮未触发结束");
steps.forEach((s) => {
  if (s.activeDots !== 1) fails.push(`第${s.step}步高亮进度点数=${s.activeDots}`);
  if (s.doneDots !== s.step - 1) fails.push(`第${s.step}步「已完成」进度点数=${s.doneDots}（期望 ${s.step - 1}）`);
  if (s.overflow > 1) fails.push(`第${s.step}步内容溢出 ${s.overflow}px`);
});
if (steps[0].prevDisabled !== true) fails.push("首步「上一步」应禁用");
steps.slice(1).forEach((s) => { if (s.prevDisabled !== false) fails.push(`第${s.step}步「上一步」应可用`); });
if (steps[steps.length - 1].go !== "开始使用 ✓") fails.push("末步按钮文案未切换");
steps.slice(0, -1).forEach((s) => { if (s.go !== "下一步") fails.push(`第${s.step}步按钮文案应为下一步，实际「${s.go}」`); });
const hs = steps.map((s) => s.h);
if (Math.max(...hs) - Math.min(...hs) > 0.5) fails.push(`各步卡片高度不一致（切步会抖）：${hs.join(", ")}`);

if (fails.length) { console.error("\n✗ 指引交互检查失败:"); fails.forEach((f) => console.error("  - " + f)); process.exit(1); }
console.log("✓ 指引交互检查通过：5 步可依次推进、进度点与按钮状态正确、末步正常结束 ✓");
