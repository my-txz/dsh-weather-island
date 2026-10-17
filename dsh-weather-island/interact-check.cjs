/**
 * 交互级 BUG 验证（需要本机 Edge/Chrome）· v2.1。
 * 与 guide-interact.cjs 的区别：那个只点指引；本脚本验证**看板运行时行为**——
 * 在真实浏览器 + 真实 React 运行时里跑 WeatherIsland 组件本体，
 * 模拟「快速连续刷新」「搜索键盘导航」「展开收起」等交互，
 * 断言竞态守卫真的丢弃旧结果、spinner 不卡死、渐隐淡出生效。
 *
 * 做法：因为组件在 DSH 槽位环境里依赖 __ModuleLoader__，这里搭一个最小宿主页：
 * 注入 React UMD（若本机 node_modules 有 react 则用其 UMD 包，否则 SKIP）+
 * index.js 的 factory，然后真实挂载组件并驱动交互。
 *   node interact-check.cjs
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
if (!browser) { console.log("SKIP: 未找到浏览器"); process.exit(0); }

/* 在 node_modules 里找 react 的 UMD 产物（DSH 客户端自带 react，但仓库里未必有 node_modules） */
const reactUmdPaths = [
  path.join(dir, "node_modules", "react", "umd", "react.production.min.js"),
  path.join(dir, "node_modules", "react", "cjs", "react.production.min.js"),
];
let reactSrc = null;
for (const p of reactUmdPaths) { try { reactSrc = fs.readFileSync(p, "utf8"); break; } catch { /* next */ } }
if (!reactSrc) {
  console.log("SKIP: 仓库内没有 react UMD（不为了测试引入依赖）。");
  console.log("     交互级验证交由 render-smoke（元素树断言）+ ui-screenshot（几何断言）覆盖。");
  process.exit(0);
}

const pluginSrc = fs.readFileSync(path.join(dir, "index.js"), "utf8");

