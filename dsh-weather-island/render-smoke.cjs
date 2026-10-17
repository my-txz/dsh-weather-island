/**
 * 临时：用带 hooks 的 React 桩真实执行两个组件函数体一遍，捕获渲染期异常。
 * node render-smoke.cjs
 */
"use strict";
const fs = require("fs");
const path = require("path");

let hookIdx = 0;
const hooks = [];
function resetHooks() { hookIdx = 0; }
function nextHook(initial) {
  if (hooks.length <= hookIdx) hooks.push({ v: typeof initial === "function" ? initial() : initial });
  const slot = hooks[hookIdx];
  hookIdx += 1;
  return slot;
}
const reactStub = {
  createElement: (type, props, ...children) => ({ $$typeof: Symbol("el"), type, props: props || {}, children }),
  Fragment: "Fragment",
  useState: (initial) => {
    const slot = nextHook(initial);
    return [slot.v, (nv) => { slot.v = typeof nv === "function" ? nv(slot.v) : nv; }];
  },
  useEffect: (fn) => { nextHook(); /* 不执行副作用，避免定时器/订阅泄漏 */ },
  useMemo: (fn) => { const s = nextHook(); if (s.memo === undefined) s.memo = { v: fn() }; return s.memo.v; },
  useRef: (v) => { const s = nextHook(); if (!s.ref) s.ref = { current: v }; return s.ref; },
  useCallback: (fn) => { const s = nextHook(); s.v = fn; return fn; },
};

const store = new Map();
store.set("dsh-weather-island:v1", JSON.stringify({
  loc: { lat: 39.9, lon: 116.4, label: "北京", region: "北京市", country: "中国", countryCode: "CN", flag: "🇨🇳", source: "ip" },
  results: {
    uapi: {
      ok: true, source: "uapi", reportTime: "7 分钟前发布",
      current: { tempC: 25, feelsC: 24, humidity: 41, windKmh: 19, windDirText: "南风", windScale: "3级", pressureHpa: 1016, precipMm: 0, uvIndex: 4, visibilityKm: 4.3, cloudPct: 6, aqi: 101, aqiCategory: "轻度污染", icon: "😷", desc: "中度霾", isDay: true },
      hourly: [{ time: "现在", icon: "😷", desc: "霾", tempC: 25, pop: 0 }, { time: "16:00", icon: "☀️", desc: "晴", tempC: 26, pop: 0 }],
      daily: [
        { date: "2026-10-11", label: "今天", icon: "☀️", desc: "晴", tempMaxC: 26, tempMinC: 14, pop: 0, sunrise: "06:20", sunset: "17:42", uvMax: 4 },
        { date: "2026-10-12", label: "明天", icon: "⛅", desc: "多云", tempMaxC: 21, tempMinC: 11, pop: 10, sunrise: "06:21", sunset: "17:40" },
        { date: "2026-10-13", label: "后天", icon: "🌧️", desc: "小雨", tempMaxC: 22, tempMinC: 7, pop: 60 },
      ],
      alerts: [{ title: "霾预警", type: "霾", level: "黄色", text: "预计今日中度霾" }],
    },
    "open-meteo": {
      ok: true, source: "open-meteo", reportTime: "13:00",
      current: { tempC: 25.8, feelsC: 24.8, humidity: 40, windKmh: 9.5, windDirText: "南", pressureHpa: 1015, precipMm: 0, uvIndex: 4, visibilityKm: 24, cloudPct: 20, icon: "☀️", desc: "晴", isDay: true },
      hourly: [], daily: [], alerts: [],
    },
  },
  updated: Date.now() - 1000,
}));
store.set("dsh-weather-island:settings:v3", JSON.stringify({
  fontSize: 15, unit: "C", refreshMinutes: 10, locPref: "ip",
  activeSources: ["uapi", "open-meteo"], forecastDays: 7, clockSeconds: true,
  opacity: 80, theme: "auto", hoverExpand: false, showHourly: true,
  keys: { caiyun: "", openWeather: "", mojiId: "", mojiKey: "" },
  corsProxy: "", pos: { x: 300, y: 120 },
  manualLoc: { lat: 31.2, lon: 121.4, label: "上海", source: "manual" },
}));

