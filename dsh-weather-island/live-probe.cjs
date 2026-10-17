/**
 * 临时：对真实网络跑一遍适配器归一化（非仓库自检，验证完即删）。
 * node live-probe.cjs
 */
"use strict";
const fs = require("fs");
const path = require("path");
const reactStub = {
  createElement: (t, p, ...c) => ({ type: t, props: p || {}, children: c }),
  Fragment: "F", useState: (v) => [typeof v === "function" ? v() : v, () => {}],
  useEffect: () => {}, useMemo: (fn) => fn(), useRef: (v) => ({ current: v }), useCallback: (fn) => fn,
};
const store = new Map();
global.window = {
  __ModuleLoader__: { load: (d) => { global.__f = d.factory; } },
  localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
  innerWidth: 1280, innerHeight: 800, addEventListener() {}, removeEventListener() {},
};
global.document = {
  querySelector: () => null, createElement: () => ({ dataset: {}, set textContent(v) {}, appendChild() {} }),
  head: { appendChild() {} }, addEventListener() {}, removeEventListener() {},
};
const src = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
new Function("require", "window", "document", src)((m) => (m === "react" ? reactStub : {}), global.window, global.document);
const IV = global.__f((m) => (m === "react" ? reactStub : {})).internals;

const show = (tag, o) => {
  if (!o) return console.log(tag, "-> null");
  if (o.ok === false) return console.log(tag, "-> FAIL:", o.error);
  console.log(tag, "->", o.current.tempC + "°", o.current.desc, o.current.icon,
    "| feels", o.current.feelsC, "| humidity", o.current.humidity,
    "| wind", o.current.windKmh, o.current.windDirText, o.current.windScale || "",
    "| aqi", o.current.aqi, o.current.aqiCategory,
    "| daily", o.daily.length, "| hourly", o.hourly.length,
    "| alerts", (o.alerts || []).length);
  if (o.daily && o.daily.length) console.log("   daily:", o.daily.map((d) => `${d.label}/${d.date} ${d.icon}${d.desc} ${d.tempMinC}~${d.tempMaxC}`).join("  |  "));
  if (o.hourly && o.hourly.length > 1) console.log("   hourly[0..2]:", o.hourly.slice(0, 3).map((x) => `${x.time}${x.icon}${x.tempC}`).join("  "));
};

(async () => {
  const S = IV.settingsStore.get();
  // 1) Uapi 真实：北京（主源、7日、扩展、预警）
  try { show("uapi 北京 days=7", await IV.SOURCE_REGISTRY.uapi.fetch({ label: "北京" }, S, 7)); }
  catch (e) { console.log("uapi 北京 EX:", e.message); }
  // 2) Uapi 真实：区县名 + 国外城市
  try { show("uapi 深圳南山区 days=3", await IV.SOURCE_REGISTRY.uapi.fetch({ label: "深圳南山区" }, S, 3)); }
  catch (e) { console.log("uapi 南山区 EX:", e.message); }
  try { show("uapi Tokyo days=5", await IV.SOURCE_REGISTRY.uapi.fetch({ label: "Tokyo" }, S, 5)); }
  catch (e) { console.log("uapi Tokyo EX:", e.message); }
  // 3) Uapi 城市不存在 → 应给可读 404
  try { show("uapi 不存在市", await IV.SOURCE_REGISTRY.uapi.fetch({ label: "zzznotacity999" }, S, 3)); }
  catch (e) { console.log("uapi 不存在市 EX:", e.message); }
  // 4) Uapi 无城市名（GPS 反查失败场景）
  try { show("uapi 空 label", await IV.SOURCE_REGISTRY.uapi.fetch({ label: "" }, S, 3)); }
  catch (e) { console.log("uapi 空 label EX:", e.message); }
  // 5) Open-Meteo 真实
  try { show("open-meteo 北京 days=7", await IV.SOURCE_REGISTRY["open-meteo"].fetch({ lat: 39.9, lon: 116.4 }, S, 7)); }
  catch (e) { console.log("open-meteo EX:", e.message); }
  // 6) wttr.in 真实（可能慢）
  try { show("wttr 北京 days=3", await IV.SOURCE_REGISTRY.wttr.fetch({ lat: 39.9, lon: 116.4 }, S, 3)); }
  catch (e) { console.log("wttr EX:", e.message); }
  // 7) loadWeather 双源（Uapi 主 + Open-Meteo）
  const w = await IV.loadWeather({ label: "上海", lat: 31.2, lon: 121.4 }, S);
  console.log("loadWeather uapi:", w.results.uapi && (w.results.uapi.ok ? "OK" : "ERR " + w.results.uapi.error));
  console.log("loadWeather open-meteo:", w.results["open-meteo"] && (w.results["open-meteo"].ok ? "OK" : "ERR " + w.results["open-meteo"].error));
  // 8) 超时保护：用一个不会响应的地址验证 fetchJson 翻译
  const t0 = Date.now();
  try {
    await IV.fetchJson("https://10.255.255.1/slow", { timeout: 1500, label: "黑洞" });
  } catch (e) { console.log("timeout test:", e.message, "in", Date.now() - t0, "ms"); }
  // 9) 代理回退路径：直连坏 URL → 代理包一层好 URL（仅验证拼接逻辑，用一个自建占位地址）
  const withProxySettings = Object.assign({}, S, { corsProxy: "https://your-worker.example.dev/?url={{url}}" });
  try {
    const r = await IV.fetchSource("https://uapis.cn/api/v1/misc/weather?city=北京", withProxySettings, { timeout: 6000, label: "代理测试" });
    console.log("proxy path reachable:", !!r, "city:", r && r.city);
  } catch (e) { console.log("proxy EX (预期：占位地址不可达):", e.message); }

  // 10) 多端点自动切换：把 uapis.cn 人为打挂，确认能自动切到真实备份源并出数
  const realFetch = global.fetch;
  IV.EP_HEALTH.clear();
  global.fetch = (url, opts) => {
    if (/uapis\.cn/.test(String(url))) {
      return Promise.resolve({ ok: false, status: 403, headers: { get: () => null }, text: () => Promise.resolve("") });
    }
    return realFetch(url, opts);
  };
  try {
    show("uapi 切换(模拟403) 北京", await IV.SOURCE_REGISTRY.uapi.fetch({ label: "北京", lat: 39.9, lon: 116.4 }, S, 3));
  } catch (e) { console.log("uapi 403 切换 EX:", e.message); }
  try {
    show("uapi 切换(模拟403) 深圳南山区", await IV.SOURCE_REGISTRY.uapi.fetch({ label: "深圳南山区" }, S, 3));
  } catch (e) { console.log("uapi 403 切换(中文名) EX:", e.message); }

  // 11) 业务错误不应触发切换（应只发 1 次请求、快速失败）
  let calls = 0;
  global.fetch = () => { calls += 1; return Promise.resolve({ ok: false, status: 404, headers: { get: () => null }, text: () => Promise.resolve('{"code":"NOT_FOUND"}') }); };
  IV.EP_HEALTH.clear();
  const tb = Date.now();
  try { await IV.SOURCE_REGISTRY.uapi.fetch({ label: "zzznotacity999" }, S, 3); }
  catch (e) { console.log("404 直抛:", e.message, "| 请求数 =", calls, "| 耗时", Date.now() - tb, "ms"); }
  global.fetch = realFetch;
})();
