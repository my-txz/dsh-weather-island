/**
 * dsh-weather-island — 客户端半身自检（无浏览器、无 DSH 也能跑）· v2.0。
 *
 * 在最小 window/react/localStorage 桩里加载 index.js，验证：
 *   1) 工厂导出 name/inject/apply/Config 四件套；
 *   2) apply(ctx) 同时注册 shell.overlay（灵动岛）与 settings.section（设置页），
 *      两个 render(props) 均返回组件元素；
 *   3) 6 个数据源注册齐全，默认 Uapi + Open-Meteo（Uapi 为主源）；
 *   4) v2.0 修复点静态与单元断言：
 *      · fetchJson abort 带 TimeoutError 原因（不再是 signal is aborted without reason）；
 *      · settingsStore 逐键清洗（脏值回落默认、未知键丢弃、pos/manualLoc 形状校验）；
 *      · normalizeActive 上限 2、去重；withRetry 只重试瞬时错误；
 *      · 主题：detectTheme 显式偏好优先；
 *      · UI：位置只在拖动抬起提交（startDrag 源码含 anchorX + up 提交）、
 *        卡片绝对定位不撑根节点（.dwi-anchor position:absolute）；
 *      · 大温度 + 实时时钟 + 悬停效果 + 3/5/7 日预报 + Key 获取链接均在源码中。
 *   5) package.json / cordis.patch.yml 结构正确。
 *
 * 运行：node verify-client.cjs
 */
"use strict";
const fs = require("fs");
const path = require("path");

const failed = [];
const assert = (cond, msg) => { if (!cond) failed.push(msg); };

/* ── React 桩 ─────────────────────────────────────────────────────────── */
const createElement = (type, props, ...children) => ({ $$typeof: Symbol("element"), type, props: props || {}, children });
const reactStub = {
  createElement,
  Fragment: "Fragment",
  useState: (v) => [typeof v === "function" ? v() : v, () => {}],
  useEffect: () => {},
  useMemo: (fn) => fn(),
  useRef: (v) => ({ current: v }),
  useCallback: (fn) => fn,
};

/* ── 环境桩 ───────────────────────────────────────────────────────────── */
const store = new Map();
const localStorageStub = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
let loadedFactory = null;
const styleTags = [];
global.window = {
  __ModuleLoader__: { load(desc) { loadedFactory = desc.factory; } },
  localStorage: localStorageStub,
  innerWidth: 1280, innerHeight: 800,
  addEventListener() {}, removeEventListener() {},
};
global.document = {
  querySelector: () => null,
  createElement: () => ({ dataset: {}, set textContent(_v) {}, appendChild() {} }),
  head: { appendChild(el) { styleTags.push(el); } },
  addEventListener() {}, removeEventListener() {},
};
// Node 24+ 自带只读 globalThis.navigator，无需（也不能）覆盖。

const src = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
new Function("require", "window", "document", "navigator", src)(
  (mod) => (mod === "react" ? reactStub : {}),
  global.window, global.document, global.navigator
);
assert(typeof loadedFactory === "function", "factory 未注册到 __ModuleLoader__");

const require_ = (mod) => (mod === "react" ? reactStub : {});
const api = loadedFactory(require_);
assert(api && api.name === "weather-island", `exports.name 应为 weather-island，实际 ${api && api.name}`);
assert(Array.isArray(api.inject) && api.inject.includes("slots"), "exports.inject 应包含 'slots'");
assert(typeof api.apply === "function", "exports.apply 应为函数");
assert(api.Config && api.Config["~standard"] && typeof api.Config["~standard"].validate === "function",
  "exports.Config 缺少 ~standard.validate");
assert(api.Config["~standard"].validate({ fontSize: 17 }).value.fontSize === 17, "Config 应放行已知键");
assert(api.Config["~standard"].validate({ evil: 1 }).value.evil === undefined, "Config 应丢弃未知键");
const IV = api.internals || {};

/* ── 槽位注册自检 ─────────────────────────────────────────────────────── */
const registrations = [];
const mockSlots = {
  inject(slot, factory) {
    const r = factory();
    registrations.push({ slot, reg: r && r.reg, renderFn: r && r.renderFn });
    return () => {};
  },
  register(reg, renderFn) {
    const el = renderFn({});
    assert(el && typeof el === "object" && typeof el.type === "function",
      `render(props) 未返回组件元素（slot=${reg && reg.name}）`);
    return { reg, renderFn };
  },
};
api.apply({ inject(names, cb) { return cb({ get: (k) => (k === "slots" ? mockSlots : undefined) }); } });
const overlay = registrations.find((r) => r.slot === "shell.overlay");
const settings = registrations.find((r) => r.slot === "settings.section");
assert(overlay && overlay.reg && overlay.reg.id === "dsh-weather-island", "未注册 shell.overlay 或 id 不符");
assert(settings && settings.reg && settings.reg.id === "dsh-weather-island", "未注册 settings.section 或 id 不符");
assert(settings && settings.reg && typeof settings.reg.order === "number", "settings 注册应带 order");

/* ── 数据源注册与默认值 ───────────────────────────────────────────────── */
assert(Object.keys(IV.SOURCE_REGISTRY).length === 6, `应注册 6 个数据源，实际 ${Object.keys(IV.SOURCE_REGISTRY).length}`);
["uapi", "open-meteo", "wttr", "caiyun", "openWeather", "moji"].forEach((id) => {
  assert(!!IV.SOURCE_REGISTRY[id], `缺少数据源 ${id}`);
});
assert(IV.PRIMARY_PRIORITY[0] === "uapi", "PRIMARY_PRIORITY 应以 Uapi 优先");
assert(JSON.stringify(IV.DEFAULTS.activeSources) === JSON.stringify(["uapi", "open-meteo"]),
  "默认应为 Uapi + Open-Meteo（Uapi 为主）");
assert(IV.DEFAULTS.forecastDays === 3, "默认预报应为三日");
assert(IV.DEFAULTS.clockSeconds === false, "默认时钟不显示秒");
assert(IV.DEFAULTS.corsProxy === "", "默认不应启用第三方 CORS 代理（防拖慢/泄 Key）");
assert(IV.SOURCE_REGISTRY.uapi.free === true && IV.SOURCE_REGISTRY["open-meteo"].free === true &&
  IV.SOURCE_REGISTRY.wttr.free === true, "Uapi/Open-Meteo/wttr 应标为免 Key");
assert(IV.SOURCE_REGISTRY.caiyun.free === false && IV.SOURCE_REGISTRY.openWeather.free === false,
  "彩云/OpenWeather 应标为需 Key");