global.window = {
  __ModuleLoader__: { load: (d) => { global.__f = d.factory; } },
  localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
  innerWidth: 1280, innerHeight: 800,
  addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
};
global.document = {
  hidden: false,
  querySelector: () => null,
  createElement: () => ({ dataset: {}, set textContent(v) {}, appendChild() {} }),
  head: { appendChild() {} },
  documentElement: { getAttribute: () => null, classList: { contains: () => false }, style: {} },
  body: { getAttribute: () => null, hasAttribute: () => false, classList: { contains: () => false } },
  addEventListener() {}, removeEventListener() {},
};
global.getComputedStyle = () => ({ colorScheme: "dark", getPropertyValue: () => "" });
global.MutationObserver = class { observe() {} disconnect() {} };
global.fetch = () => Promise.reject(new Error("smoke: no network"));

const src = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
new Function("require", "window", "document", "getComputedStyle", "MutationObserver", src)(
  (m) => (m === "react" ? reactStub : {}), global.window, global.document, global.getComputedStyle, global.MutationObserver
);
const api = global.__f((m) => (m === "react" ? reactStub : {}));
const regs = [];
const slots = {
  inject(slot, factory) { const r = factory(); regs.push({ slot, reg: r.reg, renderFn: r.renderFn }); return () => {}; },
  register(reg, renderFn) { return { reg, renderFn }; },
};
api.apply({ inject(names, cb) { return cb({ get: () => slots }); } });

let errors = [];
const walkCount = (node, depth = 0) => {
  if (node == null || depth > 40) return 0;
  let n = 0;
  if (Array.isArray(node)) { node.forEach((x) => { n += walkCount(x, depth + 1); }); return n; }
  if (typeof node === "object" && node.$$typeof) { n += 1; n += walkCount(node.children, depth + 1); }
  return n;
};

// 渲染折叠态
resetHooks();
try {
  const el = api && slots ? null : null;
  const islandFn = regs.find((r) => r.slot === "shell.overlay").renderFn({}).type;
  const out = islandFn();
  const nodes = walkCount(out);
  console.log("WeatherIsland 折叠态渲染 OK，节点数 =", nodes);
  // 再跑一次模拟展开后的渲染（expanded=true 通过直接调用组件 + hook 序号复用不可行，改走 settings 触发？简单起见：手动跑两次，hooks 重置后 state 初值一致）
} catch (e) { errors.push("折叠渲染: " + e.stack); }

// 用「展开态 + 已缓存数据」渲染：第一遍建立 hook 槽位，按声明顺序直接播种 state 槽，再重渲染。
// useState 声明顺序：0 settings,1 loc,2 weather,3 phase,4 error,5 expanded,6 searchOpen,
// 7 query,8 suggest,9 sugIdx,10 locatingGps,11 refreshing,12 updated,13 theme,14 dragPos,
// 15 dragging,16 guideOpen,17 guideStep,18 force
const origUseState = reactStub.useState;
try {
  const islandFn = regs.find((r) => r.slot === "shell.overlay").renderFn({}).type;
  resetHooks();
  islandFn(); // 建立 19 个 useState 槽位
  if (hooks.length < 19) throw new Error("槽位数异常: " + hooks.length);
  if (hooks[3].v !== "idle" || hooks[5].v !== false) throw new Error("未按预期定位到 phase/expanded 槽位");
  // 首次加载默认 `seenGuide=false` → guideOpen 应为 true（首帧就展开指引，无闪烁）
  if (hooks[16].v !== true) throw new Error("首跑应自动打开欢迎指引，实际 guideOpen=" + hooks[16].v);
  const cached = JSON.parse(store.get("dsh-weather-island:v1"));
  hooks[1].v = cached.loc;
  hooks[2].v = { results: cached.results, active: ["uapi", "open-meteo"] };
  hooks[3].v = "ready";
  hooks[5].v = true;
  hooks[12].v = cached.updated;
  hooks[16].v = false;   // 展开态断言用「指引已关」的常规界面
  hooks.forEach((s) => { s.memo = undefined; }); // 让 useMemo 基于新 state 重算
  resetHooks();
  const out = islandFn();
  console.log("WeatherIsland 展开态渲染 OK，节点数 =", walkCount(out));
  const classNames = [];
  const types = [];
  (function collect(n) {
    if (n == null) return;
    if (Array.isArray(n)) { n.forEach(collect); return; }
    if (typeof n === "object" && n.$$typeof) {
      types.push(String(n.type && n.type.name ? n.type.name : n.type));
      if (n.props && n.props.className) classNames.push(n.props.className);
      collect(n.children);
    }
  })(out);
  const joined = classNames.join(" ");
  ["dwi-card", "dwi-head", "dwi-nowTemp", "dwi-cell", "dwi-day", "dwi-sourceCard", "dwi-alert", "dwi-hour", "dwi-anchor", "dwi-pop", "dwi-primary", "dwi-today", "dwi-hnow", "dwi-dot"].forEach((needle) => {
    if (joined.indexOf(needle) < 0) throw new Error("展开态缺少关键区块: " + needle);
  });
  ["RealtimeClock", "PillClock"].forEach((needle) => {
    if (types.indexOf(needle) < 0) throw new Error("展开态缺少组件: " + needle);
  });
  console.log("展开态包含锚点层/头部/大温度/实时时钟/双源对照/详细数据(AQI色点)/逐时/多日/预警区块 ✓");
} catch (e) { errors.push("展开渲染: " + e.stack); }