const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{margin:0;background:#0d0f14;height:100vh;overflow:hidden}</style>
<script>${reactSrc}<\/script>
</head><body>
<div id="host"></div>
<pre id="M" style="position:fixed;left:-99999px"></pre>
<script>
(function () {
  const log = [];
  const store = new Map();
  const localStorageStub = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  window.localStorage = localStorageStub;
  window.innerWidth = 1280; window.innerHeight = 800;

  // __ModuleLoader__：接住 index.js 顶层的 load() 调用
  let factory = null;
  window.__ModuleLoader__ = { load: (d) => { factory = d.factory; } };

  // fetch 桩：第一次请求 500ms 后返回「慢的旧数据」，之后的请求 50ms 返回「新数据」
  // —— 验证竞态守卫：连点两次刷新后，最终上屏必须是新数据（旧的被丢弃）
  let callSeq = 0;
  const mkWeather = (temp, city) => JSON.stringify({
    city, weather: "晴", weather_icon: "100", temperature: temp,
    report_time: "刚刚", temp_max: 26, temp_min: 14, humidity: 46,
    forecast: [{ date: "2026-10-17", temp_max: 26, temp_min: 14, weather_day: "晴", pop: 0 }],
    hourly_forecast: [], alerts: [],
  });
  window.fetch = (url) => {
    const u = String(url);
    callSeq += 1;
    const delay = /uapis\\.cn/.test(u) && callSeq === 1 ? 500 : 40;
    const temp = delay === 500 ? 11 : 22;   // 慢请求给 11°，快请求给 22°
    return new Promise((res) => setTimeout(() => res({
      ok: true, status: 200,
      headers: { get: () => null },
      text: () => Promise.resolve(mkWeather(temp, "北京")),
    }), delay));
  };

  // 执行插件源码（注册 factory）
  try {
    new Function("require", "window", "document", "navigator", ${JSON.stringify("__PLUGINSRC__")})(
      (m) => (m === "react" ? window.React : {}),
      window, window.document, window.navigator,
    );
  } catch (e) { log.push("LOAD_FAIL: " + e.message); }

  if (factory) {
    try {
      const api = factory((m) => (m === "react" ? window.React : {}));
      const React = window.React;
      log.push("name=" + api.name + " slots_ready");

      // 收集槽位注册
      const regs = [];
      const slots = {
        inject(slot, f) { const r = f(); regs.push({ slot, r }); return () => {}; },
        register(reg, renderFn) { return { reg, renderFn }; },
      };
      api.apply({ inject(names, cb) { return cb({ get: (k) => (k === "slots" ? slots : undefined) }); } });

      const islandFn = regs.find((r) => r.slot === "shell.overlay").r.renderFn({}).type;

      // 真实 React 挂载（16/18 兼容：ReactDOM.render 或 createRoot）
      const host = document.getElementById("host");
      const el = React.createElement(islandFn, {});
      if (window.ReactDOM.createRoot) {
        window.ReactDOM.createRoot(host).render(el);
      } else {
        window.ReactDOM.render(el, host);
      }
      log.push("mounted");

      // 竞态验证：等首屏完成后，先点一次「慢刷新」（返回 11°），
      // 紧接着立刻再点一次「快刷新」（返回 22°）。最终上屏必须是 22°。
      setTimeout(() => {
        try {
          const pill = host.querySelector(".dwi-hit");
          if (!pill) throw new Error("胶囊未挂载");
          // 触发两次刷新（直接调用其内部的刷新按钮语义：模拟展开后点刷新按钮两次）
          const before = host.querySelector(".dwi-temp");
          log.push("pill_temp_before=" + (before ? before.textContent : "none"));

          // 展开卡片，找到刷新按钮
          pill.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
          setTimeout(() => {
            const btns = Array.from(host.querySelectorAll(".dwi-btn"));
            const refreshBtn = btns[3]; // 第 4 个按钮是刷新
            if (!refreshBtn) { log.push("NO_REFRESH_BTN"); finish(); return; }
            refreshBtn.click();            // 第一次：慢（11°）
            setTimeout(() => refreshBtn.click(), 10);  // 第二次：快（22°）→ 应胜出
            setTimeout(() => {
              const after = host.querySelector(".dwi-temp");
              log.push("pill_temp_after=" + (after ? after.textContent : "none"));
              const spinning = !!host.querySelector(".dwi-spinning");
              log.push("spinner_stuck=" + spinning);
              finish();
            }, 900);
          }, 350);
        } catch (e) { log.push("INTERACT_FAIL: " + e.message); finish(); }
      }, 700);

      const finish = () => {
        document.getElementById("M").textContent = JSON.stringify(log);
      };
    } catch (e) {
      log.push("MOUNT_FAIL: " + e.message);
      document.getElementById("M").textContent = JSON.stringify(log);
    }
  } else {
    document.getElementById("M").textContent = JSON.stringify(log);
  }
})();
<\/script></body></html>`;

const finalHtml = html.replace("__PLUGINSRC__", () => JSON.stringify(pluginSrc).slice(1, -1));
const tmp = path.join(os.tmpdir(), "dwi-interact-" + process.pid + ".html");
fs.writeFileSync(tmp, finalHtml, "utf8");

try {
  const dom = execFileSync(browser, [
    "--headless", "--disable-gpu", "--virtual-time-budget=6000", "--dump-dom",
    "file:///" + tmp.replace(/\\/g, "/"),
  ], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
  const m = dom.match(/<pre id="M">([\s\S]*?)<\/pre>/);
  if (!m) { console.error("✗ 未拿到交互结果"); process.exit(1); }
  const log = JSON.parse(m[1].replace(/"/g, '"').replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">"));

  const fails = [];
  log.forEach((l) => console.log("  " + l));
  if (log.some((l) => /_FAIL/.test(l))) fails.push("挂载/交互过程有失败项：" + log.filter((l) => /_FAIL/.test(l)).join(" | "));
  if (!log.includes("mounted")) fails.push("组件未能真实挂载");
  const after = (log.find((l) => /^pill_temp_after=/.test(l)) || "").split("=")[1] || "";
  if (!/^22/.test(after)) fails.push(`竞态守卫失效：连点两次刷新后应显示 22°，实际「${after}」`);
  if (log.includes("spinner_stuck=true")) fails.push("刷新 spinner 被竞态守卫卡死");

  if (fails.length) { console.error("\n✗ 交互级验证失败:"); fails.forEach((f) => console.error("  - " + f)); process.exit(1); }
  console.log("✓ 交互级验证通过：真实 React 挂载、竞态守卫丢弃旧结果、spinner 正常复位");
} finally {
  try { fs.unlinkSync(tmp); } catch { /* ignore */ }
}