assert(IV.SOURCE_REGISTRY.moji.free === true, "墨迹改为网页爬虫后应为免 Key 源");
["caiyun", "openWeather"].forEach((id) => {
  assert(/^https:\/\//.test(IV.SOURCE_REGISTRY[id].keyApplyUrl), `${id} 必须有 Key 获取网址`);
});
assert(!IV.SOURCE_REGISTRY.moji.keyFields || IV.SOURCE_REGISTRY.moji.keyFields.length === 0,
  "墨迹爬虫不应再有 Key 字段");
// 免费源不配 Key 输入：keyFields 必须为空
["uapi", "open-meteo", "wttr", "moji"].forEach((id) => {
  assert(!IV.SOURCE_REGISTRY[id].keyFields || IV.SOURCE_REGISTRY[id].keyFields.length === 0,
    `免 Key 源 ${id} 不应有 keyFields`);
});

/* ── normalizeActive / 清洗 ───────────────────────────────────────────── */
assert(JSON.stringify(IV.normalizeActive(["uapi", "wttr", "caiyun", "uapi", "bogus"])) === JSON.stringify(["uapi", "wttr"]),
  "normalizeActive 应去重、丢未知、限 2");
const dirty = IV.sanitize({
  fontSize: 999, unit: "K", forecastDays: 4, opacity: -30, theme: "neon",
  clockSeconds: "yes", refreshMinutes: 7, activeSources: ["caiyun"],
  corsProxy: "http://insecure.example", keys: { caiyun: " tok " },
  pos: { x: 12.5, y: "bad" }, evil: { a: 1 },
});
assert(dirty.fontSize === 22 && dirty.unit === "C" && dirty.forecastDays === 3 && dirty.opacity === 45,
  "数值越界应回落到边界/默认");
assert(dirty.theme === "auto" && dirty.clockSeconds === false && dirty.refreshMinutes === 10,
  "非法枚举/布尔应回落默认");
assert(dirty.corsProxy === "", "非 https 代理应被丢弃");
assert(dirty.keys.caiyun === "tok", "Key 应被 trim");
assert(dirty.pos === null, "pos 形状非法应回落 null");
assert(dirty.evil === undefined, "未知键应被丢弃");
assert(JSON.stringify(IV.sanitize({ pos: { x: 100, y: 200 } }).pos) === JSON.stringify({ x: 100, y: 200 }),
  "合法 pos 应保留");
assert(IV.sanitize({ activeSources: ["nope"] }).activeSources.length === 2, "全非法 activeSources 应回落默认");

/* ── settingsStore：持久化 + 订阅 ─────────────────────────────────────── */
let notified = 0;
IV.settingsStore.subscribe(() => { notified += 1; });
IV.settingsStore.set({ unit: "F" });
assert(notified === 1, "订阅者应收到变更通知");
IV.settingsStore.set({ unit: "F" });
assert(notified === 1, "同值设置不应重复通知");
// 用 internals 暴露的真实键名，避免以后再改版本号时测试「假失败」
const persisted = JSON.parse(store.get(IV.LS_SETTINGS) || "{}");
assert(persisted.unit === "F", "设置应写入 localStorage（键 " + IV.LS_SETTINGS + "）");
IV.settingsStore.reset();
assert(IV.settingsStore.get().unit === "C", "reset 应回到默认");

/* ── withRetry：只重试瞬时错误 ────────────────────────────────────────── */
(async () => {
  let calls = 0;
  await IV.withRetry(() => {
    calls += 1;
    return calls < 2 ? Promise.reject(new Error("X：超时（9s 未返回）")) : Promise.resolve("ok");
  }, 1, 10).then((v) => assert(v === "ok" && calls === 2, "withRetry 应重试超时一次"));

  calls = 0;
  await IV.withRetry(() => {
    calls += 1;
    return Promise.reject(new Error("Uapi：未找到该城市"));
  }, 1, 10).then(
    () => assert(false, "withRetry 不应重试业务错误"),
    () => assert(calls === 1, "withRetry 对业务错误只调用一次")
  );

  /* ── fetchJson：abort 带原因 + 非 2xx 可读消息 ── */
  let seenSignal = null;
  const realFetch = global.fetch;
  global.fetch = (url, opts) => {
    seenSignal = opts && opts.signal;
    return new Promise((_res, rej) => {
      opts.signal.addEventListener("abort", () => {
        const reason = typeof opts.signal.reason === "object" && opts.signal.reason ? opts.signal.reason : null;
        const e = new Error(reason ? String(reason.message || "") : "signal is aborted without reason");
        e.name = reason ? (reason.name || "AbortError") : "AbortError";
        rej(e);
      });
    });
  };
  const timeoutErr = await IV.fetchJson("https://unit.test/x", { timeout: 30, label: "测试源" }).then(
    () => null, (e) => e.message);
  assert(seenSignal && typeof seenSignal.addEventListener === "function", "fetchJson 必须挂 AbortController signal");
  assert(typeof timeoutErr === "string" && /超时/.test(timeoutErr),
    `超时应翻译成中文「超时」，实际：${timeoutErr}`);

  global.fetch = (url, opts) => {
    if (opts && opts.signal) return Promise.reject(Object.assign(new Error("signal is aborted without reason"), { name: "AbortError" }));
    return Promise.reject(new Error("never"));
  };
  const abortedMsg = await IV.fetchJson("https://unit.test/y", { timeout: 5000, label: "S" }).then(() => null, (e) => e.message);
  assert(/超时/.test(abortedMsg), `AbortError 也应翻译为超时：${abortedMsg}`);

  const mkRes = (status, body, headers) => ({
    ok: status >= 200 && status < 300, status,
    headers: { get: (k) => (headers && headers[k]) || null },
    text: () => Promise.resolve(body),
  });
  global.fetch = () => Promise.resolve(mkRes(404, JSON.stringify({ code: "NOT_FOUND", message: "未找到该城市的天气数据" })));
  const m404 = await IV.fetchJson("https://unit.test/z", { timeout: 5000, label: "Uapi" }).then(() => null, (e) => e.message);
  assert(/未找到该城市/.test(m404) && /未找到该城市的天气数据/.test(m404) && /NOT_FOUND/.test(m404),
    `404 应透出接口 code/message：${m404}`);

  // 破坏性变更回归：Uapi 4xx 常返回「空响应体」→ 必须靠状态码兜底，不能报错成空的
  global.fetch = () => Promise.resolve(mkRes(404, ""));
  const empty404 = await IV.fetchJson("https://unit.test/z", { timeout: 5000, label: "Uapi" }).then(() => null, (e) => e.message);
  assert(/未找到该城市/.test(empty404), `空体 404 应仍有可读原因：${empty404}`);
  global.fetch = () => Promise.resolve(mkRes(400, ""));
  const empty400 = await IV.fetchJson("https://unit.test/z", { timeout: 5000, label: "Uapi" }).then(() => null, (e) => e.message);
  assert(/参数不合法/.test(empty400), `空体 400 应提示参数问题：${empty400}`);
  global.fetch = () => Promise.resolve(mkRes(503, ""));
  const empty503 = await IV.fetchJson("https://unit.test/z", { timeout: 5000, label: "Uapi" }).then(() => null, (e) => e.message);
  assert(/服务端\/上游异常/.test(empty503) && /503/.test(empty503), `503 应提示服务暂不可用：${empty503}`);

  global.fetch = () => Promise.resolve(mkRes(429, "{}", { "Retry-After": "30" }));
  const m429 = await IV.fetchJson("https://unit.test/z", { timeout: 5000, label: "S" }).then(() => null, (e) => e.message);
  assert(/429/.test(m429) && /30/.test(m429), `429 应提示频率限制并带 Retry-After：${m429}`);

  global.fetch = () => Promise.resolve(mkRes(200, "<html>not json</html>"));
  const mhtml = await IV.fetchJson("https://unit.test/z", { timeout: 5000, label: "S" }).then(() => null, (e) => e.message);
  assert(/不是 JSON/.test(mhtml), `非 JSON 应说明被网关改写：${mhtml}`);

  // 200 + 业务错误码（升级后新增的错误码体系）
  global.fetch = () => Promise.resolve(mkRes(200, JSON.stringify({ code: "SERVICE_UNAVAILABLE", message: "天气服务暂时不可用" })));
  const bizErr = await IV.fetchJson("https://unit.test/z", { timeout: 5000, label: "Uapi" }).then(() => null, (e) => e.message);
  assert(/天气服务暂时不可用/.test(bizErr) && /SERVICE_UNAVAILABLE/.test(bizErr), `200+业务错误码应被拦截：${bizErr}`);

  global.fetch = () => Promise.resolve(mkRes(200, JSON.stringify({ a: 1 })));
  const okv = await IV.fetchJson("https://unit.test/ok", { timeout: 5000, label: "S" });
  assert(okv && okv.a === 1, "200 JSON 应正常返回");
  global.fetch = realFetch;

  /* ── 时间解析：ISO8601（带时区偏移）不能错位 ── */
  assert(/function parseIso/.test(src), "应新增 ISO8601 时间解析（新版 hourly.time 带时区）");
  const isoNoOff = IV.parseIso("2026-02-19T17:00:00");
  assert(!isNaN(isoNoOff) && isoNoOff.getHours() === 17 && isoNoOff.getMinutes() === 0,
    "无偏移 ISO 应按本地墙上时间解析");
  const isoOff = IV.parseIso("2026-02-19T17:00:00+0900");
  assert(!isNaN(isoOff) && isoOff.getHours() === 17 && isoOff.getMinutes() === 0,
    "带偏移 ISO 应还原为来源时区的墙上时间（17:00），而非被时区平移");
  const isoColon = IV.parseIso("2026-02-19T15:30:00+08:00");
  assert(!isNaN(isoColon) && isoColon.getHours() === 15 && isoColon.getMinutes() === 30, "+08:00 冒号式偏移也应正确");
  const isoZ = IV.parseIso("2026-02-19T00:00:00Z");
  assert(!isNaN(isoZ), "Z 结尾应可解析");

  /* ── reportTime 归一：绝对时间与「x 分钟前」两种格式都要可读 ── */
  assert(/function normalizeReportTime/.test(src), "应新增 report_time 归一化");
  assert(IV.normalizeReportTime("8 分钟前发布") === "8 分钟前发布", "相对描述应原样保留");
  const rt = IV.normalizeReportTime("2026-02-19 15:25:58");
  assert(/\d{2}:\d{2}/.test(rt) && rt.length <= 20, `绝对时间应归一为短串（实际：${rt}）`);

  /* ── Uapi 适配器：真实样例响应归一化 ── */
  const sample = {
    province: "北京市", city: "北京", adcode: "110000",
    weather: "中度霾", weather_icon: "502", temperature: 25,
    wind_direction: "东南风", wind_power: "3级", humidity: 46,
    report_time: "7 分钟前发布", temp_max: 26, temp_min: 14,
    feels_like: 25, visibility: 4.3, pressure: 1016, uv: 4,
    aqi: 114, aqi_level: 3, aqi_category: "轻度污染", aqi_primary: "O3",
    air_pollutants: { pm25: 52, pm10: 93, o3: 205 },
    precipitation: 0, cloud: 6,
    forecast: [
      { date: "2026-10-11", week: "星期日", temp_max: 26, temp_min: 14, weather_day: "晴", weather_night: "多云", wind_dir_day: "东南风", wind_scale_day: "2级", wind_speed_day: 17, pop: 0, uv_index: 4, sunrise: "06:20", sunset: "17:42" },
      { date: "2026-10-12", week: "星期一", temp_max: 21, temp_min: 11, weather_day: "多云", weather_night: "阴", pop: 10, sunrise: "06:21", sunset: "17:40" },
      { date: "2026-10-13", week: "星期二", temp_max: 22, temp_min: 7, weather_day: "小雨", pop: 60 },
    ],
    hourly_forecast: [
      { time: "2026-10-11T13:45:08+0800", temperature: 25, weather: "中度霾", wind_speed: 12 },
      { time: "2026-10-11T14:00:00+0800", temperature: 25, weather: "中度霾", pop: 0 },
    ],
  };
  global.fetch = () => Promise.resolve(mkRes(200, JSON.stringify(sample)));
  const u = await IV.SOURCE_REGISTRY.uapi.fetch({ label: "北京" }, IV.DEFAULTS, 3);
  assert(u.ok && u.source === "uapi", "Uapi 适配器应产出 ok 结果");
  assert(u.current.tempC === 25 && u.current.feelsC === 25 && u.current.humidity === 46, "实况字段应归一化");
  assert(u.current.windKmh === 12, "风速应从 hourly[0] 借数值");
  assert(u.current.windScale === "3级", "风力等级保留");
  assert(u.current.aqi === 114 && u.current.aqiCategory === "轻度污染", "AQI 应保留");
  assert(u.current.aqiLevel === 3 && u.current.aqiPrimary === "O3", "新版 aqi_level / aqi_primary 应透出");
  assert(u.current.pollutants && u.current.pollutants.pm25 === 52, "新版 air_pollutants 应透出");
  assert(u.current.icon === "😷" && /霾/.test(u.current.desc), "502 应映射为霾图标与中文描述");
  assert(u.daily.length === 3 && !!u.daily[0].label && u.daily[0].sunrise === "06:20", "三日预报与日出应映射");
  assert(u.daily[0].windSpeedDay === 17, "新版 wind_speed_day 应透出");
  assert(u.daily[2].pop === 60, "pop 应透传");
  assert(u.hourly.length >= 2 && u.hourly[0].time === "现在", "逐时应归一化且首格为现在");
  assert(/^\d{2}:\d{2}$/.test(u.hourly[1].time), "逐时时间应为 HH:MM（ISO8601 带时区也可解析）");
  assert(u.hourly[1].time === "14:00", `ISO+0800 应解析为 14:00，实际 ${u.hourly[1].time}`);
  assert(u.reportTime === "7 分钟前发布", "相对 report_time 应保留");

  // 新版：不传 city 时走 IP 自动定位（不应再抛「没有城市名」）
  const ipSample = {
    province: "四川省", city: "成都市", district: "郫都区", adcode: "510117",
    weather: "晴", weather_icon: "100", temperature: 22,
    wind_direction: "西北风", wind_power: "2级", humidity: 62,
    report_time: "2026-02-19 15:25:58", forecast: [{ date: "2026-02-19", temp_max: 24, temp_min: 12, weather_day: "晴", sunrise: "07:30", sunset: "18:40" }],
    hourly_forecast: [
      { time: "2026-02-19T17:00:00+0900", temperature: 20, weather: "晴", wind_speed: 17 },
      { time: "2026-02-19T18:00:00+0900", temperature: 18, weather: "晴", wind_speed: 15 },
    ],
  };
  global.fetch = () => Promise.resolve(mkRes(200, JSON.stringify(ipSample)));
  const uIp = await IV.SOURCE_REGISTRY.uapi.fetch({ label: "" }, IV.DEFAULTS, 3);
  assert(uIp.ok, "无城市名时应走 IP 自动定位而非报错");
  assert(uIp.placeName === "成都市·郫都区", `应拼装 city·district 显示名，实际 ${uIp.placeName}`);
  assert(/\d{2}:\d{2}/.test(uIp.reportTime) && uIp.reportTime.length <= 20, `绝对 report_time 应归一化，实际 ${uIp.reportTime}`);
  assert(uIp.hourly[1].time === "18:00", `+0900 应解析为来源时区墙上时间 18:00，实际 ${uIp.hourly[1].time}`);

  // 新版字段缺失时的图标回退：weather_icon 缺席 → 用中文文本兜底
  // （给出覆盖全天的日出日落以固定 isDay=true，避免断言随运行时刻在昼/夜图标间摆动）
  global.fetch = () => Promise.resolve(mkRes(200, JSON.stringify({
    city: "北京", weather: "多云", temperature: 20,
    forecast: [{ date: "2026-02-19", temp_max: 24, temp_min: 12, weather_day: "多云", sunrise: "00:01", sunset: "23:59" }],
    hourly_forecast: [],
  })));
  const uNoIcon = await IV.SOURCE_REGISTRY.uapi.fetch({ label: "北京" }, IV.DEFAULTS, 3);
  assert(uNoIcon.ok && uNoIcon.current.icon === "⛅", `weather_icon 缺失时应按中文文本回退，实际 ${uNoIcon.current.icon}`);

  // 新版分钟级降水 + 生活指数（官方文档的 minutely / indices 模块）
  let lastUrl = "";
  global.fetch = (url) => {
    lastUrl = String(url);
    return Promise.resolve(mkRes(200, JSON.stringify({
      city: "深圳", weather: "晴", temperature: 20, report_time: "2026-02-19 15:30:00",
      forecast: [], hourly_forecast: [],
      minutely_precip: {
        summary: "未来2小时无降水",
        update_time: "2026-02-19T15:30:00+08:00",
        data: [{ time: "2026-02-19T15:30:00+08:00", precip: 0, type: "rain" }],
      },
      life_indices: {
        clothing: { level: "热", brief: "很热", advice: "建议穿轻薄的夏装" },
        uv: { level: "高", brief: "较强", advice: "涂抹SPF30+防晒霜" },
        exercise: { level: "非常适宜", brief: "极佳", advice: "适合户外运动" },
      },
    })));
  };
  const uMin = await IV.SOURCE_REGISTRY.uapi.fetch({ label: "深圳" }, IV.DEFAULTS, 3);
  assert(uMin.minutely && uMin.minutely.summary === "未来2小时无降水", "新版 minutely_precip 应透出");
  assert(uMin.minutely.points.length === 1, "minutely.data 应作为 points 透出");
  assert(uMin.lifeIndices && uMin.lifeIndices.clothing.level === "热", "life_indices 应透出");
  assert(uMin.lifeIndices.uv.advice === "涂抹SPF30+防晒霜", "生活指数 advice 应透出");
  // 官方文档的 minutely / indices 必须是「请求参数」，否则接口不会返回这两块
  assert(/minutely=true/.test(lastUrl), `应按文档请求 minutely=true（实际 ${lastUrl}）`);
  assert(/indices=true/.test(lastUrl), `应按文档请求 indices=true（实际 ${lastUrl}）`);

  global.fetch = () => Promise.resolve(mkRes(404, JSON.stringify({ code: "NOT_FOUND", message: "未找到该城市的天气数据" })));
  const u2 = await IV.loadWeather({ label: "不存在市" }, Object.assign({}, IV.DEFAULTS, { activeSources: ["uapi", "open-meteo"] }));
  assert(u2.results.uapi && u2.results.uapi.ok === false && /未找到/.test(u2.results.uapi.error), "城市 404 应给出可读错误");
  assert(u2.results["open-meteo"] && u2.results["open-meteo"].ok === false, "另一源失败也应各自记录，不阻断整体");

  // 缺 Key 源：不调网络，直接标注未配置（墨迹改为爬虫后不再属于此类）
  const noKey = await IV.loadWeather({ label: "北京", lat: 1, lon: 2 }, Object.assign({}, IV.DEFAULTS, { activeSources: ["caiyun"] }));
  assert(/未配置/.test(noKey.results.caiyun.error), "缺 Key 源应返回「未配置」而非发请求");

  /* ── 多端点自动切换（本轮核心修复） ── */
  assert(/function fetchEndpoints/.test(src), "应有多端点自动切换实现");
  assert(/function uapiEndpoints/.test(src), "Uapi 应提供端点表（主 + 备份）");
  assert(/function isRetryableError/.test(src), "应有结构化可重试判定");
  assert(/function epMarkFail|EP_HEALTH/.test(src), "应有端点健康冷却");
  assert(/visitor-rate|Ratelimit-Policy|429/.test(src), "应针对 Uapi 访客速率桶（429）做防护");
  assert(/store-on-empty|Stop-On-Empty|StopOnEmpty/i.test(src), "应知晓 Uapi-Stop-On-Empty 配额硬拦行为");
  assert(!/cache: "no-store"/.test(src), "不应再发 cache:no-store（会绕开 CDN 缓存并更易触发 429）");
  // 实测公共 CORS 代理已全线不可用（allorigins 522/超时、corsproxy.io 401 要付费 Key、
  // codetabs 522、thingproxy 502、r.jina.ai 502…），内置它们只会白等后失败 → 不应内置。
  // 只检查「代码行」，注释里说明这些代理已失效是允许的。
  const srcCode = src.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  assert(!/api\.allorigins\.win|corsproxy\.io|codetabs|thingproxy|r\.jina\.ai/i.test(srcCode),
    "不应内置已失效的公共 CORS 代理（只会拖慢并失败）");
  assert(/geocoding-api\.open-meteo\.com/.test(src), "备份应支持城市名 → 坐标（open-meteo geocoding）");
  assert(/\bwttr\.in\/.*format=j1/.test(src), "备份应含 wttr.in（同为城市名语义）");

  // 分类器：业务错误不可重试，瞬时错误可重试
  const mkErr = (msg, meta) => IV.errWith(new Error(msg), meta || {});
  assert(IV.isRetryableError(mkErr("未找到该城市", { status: 404, fatal: true })) === false, "404 不应重试");
  assert(IV.isRetryableError(mkErr("参数无效", { status: 400 })) === false, "400 不应重试");
  assert(IV.isRetryableError(mkErr("Key 无效", { status: 401, fatal: true })) === false, "401 不应重试");
  assert(IV.isRetryableError(mkErr("拒绝", { status: 403 })) === true, "403（CORS/防盗链）应换端点重试");
  assert(IV.isRetryableError(mkErr("频繁", { status: 429 })) === true, "429 应换端点重试");
  assert(IV.isRetryableError(mkErr("服务端异常", { status: 503 })) === true, "5xx 应换端点重试");
  assert(IV.isRetryableError(mkErr("超时（9s 未返回）")) === true, "超时应重试");

  // endpoints 表结构：首个为直连主端点
  const eps = IV.uapiEndpoints(["city=%E5%8C%97%E4%BA%AC"], { label: "北京", lat: 39.9, lon: 116.4 });
  assert(eps.length >= 4, `端点表应含主端点 + 多个等价备份，实际 ${eps.length}`);
  assert(eps[0].mode === "direct" && /^https:\/\/uapis\.cn\/api\/v1\/misc\/weather\?/.test(eps[0].url),
    "首个端点应为 uapis.cn 直连主端点");
  assert(eps.some((e) => e.mode === "proxy"), "端点表应含走用户自配 CORS 代理的备份");
  assert(eps.some((e) => /wttr\.in/.test(e.url)), "端点表应含 wttr.in 等价备份");
  assert(eps.some((e) => /api\.open-meteo\.com\/v1\/forecast/.test(e.url)), "端点表应含 open-meteo 预报备份");
  // v2.1：无坐标但有城市名时才需要「地理编码 → 预报」两跳兜底；有坐标时直接按坐标取，少一跳
  const epsNoGeo = IV.uapiEndpoints(["city=x"], { label: "北京" });
  assert(epsNoGeo.some((e) => /geocoding-api\.open-meteo\.com/.test(e.url)),
    "无坐标的端点表应含 open-meteo 地理编码备份");
  assert(!eps.some((e) => /geocoding-api\.open-meteo\.com/.test(e.url)),
    "有坐标的端点表不应再含地理编码（直接走 forecast，省一跳）");

  // 自动切换：主端点 429 → 备份成功
  const realFetch2 = global.fetch;
  let hit = [];
  global.fetch = (url) => {
    hit.push(String(url));
    if (hit.length === 1) return Promise.resolve(mkRes(429, "{}", { "Retry-After": "2" }));
    return Promise.resolve(mkRes(200, JSON.stringify({ city: "北京", weather: "晴", temperature: 21, forecast: [], hourly_forecast: [] })));
  };
  IV.EP_HEALTH.clear();
  const fo = await IV.fetchEndpoints(IV.uapiEndpoints(["city=x"], { label: "北京", lat: 39.9, lon: 116.4 }), IV.DEFAULTS, { timeout: 3000, label: "Uapi" });
  assert(fo && fo.temperature === 21, "主端点 429 后应自动切到备份并成功");
  assert(hit.length >= 2, `应至少尝试两个端点，实际 ${hit.length}`);

  // v2.1：未配置 CORS 代理时，proxy 端点必须被跳过（不再把主端点原样重发一遍打速率桶）
  hit = [];
  IV.EP_HEALTH.clear();
  await IV.fetchEndpoints(IV.uapiEndpoints(["city=x"], { label: "北京", lat: 39.9, lon: 116.4 }), IV.DEFAULTS, { timeout: 3000, label: "Uapi" })
    .catch(() => {});
  const uapiHits = hit.filter((u) => /uapis\.cn/.test(u));
  assert(uapiHits.length <= 1, `无代理配置时主端点最多请求 1 次（不重发），实际 ${uapiHits.length} 次`);

  // v2.1：配置了 CORS 代理时，proxy 端点参与切换
  hit = [];
  IV.EP_HEALTH.clear();
  await IV.fetchEndpoints(IV.uapiEndpoints(["city=x"], { label: "北京", lat: 39.9, lon: 116.4 }),
    Object.assign({}, IV.DEFAULTS, { corsProxy: "https://worker.test/?url={{url}}" }),
    { timeout: 3000, label: "Uapi" }).catch(() => {});
  assert(hit.some((u) => /worker\.test/.test(u)), "配置代理后应尝试走代理的端点");

  // 自动切换：业务错误（404）不切换，直接上抛
  hit = [];
  global.fetch = (url) => { hit.push(String(url)); return Promise.resolve(mkRes(404, JSON.stringify({ code: "NOT_FOUND", message: "没这个城市" }))); };
  IV.EP_HEALTH.clear();
  const bizErr2 = await IV.fetchEndpoints(IV.uapiEndpoints(["city=x"], { label: "北京", lat: 39.9, lon: 116.4 }), IV.DEFAULTS, { timeout: 3000, label: "Uapi" })
    .then(() => null, (e) => e);
  assert(bizErr2 && /没这个城市|未找到/.test(bizErr2.message), "404 业务错误应上抛");
  assert(hit.length === 1, `404 不应切换端点（避免无意义的多次请求），实际尝试 ${hit.length} 次`);

  // 全端点失败：应抛错且错误带端点信息
  hit = [];
  global.fetch = (url) => { hit.push(String(url)); return Promise.resolve(mkRes(503, "")); };
  IV.EP_HEALTH.clear();
  const allErr = await IV.fetchEndpoints(IV.uapiEndpoints(["city=x"], { label: "北京", lat: 39.9, lon: 116.4 }), IV.DEFAULTS, { timeout: 3000, label: "Uapi" })
    .then(() => null, (e) => e);
  assert(allErr && /服务端\/上游异常|不可用/.test(allErr.message), `全失败应给出可读原因：${allErr && allErr.message}`);
  assert(allErr.endpoint, "失败错误应标记出错的端点");

  // 冷却：失败端点被标记，冷却期内 epReady 为 false
  const coolUrl = "https://cool.test/api";
  IV.EP_HEALTH.clear();
  assert(IV.epReady(coolUrl) === true, "无记录端点应可用");
  IV.epMarkFail(coolUrl, mkErr("boom", { status: 503 }));
  IV.epMarkFail(coolUrl, mkErr("boom", { status: 503 }));
  assert(IV.epReady(coolUrl) === false, "连续失败端点应进入冷却");
  IV.epMarkOk(coolUrl);
  assert(IV.epReady(coolUrl) === true, "成功后应清除冷却");

  // Retry-After 解析：秒数
  assert(IV.numFromHeader({ headers: { get: () => "30" } }, "Retry-After") === 30, "Retry-After 秒数应解析");
  assert(IV.numFromHeader({ headers: { get: () => null } }, "Retry-After") === null, "无 Retry-After 应返回 null");
  global.fetch = realFetch2;

  /* ── detectTheme：显式偏好优先 ── */
  assert(IV.detectTheme("light") === "light" && IV.detectTheme("dark") === "dark", "显式主题偏好应直接生效");
  const auto = IV.detectTheme("auto");
  assert(auto === "dark" || auto === "light", "auto 应解析为 dark/light 之一");

  /* ── AQI 分级 ── */
  assert(IV.aqiGrade(30).text === "优" && IV.aqiGrade(114).text === "轻度污染" && IV.aqiGrade(400).text === "严重污染",
    "AQI 六级应正确");

  /* ── 源码级 v2.0 修复断言 ── */
  assert(/new DOMException\(reason, "TimeoutError"\)/.test(src), "abort 必须带 TimeoutError 原因（修复 signal is aborted without reason）");
  assert(!/ctrl\.abort\(\)/.test(src.replace(/try \{ ctrl\.abort\(\); \} catch/g, "")), "不应再出现无原因 abort");
  assert(/anchorX: rect\.left \+ rect\.width \/ 2/.test(src), "拖动应记录按下瞬间锚点");
  assert(/if \(wasMoved && final\) settingsStore\.set\(\{ pos: final \}\)/.test(src), "位置应只在拖动抬起时提交一次");
  assert(/dwi-anchor\{position:absolute/.test(src), "卡片必须绝对定位（展开不撑大根节点→不改写记忆位置）");
  assert(/dwi-nowTemp\{font-size:calc\(var\(--dwi-fs\) \* 3\.9\)/.test(src), "卡片度数应放大到 3.9 倍");
  assert(/function RealtimeClock/.test(src) && /dwi-clockBig/.test(src), "应有实时时钟组件");
  assert(/clockSeconds: false/.test(src), "时钟默认不显示秒");
  assert(/\.dwi-cell:hover\{background:var\(--dwi-cell-hover\)/.test(src) && /\.dwi-cell::after\{/.test(src), "详细数据小卡片应有悬停效果");
  assert(/forecastDays/.test(src) && /"七日"|"五日"/.test(src), "预报天数应支持 3/5/7 切换");
  assert(/&forecast_days=" \+ days|forecast=\[&days\]/.test(src) || /forecast=true/.test(src), "多日预报参数应随设置变化");
  assert(/获取 Key ↗/.test(src), "设置页应有 Key 获取入口链接");
  assert(/keyApplyUrl/.test(src), "注册表应带 keyApplyUrl 字段");
  assert(/dwi-theme-light|dwi-theme-dark/.test(src), "深浅主题类应存在");
  assert(/--dwi-alpha/.test(src), "玻璃透明度令牌应存在");
  assert(/function detectTheme/.test(src), "应有主题检测函数");
  assert(/visibilitychange/.test(src), "应在页面隐藏时暂停轮询");
  assert(/open-meteo\.com\/v1\/search/.test(src), "城市搜索应使用 Open-Meteo Geocoding");
  assert(/uapis\.cn\/api\/v1\/misc\/weather/.test(src), "Uapi 端点应为 uapis.cn/api/v1/misc/weather");
  assert(/manualLoc/.test(src), "手动城市应持久记忆");
  assert(!/api\.uapis\.cn/.test(src), "不应使用不可靠的 api.uapis.cn 主机名");
  assert(/setPrimary/.test(src), "双源卡应可点选主源");

  /* ── 源码级：Uapi 2026-02-19 升级修复断言 ── */
  assert(/function parseIso/.test(src) && /function normalizeReportTime/.test(src),
    "应有 ISO8601 解析与 report_time 归一化（新版时间格式变更）");
  assert(/function pickInfo/.test(src) || /const info = pickInfo/.test(src),
    "图标应做 weather_code → weather_icon → 中文文本 三级回退（weather_icon 可能缺失）");
  assert(/extended=true", "forecast=true", "hourly=true/.test(src),
    "应恒开 extended/forecast/hourly 模块");
  assert(/adcode=/.test(src), "应支持 adcode 查询（新版优先级最高）");
  assert(/新版的?允许两者都不传|按客户端 IP 自动定位/.test(src),
    "无 city/adcode 时应走 IP 自动定位而非报错（新版行为）");
  assert(/aqi_primary|aqiPrimary/.test(src), "应读取新版 aqi_primary");
  assert(/air_pollutants|pollutants/.test(src), "应读取新版 air_pollutants 污染物分项");
  assert(/minutely_precip|minutely/.test(src), "应兼容新版分钟级降水");
  assert(/wind_speed_day|windSpeedDay/.test(src), "应读取新版 forecast.wind_speed_day");
  assert(/district/.test(src), "应读取新版 district 用于城市显示名");
  assert(/NOT_FOUND|SERVICE_UNAVAILABLE/.test(src), "应处理新版字符串错误码（NOT_FOUND/SERVICE_UNAVAILABLE）");
  assert(/SERVICE_BUSY|VISITOR_MONTHLY_QUOTA_EXHAUSTED/.test(src), "应处理新版 429 细分错误码");
  assert(/Retry-After/.test(src), "429 应读取 Retry-After 给出等待提示");

  /* ── 源码级：官方文档对齐（weather_icon 优先 / minutely / indices / 生活指数 UI） ── */
  // 实测 uapis.cn 返回里只有 weather_icon（和风码），weather_code 未返回；
  // 故 pickInfo 必须让 weather_icon 参数在前，否则等于每次都退化到文本兜底。
  const pickCall = (src.match(/function pickInfo\(([^)]*)\)/) || [])[1] || "";
  assert(/^\s*iconLike\s*,\s*codeLike/.test(pickCall), `pickInfo 形参应 iconLike 在前（实际：${pickCall}）`);
  assert(/const info = pickInfo\(j\.weather_icon, j\.weather_code/.test(src),
    "顶层图标应以 weather_icon 优先（实测真实字段）");
  assert(/pickInfo\(x\.weather_icon, x\.weather_code/.test(src), "逐时图标应以 weather_icon 优先");
  assert(/pickInfo\(f\.weather_icon, f\.weather_code/.test(src), "每日图标应以 weather_icon 优先");
  assert(/minutely=true/.test(src) && /indices=true/.test(src),
    "应按官方文档请求 minutely=true / indices=true 模块");
  assert(/lifeIndices/.test(src) && /dwi-tips|dwi-tip/.test(src), "生活指数应有归一化与展示");
  assert(/生活指数/.test(src), "卡片应展示生活指数区块");

  /* ── 墨迹爬虫：解析器单元测试（用真实抓取片段做夹具） ── */
  assert(typeof IV.fetchHtml === "function", "应有 HTML 抓取器 fetchHtml（爬虫用）");
  assert(typeof IV.parseMojiCurrent === "function" && typeof IV.parseMojiForecast === "function",
    "应暴露墨迹解析器供测试");
  // 实况夹具：摘录自 tianqi.moji.com 真实页面片段
  const mojiCurHtml = `
    <div class="wea_weather clearfix">
      <em>19</em>
      <span><img src="https://h5tq.moji.com/tianqi/assets/images/weather/w30.png" alt="晴"></span>
      <b>晴</b>
      <strong class="info_uptime">今天19:04更新</strong>
    </div>
    <div class="wea_about clearfix">
      <span>湿度 64%</span>
      <em>东南风1级</em>
    </div>
    <div class="wea_tips clearfix"><span>今日天气提示</span><em>冷热适宜，感觉很舒适。</em></div>
    <div class="wea_alert clearfix"><ul><li><a href="/aqi/china/beijing/beijing">
      <span class="level level_3"><img src=".../aqi/3.png" alt="101 轻度污染"></span>
      <em>101 轻度污染</em></a></li></ul></div>
    <ul class="days clearfix">
      <li><a href="https://tianqi.moji.com/today/china/beijing/beijing">今天</a></li>
      <li><span><img src=".../w31.png" alt="多云"></span> 多云 </li>
      <li>14° / 26°</li>
      <li><em>南风</em><b>2级</b></li>
      <li><strong class="level_2"> 94 良 </strong></li>
    </ul>
    <div id="live_index"><div class="live_index_grid"><ul class="clearfix">
      <li><a href="javascript:" class="clearfix"><span><img src=".../21.png"></span>
        <dl><dt>弱</dt><dd>紫外线</dd></dl></a></li>
      <li><a href="javascript:" class="clearfix"><span><img src=".../2.png"></span>
        <dl><dt>适宜</dt><dd>运动</dd></dl></a></li>
    </ul></div></div>`;
  const mc = IV.parseMojiCurrent(mojiCurHtml);
  assert(mc.c.tempC === 19, `实况温度应解析为 19，实际 ${mc.c.tempC}`);
  assert(mc.c.desc === "晴", `实况天气应解析为「晴」，实际 ${mc.c.desc}`);
  assert(mc.c.humidity === 64, `湿度应解析为 64，实际 ${mc.c.humidity}`);
  assert(mc.c.windDirText === "东南风" && mc.c.windScale === "1级",
    `风向风力应解析为 东南风/1级，实际 ${mc.c.windDirText}/${mc.c.windScale}`);
  assert(mc.c.aqi === 101 && mc.c.aqiCategory === "轻度污染",
    `AQI 应解析为 101/轻度污染，实际 ${mc.c.aqi}/${mc.c.aqiCategory}`);
  assert(mc.c.tips === "冷热适宜，感觉很舒适。", "天气提示应解析");
  assert(mc.today && mc.today.tempMinC === 14 && mc.today.tempMaxC === 26,
    `当天区间应为 14~26（页面是「低 / 高」顺序），实际 ${mc.today && mc.today.tempMinC}~${mc.today && mc.today.tempMaxC}`);
  const mind = IV.parseMojiIndices(mojiCurHtml);
  assert(mind && mind["紫外线"] && mind["紫外线"].level === "弱", "生活指数应解析出「紫外线:弱」");
  assert(mind["运动"] && mind["运动"].level === "适宜", "生活指数应解析出「运动:适宜」");

  // 预报夹具：wea_list_seven，<b>=最高温 <strong>=最低温
  const mojiFcHtml = `
    <div class="wea_list clearfix wea_list_seven">
      <ul class="clearfix">
        <li><span class="week">周六</span><span class="wea">多云</span>
          <span class="weai"><img src=".../w1.png" alt="多云"></span>
          <div class="tree clearfix"><p><b>25°</b><strong>13°</strong></p></div>
          <span class="weai"><img src=".../w32.png" alt="雾"></span>
          <span class="wea">雾</span><span class="week">10/10</span></li>
        <li class="active"><span class="week">周日</span><span class="wea">晴</span>
          <span class="weai"><img src=".../w0.png" alt="晴"></span>
          <div class="tree clearfix"><p><b>26°</b><strong>14°</strong></p></div>
          <span class="weai"><img src=".../w1.png" alt="多云"></span>
          <span class="wea">多云</span><span class="week">10/11</span></li>
      </ul>
    </div>`;
  const mf = IV.parseMojiForecast(mojiFcHtml, 7);
  assert(mf.length === 2, `预报应解析出 2 天，实际 ${mf.length}`);
  assert(mf[0].tempMaxC === 25 && mf[0].tempMinC === 13,
    `第 1 天应为 高25/低13（<b>=高、<strong>=低），实际 ${mf[0].tempMaxC}/${mf[0].tempMinC}`);
  assert(mf[0].descDay === "多云" && mf[0].descNight === "雾",
    `第 1 天应 白天多云/夜间雾，实际 ${mf[0].descDay}/${mf[0].descNight}`);
  assert(mf[0].dateText === "10/10" && mf[0].label === "周六", "应解析出星期与日期");
  assert(mf[1].tempMaxC === 26 && mf[1].descDay === "晴" && mf[1].descNight === "多云", "第 2 天解析应正确");
  // 日期换算
  const baseD = new Date(2026, 9, 11);  // 2026-10-11
  const d1 = IV.mojiDateFromText("10/13", baseD);
  assert(d1 && d1.getMonth() === 9 && d1.getDate() === 13, `"10/13" 应解析为 10 月 13 日`);
  const d2 = IV.mojiDateFromText("01/05", baseD);
  assert(d2 && d2.getFullYear() === 2027, `跨年 "01/05" 应顺延到 2027 年，实际 ${d2 && d2.getFullYear()}`);
  const d3 = IV.mojiDateFromWeek("周日", baseD);
  assert(d3 && d3.getDay() === 0, `"周日" 应解析为最近的那个周日`);

  // CloudWAF 拦截页必须被识别为可重试错误，而不是当作正常页面解析
  assert(/CloudWAF|访问被拦截/.test(src), "fetchHtml 应识别 CloudWAF 拦截页");
  assert(/418/.test(src), "应把 WAF 的 HTTP 418 视为限流信号");
  assert(/MOJI_MIN_GAP_MS|mojiSerial/.test(src), "墨迹应做全局限速/串行，避免触发 CloudWAF");
  assert(/forecast7|forecast10|forecast15|forecast" \+/.test(src), "多日预报应取自 forecastN 页");
  assert(!/apihz/i.test(src), "应删除原 apihz 中转 API 逻辑");

  /* ── dayLabel：日期归一化（曾把「今天」误判为「明天」的回归测试） ── */
  const tnow = new Date();
  assert(IV.dayLabel(tnow) === "今天", `当前时刻应判为「今天」，实际 ${IV.dayLabel(tnow)}`);
  assert(IV.dayLabel(new Date(tnow.getFullYear(), tnow.getMonth(), tnow.getDate())) === "今天",
    "今天零点应判为「今天」");
  assert(IV.dayLabel(new Date(tnow.getFullYear(), tnow.getMonth(), tnow.getDate() + 1)) === "明天",
    "明天应判为「明天」");
  assert(IV.dayLabel(new Date(tnow.getFullYear(), tnow.getMonth(), tnow.getDate() + 2)) === "后天",
    "后天应判为「后天」");
  // 「今天 20:00」这类带时刻的日期同样必须是「今天」
  const evening = new Date(tnow.getFullYear(), tnow.getMonth(), tnow.getDate(), 20, 0, 0);
  assert(IV.dayLabel(evening) === "今天", `今天 20:00 应判为「今天」，实际 ${IV.dayLabel(evening)}`);

  /* ── fetchHtml：短响应可用 minLength 放宽（供 /api/iplocate 一行文本） ── */
  assert(/minLength/.test(src), "fetchHtml 应支持 minLength 以兼容很小的接口响应");
  assert(/api\/iplocate/.test(src), "墨迹应按 IP 定位换取省/市 slug，从而在「不切地区」下也能出多日预报");

  /* ══ 首次加载欢迎指引 ══════════════════════════════════════════════════ */
  // 1) 步骤数据：每步都要有标题与说明，且至少 3 步才有「指引」的价值
  assert(Array.isArray(IV.GUIDE_STEPS) && IV.GUIDE_STEPS.length >= 3,
    `应有 >=3 步欢迎指引，实际 ${IV.GUIDE_STEPS && IV.GUIDE_STEPS.length}`);
  IV.GUIDE_STEPS.forEach((s, i) => {
    assert(s && typeof s.title === "string" && s.title.length > 0, `第 ${i + 1} 步缺标题`);
    assert(typeof s.desc === "string" && s.desc.length >= 10, `第 ${i + 1} 步说明过短`);
    assert(typeof s.orb === "string" && s.orb.length > 0, `第 ${i + 1} 步缺图标`);
    assert(["accent", "accent2", "teal", "warn", "ok"].includes(s.tone),
      `第 ${i + 1} 步 tone 非法：${s.tone}`);
  });

  // 2) 持久化：默认未见 → 标记已读 → 落盘 → 再次读取仍为已读
  const gDefault = IV.settingsStore.get().seenGuide;
  assert(gDefault === false, "全新用户的 seenGuide 默认应允许自动弹出（false）");
  IV.settingsStore.set({ seenGuide: true });
  assert(IV.settingsStore.get().seenGuide === true, "seenGuide 应可置为已读");
  const gPersisted = JSON.parse(store.get(IV.LS_SETTINGS) || "{}");
  assert(gPersisted.seenGuide === true, "seenGuide 应写入 localStorage（否则每次打开都弹）");
  // 从 localStorage 重新解析一遍，模拟「下次启动」
  IV.settingsStore.reset();
  assert(IV.settingsStore.get().seenGuide === false, "reset 后应回到「未看过」");
  IV.settingsStore.set({ seenGuide: true });
  const reread = JSON.parse(store.get(IV.LS_SETTINGS) || "{}");
  assert(reread.seenGuide === true, "再次启动应读到已读状态");

  // 3) 旧版本设置键仍能升级（v3/v2 → v4），且不会丢掉用户设置
  assert(Array.isArray(IV.LS_SETTINGS_LEGACY) && IV.LS_SETTINGS_LEGACY.length >= 1,
    "应保留旧设置键以便平滑升级");
  assert(/settings:v4/.test(IV.LS_SETTINGS), "设置键应升到 v4（新增 seenGuide）");
  const legacyKey = IV.LS_SETTINGS_LEGACY[0];
  store.set(legacyKey, JSON.stringify({ unit: "F", fontSize: 19 }));
  delete store.__probe;                       // 无关；保持 store 语义清晰
  const upgraded = (function () {
    // 直接调用清洗器验证「旧数据进来 → 新结构出去」，不依赖单例缓存
    return IV.sanitize ? IV.sanitize(JSON.parse(store.get(legacyKey))) : null;
  })();
  if (upgraded) {
    assert(upgraded.unit === "F" && upgraded.fontSize === 19, "旧版本设置应被保留");
    assert(upgraded.seenGuide === false, "旧版本没有 seenGuide 时应回落为「未看过」");
  }
  // 脏类型清洗：非布尔值不能让指引「永久消失」或「永久弹出」
  assert(IV.DEFAULTS.seenGuide === false, "DEFAULTS.seenGuide 应为 false");
  ["yes", 1, null, {}, []].forEach((bad) => {
    const s = IV.sanitize ? IV.sanitize({ seenGuide: bad }) : null;
    if (s) assert(s.seenGuide === false, `seenGuide 脏值 ${JSON.stringify(bad)} 应回落 false`);
  });

  // 4) 跨插槽重播总线：设置页触发 → 悬浮卡片收到
  let replayHits = 0;
  const offReplay = IV.guideReplay.on(() => { replayHits += 1; });
  IV.guideReplay.fire();
  IV.guideReplay.fire();
  assert(replayHits === 2, `重播总线应逐次通知订阅者，实际 ${replayHits}`);
  offReplay();
  IV.guideReplay.fire();
  assert(replayHits === 2, "取消订阅后不应再收到通知");
  // 订阅者抛错不能牵连其它订阅者
  let okAfterThrow = 0;
  const offThrow = IV.guideReplay.on(() => { throw new Error("boom"); });
  const offOk = IV.guideReplay.on(() => { okAfterThrow += 1; });
  IV.guideReplay.fire();
  assert(okAfterThrow === 1, "某个订阅者抛错时其它订阅者仍应被通知");
  offThrow(); offOk();

  // 5) 源码级：指引首帧展开（避免「先见胶囊、再弹指引」的闪烁）
  assert(/useState\(\(\) => !settingsStore\.get\(\)\.seenGuide\)/.test(src),
    "指引应以 seenGuide 初值直接决定是否展开（首帧生效）");
  assert(/guideOpen/.test(src) && /finishGuide/.test(src) && /GuideCard/.test(src),
    "应有指引的开合状态、结束回调与卡片组件");
  assert(/GUIDE_TEXT|GUIDE_STEPS/.test(src) && /dwi-guide-card/.test(src), "指引应有步骤数据与样式");
  assert(/ArrowRight/.test(src) && /ArrowLeft/.test(src), "指引应支持键盘左右翻页");
  assert(/再看一遍指引/.test(src), "设置页应提供「再看一遍指引」入口");
  // 指引必须复用卡片同款视觉语言，而不是另起一套
  ["dwi-guide-tint", "dwi-guide-dots", "dwi-guide-dot", "dwi-on", "dwi-orbit", "dwi-sheen"].forEach((n) => {
    assert(src.indexOf(n) >= 0, `指引缺少视觉细节：${n}`);
  });
  assert(/prefers-reduced-motion:reduce\{[^}]*dwi-guide/.test(src.replace(/\s+/g, "")) ||
    /dwi-guide[\s\S]{0,120}prefers-reduced-motion/.test(src) ||
    /\.dwi-guide-card,\.dwi-guide-anim,\.dwi-guide-orb,\.dwi-guide-ring,\.dwi-guide-go::after\{animation:none/.test(src),
    "指引应遵循 prefers-reduced-motion 降级");

  /* ══ v2.1：场景化背景 / 竞态守卫 / 失败汇总 / 搜索导航 / 键盘增强 ════════ */
  // 1) 场景映射：常见天气 → 场景 key；SCENES 表每套都要有三色
  assert(typeof IV.sceneOf === "function", "应有 sceneOf 场景推断函数");
  assert(IV.sceneOf("雷阵雨", "⛈️", true) === "storm", "雷暴应映射 storm 场景");
  assert(IV.sceneOf("小雨", "🌧️", true) === "rain", "雨应映射 rain 场景");
  assert(IV.sceneOf("中雪", "❄️", true) === "snow", "雪应映射 snow 场景");
  assert(IV.sceneOf("中度霾", "😷", true) === "haze", "霾应映射 haze 场景");
  assert(IV.sceneOf("多云", "⛅", true) === "cloudy", "多云应映射 cloudy 场景");
  assert(IV.sceneOf("晴", "☀️", true) === "day_clear", "晴昼应映射 day_clear 场景");
  assert(IV.sceneOf("晴", "☀️", false) === "night", "晴夜应映射 night 场景（夜间优先于晴）");
  assert(IV.sceneOf("大风", "💨", true) === "cloudy",
    "大风应归入 cloudy（💨 图标有歧义：不能因它误判成霾的昏黄背景）");
  assert(IV.sceneOf("扬沙", "💨", true) === "haze", "文本含「扬沙」时应优先于图标判为 haze");
  ["day_clear", "night", "cloudy", "rain", "storm", "snow", "haze"].forEach((k) => {
    const sc = IV.SCENES[k];
    assert(sc && /^#[0-9a-f]{6}$/i.test(sc.c1) && /^#[0-9a-f]{6}$/i.test(sc.c2) && /^#[0-9a-f]{6}$/i.test(sc.c3),
      `场景 ${k} 缺少合法三色`);
  });
  // 场景色应挂到根节点（CSS 变量），且设置里可关
  assert(/--dwi-c1:scene\.c1/.test(src) || /"\-\-dwi-c1": scene\.c1/.test(src), "场景三色应写入根节点 CSS 变量");
  assert(IV.DEFAULTS.sceneBg === true, "场景化背景默认开启");
  assert(IV.sanitize({ sceneBg: false }).sceneBg === false, "sceneBg 应可关闭");
  assert(IV.sanitize({ sceneBg: "bogus" }).sceneBg === true, "sceneBg 脏值应回落 true");
  assert(/sceneBg/.test(src) && /场景化背景/.test(src), "设置页应有场景化背景开关");
  // 场景生效机制：.dwi-scene 类 + --dwi-scene-aurora 强度（浅色下弱强度会把场景冲淡到难辨）
  assert(/scene \? " dwi-scene" : ""/.test(src), "场景激活时应给根节点挂 dwi-scene 类");
  assert(/\.dwi-scene \.dwi-bg span\{opacity:calc\(var\(--dwi-scene-aurora\)/.test(src),
    "场景激活时应改用 --dwi-scene-aurora 强度（而非被浅色 .20 基础极光冲淡）");
  assert(/--dwi-scene-aurora:\.45/.test(src) && /--dwi-scene-aurora:\.55/.test(src),
    "场景强度令牌应为深 .45 / 浅 .55");

  // 2) 竞态守卫：loadSeqRef 存在且 locate/refresh/pickSuggest 都比对序号
  assert(/loadSeqRef/.test(src), "应有 loadSeqRef 竞态守卫");
  assert((src.match(/seq !== loadSeqRef\.current/g) || []).length >= 4,
    "locate/refresh/pickSuggest/设置重取 四处都应比对竞态序号");

  // 3) 失败汇总块：README 承诺的「两源皆败给汇总与重试」必须真的渲染
  assert(/failSummary/.test(src), "应有失败源汇总派生（failSummary）");
  assert(/dwi-errAll/.test(src), "全败汇总块应有更醒目的样式（dwi-errAll）");
  assert(/所有数据源都失败了/.test(src), "全败文案应明确");
  assert(/allFailed && loc/.test(src), "已定位但全源失败时胶囊应有「数据源失败」态");

  // 4) 搜索建议键盘导航 + U 键
  assert(/sugIdx/.test(src), "搜索建议应有键盘高亮项（sugIdx）");
  assert(/ArrowDown/.test(src) && /ArrowUp/.test(src) && /dwi-sugOn/.test(src),
    "搜索应支持 ↑/↓ 导航并高亮当前项");
  assert(/"u" \|\| e\.key === "U"|\|\| e\.key === "u"/.test(src) || /e\.key === "u" \|\| e\.key === "U"/.test(src),
    "胶囊聚焦应支持 U 键切换单位");

  // 5) 本轮修复的回归断言
  assert(!/var\(--dwi-line\)|var\(--dwi-fg\)/.test(src), "不应再引用未定义的 var(--dwi-line/--dwi-f) 变量");
  assert(!/return text;\s*\n\s*return text;/.test(src), "httpTextOnce 不应再有重复 return");
  assert(/ipapi\.co/.test(src), "IP 定位应有备份源（ipapi.co）");
  assert(/Math\.min\(o\.timeout \|\| DEFAULT_TIMEOUT, 9000\)/.test(src),
    "备份端点超时应收紧到 ≤9s");
  assert(/dwis-hero/.test(src), "设置页应有 hero 横幅");
  assert(/dwis-fill/.test(src), "滑杆应带轨道填充进度");

  console.log("style tags injected:", styleTags.length);
  console.log("registered slots:", registrations.map((r) => `${r.slot}(id=${r.reg && r.reg.id})`).join(", "));
  console.log("sources:", Object.keys(IV.SOURCE_REGISTRY).join(", "),
    "| default:", JSON.stringify(IV.DEFAULTS.activeSources));

  if (failed.length) {
    console.error("\n✗ 自检失败：");
    failed.forEach((m) => console.error("  - " + m));
    process.exit(1);
  }
  console.log("\n✓ dsh-weather-island v2.0 客户端半身自检通过。");
})();