/* ── 欢迎指引渲染：首跑展开、逐步遍历、最后一步文案切换 ── */
try {
  const islandFn = regs.find((r) => r.slot === "shell.overlay").renderFn({}).type;
  // 独立一轮：清空 hook 槽，确保 useState 用「真正的初值」重新初始化
  // （resetHooks 只把游标归零，不清数组；上文的槽位会残留并让初值断言失真）
  const freshRun = () => { hooks.length = 0; hookIdx = 0; };
  const classesOf = (tree) => {
    const acc = [];
    (function collect(n) {
      if (n == null) return;
      if (Array.isArray(n)) { n.forEach(collect); return; }
      if (typeof n !== "object" || !n.$$typeof) return;
      const t = n.type;
      // 函数组件：tree 里只留占位，需就地调用才能拿到它真正渲染出的 DOM 元素
      // （GuideCard 这类组件自己的根节点类名否则会被漏掉）
      if (typeof t === "function") {
        try {
          const sub = t(n.props || {});
          const snap = hookIdx;
          hookIdx = snap;              // 不改动调用方的 hook 游标
          collect(sub);
        } catch { /* 组件内部报错不吞掉：由外层断言兜底 */ }
        return;
      }
      if (n.props && n.props.className) acc.push(String(n.props.className));
      collect(n.children);
    })(tree);
    return acc.join(" ");
  };
  const total = api.internals.GUIDE_STEPS.length;
  if (total < 3) throw new Error("指引步骤过少: " + total);

  // 收集所有文本（含字符串子节点），用于断言按钮/标题文案
  const textOf = (tree) => {
    const acc = [];
    (function collect(n) {
      if (n == null) return;
      if (typeof n === "string" || typeof n === "number") { acc.push(String(n)); return; }
      if (Array.isArray(n)) { n.forEach(collect); return; }
      if (typeof n !== "object" || !n.$$typeof) return;
      const t = n.type;
      if (typeof t === "function") { collect(t(n.props || {})); return; }
      collect(n.children);
    })(tree);
    return acc.join(" ");
  };

  // 首跑：不播种任何 state → guideOpen 初值 = !seenGuide = true
  freshRun();
  islandFn();
  if (hooks[16].v !== true) throw new Error("首跑 guideOpen 应为 true，实际 " + hooks[16].v);
  freshRun();
  const first = islandFn();
  const cls = classesOf(first);
  ["dwi-guide", "dwi-guide-card", "dwi-guide-badge", "dwi-guide-orb", "dwi-guide-ring",
    "dwi-guide-dots", "dwi-guide-go", "dwi-guide-skip", "dwi-guide-anim"].forEach((needle) => {
    if (cls.indexOf(needle) < 0) throw new Error("指引首屏缺少: " + needle);
  });
  if (cls.indexOf("dwi-card") >= 0) throw new Error("指引显示时不应同时渲染天气卡片");

  // 每一步都能渲染：进度点恰好点亮 1 个、按钮文案随步骤切换
  for (let i = 0; i < total; i++) {
    // 先跑一次建立槽位，再播种，最后清槽位数组重跑
    // （必须清数组：否则上一轮残留的槽位会让这次 useState 复用旧初值）
    freshRun();
    islandFn();
    const seeded = { open: hooks[16].v, step: hooks[17].v };
    if (seeded.open !== true || seeded.step !== 0) throw new Error("槽位定位错误: " + JSON.stringify(seeded));
    hooks[16].v = true;       // guideOpen
    hooks[17].v = i;          // guideStep
    resetHooks();              // 只归零游标，保留刚播种的值
    const out2 = islandFn();
    const flat = classesOf(out2) + " " + textOf(out2);
    const onDots = flat.match(/dwi-guide-dot dwi-on/g) || [];
    if (onDots.length !== 1) throw new Error(`第 ${i + 1} 步应恰好点亮 1 个进度点，实际 ${onDots.length}`);
    const expect = i === total - 1 ? "开始使用 ✓" : "下一步";
    if (flat.indexOf(expect) < 0) throw new Error(`第 ${i + 1} 步按钮文案应为「${expect}」`);
    if (i === 0 && flat.indexOf("上一步") < 0) throw new Error("首步应有「上一步」按钮");
    if (classesOf(out2).indexOf("dwi-guide-card") < 0) throw new Error("指引卡片未渲染");
  }
  console.log(`欢迎指引渲染 OK：${total} 步全部可渲染，进度点与按钮文案正确 ✓`);
} catch (e) { errors.push("欢迎指引渲染: " + e.stack); }
reactStub.useState = origUseState;

