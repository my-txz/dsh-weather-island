/* 墨迹爬虫真实网络验证：反复多次运行，确认能稳定取回并解析 */
const fs = require("fs"), path = require("path");
const reactStub = {
  createElement: (t, p, ...c) => ({ type: t, props: p || {}, children: c }), Fragment: "F",
  useState: (v) => [typeof v === "function" ? v() : v, () => {}], useEffect: () => {}, useMemo: (fn) => fn(),
  useRef: (v) => ({ current: v }), useCallback: (fn) => fn,
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

/* node 环境没有 CORS 限制，但 withProxy 会读 settings.corsProxy。
   墨迹页面本身无 CORS 头，浏览器需代理；node 直连即可，proxyUrl 仅用于拼链。 */
const S = Object.assign({}, IV.DEFAULTS, { corsProxy: "" });

function show(tag, r) {
  if (!r) return console.log(tag + " -> null");
  const c = r.current || {};
  console.log(`${tag} -> ${c.tempC}° ${c.desc} ${c.icon} | 湿度 ${c.humidity}% | ${c.windDirText}${c.windScale} | AQI ${c.aqi} ${c.aqiCategory || ""} | 报告 ${r.reportTime}`);
  console.log(`   地点: ${r.placeName || "-"} | daily=${r.daily.length} | 指数=${r.lifeIndices ? Object.keys(r.lifeIndices).length : 0} 项 | tips: ${(r.tips || "").slice(0, 24)}`);
  r.daily.forEach((d, i) => console.log(`     [${i}] ${d.label || ""} ${d.desc}${d.descNight ? "转" + d.descNight : ""} ${d.tempMinC}~${d.tempMaxC}° ${d.icon}`));
}

(async () => {
  const rounds = Number(process.argv[2] || 2);
  for (let n = 1; n <= rounds; n++) {
    console.log("\n############ ROUND " + n + " ############");
    // 首页（IP 自动定位）——用户要求「不支持地区切换」，这是主路径
    try { show("墨迹 首页(IP) days=7", await IV.fetchMoji({ label: "" }, S, 7)); }
    catch (e) { console.log("墨迹 首页 EX:", e.message); }

    // 间歇等待，避免 CloudWAF（模块内已限速，这里再加一道外层保险）
    await new Promise((r) => setTimeout(r, 15000));

    // 带拼音 slug 的详情页路径
    try { show("墨迹 北京(detail) days=7", await IV.fetchMoji({ label: "北京市", provinceSlug: "beijing", citySlug: "beijing" }, S, 7)); }
    catch (e) { console.log("墨迹 北京 EX:", e.message); }

    await new Promise((r) => setTimeout(r, 15000));
    try { show("墨迹 上海(detail) days=3", await IV.fetchMoji({ label: "上海市", provinceSlug: "shanghai", citySlug: "shanghai" }, S, 3)); }
    catch (e) { console.log("墨迹 上海 EX:", e.message); }
    await new Promise((r) => setTimeout(r, 15000));
  }

  // 通过 loadWeather 走一遍（含多源协调）
  console.log("\n############ 经 loadWeather 调用 ############");
  const w = await IV.loadWeather({ label: "北京市", provinceSlug: "beijing", citySlug: "beijing" },
    Object.assign({}, IV.DEFAULTS, { activeSources: ["moji", "uapi"] }));
  const mo = w.results.moji;
  console.log("moji:", mo && (mo.ok ? "OK " + mo.current.tempC + "° " + mo.current.desc + " daily=" + mo.daily.length : "ERR " + mo.error));
  console.log("uapi:", w.results.uapi && (w.results.uapi.ok ? "OK" : "ERR " + w.results.uapi.error));
  console.log(w.results.moji && w.results.moji.ok ? "\n✓ 墨迹爬虫验证通过" : "\n✗ 墨迹爬虫未能取回数据");
})().catch((e) => { console.error("FATAL:", e.message); process.exit(1); });