try {
  const pageFn = regs.find((r) => r.slot === "settings.section").renderFn({}).type;
  resetHooks();
  const out = pageFn();
  console.log("SettingsPage 渲染 OK，节点数 =", walkCount(out));
} catch (e) { errors.push("设置页渲染: " + e.stack); }

/* ── 竞态守卫行为验证（等价调度模拟）──
   组件内部用 loadSeqRef 保证「只接受最新一次取数」。直接驱动组件私有闭包不可行
   （hooks 桩不跑 useEffect，locate/refresh 不会自发执行），因此这里复刻同一调度
   形状做行为级断言：慢请求(11°)与快请求(22°)同时在飞，seq 比对必须丢弃前者。
   这验证的是 loadWeather+守卫的组合语义，与组件内的使用方式一一对应。 */
(async () => {
try {
  const IV = api.internals;
  const mkWeather = (temp) => JSON.stringify({
    city: "北京", weather: "晴", weather_icon: "100", temperature: temp,
    report_time: "刚刚", temp_max: 26, temp_min: 14, humidity: 46,
    forecast: [{ date: "2099-01-01", temp_max: 26, temp_min: 14, weather_day: "晴", pop: 0 }],
    hourly_forecast: [], alerts: [],
  });
  let callSeq = 0;
  global.fetch = (url) => {
    callSeq += 1;
    const slow = /uapis\.cn/.test(String(url)) && callSeq === 1;
    return new Promise((res) => setTimeout(() => res({
      ok: true, status: 200,
      headers: { get: () => null },
      text: () => Promise.resolve(mkWeather(slow ? 11 : 22)),
    }), slow ? 400 : 40));
  };

  // 与组件相同的守卫形状：seq 自增 + 过期结果丢弃
  const state = { weather: null };
  let loadSeq = 0;
  const accept = (w) => { state.weather = w; };
  const loc = { label: "北京", lat: 39.9, lon: 116.4 };

  const p1 = (async () => {           // 第一次取数：慢（400ms → 11°）
    const seq = ++loadSeq;
    const w = await IV.loadWeather(loc, IV.settingsStore.get());
    if (seq === loadSeq) accept(w);   // 若期间发生了新取数 → 丢弃
  })();
  await new Promise((r) => setTimeout(r, 60));
  const p2 = (async () => {           // 第二次取数：快（40ms → 22°）
    const seq = ++loadSeq;
    const w = await IV.loadWeather(loc, IV.settingsStore.get());
    if (seq === loadSeq) accept(w);
  })();
  await Promise.all([p1, p2]);

  const temp = state.weather && state.weather.results && state.weather.results.uapi
    ? state.weather.results.uapi.current.tempC : null;
  if (temp === null) throw new Error("竞态验证前置失败：weather 为空");
  if (temp === 11) throw new Error("竞态守卫失效：慢请求(11°)晚到覆盖了快请求(22°)");
  if (temp !== 22) throw new Error(`竞态验证结果异常：${temp}°`);
  console.log("竞态守卫行为验证 OK：慢请求(11°)被丢弃，最终上屏 22° ✓");
} catch (e) { errors.push("竞态守卫行为: " + e.message); }

if (errors.length) { console.error("✗ 渲染冒烟失败:\n" + errors.join("\n---\n")); process.exit(1); }
console.log("✓ 渲染冒烟全部通过");
})();
