/**
 * dsh-weather-island — 浏览器半身（client half）· v2.0
 *
 * ┌─ 文件分区（新增功能请落对应分区，勿跨区散改）────────────────────────┐
 * │  0  常量                                                              │
 * │  1  样式（主题令牌 · 深浅色 · 透明度 · 悬停效果）                      │
 * │  2  通用工具（fetchJson 超时/重试 · 单位 · 时间）                       │
 * │  3  设置仓库（逐键清洗 + 旧版本迁移）                                   │
 * │  4  天气符号字典（WMO / 和风码 / 中文文本 / skycon / OWM / AQI）         │
 * │  5  数据源适配层（registerSource：扩展新源只加一个适配器 + 一行注册）    │
 * │  6  定位服务（IP / GPS / 城市搜索 / 手动记忆）                           │
 * │  7  主题检测（DSH 标记 + 令牌亮度 + 系统偏好）                           │
 * │  8  小组件（图标 / 实时时钟）                                            │
 * │  9  灵动岛（锚点式拖动：记住落点，点击不改位置；智能弹出方向）           │
 * │ 10  设置页                                                              │
 * │ 11  装配（slot 注册）                                                   │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * v2.0 修复与新增（相对 v1.2）
 *   ① Uapi「signal is aborted without reason」
 *      · abort() 附带 DOMException('…','TimeoutError') 作为 reason，不再无原因中断；
 *      · 每个源独立超时（Uapi 11s），瞬时失败自动重试一次；
 *      · 先 text() 再 JSON.parse：404/401/429/5xx/非 JSON 都给出中文可读原因；
 *      · CORS 代理改为默认关闭 + 支持 {{url}} 占位符，避免第三方代理把请求拖到超时。
 *   ② 灵动岛记忆语义：记住的是「拖动落点」，点击展开/收起不再改写位置。
 *      · 卡片改为绝对定位挂在锚点旁，自身不再撑大根节点 → 尺寸变化不影响锚点；
 *      · 拖动中只更新局部 state（60fps），抬起时才提交一次位置（不再每帧写 localStorage）；
 *      · 未移动（纯点击）完全不写位置。
 *   ③ 主题：令牌去重为「深色默认 + 浅色覆盖」两套；玻璃背板用 ::before 伪元素，
 *      透明度可调而文字始终满不透明；设置页全部改用 DSH 主题令牌。
 *   ④ 卡片度数放大（约 3.9em，带渐变描边），右侧新增实时时钟（默认 HH:MM，可开秒）。
 *   ⑤ 预报支持 3 / 5 / 7 日（默认 3 日）；Uapi 的 forecast 本身就返回 7 天，直接取用。
 *   ⑥ 「详细数据」小卡片 + 逐时格 + 单日行 + 双源卡 + 搜索建议 均加悬停效果。
 *   ⑦ 设置页为需 Key 的源补「申请 Key ↗」与「文档 ↗」链接（免费源不加链接，只留文档）。
 *   ⑧ 新增实用功能：主源可点选、AQI 色阶、手动城市持久记忆、透明度/主题/悬停展开/
 *      逐时开关可调、后台自动暂停轮询、错误一键重试、胶囊键盘可达（Enter/Space/R）。
 *
 * 2.0 修订（Uapi 接口 2026-02-19「重大升级」适配，仅修 Uapi 相关逻辑）
 *   ⑨ Uapi 升级为破坏性变更，旧解析失效，按新契约重写 fetchUapi：
 *      · 错误体系：移除 502、新增 503；400 INVALID_ARGUMENT→INVALID_PARAMETER、
 *        404 LOCATION_NOT_FOUND→NOT_FOUND；且 4xx 常回「空响应体」——
 *        故 fetchJson 改为「状态码兜底文案 + 接口 message 优先 + 新版字符串错误码拦截」。
 *      · city/adcode 双查询，且两者都不传时按客户端 IP 自动定位（旧版会直接报错）。
 *      · hourly.time 改 ISO8601 且可能带时区偏移（+0900）→ 新增 parseIso 避免逐时错位。
 *      · report_time 由「x 分钟前发布」变为绝对时间 → 新增 normalizeReportTime 归一。
 *      · weather_icon 可能缺失 → 图标改三级回退 weather_code → weather_icon → 中文文本。
 *      · 新增字段：district / aqi_level / aqi_primary / air_pollutants /
 *        forecast.wind_speed_day / minutely_precip / life_indices / alerts 扩展字段。
 *
 * v2.1（本轮完善：修复 + 场景化 + 设置页 + 网络强化）
 *   ⑩ 场景化卡片背景：按当前天气/昼夜自动切换极光配色（晴昼/夜间/多云/雨/雷暴/
 *      雪/霾 7 套），大温度渐变与度数符号同步染色；可在设置页关闭。
 *   ⑪ 修复 .dwi-tip 引用了未定义变量（--dwi-line/--dwi-fg）导致边框/颜色失效。
 *   ⑫ 修复 httpTextOnce 中重复的 return（死代码）。
 *   ⑬ 网络强化：未配置 CORS 代理时跳过 proxy 端点（不再原样重发主端点打满
 *      访客速率桶）；备份端点超时收紧到 ≤9s；IP 定位双源回退（ipwho.is → ipapi.co）。
 *   ⑭ 竞态守卫：快速连续刷新/定位/换城时只接受最新一次请求的结果（loadSeq）。
 *   ⑮ 补上 README 承诺但未实现的「数据源失败汇总 + 重试」块（.dwi-err）；
 *      双源皆败时胶囊也显示 ⚠️ 与「点击重试」态。
 *   ⑯ 体验：搜索建议支持 ↑/↓/Enter 键盘导航；补上 U 键切换单位；
 *      逐时条右缘渐隐提示可滚动；设置页 hero 横幅 + 分段控件/滑杆视觉精修。
 */
window.__ModuleLoader__.load({
  id: "dsh-weather-island",
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    const react = require("react");
    const {
      createElement: h, Fragment, useState, useEffect, useMemo, useRef, useCallback,
    } = react;

    /* ═══ 0. 常量 ═══════════════════════════════════════════════════════════ */
    const name = "weather-island";
    const inject = ["slots"];
    const OVERLAY_SLOT = "shell.overlay";
    const SETTINGS_SLOT = "settings.section";
    const PLUGIN_ID = "dsh-weather-island";

    const LS_WEATHER = "dsh-weather-island:v1";           // 首屏缓存（定位 + 结果）
    // v4：新增 seenGuide（首次加载欢迎指引是否已看过）。升级时沿用 v3 里的其它设置。
    const LS_SETTINGS = "dsh-weather-island:settings:v4"; // 设置（v4：未知键丢弃、逐键清洗）
    const LS_SETTINGS_LEGACY = ["dsh-weather-island:settings:v3", "dsh-weather-island:settings:v2"];

    const STALE_MS = 15 * 60 * 1000;    // 超过则视为过期，展开时静默补一次
    const PROXY_TIMEOUT_SLACK = 7000;   // 走代理时追加的超时
    const MAX_SOURCES = 2;              // 最多同时启用（对照显示）
    const DEFAULT_TIMEOUT = 9000;       // 适配器未声明 timeout 时的兜底
    const PILL_W = 190, PILL_H = 40;    // 锚点钳制用的胶囊近似尺寸
    const CARD_W = 412;                 // 卡片宽度（用于计算水平防出界偏移）
    const EDGE = 8;                     // 距视口边缘最小留白
    const TAP_MS = 230;                 // 区分单击与双击的等待
    const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const DAY_NAMES = ["今天", "明天", "后天", "第4天", "第5天", "第6天", "第7天"];

    /** 数据源注册表：必须在设置清洗之前存在（清洗时校验 id 合法性）。 */
    const SOURCE_REGISTRY = {};
    function registerSource(id, def) { SOURCE_REGISTRY[id] = def; }

    /* ═══ 1. 样式 ═══════════════════════════════════════════════════════════ */
    const css = `
.dwi-root{position:fixed;z-index:99999;pointer-events:auto;
  font-family:var(--dsw-font-family,system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif);
  -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;
  --dwi-fs:15px;--dwi-alpha:1;
  /* 深色 = 默认值（贴合 DSH 默认观感） */
  --dwi-glass-a:rgba(28,31,42,.92);--dwi-glass-b:rgba(12,14,20,.95);
  --dwi-card-a:rgba(26,29,39,.88);--dwi-card-b:rgba(13,15,21,.92);
  --dwi-stroke:rgba(255,255,255,.11);--dwi-stroke-soft:rgba(255,255,255,.06);
  --dwi-txt:#f4f6fb;--dwi-sub:#aeb8c8;--dwi-dim:#7b8698;
  --dwi-accent:#5b9bff;--dwi-accent2:#8a7bff;--dwi-ok:#3ddc84;--dwi-warn:#ffb020;--dwi-err:#ff6b6b;
  --dwi-btn-hover:rgba(255,255,255,.10);--dwi-cell-bg:rgba(255,255,255,.045);
  --dwi-cell-hover:rgba(255,255,255,.10);--dwi-input-bg:rgba(0,0,0,.30);
  --dwi-inner-hl:inset 0 1px 0 rgba(255,255,255,.08);
  --dwi-shadow:0 26px 76px rgba(0,0,0,.55);
  --dwi-pill-shadow:0 10px 34px rgba(0,0,0,.45);
  --dwi-pill-shadow-hover:0 16px 46px rgba(0,0,0,.58);
  --dwi-aurora:.42;
  /* 场景化背景（默认 = 通用蓝紫）：由 JS 按“当前天气 + 昼夜”写入 */
  --dwi-c1:#5b9bff;--dwi-c2:#8a7bff;--dwi-c3:#36d6c4;
  --dwi-scene-boost:0;               /* 夜间/雷暴等场景略加强背景表现力 */
  /* 场景激活时的极光强度：显著高于无场景时的基础 aurora，
     否则浅色主题（.20）会把 7 套场景色全部冲淡到肉眼难辨（实测 ΔE<3）。 */
  --dwi-scene-aurora:.45;
  transform:translate(-50%,-50%);will-change:left,top;
  transition:left .5s cubic-bezier(.34,1.35,.64,1),top .5s cubic-bezier(.34,1.35,.64,1),transform .5s ease;}
.dwi-root.dwi-theme-light{
  --dwi-glass-a:rgba(255,255,255,.88);--dwi-glass-b:rgba(238,241,248,.94);
  --dwi-card-a:rgba(255,255,255,.86);--dwi-card-b:rgba(236,240,247,.93);
  --dwi-stroke:rgba(20,24,34,.13);--dwi-stroke-soft:rgba(20,24,34,.07);
  --dwi-txt:#1f2430;--dwi-sub:#545e70;--dwi-dim:#5f6a79;
  --dwi-accent:#2f7bea;--dwi-accent2:#7c5cff;--dwi-ok:#16a34a;--dwi-warn:#c97a00;--dwi-err:#dc3d3d;
  --dwi-btn-hover:rgba(20,24,34,.07);--dwi-cell-bg:rgba(20,24,34,.045);
  --dwi-cell-hover:rgba(47,123,234,.12);--dwi-input-bg:rgba(20,24,34,.05);
  --dwi-inner-hl:inset 0 1px 0 rgba(255,255,255,.7);
  --dwi-shadow:0 24px 66px rgba(20,30,60,.18);
  --dwi-pill-shadow:0 10px 30px rgba(20,30,60,.15);
  --dwi-pill-shadow-hover:0 16px 42px rgba(20,30,60,.22);
  --dwi-aurora:.20;--dwi-scene-aurora:.55;}
/* 自动模式且 JS 尚未接管时的系统浅色兜底 */
@media (prefers-color-scheme: light){
  .dwi-root:not(.dwi-theme-dark):not(.dwi-theme-light){
    --dwi-glass-a:rgba(255,255,255,.88);--dwi-glass-b:rgba(238,241,248,.94);
    --dwi-card-a:rgba(255,255,255,.86);--dwi-card-b:rgba(236,240,247,.93);
    --dwi-stroke:rgba(20,24,34,.13);--dwi-stroke-soft:rgba(20,24,34,.07);
    --dwi-txt:#1f2430;--dwi-sub:#545e70;--dwi-dim:#5f6a79;
    --dwi-accent:#2f7bea;--dwi-accent2:#7c5cff;--dwi-ok:#16a34a;--dwi-warn:#c97a00;--dwi-err:#dc3d3d;
    --dwi-btn-hover:rgba(20,24,34,.07);--dwi-cell-bg:rgba(20,24,34,.045);
    --dwi-cell-hover:rgba(47,123,234,.12);--dwi-input-bg:rgba(20,24,34,.05);
    --dwi-inner-hl:inset 0 1px 0 rgba(255,255,255,.7);
    --dwi-shadow:0 24px 66px rgba(20,30,60,.18);
    --dwi-pill-shadow:0 10px 30px rgba(20,30,60,.15);
    --dwi-pill-shadow-hover:0 16px 42px rgba(20,30,60,.22);
    /* 浅色下场景强度更高（multiply 混合会压暗 + 底色亮，需更高 α 才可辨） */
    --dwi-aurora:.20;--dwi-scene-aurora:.55;}}

.dwi-root.dwi-initial{left:50%;top:32px;}
.dwi-root.dwi-dragging{transition:none;}
.dwi-root.dwi-dragging .dwi-hit,.dwi-root.dwi-dragging .dwi-head{cursor:grabbing;}
.dwi-root.dwi-dragging .dwi-pill{animation-play-state:paused;}

/* ── 胶囊 ── */
.dwi-hit{position:relative;padding:9px;margin:-9px;border-radius:999px;cursor:grab;touch-action:none;}
.dwi-pill{position:relative;isolation:isolate;display:flex;align-items:center;gap:9px;height:40px;
  padding:0 15px;border-radius:999px;color:var(--dwi-txt);user-select:none;
  max-width:calc(100vw - 24px);font-size:var(--dwi-fs);
  animation:dwi-breathe 5.5s ease-in-out infinite;
  transition:height .45s cubic-bezier(.34,1.5,.64,1),padding .45s ease,transform .22s cubic-bezier(.34,1.5,.64,1);}
.dwi-pill::before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;
  background:linear-gradient(180deg,var(--dwi-glass-a),var(--dwi-glass-b));
  border:1px solid var(--dwi-stroke);box-shadow:var(--dwi-pill-shadow),var(--dwi-inner-hl);
  backdrop-filter:blur(22px) saturate(1.45);-webkit-backdrop-filter:blur(22px) saturate(1.45);
  opacity:var(--dwi-alpha);transition:box-shadow .3s ease;}
.dwi-pill:hover{transform:translateY(-1px);animation-play-state:paused;}
.dwi-pill:hover::before{box-shadow:var(--dwi-pill-shadow-hover),var(--dwi-inner-hl);}
.dwi-pill.dwi-expanded{height:34px;padding:0 12px;}
.dwi-pill.dwi-loading{padding:0 17px;}
.dwi-icon{font-size:calc(var(--dwi-fs) * 1.18);line-height:1;display:flex;align-items:center;
  filter:drop-shadow(0 1px 2px rgba(0,0,0,.35));}
.dwi-temp{font-size:calc(var(--dwi-fs) * 1.22);font-weight:700;letter-spacing:.2px;font-variant-numeric:tabular-nums;}
.dwi-sep{width:1px;height:15px;background:var(--dwi-stroke);flex:none;}
.dwi-loc{font-size:calc(var(--dwi-fs) * .84);color:var(--dwi-sub);max-width:150px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.dwi-clock{font-size:calc(var(--dwi-fs) * .8);color:var(--dwi-sub);font-variant-numeric:tabular-nums;letter-spacing:.2px;}
.dwi-live{width:8px;height:8px;border-radius:50%;background:var(--dwi-ok);flex:none;
  box-shadow:0 0 0 0 rgba(61,220,132,.6);animation:dwi-pulse 2.4s infinite;}
.dwi-live.dwi-stale{background:var(--dwi-warn);}
.dwi-live.dwi-err{background:var(--dwi-err);animation:none;}
.dwi-spinner{width:15px;height:15px;border-radius:50%;border:2px solid var(--dwi-stroke-soft);
  border-top-color:var(--dwi-accent);animation:dwi-spin .8s linear infinite;flex:none;}
.dwi-loadtxt{font-size:calc(var(--dwi-fs) * .85);color:var(--dwi-sub);padding-right:2px;}
@keyframes dwi-pulse{0%{box-shadow:0 0 0 0 rgba(61,220,132,.55)}70%{box-shadow:0 0 0 8px rgba(61,220,132,0)}100%{box-shadow:0 0 0 0 rgba(61,220,132,0)}}
@keyframes dwi-breathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
@keyframes dwi-spin{to{transform:rotate(360deg)}}
@keyframes dwi-spin-rev{to{transform:rotate(-360deg)}}

/* ── 卡片锚点层：绝对定位挂在胶囊旁 → 不改变根节点尺寸，故不改写记忆位置 ── */
.dwi-anchor{position:absolute;left:50%;top:calc(100% + 2px);transform:translate(-50%,0);
  width:min(412px,calc(100vw - 20px));}
.dwi-anchor.dwi-above{top:auto;bottom:calc(100% + 2px);}
.dwi-anchor.dwi-pop{animation:dwi-pop .36s cubic-bezier(.34,1.56,.64,1) both;}
.dwi-anchor.dwi-above.dwi-pop{animation-name:dwi-pop-above;}
.dwi-card{position:relative;isolation:isolate;overflow:hidden;border-radius:26px;color:var(--dwi-txt);
  font-size:var(--dwi-fs);box-shadow:var(--dwi-shadow);}
.dwi-card::before{content:"";position:absolute;inset:0;z-index:-2;border-radius:inherit;
  background:linear-gradient(180deg,var(--dwi-card-a),var(--dwi-card-b));
  border:1px solid var(--dwi-stroke);box-shadow:var(--dwi-inner-hl);
  backdrop-filter:blur(28px) saturate(1.55);-webkit-backdrop-filter:blur(28px) saturate(1.55);
  opacity:var(--dwi-alpha);}
.dwi-card-scroll{max-height:min(76vh,700px);overflow-y:auto;overscroll-behavior:contain;
  scrollbar-width:none;padding:12px 15px 12px;position:relative;z-index:1;}
.dwi-card-scroll::-webkit-scrollbar{display:none;width:0;height:0;}
.dwi-bg{position:absolute;inset:0;z-index:-1;overflow:hidden;border-radius:inherit;pointer-events:none;
  /* 场景色平滑过渡：切场景（晴→雨等）时 1.6s 缓变，而不是生硬跳色 */
  --bg-c1:var(--dwi-c1);--bg-c2:var(--dwi-c2);--bg-c3:var(--dwi-c3);}
.dwi-bg span{position:absolute;width:60%;height:60%;border-radius:50%;filter:blur(36px);
  /* 基础极光用 --dwi-aurora；场景激活（根节点有 .dwi-scene）时改用更强的
     --dwi-scene-aurora —— 浅色主题若沿用 .20 会把 7 套场景色冲淡到肉眼难辨。 */
  opacity:var(--dwi-aurora);mix-blend-mode:screen;
  transition:background 1.6s ease,opacity 1.6s ease;}
.dwi-scene .dwi-bg span{opacity:calc(var(--dwi-scene-aurora) * (1 + var(--dwi-scene-boost)));}
.dwi-theme-light .dwi-bg span{mix-blend-mode:multiply;}
.dwi-bg .b1{background:radial-gradient(circle,var(--bg-c1),transparent 70%);top:-18%;left:-10%;animation:dwi-aurora1 16s ease-in-out infinite alternate;}
.dwi-bg .b2{background:radial-gradient(circle,var(--bg-c2),transparent 70%);bottom:-22%;right:-12%;animation:dwi-aurora2 18s ease-in-out infinite alternate;}
.dwi-bg .b3{background:radial-gradient(circle,var(--bg-c3),transparent 70%);top:30%;right:18%;animation:dwi-aurora3 14s ease-in-out infinite alternate;}
/* 噪点纹理：极细颗粒，压住大面积渐变的“塑料感”（浅色下再降一半强度） */
.dwi-bg::after{content:"";position:absolute;inset:-50%;pointer-events:none;opacity:.05;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");}
.dwi-theme-light .dwi-bg::after{opacity:.028;}
/* 场景细节层：星（夜）/ 雨（雨/雷）/ 雾霾（霾）——由 JS 按场景挂 .dwi-scene-* */
.dwi-bg .dwi-spark{position:absolute;border-radius:50%;background:#fff;
  animation:dwi-twinkle 3.4s ease-in-out infinite;}
@keyframes dwi-twinkle{0%,100%{opacity:.1;transform:scale(.6)}50%{opacity:.85;transform:scale(1)}}
.dwi-bg .dwi-drop{position:absolute;top:-12%;width:1px;height:56px;
  background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--bg-c1) 55%,#9db8e8));
  opacity:.35;animation:dwi-rainfall 1.5s linear infinite;}
@keyframes dwi-rainfall{to{transform:translateY(1200%)}}
.dwi-bg .dwi-hazeband{position:absolute;width:64%;height:26%;border-radius:50%;
  background:radial-gradient(ellipse,color-mix(in srgb,var(--bg-c1) 30%,#b8a98c) 0%,transparent 68%);
  filter:blur(18px);opacity:.5;animation:dwi-haze-sway 10s ease-in-out infinite alternate;}
@keyframes dwi-haze-sway{from{transform:translateX(-7%) scale(1)}to{transform:translateX(9%) scale(1.12)}}
/* 飘雪：白色小圆点缓落 + 左右摇曳（比雨丝慢得多，观感是「飘」不是「落」） */
.dwi-bg .dwi-flake{position:absolute;top:-6%;border-radius:50%;background:#fff;
  box-shadow:0 0 4px rgba(255,255,255,.55);
  animation:dwi-snowfall linear infinite;}
@keyframes dwi-snowfall{
  0%{transform:translate(0,-6vh) translateX(0)}
  25%{transform:translate(0,24vh) translateX(8px)}
  50%{transform:translate(0,54vh) translateX(-6px)}
  75%{transform:translate(0,84vh) translateX(7px)}
  100%{transform:translate(0,112vh) translateX(0)}
}
@keyframes dwi-aurora1{from{transform:translate(0,0) scale(1)}to{transform:translate(40px,30px) scale(1.2)}}
@keyframes dwi-aurora2{from{transform:translate(0,0) scale(1)}to{transform:translate(-36px,-26px) scale(1.15)}}
@keyframes dwi-aurora3{from{transform:translate(0,0) scale(1)}to{transform:translate(-28px,22px) scale(1.25)}}
@keyframes dwi-pop{from{opacity:0;transform:translate(-50%,-8px) scale(.94)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
@keyframes dwi-pop-above{from{opacity:0;transform:translate(-50%,8px) scale(.94)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
@keyframes dwi-fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

/* ── 卡片头 ── */
.dwi-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;
  cursor:grab;touch-action:none;padding:3px 0 2px;}
.dwi-headLoc{display:flex;align-items:center;gap:9px;min-width:0;}
.dwi-flag{font-size:calc(var(--dwi-fs) * 1.3);line-height:1;flex:none;}
.dwi-locName{font-size:calc(var(--dwi-fs) * 1.02);font-weight:650;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;max-width:210px;}
.dwi-locSub{font-size:calc(var(--dwi-fs) * .72);color:var(--dwi-dim);margin-top:1px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:210px;}
.dwi-tools{display:flex;align-items:center;gap:2px;flex:none;}
.dwi-btn{width:34px;height:34px;border-radius:10px;border:none;background:transparent;
  color:var(--dwi-sub);cursor:pointer;display:flex;align-items:center;justify-content:center;flex:none;
  transition:background .15s,color .15s,transform .15s;}
.dwi-btn:hover{background:var(--dwi-btn-hover);color:var(--dwi-txt);transform:translateY(-1px);}
.dwi-btn:active{transform:translateY(0) scale(.94);}
.dwi-btn:focus-visible{outline:2px solid var(--dwi-accent);outline-offset:1px;}
.dwi-btn.dwi-active{color:var(--dwi-accent);background:color-mix(in srgb,var(--dwi-accent) 18%,transparent);}
.dwi-btn svg{width:17px;height:17px;}
.dwi-spinning svg{animation:dwi-spin .9s linear infinite;}
.dwi-spinning-rev svg{animation:dwi-spin-rev .9s linear infinite;}

/* ── 搜索 ── */
.dwi-search{margin:8px 0 2px;}
.dwi-searchInput{width:100%;box-sizing:border-box;height:36px;border-radius:10px;
  border:1px solid var(--dwi-stroke);background:var(--dwi-input-bg);color:var(--dwi-txt);
  padding:0 12px;font-size:calc(var(--dwi-fs) * .85);outline:none;transition:border-color .15s;}
.dwi-searchInput::placeholder{color:var(--dwi-dim);}
.dwi-searchInput:focus{border-color:color-mix(in srgb,var(--dwi-accent) 65%,transparent);}
.dwi-suggest{margin-top:4px;border-radius:10px;border:1px solid var(--dwi-stroke-soft);
  background:var(--dwi-input-bg);overflow:hidden;}
.dwi-suggestItem{padding:8px 11px 8px 14px;font-size:calc(var(--dwi-fs) * .82);cursor:pointer;
  border-bottom:1px solid var(--dwi-stroke-soft);transition:background .13s,padding-left .13s;}
.dwi-suggestItem:last-child{border-bottom:none;}
.dwi-suggestItem:hover,.dwi-suggestItem.dwi-sugOn{background:var(--dwi-cell-hover);padding-left:17px;}
.dwi-suggestItem.dwi-sugOn{border-left:2px solid var(--dwi-accent);padding-left:15px;}
.dwi-suggestName{color:var(--dwi-txt);}
.dwi-suggestSub{color:var(--dwi-dim);font-size:calc(var(--dwi-fs) * .72);margin-left:6px;}

/* ── 预警 ── */
.dwi-alert{display:flex;gap:8px;align-items:flex-start;margin:8px 0 2px;padding:9px 11px;border-radius:12px;
  background:color-mix(in srgb,var(--dwi-warn) 14%,transparent);
  border:1px solid color-mix(in srgb,var(--dwi-warn) 45%,transparent);
  color:var(--dwi-warn);font-size:calc(var(--dwi-fs) * .78);line-height:1.45;animation:dwi-fade .4s ease both;}
.dwi-alert.dwi-red{background:color-mix(in srgb,var(--dwi-err) 14%,transparent);
  border-color:color-mix(in srgb,var(--dwi-err) 45%,transparent);color:var(--dwi-err);}
.dwi-alert b{font-weight:650;}

/* ── 生活指数 ── */
.dwi-tips{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 2px;}
.dwi-tip{display:flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;
  background:var(--dwi-cell-bg);border:1px solid var(--dwi-stroke-soft);
  font-size:calc(var(--dwi-fs) * .74);color:var(--dwi-sub);
  transition:transform .16s ease,border-color .16s ease,background .16s ease;cursor:default;}
.dwi-tip:hover{transform:translateY(-2px);border-color:var(--dwi-accent);
  background:var(--dwi-cell-hover);}
.dwi-tipName{color:var(--dwi-dim);}
.dwi-tipLv{font-weight:650;color:var(--dwi-accent);}
.dwi-tipBrief{color:var(--dwi-dim);}

/* ── 实况：大号温度 + 实时时钟 ── */
.dwi-now{display:flex;flex-direction:column;gap:2px;padding:12px 2px 10px;}
.dwi-nowMain{display:flex;align-items:center;gap:14px;}
.dwi-nowIcon{font-size:calc(var(--dwi-fs) * 3.4);line-height:1;flex:none;filter:drop-shadow(0 3px 9px rgba(0,0,0,.35));}
.dwi-nowRead{display:flex;align-items:flex-start;gap:1px;flex:none;}
.dwi-nowTemp{font-size:calc(var(--dwi-fs) * 3.9);font-weight:750;line-height:.92;
  font-variant-numeric:tabular-nums;letter-spacing:-1.6px;
  background:linear-gradient(180deg,var(--dwi-txt),color-mix(in srgb,var(--dwi-c1) 52%,var(--dwi-txt)));
  -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;}
.dwi-nowDeg{font-size:calc(var(--dwi-fs) * 1.7);font-weight:600;line-height:1.2;
  color:color-mix(in srgb,var(--dwi-c1) 72%,var(--dwi-txt));}
.dwi-nowClock{margin-left:auto;text-align:right;flex:none;padding-bottom:2px;}
.dwi-clockBig{font-size:calc(var(--dwi-fs) * 1.4);font-weight:640;line-height:1.15;
  font-variant-numeric:tabular-nums;letter-spacing:.4px;}
.dwi-clockDate{font-size:calc(var(--dwi-fs) * .7);color:var(--dwi-dim);margin-top:1px;}
.dwi-nowCond{font-size:calc(var(--dwi-fs) * .9);color:var(--dwi-sub);margin-top:6px;}
.dwi-nowMeta{font-size:calc(var(--dwi-fs) * .76);color:var(--dwi-dim);margin-top:6px;}

/* ── 区块标题 ── */
.dwi-sectionTitle{font-size:calc(var(--dwi-fs) * .72);color:var(--dwi-dim);letter-spacing:.4px;
  margin:0 2px 7px;display:flex;align-items:center;gap:6px;}
.dwi-sectionTitle em{font-style:normal;opacity:.8;}

/* ── 双源对照（可点选主源） ── */
.dwi-sources{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:2px 0 12px;}
.dwi-sources.dwi-single{grid-template-columns:1fr;}
.dwi-sourceCard{position:relative;isolation:isolate;border-radius:14px;border:1px solid var(--dwi-stroke-soft);
  background:var(--dwi-cell-bg);padding:10px 11px;cursor:pointer;text-align:left;animation:dwi-fade .4s ease both;
  transition:background .16s,border-color .16s,transform .16s,box-shadow .16s;}
.dwi-sourceCard:hover{background:var(--dwi-cell-hover);transform:translateY(-2px);
  border-color:color-mix(in srgb,var(--dwi-accent) 45%,var(--dwi-stroke-soft));box-shadow:0 8px 20px rgba(0,0,0,.18);}
.dwi-sourceCard.dwi-primary{border-color:color-mix(in srgb,var(--dwi-accent) 65%,transparent);
  box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--dwi-accent) 28%,transparent);}
.dwi-star{position:absolute;top:8px;right:9px;font-size:calc(var(--dwi-fs) * .6);color:var(--dwi-accent);
  opacity:0;transition:opacity .15s;}
.dwi-sourceCard:hover .dwi-star{opacity:.7;}
.dwi-sourceCard.dwi-primary .dwi-star{opacity:1;}
.dwi-sourceHead{display:flex;align-items:center;justify-content:space-between;font-size:calc(var(--dwi-fs) * .7);
  color:var(--dwi-dim);letter-spacing:.3px;padding-right:38px;}
.dwi-sourceTemp{font-size:calc(var(--dwi-fs) * 1.5);font-weight:680;margin-top:4px;font-variant-numeric:tabular-nums;}
.dwi-sourceCond{font-size:calc(var(--dwi-fs) * .76);color:var(--dwi-sub);margin-top:1px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

/* ── 详细数据小卡片：悬停效果 ── */
.dwi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;}
.dwi-cell{position:relative;border-radius:12px;border:1px solid var(--dwi-stroke-soft);
  background:var(--dwi-cell-bg);padding:9px 10px;overflow:hidden;animation:dwi-fade .4s ease both;
  transition:background .17s,transform .17s,border-color .17s,box-shadow .17s;}
.dwi-cell::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;
  background:linear-gradient(90deg,var(--dwi-accent),var(--dwi-accent2));
  transform:scaleX(0);transform-origin:left;transition:transform .22s ease;}
.dwi-cell:hover{background:var(--dwi-cell-hover);transform:translateY(-2px);
  border-color:color-mix(in srgb,var(--dwi-accent) 40%,var(--dwi-stroke-soft));box-shadow:0 8px 18px rgba(0,0,0,.16);}
.dwi-cell:hover::after{transform:scaleX(1);}
.dwi-cellLabel{font-size:calc(var(--dwi-fs) * .7);color:var(--dwi-dim);display:flex;align-items:center;
  gap:4px;transition:color .17s;}
.dwi-cell:hover .dwi-cellLabel{color:var(--dwi-sub);}
.dwi-cellVal{font-size:calc(var(--dwi-fs) * .95);font-weight:620;margin-top:3px;font-variant-numeric:tabular-nums;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.dwi-cellVal i{font-style:normal;font-size:calc(var(--dwi-fs) * .66);color:var(--dwi-dim);margin-left:2px;font-weight:500;}
.dwi-dot{width:7px;height:7px;border-radius:50%;flex:none;}

/* ── 逐时 ── */
.dwi-hourly{margin-bottom:12px;position:relative;}
.dwi-hourRow{display:flex;gap:7px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;}
.dwi-hourRow::-webkit-scrollbar{display:none;width:0;height:0;}
/* 右缘渐隐：提示“还有更多可横滑”；左缘不遮（首格是“现在”，应完整可见）。
   挂在 .dwi-hourly 上而不是行内，避免被 overflow 裁掉。 */
.dwi-hourly::after{content:"";position:absolute;top:0;right:0;bottom:4px;width:26px;pointer-events:none;
  background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--dwi-card-b) 82%,transparent));}
.dwi-hourly.dwi-scrolled-end::after{opacity:0;transition:opacity .3s ease;}
.dwi-hour{flex:none;width:52px;border-radius:12px;border:1px solid var(--dwi-stroke-soft);
  background:var(--dwi-cell-bg);padding:8px 4px;display:flex;flex-direction:column;align-items:center;gap:3px;
  animation:dwi-fade .4s ease both;transition:background .16s,transform .16s,border-color .16s;}
.dwi-hour:hover{background:var(--dwi-cell-hover);transform:translateY(-2px);
  border-color:color-mix(in srgb,var(--dwi-accent) 40%,var(--dwi-stroke-soft));}
.dwi-hour.dwi-hnow{border-color:color-mix(in srgb,var(--dwi-accent) 60%,transparent);
  background:color-mix(in srgb,var(--dwi-accent) 14%,var(--dwi-cell-bg));}
.dwi-hourTime{font-size:calc(var(--dwi-fs) * .68);color:var(--dwi-dim);}
.dwi-hourIcon{font-size:calc(var(--dwi-fs) * 1.2);line-height:1;}
.dwi-hourTemp{font-size:calc(var(--dwi-fs) * .86);font-weight:620;font-variant-numeric:tabular-nums;}
.dwi-hourPop{font-size:calc(var(--dwi-fs) * .62);color:var(--dwi-accent);height:11px;}

/* ── 多日预报 ── */
.dwi-daily{margin-bottom:8px;}
.dwi-day{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:12px;
  border:1px solid var(--dwi-stroke-soft);background:var(--dwi-cell-bg);margin-bottom:6px;
  animation:dwi-fade .4s ease both;transition:background .16s,transform .16s,border-color .16s;}
.dwi-day:last-child{margin-bottom:0;}
.dwi-day:hover{background:var(--dwi-cell-hover);transform:translateX(2px);
  border-color:color-mix(in srgb,var(--dwi-accent) 35%,var(--dwi-stroke-soft));}
.dwi-day.dwi-today{border-color:color-mix(in srgb,var(--dwi-accent) 45%,transparent);}
.dwi-dayDate{width:54px;font-size:calc(var(--dwi-fs) * .8);color:var(--dwi-sub);flex:none;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.dwi-dayIcon{font-size:calc(var(--dwi-fs) * 1.28);width:26px;text-align:center;flex:none;}
.dwi-dayCond{font-size:calc(var(--dwi-fs) * .72);color:var(--dwi-dim);width:50px;text-align:center;flex:none;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.dwi-dayRange{flex:1;display:flex;align-items:center;gap:8px;min-width:0;}
.dwi-dayLo{font-size:calc(var(--dwi-fs) * .8);color:var(--dwi-dim);width:30px;text-align:right;flex:none;
  font-variant-numeric:tabular-nums;}
.dwi-dayBar{flex:1;height:5px;border-radius:3px;background:var(--dwi-stroke-soft);position:relative;overflow:hidden;}
.dwi-dayBarFill{position:absolute;top:0;bottom:0;border-radius:3px;
  background:linear-gradient(90deg,var(--dwi-accent),var(--dwi-accent2),var(--dwi-warn));}
.dwi-dayHi{font-size:calc(var(--dwi-fs) * .8);font-weight:620;width:30px;flex:none;font-variant-numeric:tabular-nums;}
.dwi-dayPop{font-size:calc(var(--dwi-fs) * .68);color:var(--dwi-accent);width:34px;text-align:right;flex:none;}

/* ── 页脚 / 错误 ── */
.dwi-foot{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:calc(var(--dwi-fs) * .68);
  color:var(--dwi-dim);padding:8px 2px 0;border-top:1px solid var(--dwi-stroke-soft);margin-top:4px;}
.dwi-foot .dwi-live{width:6px;height:6px;}
.dwi-src{color:var(--dwi-sub);}
.dwi-footBtn{border:none;background:transparent;color:var(--dwi-accent);cursor:pointer;font-size:inherit;
  font-family:inherit;padding:0 2px;margin-left:auto;border-radius:6px;}
.dwi-footBtn:hover{text-decoration:underline;}
.dwi-err{margin-top:8px;padding:9px 11px;border-radius:10px;display:flex;gap:8px;align-items:flex-start;
  background:color-mix(in srgb,var(--dwi-err) 12%,transparent);
  border:1px solid color-mix(in srgb,var(--dwi-err) 32%,transparent);
  color:var(--dwi-err);font-size:calc(var(--dwi-fs) * .76);line-height:1.5;
  animation:dwi-fade .4s ease both;}
/* 单源失败（另一源仍正常）→ 降为中性信息色：对照卡里已可见具体原因，
   这里再用大红会显得「出大事」，克制才不抢戏。 */
.dwi-err:not(.dwi-errAll){background:var(--dwi-cell-bg);
  border-color:var(--dwi-stroke-soft);color:var(--dwi-sub);}
.dwi-err:not(.dwi-errAll) b{color:var(--dwi-txt);}
.dwi-err.dwi-errAll{background:color-mix(in srgb,var(--dwi-err) 16%,transparent);
  border-color:color-mix(in srgb,var(--dwi-err) 55%,transparent);}
.dwi-err b{font-weight:650;}
.dwi-err div{word-break:break-all;}
.dwi-err button{border:1px solid currentColor;background:transparent;color:inherit;border-radius:7px;
  padding:2px 8px;font-size:calc(var(--dwi-fs) * .7);cursor:pointer;flex:none;font-family:inherit;
  transition:background .15s,transform .15s;}
.dwi-err button:hover{background:color-mix(in srgb,currentColor 14%,transparent);transform:translateY(-1px);}
.dwi-err button:active{transform:translateY(0) scale(.96);}

@media (prefers-reduced-motion:reduce){
  .dwi-root,.dwi-pill,.dwi-anchor,.dwi-card,.dwi-bg span,.dwi-hour,.dwi-cell,.dwi-sourceCard,.dwi-day,.dwi-alert,
  .dwi-bg .dwi-spark,.dwi-bg .dwi-drop,.dwi-bg .dwi-hazeband,.dwi-bg .dwi-flake,.dwi-hourly::after{
    animation:none!important;transition:none!important;}}
@media (max-width:430px){
  .dwi-anchor{width:calc(100vw - 16px);}
  .dwi-card{border-radius:20px;}
  .dwi-card-scroll{padding:11px 12px 10px;}
  .dwi-locName,.dwi-locSub{max-width:120px;}
  .dwi-nowTemp{font-size:calc(var(--dwi-fs) * 3.2);}
  .dwi-nowIcon{font-size:calc(var(--dwi-fs) * 2.6);}
  .dwi-grid{grid-template-columns:repeat(2,1fr);}
  .dwi-dayCond{display:none;}}

/* ═══ 首次加载欢迎指引 ═══════════════════════════════════════════════════
   设计取向：沿用卡片的「极光 + 玻璃 + 弹簧」语言，不新增视觉体系。
   全程只用一次入场动画（其余为可选的柔和循环），避免与卡片动画打架。 */
.dwi-guide{pointer-events:auto;}
.dwi-guide-card{position:relative;isolation:isolate;overflow:hidden;border-radius:26px;color:var(--dwi-txt);
  font-size:var(--dwi-fs);box-shadow:var(--dwi-shadow);
  animation:dwi-guide-in .52s cubic-bezier(.34,1.42,.5,1) both;}
.dwi-guide-card::before{content:"";position:absolute;inset:0;z-index:-2;border-radius:inherit;
  background:linear-gradient(180deg,var(--dwi-card-a),var(--dwi-card-b));
  border:1px solid var(--dwi-stroke);box-shadow:var(--dwi-inner-hl);
  backdrop-filter:blur(28px) saturate(1.55);-webkit-backdrop-filter:blur(28px) saturate(1.55);
  opacity:var(--dwi-alpha);}
/* 顶部随步骤染色的柔光条：不用数值动画，只做颜色过渡 → 始终顺滑 */
.dwi-guide-tint{position:absolute;left:0;right:0;top:0;height:130px;z-index:-1;pointer-events:none;
  opacity:.5;transition:background .75s ease;}
.dwi-guide-body{position:relative;z-index:1;padding:16px 17px 14px;}

.dwi-guide-top{display:flex;align-items:center;gap:8px;margin-bottom:13px;}
.dwi-guide-badge{display:inline-flex;align-items:center;gap:5px;font-size:calc(var(--dwi-fs) * .66);
  font-weight:650;letter-spacing:.3px;padding:3px 9px;border-radius:999px;
  color:var(--dwi-accent);background:color-mix(in srgb,var(--dwi-accent) 15%,transparent);
  border:1px solid color-mix(in srgb,var(--dwi-accent) 30%,transparent);flex:none;}
.dwi-guide-badge i{width:5px;height:5px;border-radius:50%;background:var(--dwi-accent);
  box-shadow:0 0 0 0 color-mix(in srgb,var(--dwi-accent) 60%,transparent);
  animation:dwi-pulse 2.6s infinite;}
.dwi-guide-skip{margin-left:auto;border:none;background:transparent;color:var(--dwi-dim);cursor:pointer;
  font-family:inherit;font-size:calc(var(--dwi-fs) * .72);padding:3px 7px;border-radius:8px;
  transition:color .2s,background .2s;flex:none;}
.dwi-guide-skip:hover{color:var(--dwi-txt);background:var(--dwi-btn-hover);}

.dwi-guide-stage{position:relative;display:flex;align-items:center;gap:13px;
  /* min-height + 固定正文行高：让 5 步的卡片高度完全一致，切换时不会上下抖 2px
     （正文含 <code> 的那一步行盒更高，不锁高就会撑大卡片） */
  min-height:78px;}
.dwi-guide-orb{position:relative;width:62px;height:62px;border-radius:20px;flex:none;
  display:flex;align-items:center;justify-content:center;
  font-size:calc(var(--dwi-fs) * 1.75);line-height:1;
  background:radial-gradient(circle at 32% 26%,color-mix(in srgb,var(--dwi-gc) 42%,transparent),transparent 72%),
    var(--dwi-cell-bg);
  border:1px solid color-mix(in srgb,var(--dwi-gc) 36%,var(--dwi-stroke-soft));
  box-shadow:0 8px 26px color-mix(in srgb,var(--dwi-gc) 22%,transparent),var(--dwi-inner-hl);
  transition:border-color .6s ease,box-shadow .6s ease;animation:dwi-breathe 4.6s ease-in-out infinite;}
/* 环绕光弧：让「动态」体现在细节上，而不是到处乱动 */
.dwi-guide-ring{position:absolute;inset:-5px;border-radius:24px;pointer-events:none;
  background:conic-gradient(from 0deg,transparent 0deg,color-mix(in srgb,var(--dwi-gc) 62%,transparent) 62deg,transparent 132deg);
  -webkit-mask:radial-gradient(farthest-side,transparent calc(100% - 2px),#000 calc(100% - 1px));
  mask:radial-gradient(farthest-side,transparent calc(100% - 2px),#000 calc(100% - 1px));
  opacity:.85;animation:dwi-orbit 6.5s linear infinite;}
.dwi-guide-text{min-width:0;flex:1;}
.dwi-guide-title{font-size:calc(var(--dwi-fs) * 1.08);font-weight:680;letter-spacing:.2px;margin-bottom:4px;}
.dwi-guide-desc{font-size:calc(var(--dwi-fs) * .78);color:var(--dwi-sub);line-height:1.62;
  min-height:calc(var(--dwi-fs) * .78 * 1.62 * 2);}
.dwi-guide-desc b{color:var(--dwi-txt);font-weight:620;}
/* 行内 code 不能改行盒高度，否则带 code 的那一步会把卡片撑高 */
.dwi-guide-desc code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
  font-size:calc(var(--dwi-fs) * .72);line-height:inherit;vertical-align:baseline;
  padding:1px 5px;border-radius:6px;
  background:var(--dwi-cell-bg);border:1px solid var(--dwi-stroke-soft);color:var(--dwi-accent);}
/* 步骤切换时内容轻微上浮淡入（key 变化触发重挂载） */
.dwi-guide-anim{animation:dwi-guide-step .42s cubic-bezier(.22,1,.36,1) both;}

.dwi-guide-dots{display:flex;align-items:center;gap:6px;margin:14px 0 12px;}
.dwi-guide-dot{height:4px;border-radius:2px;cursor:pointer;border:none;padding:0;
  background:var(--dwi-stroke);width:16px;transition:width .5s cubic-bezier(.34,1.5,.64,1),background .5s ease;}
.dwi-guide-dot:hover{background:color-mix(in srgb,var(--dwi-accent) 55%,var(--dwi-stroke));}
.dwi-guide-dot.dwi-on{width:30px;background:linear-gradient(90deg,var(--dwi-accent),var(--dwi-accent2));}
.dwi-guide-dot.dwi-done{background:color-mix(in srgb,var(--dwi-accent) 45%,transparent);}

/* 固定按钮行高：末步文案含「✓」会让按钮行盒高约 2px，卡片随之变高 → 切步时抖动。
   两处一起锁：按钮行本身固定高，按钮再锁 line-height，彻底消除行盒差异。 */
.dwi-guide-acts{display:flex;align-items:center;gap:8px;height:33px;}
.dwi-guide-ghost{border:1px solid var(--dwi-stroke);background:transparent;color:var(--dwi-sub);cursor:pointer;
  font-family:inherit;font-size:calc(var(--dwi-fs) * .78);line-height:1;padding:6px 13px;border-radius:10px;
  box-sizing:border-box;transition:background .2s,color .2s,transform .16s;}
.dwi-guide-ghost:hover:not(:disabled){background:var(--dwi-btn-hover);color:var(--dwi-txt);}
.dwi-guide-ghost:disabled{opacity:.35;cursor:default;}
.dwi-guide-go{margin-left:auto;position:relative;overflow:hidden;border:none;cursor:pointer;font-family:inherit;
  font-size:calc(var(--dwi-fs) * .8);font-weight:650;color:#fff;line-height:1;padding:8px 18px;border-radius:11px;
  box-sizing:border-box;
  background:linear-gradient(135deg,var(--dwi-accent),var(--dwi-accent2));
  box-shadow:0 7px 20px color-mix(in srgb,var(--dwi-accent) 36%,transparent),var(--dwi-inner-hl);
  transition:transform .18s cubic-bezier(.34,1.5,.64,1),box-shadow .22s;}
.dwi-guide-go:hover{transform:translateY(-1px);box-shadow:0 11px 26px color-mix(in srgb,var(--dwi-accent) 46%,transparent);}
.dwi-guide-go:active{transform:translateY(0) scale(.98);}
/* 交互动效：掠过式高光。间隔较长（4.2s）+ 到末步自动停（末步按钮为 .dwi-plain），
   避免「一直在闪」的廉价感 —— 动态要服务于引导视线，而不是抢注意力。 */
.dwi-guide-go::after{content:"";position:absolute;top:0;bottom:0;width:38%;pointer-events:none;
  background:linear-gradient(100deg,transparent,rgba(255,255,255,.42),transparent);
  transform:translateX(-160%);animation:dwi-sheen 4.2s ease-in-out 1.1s infinite;}
.dwi-guide-go.dwi-plain::after{display:none;}

@keyframes dwi-guide-in{from{opacity:0;transform:translateY(-10px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes dwi-guide-step{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
@keyframes dwi-orbit{to{transform:rotate(360deg)}}
@keyframes dwi-sheen{0%{transform:translateX(-160%)}55%,100%{transform:translateX(420%)}}
/* 指引自身也遵循降级：去掉入场/循环动画，但保留步骤切换的即时渲染 */
@media (prefers-reduced-motion:reduce){
  .dwi-guide-card,.dwi-guide-anim,.dwi-guide-orb,.dwi-guide-ring,.dwi-guide-go::after{animation:none!important;}}
@media (max-width:430px){
  .dwi-guide-body{padding:14px 13px 12px;}
  .dwi-guide-orb{width:52px;height:52px;border-radius:17px;font-size:calc(var(--dwi-fs) * 1.5);}
  .dwi-guide-stage{gap:11px;min-height:66px;}}

/* ═══ 设置页：全部取 DSH 主题令牌，深浅色自动跟随 ═══ */
.dwis-wrap{font-size:14px;max-width:740px;padding:4px 2px 26px;
  --dwis-txt:var(--dsw-alias-label-primary,#1f2430);
  --dwis-sub:var(--dsw-alias-label-secondary,#555);
  --dwis-cap:var(--dsw-alias-label-caption,#7b8698);
  --dwis-br:var(--dsw-alias-border-l2,rgba(0,0,0,.12));
  --dwis-br-soft:var(--dsw-alias-border-l1,rgba(0,0,0,.07));
  --dwis-bg:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.55));
  --dwis-bg2:var(--dsw-alias-bg-layer-2,rgba(255,255,255,.7));
  --dwis-accent:var(--dsw-alias-brand-primary,#5b9bff);
  --dwis-warn:var(--dsw-alias-state-warn-primary,#cf8a00);
  --dwis-ok:var(--dsw-alias-state-success-primary,#1ea966);
  --dwis-err:var(--dsw-alias-state-error-primary,#d33);
  color:var(--dwis-txt);}
/* hero 横幅：与悬浮卡片的“极光+玻璃”语言同源，一眼看出是同一个插件 */
.dwis-hero{position:relative;overflow:hidden;border-radius:16px;padding:16px 18px 15px;margin-bottom:14px;
  border:1px solid var(--dwis-br);background:var(--dwis-bg);}
.dwis-hero::before{content:"";position:absolute;inset:-40% -20% auto auto;width:62%;aspect-ratio:1;
  background:radial-gradient(circle,color-mix(in srgb,var(--dwis-accent) 30%,transparent),transparent 68%);
  pointer-events:none;animation:dwis-hero-float 12s ease-in-out infinite alternate;}
.dwis-hero::after{content:"";position:absolute;inset:auto auto -50% -18%;width:52%;aspect-ratio:1;
  background:radial-gradient(circle,color-mix(in srgb,#7c5cff 26%,transparent),transparent 70%);
  pointer-events:none;animation:dwis-hero-float 15s ease-in-out infinite alternate-reverse;}
@keyframes dwis-hero-float{from{transform:translate(0,0) scale(1)}to{transform:translate(-24px,18px) scale(1.18)}}
.dwis-heroTitle{position:relative;z-index:1;font-size:18px;font-weight:680;letter-spacing:.2px;
  display:flex;align-items:center;gap:8px;}
.dwis-heroOrb{width:34px;height:34px;border-radius:11px;flex:none;display:flex;align-items:center;justify-content:center;
  font-size:19px;background:color-mix(in srgb,var(--dwis-accent) 16%,transparent);
  border:1px solid color-mix(in srgb,var(--dwis-accent) 32%,transparent);}
.dwis-heroSub{position:relative;z-index:1;font-size:12px;color:var(--dwis-cap);margin-top:6px;line-height:1.6;
  display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;}
.dwis-chip{display:inline-flex;align-items:center;gap:4px;padding:1px 8px;border-radius:999px;font-size:11px;
  background:var(--dwis-bg2);border:1px solid var(--dwis-br-soft);color:var(--dwis-sub);}
.dwis-chip i{width:5px;height:5px;border-radius:50%;background:var(--dwis-ok);font-style:normal;}
.dwis-sec{border:1px solid var(--dwis-br);border-radius:14px;padding:13px 16px;margin-bottom:12px;background:var(--dwis-bg);}
.dwis-secT{font-size:13px;font-weight:640;color:var(--dwis-sub);margin-bottom:8px;display:flex;align-items:center;gap:6px;}
.dwis-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 0;
  border-top:1px solid var(--dwis-br-soft);}
.dwis-row:first-of-type{border-top:none;}
.dwis-rowLabel{font-size:13px;color:var(--dwis-txt);}
.dwis-rowHint{font-size:11px;color:var(--dwis-cap);margin-top:3px;max-width:380px;line-height:1.5;}
.dwis-val{font-size:12px;color:var(--dwis-sub);font-variant-numeric:tabular-nums;min-width:52px;text-align:right;}
.dwis-ctl{display:flex;align-items:center;gap:8px;}
/* 滑杆：accent-color 只能管轨道填充色，thumb 造型统一不了 —— 用原生伪元素精修
   （Edge/Chrome/Firefox 三家各写一份；不支持的老浏览器回落默认外观，功能不受影响） */
.dwis-range{width:180px;accent-color:var(--dwis-accent);cursor:pointer;height:18px;}
.dwis-range::-webkit-slider-runnable-track{height:5px;border-radius:3px;
  background:linear-gradient(90deg,var(--dwis-accent) var(--dwis-fill,50%),var(--dwis-br) var(--dwis-fill,50%));}
.dwis-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;
  background:#fff;border:2px solid var(--dwis-accent);margin-top:-4.5px;
  box-shadow:0 1px 4px rgba(0,0,0,.22);transition:transform .14s;}
.dwis-range:hover::-webkit-slider-thumb{transform:scale(1.15);}
.dwis-range:active::-webkit-slider-thumb{transform:scale(1.28);}
.dwis-range::-moz-range-track{height:5px;border-radius:3px;background:var(--dwis-br);}
.dwis-range::-moz-range-progress{height:5px;border-radius:3px;background:var(--dwis-accent);}
.dwis-range::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:#fff;
  border:2px solid var(--dwis-accent);box-shadow:0 1px 4px rgba(0,0,0,.22);}
.dwis-input{flex:1;max-width:280px;height:32px;border-radius:8px;border:1px solid var(--dwis-br);
  background:var(--dwis-bg2);color:var(--dwis-txt);padding:0 10px;font-size:13px;outline:none;font-family:inherit;
  transition:border-color .15s,box-shadow .15s;}
.dwis-input:focus{border-color:var(--dwis-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--dwis-accent) 18%,transparent);}
.dwis-seg{display:inline-flex;border-radius:9px;overflow:hidden;border:1px solid var(--dwis-br);
  background:var(--dwis-bg2);padding:2px;gap:2px;}
.dwis-seg button{border:none;background:transparent;color:var(--dwis-sub);padding:5px 12px;font-size:12.5px;
  cursor:pointer;font-family:inherit;border-radius:7px;transition:background .16s,color .16s,box-shadow .16s,transform .13s;}
.dwis-seg button:hover{color:var(--dwis-txt);background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));}
.dwis-seg button.dwis-on{background:linear-gradient(135deg,var(--dwis-accent),color-mix(in srgb,var(--dwis-accent) 62%,#7c5cff));
  color:#fff;box-shadow:0 2px 8px color-mix(in srgb,var(--dwis-accent) 35%,transparent);}
.dwis-seg button.dwis-on:active{transform:scale(.97);}
.dwis-switch{position:relative;width:40px;height:22px;border-radius:999px;border:1px solid var(--dwis-br);
  background:var(--dwis-bg2);cursor:pointer;padding:0;flex:none;transition:background .18s,border-color .18s;}
.dwis-switch span{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;
  background:var(--dwis-cap);transition:transform .2s cubic-bezier(.34,1.4,.64,1),background .18s;}
.dwis-switch.dwis-on{background:linear-gradient(135deg,var(--dwis-accent),color-mix(in srgb,var(--dwis-accent) 58%,#7c5cff));
  border-color:transparent;}
.dwis-switch.dwis-on span{transform:translateX(18px);background:#fff;}
.dwis-src{display:flex;align-items:flex-start;gap:10px;padding:10px 0;flex-wrap:wrap;
  border-top:1px solid var(--dwis-br-soft);}
.dwis-src:first-of-type{border-top:none;}
.dwis-check{width:18px;height:18px;accent-color:var(--dwis-accent);cursor:pointer;flex:none;margin-top:2px;}
.dwis-srcMain{min-width:0;flex:1;}
.dwis-srcName{font-size:13px;font-weight:560;color:var(--dwis-txt);}
.dwis-srcDesc{font-size:11px;color:var(--dwis-cap);margin-top:2px;line-height:1.5;}
.dwis-srcTag{font-size:10.5px;padding:1px 7px;border-radius:999px;
  background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));color:var(--dwis-cap);
  margin-left:6px;white-space:nowrap;}
.dwis-srcTag.dwis-key{color:var(--dwis-warn);}
.dwis-srcTag.dwis-primary{color:var(--dwis-accent);background:color-mix(in srgb,var(--dwis-accent) 12%,transparent);}
.dwis-srcKey{width:100%;display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-left:28px;}
.dwis-link{color:var(--dwis-accent);text-decoration:none;font-size:11.5px;white-space:nowrap;
  display:inline-flex;align-items:center;gap:2px;}
.dwis-link:hover{text-decoration:underline;}
.dwis-link svg{width:12px;height:12px;}
.dwis-btn{height:32px;padding:0 14px;border-radius:8px;border:1px solid var(--dwis-br);
  background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));color:var(--dwis-txt);font-size:12.5px;
  cursor:pointer;font-family:inherit;transition:filter .14s,transform .14s,border-color .14s;}
.dwis-btn:hover{filter:brightness(1.06);transform:translateY(-1px);border-color:color-mix(in srgb,var(--dwis-accent) 45%,var(--dwis-br));}
.dwis-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.dwis-btn.dwis-danger{color:var(--dwis-err);border-color:color-mix(in srgb,var(--dwis-err) 45%,transparent);}
.dwis-btn.dwis-danger:hover{border-color:color-mix(in srgb,var(--dwis-err) 70%,transparent);}
.dwis-note{font-size:11.5px;color:var(--dwis-cap);line-height:1.7;}
.dwis-tip{font-size:11.5px;color:var(--dwis-cap);background:var(--dwis-bg2);border:1px solid var(--dwis-br-soft);
  border-radius:10px;padding:9px 11px;margin-top:10px;line-height:1.6;}
.dwis-ok{color:var(--dwis-ok);font-size:11.5px;}
@media (max-width:560px){
  .dwis-wrap{max-width:100%;}
  .dwis-row{flex-direction:column;align-items:flex-start;gap:7px;}
  .dwis-ctl{width:100%;}
  .dwis-input{max-width:100%;width:100%;}
  .dwis-range{width:100%;flex:1;}
  .dwis-srcKey{margin-left:0;width:100%;}}
@media (prefers-reduced-motion:reduce){
  .dwis-hero::before,.dwis-hero::after{animation:none!important;}}
`;

    const STYLE_TAG_ID = PLUGIN_ID + "/seat.css";
    if (typeof document !== "undefined" &&
        document.querySelector("style[data-plugin-css=" + JSON.stringify(STYLE_TAG_ID) + "]") === null) {
      const tag = document.createElement("style");
      tag.dataset.plugin = PLUGIN_ID;
      tag.dataset.pluginCss = STYLE_TAG_ID;
      tag.textContent = css;
      document.head.appendChild(tag);
    }

    /* ═══ 2. 通用工具 ════════════════════════════════════════════════════════ */

    /* ── 2.0 结构化错误：把 HTTP 状态/错误码/Retry-After/是否致命挂到 Error 上，
     *        供「自动切换端点」逻辑判定该重试、该冷却、还是该直接放弃。 ── */
    function errWith(err, meta) {
      const e = err instanceof Error ? err : new Error(String(err));
      const m = meta || {};
      if (m.status != null) e.status = m.status;
      if (m.code) e.code = m.code;
      if (m.retryAfter != null) e.retryAfter = m.retryAfter;
      if (m.fatal) e.fatal = true;
      if (m.endpoint) e.endpoint = m.endpoint;
      return e;
    }
    /** 读取响应头里的秒数（Retry-After 可能是秒数或 HTTP 日期）。 */
    function numFromHeader(res, name) {
      try {
        const h = res && res.headers && res.headers.get ? res.headers.get(name) : null;
        if (!h) return null;
        const n = Number(h);
        if (Number.isFinite(n)) return n;
        const d = Date.parse(h);
        if (Number.isFinite(d)) return Math.max(0, Math.round((d - Date.now()) / 1000));
      } catch { /* 忽略 */ }
      return null;
    }

    /**
     * 是否值得「换个端点/源再试」。与 withRetry 的字符串匹配不同，
     * 这里优先看结构化字段，避免把「城市不存在」这类业务错误也当成可重试。
     */
    function isRetryableError(e) {
      if (!e) return false;
      if (e.fatal) return false;
      const st = e.status;
      if (st === 401 || st === 402 || st === 404 || st === 413) return false;
      if (st === 400) return false;
      if (st === 403) return true;   // 防盗链/CORS 拦截：换代理或换源有意义
      if (st === 408 || st === 429) return true;
      if (st >= 500) return true;
      const msg = String(e.message || "");
      return /超时|网络|无响应|CORS|网关|不是 JSON|Failed to fetch|NetworkError|Load failed/i.test(msg);
    }

    /**
     * 带超时与可读原因的 JSON 请求。
     * 修复 v1.2 的「signal is aborted without reason」：
     *   · abort(reason) 传入 DOMException(name = TimeoutError)，中断自带可读原因；
     *   · 先 text() 再 JSON.parse，把接口自身的 message 透出（404 城市不存在等）；
     *   · AbortError / TypeError(网络或 CORS) / 5xx / 非 JSON 全部翻译成中文。
     */
    function fetchJson(url, opts) {
      const o = opts || {};
      const timeout = Number.isFinite(o.timeout) ? o.timeout : DEFAULT_TIMEOUT;
      const label = o.label || "请求";
      let ctrl = null;
      try { if (typeof AbortController !== "undefined") ctrl = new AbortController(); } catch { ctrl = null; }
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        if (!ctrl) return;
        const reason = "超时 " + Math.round(timeout / 1000) + "s";
        try {
          ctrl.abort(new DOMException(reason, "TimeoutError"));
        } catch {
          try { ctrl.abort(); } catch { /* 老环境忽略 */ }
        }
      }, timeout);

      let p;
      try {
        // 注意：不要带 cache:"no-store"。实测它会绕开 CDN 缓存并更容易触发
        // Uapi 的访客速率桶（visitor-rate q=4/w=1s）→ 频繁 429。改为 default 让 CDN 命中，
        // 接口响应头本身已带 no-store，无需客户端再强制。
        p = Promise.resolve(fetch(url, Object.assign(
          { headers: { Accept: "application/json" }, redirect: "follow" },
          ctrl ? { signal: ctrl.signal } : {}
        )));
      } catch (e) {
        clearTimeout(timer);
        return Promise.reject(new Error(label + "：无法发起请求（" + String((e && e.message) || e) + "）"));
      }

      return p
        .then((r) => {
          if (!r) throw new Error(label + "：无响应");
          return r.text().then((text) => ({ r, text }));
        })
        .then((res) => {
          let data = null, parsed = false;
          try { data = JSON.parse(res.text); parsed = true; } catch { /* 非 JSON，下面按状态码归类 */ }
          if (!res.r.ok) {
            // Uapi 新版错误体是 { code, message, details }；但实测 404/400 常返回「空体」，
            // 因此这里必须用状态码兜底文案，不能再依赖 message 存在。
            const code = (parsed && data && (data.code || data.error_code)) || "";
            const apiMsg = parsed && data
              ? (data.message || data.msg || data.detail ||
                 (typeof data.error === "string" ? data.error : (data.error && data.error.message)))
              : "";
            const st = res.r.status;
            const extra = apiMsg ? "（" + apiMsg + "）" : "";
            const codeTag = code ? "［" + code + "］" : "";
            if (st === 400) throw errWith(new Error(label + "：请求参数不合法" + codeTag + extra), { status: st, code });
            if (st === 401) throw errWith(new Error(label + "：未授权或 API Key 无效" + codeTag + extra), { status: st, code, fatal: true });
            if (st === 402) throw errWith(new Error(label + "：额度/积分不足" + codeTag + extra), { status: st, code, fatal: true });
            if (st === 403) throw errWith(new Error(label + "：访问被拒绝或被 CORS/防盗链拦截" + codeTag + extra), { status: st, code });
            if (st === 404) throw errWith(new Error(label + "：未找到该城市（或路径不存在）" + codeTag + extra), { status: st, code, fatal: true });
            if (st === 408) throw errWith(new Error(label + "：上游请求超时（408）" + codeTag + extra), { status: st, code });
            if (st === 413) throw errWith(new Error(label + "：请求体过大（413）" + codeTag + extra), { status: st, code, fatal: true });
            if (st === 429) {
              const ra = numFromHeader(res.r, "Retry-After");
              throw errWith(new Error(label + "：访问过于频繁（429）" + (ra ? "，约 " + ra + "s 后重试" : "，稍后再试") + codeTag + extra),
                { status: st, code, retryAfter: ra });
            }
            if (st >= 500) throw errWith(new Error(label + "：服务端/上游异常（HTTP " + st + "）" + extra), { status: st, code });
            throw errWith(new Error(label + "：HTTP " + st + codeTag + (apiMsg ? " · " + apiMsg : "")), { status: st, code });
          }
          // 200 但业务码非成功（个别端点会用 200 + code 表达失败）
          if (parsed && data && typeof data === "object" && !Array.isArray(data)) {
            const bc = data.code != null ? String(data.code) : "";
            const fails = ["INVALID_PARAMETER", "INVALID_PARAMS", "UNAUTHORIZED", "INSUFFICIENT_CREDITS",
              "CORS_FORBIDDEN", "NOT_FOUND", "RATE_LIMIT_EXCEEDED", "SERVICE_BUSY",
              "VISITOR_MONTHLY_QUOTA_EXHAUSTED", "INTERNAL_SERVER_ERROR", "UPSTREAM_ERROR",
              "UPSTREAM_TIMEOUT", "SERVICE_UNAVAILABLE"];
            if (fails.includes(bc)) {
              const fatal = ["INVALID_PARAMETER", "INVALID_PARAMS", "UNAUTHORIZED",
                "INSUFFICIENT_CREDITS", "NOT_FOUND", "VISITOR_MONTHLY_QUOTA_EXHAUSTED"].includes(bc);
              throw errWith(new Error(label + "：" + (data.message || bc) + "［" + bc + "］"), { code: bc, fatal });
            }
          }
          if (!parsed) throw errWith(new Error(label + "：返回不是 JSON（可能被网关或代理改写）"), {});
          return data;
        })
        .catch((e) => {
          // 已带结构化标记的错误直接透出，别再包一层丢字段
          if (e && (e.status != null || e.code || e.fatal)) throw e;
          const nameOf = e && e.name;
          if (timedOut || nameOf === "AbortError" || nameOf === "TimeoutError") {
            throw errWith(new Error(label + "：超时（" + Math.round(timeout / 1000) + "s 未返回）"), {});
          }
          if (nameOf === "TypeError") throw errWith(new Error(label + "：网络不可达或被 CORS 拦截"), {});
          throw e instanceof Error ? e : new Error(label + "：" + String((e && e.message) || e));
        })
        .finally(() => clearTimeout(timer));
    }

    /**
     * 抓取 HTML（爬虫用）。与 fetchJson 的区别：
     *   ① 返回原始文本而非 JSON；
     *   ② 带真实浏览器请求头（墨迹等站点对裸 UA 会直接返回 WAF 拦截页）；
     *   ③ 主动识别 CloudWAF 拦截页（HTTP 418 / 含「访问被拦截」）并抛出可重试错误，
     *      而不是把拦截页当成正常页面去解析（那样只会得到「结构变化」的误报）；
     *   ④ 直连失败/被 CORS 拦时，若配置了 CORS 代理则自动经代理重试一次
     *      （墨迹页面无 CORS 头，浏览器里必须靠代理）。
     * 用法：fetchHtml(url, settings, opts) 或 fetchHtml(url, opts)。
     */
    const BROWSER_HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9," +
        "image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
    };
    function httpTextOnce(url, opts) {
      const o = opts || {};
      const timeout = Number.isFinite(o.timeout) ? o.timeout : 15000;
      const label = o.label || "抓取";
      const viaProxy = o.viaProxy === true;
      let ctrl = null;
      try { if (typeof AbortController !== "undefined") ctrl = new AbortController(); } catch { ctrl = null; }
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        if (!ctrl) return;
        try { ctrl.abort(new DOMException("超时 " + Math.round(timeout / 1000) + "s", "TimeoutError")); }
        catch { try { ctrl.abort(); } catch { /* 忽略 */ } }
      }, timeout);

      const headers = Object.assign({}, BROWSER_HEADERS, o.referer ? { Referer: o.referer } : {});
      let p;
      try {
        if (!url) throw new Error("空地址");
        // 注意：不带 mode:"cors" —— 由浏览器自行决定，避免在非浏览器环境（测试）报错；
        // 跨域受限于站点是否回 ACAO（墨迹不回，故浏览器下会失败并走代理重试）。
        p = Promise.resolve(fetch(url, Object.assign(
          { headers, redirect: "follow" },
          ctrl ? { signal: ctrl.signal } : {}
        )));
      } catch (e) {
        clearTimeout(timer);
        return Promise.reject(errWith(new Error(label + "：无法发起请求（" + String((e && e.message) || e) + "）"), {}));
      }

      return p
        .then((r) => {
          if (!r) throw errWith(new Error(label + "：无响应"), {});
          return r.text().then((text) => ({ r, text }));
        })
        .then((res) => {
          const st = res.r.status;
          const text = res.text || "";
          // CloudWAF：HTTP 418 或页面标题「访问被拦截！」。属于「被限流」，需较长冷却。
          const waf = st === 418 || /CloudWAF|访问被拦截/i.test(text.slice(0, 2000));
          if (waf) {
            throw errWith(new Error(label + "：被 CloudWAF 拦截（访问过于频繁，约 5–10 分钟后恢复）"),
              { status: 418, retryAfter: 300 });
          }
          if (st === 403) throw errWith(new Error(label + "：访问被拒绝（403，可能被防盗链拦截）"), { status: 403 });
          if (st === 429) {
            const ra = numFromHeader(res.r, "Retry-After");
            throw errWith(new Error(label + "：访问过于频繁（429）" + (ra ? "，约 " + ra + "s 后重试" : "")),
              { status: 429, retryAfter: ra });
          }
          if (st === 404) throw errWith(new Error(label + "：页面不存在（404）"), { status: 404, fatal: true });
          if (st >= 500) throw errWith(new Error(label + "：服务端异常（HTTP " + st + "）"), { status: st });
          if (!res.r.ok) throw errWith(new Error(label + "：HTTP " + st), { status: st });
          // 默认要求 200 字节以上以挡住「空页/占位页」；但某些小接口（如墨迹 /api/iplocate
          // 只回一行 "/weather/china/…"）本身就很短，可用 minLength 放宽。
          const minLen = Number.isFinite(o.minLength) ? o.minLength : 200;
          if (!text || text.length < minLen) throw errWith(new Error(label + "：返回内容为空或过短"), {});
          return text;
        })
        .catch((e) => {
          if (e && (e.status != null || e.code || e.fatal)) throw e;
          const nameOf = e && e.name;
          if (timedOut || nameOf === "AbortError" || nameOf === "TimeoutError") {
            throw errWith(new Error(label + "：超时（" + Math.round(timeout / 1000) + "s 未返回）"), {});
          }
          if (nameOf === "TypeError") {
            throw errWith(new Error(label + "：网络不可达或被 CORS 拦截" +
              (viaProxy ? "" : "（该站未开放跨域读取）")), { cors: !viaProxy });
          }
          throw e instanceof Error ? e : new Error(label + "：" + String((e && e.message) || e));
        })
        .finally(() => clearTimeout(timer));
    }

    function fetchHtml(url, settings, opts) {
      // 兼容 fetchHtml(url, opts) 两参调用
      let s = settings, o = opts;
      if (settings && typeof settings === "object" &&
          (settings.timeout != null || settings.label != null || settings.referer != null) &&
          settings.corsProxy === undefined) {
        o = settings; s = null;
      }
      o = o || {};
      const label = o.label || "抓取";
      const timeout = Number.isFinite(o.timeout) ? o.timeout : 15000;
      const proxy = String((s && s.corsProxy) || "").trim();

      return httpTextOnce(url, o).catch((err) => {
        // 直连失败：有代理就走代理再试一次（并报更贴近真实原因的错误）
        if (!proxy) {
          if (err && err.cors) {
            throw errWith(new Error(label + "：该站未开放跨域读取，请在设置里填写 CORS 代理"),
              { status: err.status, code: err.code, cors: true });
          }
          throw err;
        }
        return httpTextOnce(proxyUrl(url, s), Object.assign({}, o, {
          timeout: timeout + PROXY_TIMEOUT_SLACK, label: label + "（代理）", viaProxy: true,
        })).catch(() => { throw err; });
      });
    }

    /* ── 端点健康与冷却：避免对刚失败的端点反复冲、并在 429 后按 Retry-After 让路 ── */
    const EP_HEALTH = new Map();          // url → { fails, until, lastError }
    const EP_FAIL_COOLDOWN_MS = 45000;    // 连续失败后的冷却
    function epKey(url) { return String(url).split("?")[0]; }
    function epReady(url, now) {
      const h = EP_HEALTH.get(epKey(url));
      return !h || !h.until || h.until <= (now || Date.now());
    }
    function epMarkOk(url) {
      const k = epKey(url);
      const h = EP_HEALTH.get(k);
      if (h && (h.fails || h.until)) { h.fails = 0; h.until = 0; h.lastError = ""; }
    }
    function epMarkFail(url, err) {
      const k = epKey(url);
      const h = EP_HEALTH.get(k) || { fails: 0, until: 0, lastError: "" };
      h.fails += 1;
      h.lastError = String((err && err.message) || err || "");
      // 429 优先听服务端 Retry-After；否则指数退避（最长 90s）。
      const ra = err && Number.isFinite(err.retryAfter) ? err.retryAfter * 1000 : 0;
      const backoff = Math.min(90000, 3000 * Math.pow(2, Math.min(h.fails - 1, 5)));
      h.until = Date.now() + Math.max(ra, h.fails >= 2 ? backoff : EP_FAIL_COOLDOWN_MS / 2);
      EP_HEALTH.set(k, h);
    }

    /**
     * 依次尝试一列「等价端点」，任一成功即返回；全部失败则抛出最后一个错误。
     * 用途：Uapi 主端点被限流/被拦时自动换备用端点或 CORS 代理。
     * v2.1 修复：未配置 CORS 代理时**跳过** mode:"proxy" 的端点——
     * 旧版会把主端点原样再打一遍（代理 URL 退化为直连），白白多消耗一次
     * 访客速率桶（visitor-rate 4 次/秒）额度，越切换越容易 429。
     */
    function fetchEndpoints(endpoints, settings, opts) {
      const o = opts || {};
      const proxy = String((settings && settings.corsProxy) || "").trim();
      const list = (endpoints || []).filter(Boolean).filter((ep) => {
        const mode = ep && ep.mode;
        if (mode === "proxy") return !!proxy;   // 无代理配置 → 该端点等价于直连重发，跳过
        return true;
      });
      if (!list.length) return Promise.reject(new Error((o.label || "请求") + "：没有可用端点"));
      const tryAt = (i, lastErr) => {
        if (i >= list.length) {
          return Promise.reject(lastErr || new Error((o.label || "请求") + "：所有端点均不可用"));
        }
        const ep = list[i];
        const url = typeof ep === "string" ? ep : ep.url;
        const mode = (ep && ep.mode) || "direct";
        const now = Date.now();
        if (mode === "direct" && !epReady(url, now)) {
          return tryAt(i + 1, errWith(new Error((o.label || "请求") + "：端点冷却中（跳过）"), { endpoint: url }));
        }
        const shortLabel = (o.label || "请求") + (i > 0 ? "·备份" + i : "");
        // v2.1：备份端点（i>0）是“补救”性质，超时收紧到 min(主超时, 9s)，
        // 避免“主端点已等 11s + 备份再等 11s + 再下一跳 11s”把用户晾 30s+。
        const epTimeout = i === 0 ? o.timeout : Math.min(o.timeout || DEFAULT_TIMEOUT, 9000);
        const run = mode === "proxy"
          ? fetchJson(proxyUrl(url, settings), { timeout: epTimeout + PROXY_TIMEOUT_SLACK, label: shortLabel + "（代理）" })
          : fetchJson(url, { timeout: epTimeout, label: shortLabel });
        return run.then((data) => {
          // 备份源结构可能与主源不同；transform 负责把它归一成主源形状。
          const shaped = o.transform ? o.transform(data, ep, i) : data;
          if (mode === "direct") epMarkOk(url);
          return shaped;
        }).catch((e) => {
          const err = e instanceof Error ? e : new Error(String(e));
          err.endpoint = url;
          if (mode === "direct") epMarkFail(url, err);
          if (!isRetryableError(err)) throw err;   // 业务错误：换端点也没用，直接上抛
          return tryAt(i + 1, err);
        });
      };
      return tryAt(0, null);
    }

    function proxyUrl(url, settings) {
      const proxy = String((settings && settings.corsProxy) || "").trim();
      if (!proxy) return url;
      const enc = encodeURIComponent(url);
      if (proxy.indexOf("{{url}}") >= 0) return proxy.split("{{url}}").join(enc);
      if (proxy.charAt(proxy.length - 1) === "=") return proxy + enc;
      return proxy.replace(/\/+$/, "") + "/" + enc;
    }

    /** 直连失败 → 若配置了 CORS 代理则回退（代理也失败时报原始直连错误，更贴近真实原因）。 */
    function withProxy(url, settings, label, timeout) {
      const proxy = String((settings && settings.corsProxy) || "").trim();
      if (!proxy) return null;
      return fetchJson(proxyUrl(url, settings), { timeout: timeout + PROXY_TIMEOUT_SLACK, label: label + "（代理）" });
    }
    function fetchSource(url, settings, opts) {
      const o = opts || {};
      const label = o.label || "数据源";
      const timeout = Number.isFinite(o.timeout) ? o.timeout : DEFAULT_TIMEOUT;
      return fetchJson(url, { timeout, label }).catch((err) => {
        const proxied = withProxy(url, settings, label, timeout);
        if (!proxied) throw err;
        return proxied.catch(() => { throw err; });
      });
    }

    /**
     * 瞬时失败自动重试（默认一次）。
     * 关键改动：改用 isRetryableError 判定，并在 429 时严格按 Retry-After 等待——
     * 否则并发重试会把免费额度（visitor-rate 4 次/秒）打满，越重试越取不到数据。
     * 业务错误（城市不存在/参数错/未授权）一律不重试。
     */
    function withRetry(task, times, delayMs) {
      const n = Number.isFinite(times) && times > 0 ? times : 0;
      const step = Number.isFinite(delayMs) ? delayMs : 1000;
      const once = () => Promise.resolve().then(task);
      if (!n) return once();
      return once().catch((e1) => {
        if (!isRetryableError(e1)) throw e1;
        // 429 优先听服务端 Retry-After（上限 15s，避免界面长时间空转）
        const ra = Number.isFinite(e1 && e1.retryAfter) ? Math.min(15000, e1.retryAfter * 1000) : 0;
        const wait = Math.max(ra, step);
        const msg = String((e1 && e1.message) || e1);
        return new Promise((res) => setTimeout(res, wait)).then(once).catch((e2) => {
          throw new Error(msg + "；重试仍失败（" + String((e2 && e2.message) || e2).replace(/^[^：]*：/, "") + "）");
        });
      });
    }

    function cToF(c) { return (Number(c) * 9) / 5 + 32; }
    function isNum(v) { return v != null && v !== "" && Number.isFinite(Number(v)); }
    function round1(n) { return isNum(n) ? Math.round(Number(n) * 10) / 10 : null; }
    function fmtTemp(c, unit, dash) {
      if (!isNum(c)) return dash == null ? "—" : dash;
      return String(Math.round(unit === "F" ? cToF(Number(c)) : Number(c)));
    }
    function degToCompass(deg) {
      const dirs = ["北", "北东北", "东北", "东东北", "东", "东东南", "东南", "南东南",
        "南", "南西南", "西南", "西西南", "西", "西西北", "西北", "北西北"];
      const d = ((Number(deg) || 0) % 360 + 360) % 360;
      return dirs[Math.round(d / 22.5) % 16];
    }
    function windDirToDeg(pt) {
      const order = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
        "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
      const i = order.indexOf(String(pt || "").toUpperCase());
      return i < 0 ? 0 : i * 22.5;
    }
    /** 把 "2026-10-11 14:00:00" / ISO / 时间戳 安全转本地 Date（避开严格解析差异）。 */
    function parseLocal(s) {
      if (s instanceof Date) return s;
      if (typeof s === "number") return new Date(s);
      const str = String(s == null ? "" : s).trim();
      if (!str) return new Date(NaN);
      const m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
      if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
      return new Date(str);
    }

    /**
     * ISO8601（含时区偏移）安全解析 —— Uapi 新版的 hourly.time 形如
     * "2026-02-19T17:00:00+0900" / "2026-02-19T15:30:00+08:00" / "...Z"。
     * 这类带偏移的时间若交给 parseLocal 会按本地时间误读，导致逐时错位。
     * 策略：先按偏移换算成真实 UTC 瞬间，再取其「本地墙上时间」用于显示。
     * 无偏移的裸串（"2026-02-19T17:00:00"）按本地时间处理，与接口语义一致。
     */
    function parseIso(s) {
      const str = String(s == null ? "" : s).trim();
      if (!str) return new Date(NaN);
      const m = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?\s*(Z|[+-]\d{2}:?\d{2})?$/i);
      if (!m) return parseLocal(str);
      const [, Y, Mo, D, H, Mi, Se, , off] = m;
      // 无偏移：当本地墙上时间（与旧格式 "YYYY-MM-DD HH:mm:ss" 行为一致）
      if (!off) {
        return new Date(+Y, +Mo - 1, +D, +H, +Mi, +(Se || 0));
      }
      if (/^z$/i.test(off)) return new Date(Date.UTC(+Y, +Mo - 1, +D, +H, +Mi, +(Se || 0)));
      const sign = off.charAt(0) === "-" ? -1 : 1;
      const dig = off.slice(1).replace(":", "");
      const oh = +dig.slice(0, 2), om = +dig.slice(2) || 0;
      const utcMs = Date.UTC(+Y, +Mo - 1, +D, +H, +Mi, +(Se || 0)) - sign * (oh * 60 + om) * 60000;
      const d = new Date(utcMs);
      // 转成「来源时区的墙上时间」：把 UTC 瞬间按该偏移平移后再取本地字段。
      return new Date(d.getTime() + sign * (oh * 60 + om) * 60000 + (new Date().getTimezoneOffset() * 60000));
    }

    /**
     * Uapi report_time 归一：新版可能是 "2026-02-19 15:25:58"（绝对时间），
     * 旧版是 "8 分钟前发布"（相对描述）。统一成可读短串，避免页脚出现一长串时间戳。
     */
    function normalizeReportTime(v) {
      const raw = String(v == null ? "" : v).trim();
      if (!raw) return "";
      // 已含「分钟前 / 小时前 / 刚刚」这类相对描述 → 原样保留
      if (/(前|刚刚|实时|now|ago)/i.test(raw)) return raw;
      const d = parseIso(raw) || parseLocal(raw);
      if (isNaN(d)) return raw;
      const hh = two(d.getHours()) + ":" + two(d.getMinutes());
      const t = new Date(); t.setHours(0, 0, 0, 0);
      const day = new Date(d); day.setHours(0, 0, 0, 0);
      const diff = Math.round((day - t) / 86400000);
      if (diff === 0) return hh + " 更新";
      if (diff === -1) return "昨天 " + hh;
      return (d.getMonth() + 1) + "/" + d.getDate() + " " + hh;
    }
    function two(n) { return (n < 10 ? "0" : "") + n; }
    function hhmm(dateLike) { const d = parseLocal(dateLike); return isNaN(d) ? "" : two(d.getHours()) + ":" + two(d.getMinutes()); }
    function weekdayName(dateLike) { const d = parseLocal(dateLike); return isNaN(d) ? "" : WEEKDAYS[d.getDay()]; }
    /** 今天/明天/后天；更远的用星期几；超出 7 天用 M/D。 */
    function dayLabel(dateLike) {
      const d = parseLocal(dateLike);
      if (isNaN(d)) return "—";
      // 必须把「当天」和「今天零点」都归一化到 00:00 再比，否则当前时刻（如 20:24）
      // 会让 (d - 今天零点) 变成 0.85 天，Math.round 后误判成「明天」。
      const t = new Date(); t.setHours(0, 0, 0, 0);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const diff = Math.round((day - t) / 86400000);
      if (diff >= 0 && diff < 3) return DAY_NAMES[diff];
      if (diff >= 3 && diff < 7) return WEEKDAYS[d.getDay()];
      return (d.getMonth() + 1) + "/" + d.getDate();
    }
    function relTime(ms) {
      const s = Math.max(0, Math.round(ms / 1000));
      if (s < 60) return "刚刚更新";
      const m = Math.round(s / 60);
      if (m < 60) return m + " 分钟前";
      const hr = Math.round(m / 60);
      if (hr < 24) return hr + " 小时前";
      return Math.round(hr / 24) + " 天前";
    }
    function clone(o) { return JSON.parse(JSON.stringify(o)); }

    /* ═══ 3. 设置仓库 ════════════════════════════════════════════════════════ */

    const DEFAULTS = {
      fontSize: 15,             // 12–22
      unit: "C",                // C | F
      refreshMinutes: 10,       // 5 | 10 | 15 | 30
      locPref: "ip",            // ip | gps | manual
      activeSources: ["uapi", "open-meteo"], // 顺序即主源优先序
      forecastDays: 3,          // 3 | 5 | 7
      clockSeconds: false,      // 卡片时钟是否带秒
      opacity: 100,             // 玻璃背板透明度 45–100
      theme: "auto",            // auto | dark | light
      hoverExpand: false,       // 悬停即展开
      showHourly: true,         // 显示逐时条
      sceneBg: true,            // 场景化卡片背景（随天气/昼夜切换极光配色）
      keys: { caiyun: "", openWeather: "" },
      corsProxy: "",            // 默认直连；仅非 CORS 源需要
      pos: null,                // {x,y} 胶囊锚点（拖动落点）
      manualLoc: null,          // 上次手动选择的城市（持久记忆）
      seenGuide: false,         // 是否已看过首次欢迎指引（看过后不再自动弹出）
    };

    const CLAMP = {
      fontSize: (v) => Math.min(22, Math.max(12, Math.round(Number(v) || DEFAULTS.fontSize))),
      unit: (v) => (v === "F" ? "F" : "C"),
      refreshMinutes: (v) => ([5, 10, 15, 30].includes(Number(v)) ? Number(v) : 10),
      locPref: (v) => (["ip", "gps", "manual"].includes(v) ? v : "ip"),
      forecastDays: (v) => ([3, 5, 7].includes(Number(v)) ? Number(v) : 3),
      clockSeconds: (v) => v === true,
      opacity: (v) => Math.min(100, Math.max(45, Math.round(Number(v)) || 100)),
      theme: (v) => (["auto", "dark", "light"].includes(v) ? v : "auto"),
      hoverExpand: (v) => v === true,
      showHourly: (v) => v !== false,
      sceneBg: (v) => v !== false,
      seenGuide: (v) => v === true,
    };

    /** 只接受白名单键 + 逐键类型清洗（脏数据回落默认，不让旧版本残留弄坏界面）。 */
    function sanitize(stored) {
      const out = clone(DEFAULTS);
      const src = (stored && typeof stored === "object" && !Array.isArray(stored)) ? stored : {};
      Object.keys(CLAMP).forEach((k) => {
        if (k in src) { try { out[k] = CLAMP[k](src[k]); } catch { /* 保留默认 */ } }
      });
      if (Array.isArray(src.activeSources)) {
        const seen = [];
        src.activeSources.forEach((id) => {
          if (Object.prototype.hasOwnProperty.call(SOURCE_REGISTRY, id) && !seen.includes(id)) seen.push(id);
        });
        if (seen.length) out.activeSources = seen.slice(0, MAX_SOURCES);
        // 全非法/注册表未就绪 → 保留 DEFAULTS（其自身即合法）
      }
      if (src.keys && typeof src.keys === "object") {
        Object.keys(DEFAULTS.keys).forEach((k) => {
          const v = src.keys[k];
          out.keys[k] = typeof v === "string" ? v.trim() : "";
        });
      }
      if (typeof src.corsProxy === "string") {
        const p = src.corsProxy.trim();
        out.corsProxy = (!p || /^https:\/\//i.test(p)) ? p : "";
      }
      if (src.pos === null) out.pos = null;
      else if (src.pos && isNum(src.pos.x) && isNum(src.pos.y)) {
        out.pos = { x: Number(src.pos.x), y: Number(src.pos.y) };
      }
      if (src.manualLoc && typeof src.manualLoc === "object" &&
          isNum(src.manualLoc.lat) && isNum(src.manualLoc.lon) && src.manualLoc.label) {
        out.manualLoc = {
          lat: Number(src.manualLoc.lat), lon: Number(src.manualLoc.lon),
          label: String(src.manualLoc.label).slice(0, 40),
          region: String(src.manualLoc.region || "").slice(0, 40),
          country: String(src.manualLoc.country || "").slice(0, 40),
          countryCode: String(src.manualLoc.countryCode || "").slice(0, 4),
          flag: String(src.manualLoc.flag || "").slice(0, 4),
          source: "manual",
        };
      }
      return out;
    }

    function readStored() {
      const get = (k) => { try { return window.localStorage.getItem(k); } catch { return null; } };
      const raw = get(LS_SETTINGS) || LS_SETTINGS_LEGACY.map(get).find((v) => !!v);
      if (!raw) return clone(DEFAULTS);
      try { return sanitize(JSON.parse(raw)); } catch { return clone(DEFAULTS); }
    }

    /**
     * 「再看一遍指引」的信号总线。
     * 设置页与悬浮卡片是**两个互不相关的插槽**，彼此拿不到对方的 state，
     * 所以跨插槽的重播请求走这个极简广播（不落盘、不参与设置持久化）。
     */
    const guideReplay = (() => {
      const listeners = new Set();
      return {
        on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        fire() { listeners.forEach((fn) => { try { fn(); } catch { /* 单个订阅者出错不牵连其它 */ } }); },
      };
    })();

    const settingsStore = (() => {
      // 惰性初始化：模块加载期注册表还是空的，若立刻 sanitize 会把
      // 用户已选的非常规源误过滤。第一次真正使用时（注册已完成）再读取。
      let state = null;
      const ensure = () => { if (!state) state = readStored(); return state; };
      const listeners = new Set();
      const persist = () => {
        try { window.localStorage.setItem(LS_SETTINGS, JSON.stringify(ensure())); } catch { /* 配额/隐私模式 */ }
      };
      const emit = () => listeners.forEach((l) => { try { l(ensure()); } catch { /* 单个订阅者出错不牵连其它 */ } });
      return {
        get: () => ensure(),
        set(patch) {
          const prev = ensure();
          const merged = Object.assign({}, prev, patch || {}, {
            keys: Object.assign({}, prev.keys, (patch && patch.keys) || {}),
          });
          const next = sanitize(merged);
          const changed = JSON.stringify(next) !== JSON.stringify(prev);
          state = next;
          if (changed) { persist(); emit(); }
          return state;
        },
        subscribe(l) { listeners.add(l); return () => listeners.delete(l); },
        reset() {
          state = clone(DEFAULTS);
          persist();
          try { window.localStorage.removeItem(LS_WEATHER); } catch { /* ignore */ }
          emit();
        },
      };
    })();

    /* ═══ 4. 天气符号字典 ════════════════════════════════════════════════════ */

    function wmoInfo(code, isDay) {
      const day = isDay !== false;
      const map = {
        0: ["晴", "☀️"], 1: ["晴间多云", day ? "🌤️" : "🌙"], 2: ["少云", day ? "⛅" : "🌙"], 3: ["阴", "☁️"],
        45: ["雾", "🌫️"], 48: ["凇雾", "🌫️"],
        51: ["微毛毛雨", "🌦️"], 53: ["毛毛雨", "🌦️"], 55: ["强毛毛雨", "🌧️"],
        56: ["冻毛毛雨", "🌧️"], 57: ["强冻毛毛雨", "🌧️"],
        61: ["小雨", "🌦️"], 63: ["中雨", "🌧️"], 65: ["大雨", "🌧️"], 66: ["冻雨", "🌧️"], 67: ["强冻雨", "🌧️"],
        71: ["小雪", "🌨️"], 73: ["中雪", "❄️"], 75: ["大雪", "❄️"], 77: ["米雪", "🌨️"],
        80: ["小阵雨", "🌦️"], 81: ["阵雨", "🌧️"], 82: ["强阵雨", "⛈️"], 85: ["阵雪", "🌨️"], 86: ["强阵雪", "❄️"],
        95: ["雷暴", "⛈️"], 96: ["雷暴伴冰雹", "⛈️"], 99: ["强雷暴冰雹", "⛈️"],
      };
      const f = map[Number(code)];
      return f ? { label: f[0], icon: f[1] } : { label: "未知", icon: day ? "🌥️" : "🌙" };
    }

    const QWEATHER_MAP = {
      100: ["晴", "☀️"], 150: ["晴", "🌙"], 101: ["多云", "⛅"], 151: ["多云", "🌙"],
      102: ["少云", "⛅"], 152: ["少云", "🌙"], 103: ["晴间多云", "🌤️"], 153: ["晴间多云", "🌙"], 104: ["阴", "☁️"],
      300: ["阵雨", "🌦️"], 301: ["强阵雨", "⛈️"], 302: ["雷阵雨", "⛈️"], 303: ["强雷阵雨", "⛈️"],
      304: ["雷阵雨伴冰雹", "⛈️"], 305: ["小雨", "🌦️"], 306: ["中雨", "🌧️"], 307: ["大雨", "🌧️"],
      308: ["极端降雨", "⛈️"], 309: ["毛毛雨", "🌦️"], 310: ["暴雨", "⛈️"], 311: ["大暴雨", "⛈️"],
      312: ["特大暴雨", "⛈️"], 313: ["冻雨", "🌧️"], 399: ["雨", "🌧️"],
      400: ["小雪", "🌨️"], 401: ["中雪", "❄️"], 402: ["大雪", "❄️"], 403: ["暴雪", "❄️"], 404: ["雨夹雪", "🌨️"],
      405: ["雨雪", "🌨️"], 406: ["阵雨夹雪", "🌨️"], 407: ["阵雪", "🌨️"], 499: ["雪", "❄️"],
      500: ["薄雾", "🌫️"], 501: ["雾", "🌫️"], 502: ["霾", "😷"], 503: ["扬沙", "💨"], 504: ["浮尘", "💨"],
      507: ["沙尘暴", "🏜️"], 508: ["强沙尘暴", "🏜️"], 509: ["浓雾", "🌫️"], 510: ["强浓雾", "🌫️"],
      511: ["中度霾", "😷"], 512: ["重度霾", "😷"], 513: ["严重霾", "😷"], 514: ["大雾", "🌫️"], 515: ["特强浓雾", "🌫️"],
      900: ["热", "🔥"], 901: ["冷", "🥶"], 999: ["未知", "🌥️"],
    };
    function qweatherInfo(code, isDay) {
      const day = isDay !== false;
      const f = QWEATHER_MAP[String(code)];
      if (f) return { label: f[0], icon: day ? f[1] : nightOf(f[1]) };
      return { label: "未知", icon: day ? "🌥️" : "🌙" };
    }

    /** 中文天气文本 → 图标（Uapi 文本、墨迹、wttr 中文共用；顺序即优先级）。 */
    const CN_RULES = [
      [/雷[阵雨暴]*|强对流/, ["雷暴", "⛈️"]],
      [/冰雹/, ["冰雹", "⛈️"]],
      [/特大暴雨|大暴雨|暴雨/, ["暴雨", "⛈️"]],
      [/雨夹雪|阵雨夹雪|雨雪|冻雨/, ["雨夹雪", "🌨️"]],
      [/暴雪|大雪|中雪|小雪|阵雪|雪/, ["雪", "❄️"]],
      [/毛毛雨|细雨/, ["毛毛雨", "🌦️"]],
      [/大雨|中雨|小雨|阵雨|雨/, ["雨", "🌧️"]],
      [/沙尘|扬沙|浮尘/, ["沙尘", "💨"]],
      [/霾/, ["霾", "😷"]],
      [/雾/, ["雾", "🌫️"]],
      [/晴间多云|晴转多云|多云转晴/, ["晴间多云", "🌤️"]],
      [/晴/, ["晴", "☀️"]],
      [/多云/, ["多云", "⛅"]],
      [/阴/, ["阴", "☁️"]],
      [/大风|飓风|龙卷|风/, ["大风", "💨"]],
      [/高温|热/, ["高温", "🔥"]],
      [/低温|寒冷|霜|冷/, ["低温", "🥶"]],
    ];
    function cnInfo(text, isDay) {
      const day = isDay !== false;
      const raw = String(text || "").trim();
      const hit = CN_RULES.find((r) => r[0].test(raw));
      if (hit) return { label: raw || hit[1][0], icon: day ? hit[1][1] : nightOf(hit[1][1]) };
      return { label: raw || (day ? "未知" : "夜间"), icon: day ? "🌥️" : "🌙" };
    }
    function nightOf(icon) {
      return (icon === "☀️" || icon === "🌤️" || icon === "⛅") ? "🌙" : icon;
    }

    /**
     * 英文天气描述 → 中文（wttr.in 备份源有时只给英文，界面应保持中文一致观感）。
     * 只有确实含拉丁字母才翻译，中文原样返回。
     */
    const EN_WEATHER_RULES = [
      [/thunder|storm|lightning/, "雷阵雨"],
      [/blizzard/, "暴雪"],
      [/heavy snow|snow/, "雪"],
      [/sleet|freezing rain|ice pellets/, "雨夹雪"],
      [/heavy rain|torrential/, "大雨"],
      [/light rain|drizzle|shower/, "小雨"],
      [/rain/, "雨"],
      [/heavy fog|dense fog|fog/, "雾"],
      [/smoky|smoke/, "烟霾"],
      [/haze|hazy/, "霾"],
      [/dust|sand/, "沙尘"],
      [/overcast/, "阴"],
      [/cloudy|cloud/, "多云"],
      [/partly/, "晴间多云"],
      [/clear|sunny/, "晴"],
      [/mist/, "薄雾"],
      [/wind|gale|breezy/, "大风"],
    ];
    function enWeatherToZh(text) {
      const s = String(text || "").trim();
      if (!s) return s;
      if (!/[A-Za-z]/.test(s)) return s;             // 已是中文/非拉丁 → 原样
      const hit = EN_WEATHER_RULES.find((r) => r[0].test(s.toLowerCase()));
      return hit ? hit[1] : s;
    }

    /** wttr.in（英文描述 + weatherCode） */
    function wttrInfo(desc, code, isNight) {
      const d = String(desc || "").toLowerCase();
      const night = isNight === true;
      const rules = [
        [/thunder|storm/, ["雷暴", "⛈️"]],
        [/snow|sleet|blizzard|pellet/, ["雪", "❄️"]],
        [/drizzle/, ["毛毛雨", "🌦️"]],
        [/rain|shower/, ["雨", "🌧️"]],
        [/fog|mist|haze|smoke/, ["雾/霾", "🌫️"]],
        [/sunny|clear/, ["晴", night ? "🌙" : "☀️"]],
        [/partly/, ["晴间多云", night ? "🌙" : "🌤️"]],
        [/overcast|cloudy/, ["阴", "☁️"]],
        [/wind|breezy/, ["大风", "💨"]],
      ];
      const hit = rules.find((r) => r[0].test(d));
      if (hit) return { label: hit[1][0], icon: hit[1][1] };
      const cm = {
        113: ["晴", night ? "🌙" : "☀️"], 116: ["晴间多云", night ? "🌙" : "🌤️"], 119: ["阴", "☁️"], 122: ["阴", "☁️"],
        143: ["雾", "🌫️"], 248: ["雾", "🌫️"], 260: ["雾", "🌫️"], 176: ["毛毛雨", "🌦️"], 263: ["毛毛雨", "🌦️"],
        266: ["毛毛雨", "🌦️"], 293: ["小雨", "🌧️"], 296: ["小雨", "🌧️"], 299: ["中雨", "🌧️"], 302: ["中雨", "🌧️"],
        305: ["大雨", "🌧️"], 308: ["大雨", "🌧️"], 179: ["雪", "🌨️"], 182: ["雨夹雪", "🌨️"], 185: ["雨夹雪", "🌨️"],
        227: ["雪", "❄️"], 230: ["大雪", "❄️"], 200: ["雷暴", "⛈️"], 386: ["雷暴", "⛈️"], 389: ["雷暴", "⛈️"], 149: ["烟霾", "🌫️"],
      };
      const f = cm[String(code)];
      return f ? { label: f[0], icon: f[1] } : { label: desc ? String(desc).trim() : "—", icon: night ? "🌙" : "🌥️" };
    }

    const CAIYUN_MAP = {
      CLEAR_DAY: ["晴", "☀️"], CLEAR_NIGHT: ["晴", "🌙"],
      PARTLY_CLOUDY_DAY: ["晴间多云", "🌤️"], PARTLY_CLOUDY_NIGHT: ["晴间多云", "🌙"],
      CLOUDY: ["阴", "☁️"], LIGHT_HAZE: ["轻度霾", "🌫️"], MODERATE_HAZE: ["中度霾", "🌫️"], HEAVY_HAZE: ["重度霾", "😷"],
      LIGHT_RAIN: ["小雨", "🌦️"], MODERATE_RAIN: ["中雨", "🌧️"], HEAVY_RAIN: ["大雨", "🌧️"], STORM_RAIN: ["暴雨", "⛈️"],
      FOG: ["雾", "🌫️"], HAZE: ["霾", "😷"], LIGHT_SNOW: ["小雪", "🌨️"], MODERATE_SNOW: ["中雪", "❄️"],
      HEAVY_SNOW: ["大雪", "❄️"], STORM_SNOW: ["暴雪", "❄️"], DUST: ["浮尘", "💨"], SAND: ["沙尘", "🏜️"],
      WIND: ["大风", "💨"], RAIN: ["雨", "🌧️"], SNOW: ["雪", "❄️"],
    };
    function caiyunInfo(skycon) {
      const f = CAIYUN_MAP[String(skycon || "")];
      return f ? { label: f[0], icon: f[1] } : { label: "未知", icon: "🌥️" };
    }

    function owmInfo(code, isDay) {
      const day = isDay !== false;
      const c = Number(code);
      if (c >= 200 && c < 300) return { label: "雷暴", icon: "⛈️" };
      if (c >= 300 && c < 400) return { label: "毛毛雨", icon: "🌦️" };
      if (c === 500) return { label: "小雨", icon: "🌦️" };
      if (c === 501) return { label: "中雨", icon: "🌧️" };
      if (c === 502 || c === 503) return { label: "大雨", icon: "🌧️" };
      if (c === 504) return { label: "强降水", icon: "🌧️" };
      if (c === 511) return { label: "冻雨", icon: "🌧️" };
      if (c >= 600 && c < 700) return { label: "雪", icon: "❄️" };
      if (c === 701 || c === 741) return { label: "雾", icon: "🌫️" };
      if (c === 711) return { label: "烟", icon: "🌫️" };
      if (c === 721 || c === 751) return { label: "霾/沙尘", icon: "😷" };
      if (c === 731 || c === 761 || c === 762) return { label: "沙尘", icon: "💨" };
      if (c === 771) return { label: "大风", icon: "💨" };
      if (c === 781) return { label: "龙卷", icon: "🌪️" };
      if (c === 800) return { label: "晴", icon: day ? "☀️" : "🌙" };
      if (c === 801 || c === 802) return { label: "少云", icon: day ? "⛅" : "🌙" };
      if (c === 803) return { label: "多云", icon: "⛅" };
      if (c === 804) return { label: "阴", icon: "☁️" };
      return { label: "未知", icon: day ? "🌥️" : "🌙" };
    }

    /** AQI → 颜色 + 等级（国内六级）。 */
    function aqiGrade(aqi) {
      if (!isNum(aqi)) return null;
      const v = Number(aqi);
      if (v <= 50) return { color: "#3ddc84", text: "优" };
      if (v <= 100) return { color: "#a4e04a", text: "良" };
      if (v <= 150) return { color: "#ffb020", text: "轻度污染" };
      if (v <= 200) return { color: "#ff8a3d", text: "中度污染" };
      if (v <= 300) return { color: "#ff6b6b", text: "重度污染" };
      return { color: "#c05fd6", text: "严重污染" };
    }

    /**
     * 场景化卡片背景（v2.1 新增）：把「当前天气 + 昼夜」映射成极光三色。
     * 输出同时驱动：① 极光光斑配色 ② 大温度渐变描边 ③ 场景细节层（星/雨/雾霾）。
     * 设计约束：
     *   · 每套场景只给 3 个色相（多了会“花”）；深浅主题共用同一组色相，
     *     浅色下靠 --dwi-aurora 本身更低（.20 vs .42）自然变淡，不需要另出一套。
     *   · 找不到场景时回落 accent/accent2/teal（与不挂场景时视觉零差异）。
     */
    const SCENES = {
      // 色相错开 + 明度分层 + 饱和度克制；配合 --dwi-scene-aurora 强度（深 .45 / 浅 .55）
      // 与 fx 细节层，7 套场景均可感知区分（scene-contrast.cjs 逐一断言）。
      day_clear: { c1: "#ffb84d", c2: "#ffd180", c3: "#ff8a65", boost: .1,  fx: "none" },  // 晴昼：金橙主导（Hue 35）
      night:     { c1: "#3f51b5", c2: "#1a237e", c3: "#3949ab", boost: .35, fx: "stars" }, // 夜间：靛蓝（Hue 230）+ 星
      cloudy:    { c1: "#aeb9c4", c2: "#8496a3", c3: "#cdd6de", boost: .05, fx: "none" },  // 多云/阴：偏白冷灰（浅色下呈浅银灰）
      rain:      { c1: "#29b6f6", c2: "#0277bd", c3: "#26c6da", boost: .15, fx: "rain" },  // 雨：高饱和青蓝（Hue 197）+ 雨丝
      storm:     { c1: "#8e24aa", c2: "#4a0072", c3: "#d500f9", boost: .3,  fx: "rain" },  // 雷暴：乌云紫红（Hue 290）+ 电紫 + 雨丝
      snow:      { c1: "#e1f5fe", c2: "#81d4fa", c3: "#b3e5fc", boost: .08, fx: "snow" },  // 雪：近白冰蓝（全场最亮）+ 飘雪粒子
      haze:      { c1: "#94924a", c2: "#5f5c42", c3: "#7d7a5e", boost: .05, fx: "haze" },  // 霾/沙/雾：浊黄绿（Hue 58，压深与 cloudy 拉开）
    };
    /** 由「描述文本（中文兜底）+ 图标 emoji + 昼夜」推断场景 key。
     *  注意 emoji 的歧义：💨 同时被「大风」与「沙尘」使用，故 haze 的图标判定
     *  不含 💨（交给文本判定，避免大风天误显昏黄霾背景）；大风归入多云的青灰基调。 */
    function sceneOf(desc, icon, isDay) {
      const s = String(desc || "");
      const ic = String(icon || "");
      if (/雷/.test(s) || /⛈️/.test(ic)) return "storm";
      if (/雪/.test(s) || /❄️|🌨️/.test(ic)) return "snow";
      if (/霾|沙|浮尘|扬尘|雾/.test(s) || /😷|🌫️|🏜️/.test(ic)) return "haze";
      if (/雨|阵雨|毛毛/.test(s) || /🌧️|🌦️/.test(ic)) return "rain";
      if (/阴|多云|大风|飓风|龙卷/.test(s) || /☁️|💨/.test(ic)) return "cloudy";
      if (isDay === false) return "night";
      return "day_clear";
    }

    /* ═══ 5. 数据源适配层 ════════════════════════════════════════════════════ */
    /*
     * 每个适配器产出同一形状（新增源只要照此返回即可）：
     * {
     *   ok, source, reportTime,
     *   current:{tempC,feelsC,humidity,windKmh,windDirText,windScale,pressureHpa,
     *            precipMm,uvIndex,visibilityKm,cloudPct,aqi,aqiCategory,icon,desc,isDay},
     *   hourly:[{time,icon,desc,tempC,pop}],
     *   daily:[{date,label,icon,desc,tempMaxC,tempMinC,pop,sunrise,sunset,uvMax}],
     *   alerts:[{title,type,level,text}]
     * }
     */
    function dailyRow(dateLike, info, maxC, minC, extra) {
      const d = parseLocal(dateLike);
      return Object.assign({
        date: isNaN(d) ? "" : d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate()),
        label: dayLabel(dateLike),
        icon: info.icon, desc: info.label,
        tempMaxC: isNum(maxC) ? Number(maxC) : null,
        tempMinC: isNum(minC) ? Number(minC) : null,
        pop: null, sunrise: null, sunset: null, uvMax: null,
      }, extra || {});
    }

    /* ── 5.1 Open-Meteo ─────────────────────────────────────────────────── */
    function fetchOpenMeteo(loc, s, days) {
      const cur = ["temperature_2m", "relative_humidity_2m", "apparent_temperature", "weather_code", "is_day",
        "wind_speed_10m", "wind_direction_10m", "pressure_msl", "precipitation", "uv_index", "visibility", "cloud_cover"].join(",");
      const hr = "temperature_2m,weather_code,precipitation_probability,is_day";
      const dy = "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max," +
        "precipitation_probability_max,precipitation_sum";
      const url = "https://api.open-meteo.com/v1/forecast?latitude=" + loc.lat + "&longitude=" + loc.lon +
        "&current=" + encodeURIComponent(cur) + "&hourly=" + encodeURIComponent(hr) +
        "&daily=" + encodeURIComponent(dy) + "&timezone=auto&forecast_days=" + days;
      return fetchSource(url, s, { timeout: 9000, label: "Open-Meteo" }).then((j) => {
        if (!j || !j.current) throw new Error("Open-Meteo 无数据");
        const c = j.current;
        const isDay = c.is_day !== 0;
        const info = wmoInfo(c.weather_code, isDay);
        const hourly = [];
        if (j.hourly && Array.isArray(j.hourly.time)) {
          const T = j.hourly.time, now = Date.now();
          let st = T.findIndex((x) => parseLocal(x).getTime() >= now - 3600000);
          if (st < 0) st = 0;
          for (let i = st; i < Math.min(st + 24, T.length); i++) {
            const dDay = j.hourly.is_day ? j.hourly.is_day[i] !== 0 : true;
            const inf = wmoInfo(j.hourly.weather_code[i], dDay);
            hourly.push({
              time: i === st ? "现在" : hhmm(T[i]), icon: inf.icon, desc: inf.label,
              tempC: j.hourly.temperature_2m[i],
              pop: j.hourly.precipitation_probability ? j.hourly.precipitation_probability[i] : null,
            });
          }
        }
        const daily = [];
        if (j.daily && Array.isArray(j.daily.time)) {
          const D = j.daily;
          D.time.forEach((t, i) => {
            daily.push(dailyRow(t, wmoInfo(D.weather_code[i], true), D.temperature_2m_max[i], D.temperature_2m_min[i], {
              pop: D.precipitation_probability_max ? D.precipitation_probability_max[i] : null,
              sunrise: D.sunrise && D.sunrise[i] ? String(D.sunrise[i]).slice(11, 16) : null,
              sunset: D.sunset && D.sunset[i] ? String(D.sunset[i]).slice(11, 16) : null,
              uvMax: D.uv_index_max ? D.uv_index_max[i] : null,
              precipSum: D.precipitation_sum ? D.precipitation_sum[i] : null,
            }));
          });
        }
        return {
          ok: true, source: "open-meteo", reportTime: String(c.time || "").slice(11, 16),
          current: {
            tempC: c.temperature_2m, feelsC: c.apparent_temperature, humidity: c.relative_humidity_2m,
            windKmh: c.wind_speed_10m, windDirText: degToCompass(c.wind_direction_10m), windScale: null,
            pressureHpa: c.pressure_msl, precipMm: c.precipitation, uvIndex: c.uv_index,
            visibilityKm: isNum(c.visibility) ? c.visibility / 1000 : null, cloudPct: c.cloud_cover,
            aqi: null, aqiCategory: null, icon: info.icon, desc: info.label, isDay,
          },
          hourly, daily, alerts: [],
        };
      });
    }

    /* ── 5.2 Uapi（默认主源） ───────────────────────────────────────────── */
    // 文档：https://uapis.cn/docs/api-reference/get-misc-weather
    // 官方主机：https://uapis.cn/api/v1/misc/weather（免注册、反射 Origin → CORS 可用；
    //          注意带 api. 前缀的那个子域没有 DNS 记录、不可用，切勿改用）
    //
    // ⚠ 2026-02-19 官方对本接口做了「重大升级」（含破坏性变更），旧解析已失效，此处按新契约重写：
    //   · 破坏性：错误码 502 移除，新增 503；400 由 INVALID_ARGUMENT→INVALID_PARAMETER，
    //     404 由 LOCATION_NOT_FOUND→NOT_FOUND；且 4xx 常返回「空响应体」→ 必须靠状态码兜底文案。
    //   · 新增：hourly（逐时 24h）/ minutely（分钟级降水，仅国内）/ indices（18 项生活指数）。
    //     实测：minutely / indices 都是「请求参数」——必须显式传 minutely=true / indices=true，
    //     否则响应里根本没有 minutely_precip / life_indices 字段（国际城市无 minutely 但仍有 indices）。
    //   · extended 扩展出 aqi_level / aqi_category / aqi_primary / air_pollutants。
    //   · forecast 由 3 天扩到最多 7 天，新增 wind_speed_day / sunrise / sunset。
    //   · city 支持国际城市与英文名（如 Tokyo）；不传 city 时按客户端 IP 自动定位。
    //   · hourly.time 改用 ISO8601（可能带时区偏移，如 2026-02-19T17:00:00+0900）。
    //
    // ⚠ 「人人无法获取数据」的真实成因（实测 + 官方文档）：
    //   · 免费额度是「按访客 IP」计的，响应头 Ratelimit-Policy 含 visitor-rate q=4/w=1s。
    //     双源并行 + 失败重试很容易连发 >4 次/秒 → 429；官方还带 Uapi-Stop-On-Empty: true，
    //     配额耗尽时会硬拦。→ 因此必须：① 降低并发与重试噪音；② 429 时按 Retry-After 让路。
    //   · 官方 SDK 文档明确写着「浏览器端只适合临时 Demo 或同站场景；生产环境建议由自有后端
    //     携带 API Key 转发」，错误码表里有 CORS_FORBIDDEN(403) → 浏览器直连随时可能被拦。
    //     → 因此新增「多端点 + 出错自动切换」：直连为主，被限流/被拦时自动换备用端点。
    //   · 公网 CORS 代理已基本不可用（2026-02 实测：allorigins 522/超时、corsproxy.io 401 要付费 Key、
    //     codetabs 522、thingproxy 502、cors.lol 429、r.jina.ai 502 …）。
    //     把它们当兜底只会白等 10–20s 再失败，故**不内置**任何公共代理，
    //     只保留「用户自配代理」作为可选通道（设置页可填，支持 {{url}}）。
    //   · 真正可靠的兜底是「同样对 CORS 友好的等价数据源」：open-meteo / met.no / wttr.in
    //     实测响应头均为 ACAO:*，浏览器可直连。因此备份顺序为
    //       ① uapis.cn 直连（主）
    //       ② 用户自配 CORS 代理（若填了）
    //       ③ wttr.in —— 按城市名取数，与 Uapi 同为「城市名」语义，最贴近的等价端点
    //       ④ open-meteo geocoding 解析城市名 → open-meteo forecast（ACAO:*，按经纬度）
    //     其中 ③④ 的结果会被归一化成与 Uapi 相同的结构，界面无感。
    /** Uapi 端点表：第一个为主，其余为等价备份（出错自动顺延）。
     *  注：mode:"proxy" 的端点只在用户配置了 CORS 代理时才会真正参与
     *  （fetchEndpoints 会过滤），因此无条件放进表中即可。 */
    function uapiEndpoints(qs, loc) {
      const q = qs.join("&");
      const primary = "https://uapis.cn/api/v1/misc/weather?" + q;
      const list = [{ url: primary, mode: "direct", kind: "uapi" }];
      // 用户自定义 CORS 代理（设置里填了才用）——对国内用户最稳的自备通道。
      list.push({ url: primary, mode: "proxy", kind: "uapi" });
      // 等价备份源：同语义（城市名）、且实测 CORS 友好，可直接被浏览器调用。
      const city = loc && String(loc.city || loc.label || "").trim();
      // wttr.in 对纯 ASCII 城市名（Tokyo/Beijing）最稳；中文名它有时查不到，
      // 但仍作为一次机会保留，失败会自动顺延到后面的地理编码/坐标路径。
      if (city) {
        list.push({ url: "https://wttr.in/" + encodeURIComponent(city) + "?format=j1&lang=zh", mode: "direct", kind: "wttr" });
      }
      if (isNum(loc && loc.lat) && isNum(loc && loc.lon)) {
        list.push({ url: openMeteoUrl(loc.lat, loc.lon, 3), mode: "direct", kind: "om" });
      } else if (city) {
        // 没有经纬度时：先地理编码拿到坐标，再取 open-meteo（两跳，作为最后兜底）。
        list.push({ url: "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(city) + "&count=1&language=zh&format=json", mode: "direct", kind: "geo+om" });
      }
      return list;
    }

    function openMeteoUrl(lat, lon, days) {
      const cur = ["temperature_2m", "relative_humidity_2m", "apparent_temperature", "weather_code", "is_day",
        "wind_speed_10m", "wind_direction_10m", "pressure_msl", "precipitation", "uv_index", "visibility", "cloud_cover"].join(",");
      return "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
        "&current=" + encodeURIComponent(cur) +
        "&hourly=" + encodeURIComponent("temperature_2m,weather_code,precipitation_probability,is_day") +
        "&daily=" + encodeURIComponent("weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max,precipitation_sum") +
        "&timezone=auto&forecast_days=" + (days || 3);
    }

    /** 把 wttr.in 的 j1 结构转成「Uapi 风格」对象，交给统一解析路径。 */
    function wttrAsUapiShape(j, days) {
      if (!j || !Array.isArray(j.current_condition) || !j.current_condition[0]) throw new Error("wttr.in 无数据");
      const c = j.current_condition[0];
      const zh = cjkOrNothing(c.lang_zh && c.lang_zh[0] && c.lang_zh[0].value);
      const desc = zh || enWeatherToZh((c.weatherDesc && c.weatherDesc[0] && c.weatherDesc[0].value) || "—");
      const forecast = (j.weather || []).slice(0, Math.max(1, days || 3)).map((d) => {
        const mid = (d.hourly || []).reduce((best, x) => {
          const hh = Math.floor((Number(x.time) || 0) / 100);
          const sc = Math.abs(hh - 13);
          return !best || sc < best.sc ? { x, sc } : best;
        }, null);
        const mx = mid && mid.x;
        const z2 = cjkOrNothing(mx && mx.lang_zh && mx.lang_zh[0] && mx.lang_zh[0].value);
        const wd = z2 || enWeatherToZh((mx && mx.weatherDesc && mx.weatherDesc[0] && mx.weatherDesc[0].value) || desc);
        const ast = d.astro || {};
        return {
          date: d.date, temp_max: Number(d.maxtempC), temp_min: Number(d.mintempC),
          weather_day: wd, weather_night: wd,
          sunrise: ast.sunrise ? String(ast.sunrise).slice(0, 5) : null,
          sunset: ast.sunset ? String(ast.sunset).slice(0, 5) : null,
          uv_index: Number(d.uvIndex) || null,
          wind_dir_day: c.winddir16Point || null, wind_scale_day: null,
          wind_speed_day: Number(c.windspeedKmph) || null,
          humidity: Number(c.humidity) || null,
          precip: Number(c.precipMM) || 0,
          pop: (d.hourly || []).reduce((m, x) => Math.max(m, Number(x.chanceofrain) || 0), 0) || null,
        };
      });
      const hourly_forecast = [];
      (j.weather || []).forEach((d) => (d.hourly || []).forEach((x) => {
        const hh = two(Math.floor((Number(x.time) || 0) / 100));
        const z3 = cjkOrNothing(x.lang_zh && x.lang_zh[0] && x.lang_zh[0].value);
        hourly_forecast.push({
          time: d.date + "T" + hh + ":00:00",
          temperature: Number(x.tempC),
          weather: z3 || enWeatherToZh((x.weatherDesc && x.weatherDesc[0] && x.weatherDesc[0].value) || desc),
          wind_speed: Number(x.windspeedKmph) || null,
          wind_direction: x.winddir16Point || null,
          pop: Number(x.chanceofrain) || null,
          humidity: Number(x.humidity) || null,
          precip: Number(x.precipMM) || null,
        });
      }));
      return {
        city: loc_cityName(j, c),
        weather: desc,
        temperature: Number(c.temp_C),
        wind_direction: c.winddir16Point || "",
        wind_power: c.winddirDegree ? "" : "",
        humidity: Number(c.humidity),
        report_time: String(c.observation_time || ""),
        temp_max: forecast[0] ? forecast[0].temp_max : null,
        temp_min: forecast[0] ? forecast[0].temp_min : null,
        feels_like: Number(c.FeelsLikeC),
        visibility: Number(c.visibility) || null,
        pressure: Number(c.pressure) || null,
        uv: Number(c.uvIndex) || null,
        precipitation: Number(c.precipMM) || null,
        cloud: Number(c.cloudcover) || null,
        forecast, hourly_forecast,
        __compatSource: "wttr.in",
      };
    }
    function loc_cityName(j, c) {
      const a = j && j.nearest_area && j.nearest_area[0];
      const v = a && a.areaName && a.areaName[0] && a.areaName[0].value;
      return v || "当前位置";
    }

    /** 把 open-meteo 的 forecast 响应转成「Uapi 风格」对象（供统一解析路径复用）。 */
    function openMeteoAsUapiShape(om, days, name) {
      if (!om || !om.current) throw new Error("Open-Meteo 无数据");
      const c = om.current;
      const info = wmoInfo(c.weather_code, c.is_day !== 0);
      const forecast = [];
      if (om.daily && Array.isArray(om.daily.time)) {
        const D = om.daily;
        D.time.slice(0, Math.max(1, days || 3)).forEach((t, i) => {
          forecast.push({
            date: t,
            temp_max: D.temperature_2m_max ? D.temperature_2m_max[i] : null,
            temp_min: D.temperature_2m_min ? D.temperature_2m_min[i] : null,
            weather_day: wmoInfo(D.weather_code[i], true).label,
            weather_night: wmoInfo(D.weather_code[i], false).label,
            sunrise: D.sunrise && D.sunrise[i] ? String(D.sunrise[i]).slice(11, 16) : null,
            sunset: D.sunset && D.sunset[i] ? String(D.sunset[i]).slice(11, 16) : null,
            uv_index: D.uv_index_max ? D.uv_index_max[i] : null,
            precip: D.precipitation_sum ? D.precipitation_sum[i] : null,
            pop: D.precipitation_probability_max ? D.precipitation_probability_max[i] : null,
          });
        });
      }
      const hourly_forecast = [];
      if (om.hourly && Array.isArray(om.hourly.time)) {
        const H = om.hourly;
        H.time.forEach((t, i) => {
          hourly_forecast.push({
            time: t,
            temperature: H.temperature_2m ? H.temperature_2m[i] : null,
            weather: wmoInfo(H.weather_code ? H.weather_code[i] : 0, H.is_day ? H.is_day[i] !== 0 : true).label,
            pop: H.precipitation_probability ? H.precipitation_probability[i] : null,
          });
        });
      }
      return {
        city: name || "当前位置",
        weather: info.label,
        weather_icon: null,       // open-meteo 用 WMO 码，无和风码；交由文本回退处理
        temperature: c.temperature_2m,
        wind_direction: degToCompass(c.wind_direction_10m),
        wind_power: "",
        wind_speed: isNum(c.wind_speed_10m) ? Number(c.wind_speed_10m) : null,
        humidity: c.relative_humidity_2m,
        report_time: String(c.time || ""),
        temp_max: forecast[0] ? forecast[0].temp_max : null,
        temp_min: forecast[0] ? forecast[0].temp_min : null,
        feels_like: c.apparent_temperature,
        visibility: isNum(c.visibility) ? c.visibility / 1000 : null,
        pressure: c.pressure_msl,
        uv: c.uv_index,
        precipitation: c.precipitation,
        cloud: c.cloud_cover,
        forecast, hourly_forecast,
        __compatSource: "open-meteo",
      };
    }

    function fetchUapi(loc, s, days) {
      const city = String(loc.label || loc.city || "").trim();
      const adcode = String(loc.adcode || "").trim();
      // 新版允许两者都不传 → 按客户端 IP 自动定位；因此「没有城市名」不再是错误。
      const qs = [];
      if (adcode && /^\d{6}$/.test(adcode)) qs.push("adcode=" + encodeURIComponent(adcode));
      else if (city) qs.push("city=" + encodeURIComponent(city));
      qs.push("extended=true", "forecast=true", "hourly=true");
      // minutely（分钟级降水）实测仅国内城市有数据，但参数本身对国际城市无害（返回空/不返回）。
      // indices（18 项生活指数）同理。官方文档将两者列为可选模块，这里按需求一并开启。
      qs.push("minutely=true", "indices=true");
      qs.push("lang=zh");

      const eps = uapiEndpoints(qs, loc);
      // 每个端点返回的结构可能不同，transform 统一归一成「Uapi 风格」对象，
      // 使下面的解析逻辑完全无感（主源与备份源走同一条解析路径）。
      return fetchEndpoints(eps, s, {
        timeout: 11000, label: "Uapi",
        transform: (raw, ep) => {
          const kind = (ep && ep.kind) || "uapi";
          if (kind === "uapi") return raw;
          if (kind === "wttr") return wttrAsUapiShape(raw, days);
          if (kind === "om") return openMeteoAsUapiShape(raw, days, (loc && loc.label) || "");
          if (kind === "geo" || kind === "geo+om") {
            // 地理编码结果 → 直接返回坐标，由调用方补一次 open-meteo 请求
            const hit = raw && Array.isArray(raw.results) && raw.results[0] ? raw.results[0] : null;
            if (!hit) throw errWith(new Error("地理编码未找到该城市"), { fatal: true });
            return { __needOpenMeteo: { lat: hit.latitude, lon: hit.longitude, name: hit.name || (loc && loc.label) || "" } };
          }
          return raw;
        },
      }).then((first) => {
        // geo 端点命中时还差一次 open-meteo 取数（两跳兜底）
        if (first && first.__needOpenMeteo) {
          const g = first.__needOpenMeteo;
          // 兜底跳：同样收紧到 9s，别让最后一跳再晾用户 11s。
          return fetchJson(openMeteoUrl(g.lat, g.lon, days), { timeout: 9000, label: "Uapi·备份源" })
            .then((om) => openMeteoAsUapiShape(om, days, g.name));
        }
        return first;
      }).then((res) => {
        const j = res;
        if (!j || typeof j !== "object" || Array.isArray(j)) throw new Error("Uapi 无数据");
        // fetchJson 已拦截标准业务错误码；这里再兜一层非常规 code。
        if (j.code != null && !["ok", 0, 200, "0", "200"].includes(j.code)) {
          throw new Error(j.message || ("Uapi 返回异常（code=" + j.code + "）"));
        }
        // 连实时温度都没有 → 视为无效响应，避免界面出现一片「—」。
        if (!isNum(j.temperature) && !Array.isArray(j.forecast)) {
          throw new Error(j.message || "Uapi 未返回天气数据（可能是该城市无数据）");
        }

        const forecast = Array.isArray(j.forecast) ? j.forecast : [];
        const hourlyRaw = Array.isArray(j.hourly_forecast) ? j.hourly_forecast : [];
        const f0 = forecast[0] || null;
        const h0 = hourlyRaw[0] || {};

        // 昼夜：优先用今日日出日落区间，取不到再退回 6–19 点经验值。
        const isDay = (() => {
          const srRaw = f0 && (f0.sunrise || f0.sunRise);
          const ssRaw = f0 && (f0.sunset || f0.sunSet);
          if (srRaw && ssRaw) {
            const now = new Date();
            const sr = String(srRaw).split(":"), ss = String(ssRaw).split(":");
            const cur = now.getHours() * 60 + now.getMinutes();
            const a = +sr[0] * 60 + (+sr[1] || 0), b = +ss[0] * 60 + (+ss[1] || 0);
            if (Number.isFinite(a) && Number.isFinite(b)) return cur >= a && cur <= b;
          }
          const hh = new Date().getHours();
          return hh >= 6 && hh < 19;
        })();

        /**
         * 图标回退：weather_icon（实测真实字段，和风风格码）→ weather_code（文档提及，实测未返回，
         * 兼容保留）→ 中文文本（纯文本兜底）。
         * 说明：实测 uapis.cn 多城市返回里只有 weather_icon，hourly_forecast 两项都没有，
         * 因此顺序必须让 weather_icon 优先，否则等于每次都走文本兜底。
         */
        function pickInfo(iconLike, codeLike, textLike, day) {
          const i = iconLike != null && iconLike !== "" ? String(iconLike) : "";
          if (i && QWEATHER_MAP[i]) return qweatherInfo(i, day);
          const c = codeLike != null && codeLike !== "" ? String(codeLike) : "";
          if (c && QWEATHER_MAP[c]) return qweatherInfo(c, day);
          if (textLike) return cnInfo(textLike, day);
          return { label: day === false ? "夜间" : "未知", icon: day === false ? "🌙" : "🌥️" };
        }

        const info = pickInfo(j.weather_icon, j.weather_code, j.weather, isDay);

        // 风速：实测 hourly[0].wind_speed 最稳；文档示例的 forecast[].wind_speed_day 实测未返回，
        // 仍保留为回退以兼容后续字段恢复。
        const windKmh = [
          h0.wind_speed, f0 && f0.wind_speed_day, j.wind_speed,
          (forecast.find((f) => isNum(f && f.wind_speed_day)) || {}).wind_speed_day,
        ].map((v) => (isNum(v) ? Number(v) : null)).find((v) => v != null);

        const hourly = hourlyRaw.slice(0, Math.max(24, days * 6)).map((x, i) => {
          const inf = pickInfo(x.weather_icon, x.weather_code, x.weather, true);
          // 新版为 ISO8601（可能带时区偏移），改用 parseIso 才不会错位。
          const t = parseIso(x.time);
          return {
            time: i === 0 ? "现在" : (isNaN(t) ? "" : hhmm(t)),
            icon: inf.icon, desc: x.weather || inf.label,
            tempC: isNum(x.temperature) ? Number(x.temperature) : null,
            pop: isNum(x.pop) ? Number(x.pop) : null,
            windKmh: isNum(x.wind_speed) ? Number(x.wind_speed) : null,
            windDirText: x.wind_direction || null,
            windScale: x.wind_scale || null,
            humidity: isNum(x.humidity) ? Number(x.humidity) : null,
            feelsC: isNum(x.feels_like) ? Number(x.feels_like) : null,
            precipMm: isNum(x.precip) ? Number(x.precip) : null,
            visibilityKm: isNum(x.visibility) ? Number(x.visibility) : null,
          };
        });

        const daily = forecast.slice(0, days).map((f) => dailyRow(
          f.date, pickInfo(f.weather_icon, f.weather_code, f.weather_day, true), f.temp_max, f.temp_min, {
            pop: isNum(f.pop) ? Number(f.pop) : null,
            sunrise: f.sunrise ? String(f.sunrise).slice(0, 5) : null,
            sunset: f.sunset ? String(f.sunset).slice(0, 5) : null,
            uvMax: isNum(f.uv_index) ? Number(f.uv_index) : null,
            descNight: f.weather_night || null,
            windDay: f.wind_dir_day || null, windScaleDay: f.wind_scale_day || null,
            windNight: f.wind_dir_night || null, windScaleNight: f.wind_scale_night || null,
            windSpeedDay: isNum(f.wind_speed_day) ? Number(f.wind_speed_day) : null,
            precipSum: isNum(f.precip) ? Number(f.precip) : null,
            humidity: isNum(f.humidity) ? Number(f.humidity) : null,
            visibilityKm: isNum(f.visibility) ? Number(f.visibility) : null,
            week: f.week || null,
          }));

        // 预警：新版字段为 title/type/level/text/publish_time/publisher/guidance。
        const rawAlerts = j.alerts || j.warning || j.alert || [];
        const alerts = (Array.isArray(rawAlerts) ? rawAlerts : [rawAlerts]).filter(Boolean).map((a) => ({
          title: a.title || a.name || a.type || "气象预警",
          type: a.type || "", level: a.level || a.severity || "",
          text: a.text || a.description || a.detail || "",
          publishTime: a.publish_time || a.publishTime || "",
          publisher: a.publisher || "",
          guidance: Array.isArray(a.guidance) ? a.guidance.filter(Boolean) : [],
        }));

        // 分钟级降水（仅国内城市，新版新增）：取摘要，界面用于「短临」提示。
        const mp = j.minutely_precip || j.minutely || null;
        const minutely = mp && typeof mp === "object" && (mp.summary || Array.isArray(mp.data))
          ? {
            summary: String(mp.summary || ""),
            updateTime: normalizeReportTime(mp.update_time || ""),
            points: Array.isArray(mp.data) ? mp.data.slice(0, 60) : [],
          } : null;

        // 18 项生活指数（新版新增，indices=true 时才返回；当前未默认开启，先做兼容取值）。
        const lifeIndices = (j.life_indices && typeof j.life_indices === "object" && !Array.isArray(j.life_indices))
          ? Object.keys(j.life_indices).reduce((acc, k) => {
            const v = j.life_indices[k];
            if (v && typeof v === "object") {
              acc[k] = {
                level: String(v.level || ""), brief: String(v.brief || ""),
                advice: String(v.advice || ""),
              };
            }
            return acc;
          }, {}) : null;

        // 城市显示名：新版 IP 自动定位时会返回 district，拼上更精确。
        const cityName = [j.city, j.district].filter(Boolean).join("·") ||
          String(j.province || city || "自动定位");

        return {
          ok: true, source: "uapi",
          // 新版可能是绝对时间 "2026-02-19 15:25:58"，旧版是 "8 分钟前发布"，
          // 统一归一化，避免页脚「报时」出现一长串时间戳。
          reportTime: normalizeReportTime(j.report_time),
          placeName: cityName,
          minutely, lifeIndices,
          current: {
            tempC: isNum(j.temperature) ? Number(j.temperature) : null,
            feelsC: isNum(j.feels_like) ? Number(j.feels_like) : null,
            humidity: isNum(j.humidity) ? Number(j.humidity) : null,
            windKmh,
            windDirText: j.wind_direction || h0.wind_direction || "",
            windScale: j.wind_power || h0.wind_scale || "",
            pressureHpa: isNum(j.pressure) ? Number(j.pressure) : null,
            precipMm: isNum(j.precipitation) ? Number(j.precipitation) : null,
            uvIndex: isNum(j.uv) ? Number(j.uv) : null,
            visibilityKm: isNum(j.visibility) ? Number(j.visibility) : null,
            cloudPct: isNum(j.cloud) ? Number(j.cloud) : null,
            aqi: isNum(j.aqi) ? Number(j.aqi) : null,
            aqiCategory: j.aqi_category || (aqiGrade(j.aqi) ? aqiGrade(j.aqi).text : null),
            aqiLevel: isNum(j.aqi_level) ? Number(j.aqi_level) : null,
            aqiPrimary: j.aqi_primary || null, pollutants: j.air_pollutants || null,
            tempMaxC: isNum(j.temp_max) ? Number(j.temp_max) : null,
            tempMinC: isNum(j.temp_min) ? Number(j.temp_min) : null,
            icon: info.icon, desc: j.weather || info.label, isDay,
          },
          hourly, daily, alerts,
        };
      });
    }

    /* ── 5.3 wttr.in ────────────────────────────────────────────────────── */
    /** wttr 的 lang_zh 有时回显英文；只有真含中日韩才当中文用。 */
    function cjkOrNothing(s) { return /[㐀-鿿぀-ヿ]/.test(String(s || "")) ? String(s) : null; }
    function fetchWttr(loc, s, days) {
      const url = "https://wttr.in/" + loc.lat + "," + loc.lon + "?format=j1&lang=zh";
      return fetchSource(url, s, { timeout: 14000, label: "wttr.in" }).then((j) => {
        if (!j || !Array.isArray(j.current_condition) || !j.current_condition[0]) throw new Error("wttr.in 无数据");
        const c = j.current_condition[0];
        const iconUrl = (c.weatherIconUrl && c.weatherIconUrl[0] && c.weatherIconUrl[0].value) || "";
        const night = iconUrl.indexOf("night") >= 0;
        const zh = cjkOrNothing(c.lang_zh && c.lang_zh[0] && c.lang_zh[0].value);
        const en = c.weatherDesc && c.weatherDesc[0] && c.weatherDesc[0].value;
        const info = zh ? cnInfo(zh, !night) : wttrInfo(en, c.weatherCode, night);

        const now = Date.now();
        const flat = [];
        (j.weather || []).forEach((d) => (d.hourly || []).forEach((x) => {
          const hh = two(Math.floor((Number(x.time) || 0) / 100));
          flat.push({ d, x, t: parseLocal(d.date + " " + hh + ":00") });
        }));
        const hourly = flat.filter((it) => !isNaN(it.t) && it.t.getTime() >= now - 3600000).slice(0, 24)
          .map((it, i) => {
            const x = it.x;
            const u = (x.weatherIconUrl && x.weatherIconUrl[0] && x.weatherIconUrl[0].value) || "";
            const z = cjkOrNothing(x.lang_zh && x.lang_zh[0] && x.lang_zh[0].value);
            const e = x.weatherDesc && x.weatherDesc[0] && x.weatherDesc[0].value;
            const inf = z ? cnInfo(z, u.indexOf("night") < 0) : wttrInfo(e, x.weatherCode, u.indexOf("night") >= 0);
            return {
              time: i === 0 ? "现在" : hhmm(it.t), icon: inf.icon, desc: inf.label,
              tempC: x.tempC, pop: isNum(x.chanceofrain) ? Number(x.chanceofrain) : null,
            };
          });

        const daily = (j.weather || []).slice(0, days).map((d) => {
          const mid = (d.hourly || []).reduce((best, x) => {
            const hh = Math.floor((Number(x.time) || 0) / 100);
            const score = Math.abs(hh - 13);
            return !best || score < best.score ? { x, score } : best;
          }, null);
          const mx = mid && mid.x;
          const u = mx && mx.weatherIconUrl && mx.weatherIconUrl[0] && mx.weatherIconUrl[0].value || "";
          const z = cjkOrNothing(mx && mx.lang_zh && mx.lang_zh[0] && mx.lang_zh[0].value);
          const inf = z ? cnInfo(z, u.indexOf("night") < 0)
            : wttrInfo(mx && mx.weatherDesc && mx.weatherDesc[0] && mx.weatherDesc[0].value, mx && mx.weatherCode, u.indexOf("night") >= 0);
          const ast = d.astro || {};
          const pop = (d.hourly || []).reduce((m, x) => Math.max(m, Number(x.chanceofrain) || 0), 0);
          return dailyRow(d.date, inf, d.maxtempC, d.mintempC, {
            pop: pop || null,
            sunrise: ast.sunrise ? String(ast.sunrise).slice(0, 5) : null,
            sunset: ast.sunset ? String(ast.sunset).slice(0, 5) : null,
            uvMax: d.uvIndex,
          });
        });

        return {
          ok: true, source: "wttr", reportTime: String(c.observation_time || ""),
          current: {
            tempC: Number(c.temp_C), feelsC: Number(c.FeelsLikeC), humidity: Number(c.humidity),
            windKmh: Number(c.windspeedKmph), windDirText: c.winddir16Point ? degToCompass(windDirToDeg(c.winddir16Point)) : "",
            windScale: null, pressureHpa: Number(c.pressure), precipMm: Number(c.precipMM),
            uvIndex: Number(c.uvIndex), visibilityKm: Number(c.visibility), cloudPct: Number(c.cloudcover),
            icon: info.icon, desc: info.label, isDay: !night,
          },
          hourly, daily, alerts: [],
        };
      });
    }

    /* ── 5.4 彩云天气（需 Token） ───────────────────────────────────────── */
    function fetchCaiyun(loc, s, days) {
      const token = (s.keys && s.keys.caiyun) || "";
      if (!token) throw new Error("未配置彩云 Token");
      // 彩云路径顺序为「经度,纬度」
      const url = "https://api.caiyunapp.com/v2.6/" + encodeURIComponent(token) + "/" +
        loc.lon + "," + loc.lat + "/weather.json?hourly=24&alert=true&aso=true";
      return fetchSource(url, s, { timeout: 10000, label: "彩云天气" }).then((j) => {
        if (!j || j.status !== "ok" || !j.result) throw new Error((j && (j.error || j.message)) || "彩云无数据");
        const r = j.result, rt = r.realtime || {}, D = r.daily || {}, H = r.hourly || {};
        const sky = rt.skycon || "CLEAR_DAY";
        const info = caiyunInfo(sky);
        const hourly = [];
        if (Array.isArray(H.temperature)) {
          const S = H.skycon || [], P = H.precipitation || [];
          for (let i = 0; i < Math.min(24, H.temperature.length); i++) {
            const inf = caiyunInfo((S[i] && S[i].value) || sky);
            const t = H.temperature[i] && H.temperature[i].datetime ? parseLocal(H.temperature[i].datetime) : null;
            hourly.push({
              time: i === 0 ? "现在" : (t && !isNaN(t) ? hhmm(t) : ""),
              icon: inf.icon, desc: inf.label, tempC: H.temperature[i].value,
              pop: P[i] && P[i].probability != null ? Math.round(P[i].probability * 100) : null,
            });
          }
        }
        const daily = [];
        if (Array.isArray(D.temperature)) {
          D.temperature.slice(0, days).forEach((t, i) => {
            const inf = caiyunInfo((D.skycon && D.skycon[i] && D.skycon[i].value) || sky);
            const ast = (D.astro && D.astro[i]) || {};
            const uv = D.life_index && D.life_index.ultraviolet && D.life_index.ultraviolet[i];
            const pc = D.precipitation && D.precipitation[i];
            daily.push(dailyRow(t.date, inf, t.max, t.min, {
              pop: pc && pc.probability != null ? Math.round(pc.probability * 100) : null,
              sunrise: ast.sunrise ? String(ast.sunrise.value || ast.sunrise).slice(0, 5) : null,
              sunset: ast.sunset ? String(ast.sunset.value || ast.sunset).slice(0, 5) : null,
              uvMax: uv ? uv.index : null,
            }));
          });
        }
        const warn = r.warning && Array.isArray(r.warning.warning) ? r.warning.warning : [];
        const aq = rt.aqi && (rt.aqi.city || rt.aqi) || null;
        return {
          ok: true, source: "caiyun", reportTime: rt.server_x ? hhmm(new Date(rt.server_x * 1000)) : "",
          current: {
            tempC: rt.temperature, feelsC: rt.apparent_temperature,
            humidity: isNum(rt.humidity) ? rt.humidity * 100 : null,
            windKmh: rt.wind && rt.wind.speed, windDirText: rt.wind ? degToCompass(rt.wind.direction) : "",
            windScale: null, pressureHpa: isNum(rt.pressure) ? rt.pressure / 100 : null,
            precipMm: rt.precipitation && rt.precipitation.local && rt.precipitation.local.intensity,
            uvIndex: D.life_index && D.life_index.ultraviolet && D.life_index.ultraviolet[0] && D.life_index.ultraviolet[0].index,
            visibilityKm: isNum(rt.visibility) ? (rt.visibility > 200 ? rt.visibility / 1000 : rt.visibility) : null,
            cloudPct: isNum(rt.cloudrate) ? rt.cloudrate * 100 : null,
            aqi: aq && aq.aqi, aqiCategory: aq && (aq.category || (aq.china && aq.china.category)) || null,
            icon: info.icon, desc: info.label, isDay: String(sky).indexOf("_NIGHT") < 0,
          },
          hourly, daily,
          alerts: warn.map((a) => ({
            title: a.title || a.text || "气象预警", type: a.type_name || "",
            level: a.level || a.severity || "", text: a.text || a.description || "",
          })),
        };
      });
    }

    /* ── 5.5 OpenWeatherMap（需 Key） ───────────────────────────────────── */
    function fetchOpenWeather(loc, s, days) {
      const key = (s.keys && s.keys.openWeather) || "";
      if (!key) throw new Error("未配置 OpenWeatherMap Key");
      const q = "lat=" + loc.lat + "&lon=" + loc.lon + "&appid=" + encodeURIComponent(key) + "&units=metric&lang=zh_cn";
      return Promise.all([
        fetchSource("https://api.openweathermap.org/data/2.5/weather?" + q, s, { timeout: 9000, label: "OpenWeather" }),
        fetchSource("https://api.openweathermap.org/data/2.5/forecast?" + q + "&cnt=48", s,
          { timeout: 11000, label: "OpenWeather 预报" }).catch(() => null),
      ]).then((arr) => {
        const w = arr[0], f = arr[1];
        if (!w || !Array.isArray(w.weather)) throw new Error((w && (w.message || w.cod)) || "OpenWeatherMap 无数据");
        const sys = w.sys || {};
        const ts = Math.floor(Date.now() / 1000);
        const isDay = !(sys.sunrise && sys.sunset && (ts < sys.sunrise || ts > sys.sunset));
        const info = owmInfo(w.weather[0].id, isDay);
        const hourly = ((f && f.list) || []).slice(0, Math.max(24, days * 6)).map((it, i) => {
          const d = new Date(it.dt * 1000);
          const inf = owmInfo(it.weather && it.weather[0] && it.weather[0].id, true);
          return {
            time: i === 0 ? "现在" : hhmm(d), icon: inf.icon,
            desc: (it.weather && it.weather[0] && it.weather[0].description) || inf.label,
            tempC: it.main && it.main.temp, pop: it.pop != null ? Math.round(it.pop * 100) : null,
          };
        });
        const daily = [];
        if (f && Array.isArray(f.list)) {
          const groups = new Map();
          f.list.forEach((it) => {
            const d = new Date(it.dt * 1000);
            const k = d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
            if (!groups.has(k)) groups.set(k, []);
            groups.get(k).push(it);
          });
          Array.from(groups.keys()).slice(0, days).forEach((k) => {
            const arr2 = groups.get(k);
            const mx = Math.max.apply(null, arr2.map((x) => x.main.temp));
            const mn = Math.min.apply(null, arr2.map((x) => x.main.temp));
            const mid = arr2.reduce((a, b) => {
              const ha = new Date(a.dt * 1000).getHours(), hb = new Date(b.dt * 1000).getHours();
              return Math.abs(ha - 13) <= Math.abs(hb - 13) ? a : b;
            });
            const inf = owmInfo(mid.weather && mid.weather[0] && mid.weather[0].id, true);
            daily.push(dailyRow(new Date(arr2[0].dt * 1000), inf, mx, mn, {
              pop: Math.round(Math.max.apply(null, arr2.map((x) => (x.pop || 0) * 100))),
              sunrise: sys.sunrise ? hhmm(new Date(sys.sunrise * 1000)) : null,
              sunset: sys.sunset ? hhmm(new Date(sys.sunset * 1000)) : null,
            }));
          });
        }
        return {
          ok: true, source: "openWeather", reportTime: hhmm(new Date((w.dt || 0) * 1000)),
          current: {
            tempC: w.main && w.main.temp, feelsC: w.main && w.main.feels_like, humidity: w.main && w.main.humidity,
            windKmh: isNum(w.wind && w.wind.speed) ? w.wind.speed * 3.6 : null,
            windDirText: w.wind ? degToCompass(w.wind.deg) : "", windScale: null,
            pressureHpa: w.main && w.main.pressure,
            precipMm: w.rain ? (w.rain["1h"] != null ? w.rain["1h"] : w.rain["3h"]) : null,
            uvIndex: w.main && w.main.uvi,
            visibilityKm: isNum(w.visibility) ? w.visibility / 1000 : null,
            cloudPct: w.clouds && w.clouds.all,
            icon: info.icon, desc: w.weather[0].description || info.label, isDay,
          },
          hourly, daily, alerts: [],
        };
      });
    }

    /* ── 5.6 墨迹天气（网页爬虫，无需 Key） ──────────────────────────────
     * 数据来源：https://tianqi.moji.com/ 真实网页。
     *   · 实况 + 当天：首页 `/`（按客户端 IP 自动定位，不传城市 → 与「不支持地区切换」一致）
     *     或 `/weather/china/{省拼音}/{市拼音}`。
     *   · 多日预报：`/forecast7|10|15/china/{省拼音}/{市拼音}` 的 `wea_list_seven` 列表。
     * 页面结构（实测 2026-10）：
     *   实况  <div class="wea_weather clearfix"><em>19</em>…<b>晴</b><strong class="info_uptime">
     *   湿度  <div class="wea_about clearfix"><span>湿度 64%</span><em>东南风1级</em>
     *   AQI   <span class="level level_3"><img alt="101 轻度污染"></span>
     *   预报  <div class="wea_list clearfix wea_list_seven"><ul><li>…<b>25°</b><strong>13°</strong>
     *   指数  <div id="live_index">…<dl><dt>弱</dt><dd>紫外线</dd></dl>
     * 重要限制（实测）：
     *   ① 站点无任何 CORS 响应头 → 浏览器必须经「CORS 代理」读取，否则抛 CORS 错误。
     *   ② 前置 CloudWAF：短时间多次请求会返回 **HTTP 418 + 「访问被拦截！」** 页面，
     *      封禁约 5–10 分钟。因此这里做「全局限速 + 单飞」：同一时刻只发 1 个请求，
     *      两次墨迹请求之间至少间隔 MOJI_MIN_GAP_MS，且失败后进入较长冷却。
     */
    const MOJI_BASE = "https://tianqi.moji.com";
    const MOJI_MIN_GAP_MS = 12000;        // 两次墨迹请求的最小间隔（实测 ~8s 安全，留余量）
    let mojiLastAt = 0;                   // 上次请求时间戳
    let mojiChain = Promise.resolve();    // 单飞链：串行化所有墨迹请求

    /** 串行 + 限速地执行一个墨迹请求任务（避免并发触发 CloudWAF）。 */
    function mojiSerial(task) {
      const run = mojiChain.then(() => {
        const wait = Math.max(0, mojiLastAt + MOJI_MIN_GAP_MS - Date.now());
        return new Promise((r) => setTimeout(r, wait)).then(() => {
          mojiLastAt = Date.now();
          return task();
        });
      });
      // 无论成败都让链条继续（失败也返回一个已解决的 promise，避免后续全部 reject）
      mojiChain = run.then(() => {}, () => {});
      return run;
    }

    function stripTags(s) {
      return String(s == null ? "" : s).replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
    }

    /** 解析墨迹「实况 + 当天」页，返回 {current, today} 形态的中间结果。 */
    function parseMojiCurrent(html) {
      const wm = html.match(/class="wea_weather clearfix">([\s\S]*?)<\/div>/);
      if (!wm) throw new Error("墨迹页面结构变化：未找到实况区块");
      const w = wm[1];
      const t = w.match(/<em>\s*(-?\d+(?:\.\d+)?)\s*<\/em>/);
      const cond = w.match(/<b>\s*([^<]+?)\s*<\/b>/);
      const up = w.match(/class="info_uptime">\s*([^<]+?)\s*</);
      const c = {
        tempC: t ? Number(t[1]) : null,
        desc: cond ? stripTags(cond[1]) : "",
        reportTime: up ? stripTags(up[1]) : "",
        humidity: null, windDirText: "", windScale: "", aqi: null, aqiCategory: "", tips: "",
      };
      const am = html.match(/class="wea_about clearfix">([\s\S]*?)<\/div>/);
      if (am) {
        const hm = am[1].match(/湿度\s*(\d+)\s*%/);
        if (hm) c.humidity = Number(hm[1]);
        const wd = am[1].match(/<em>\s*([^<]+?)\s*<\/em>/);
        if (wd) {
          const txt = stripTags(wd[1]);
          const lm = txt.match(/(\d+)\s*级/);
          if (lm) c.windScale = lm[1] + "级";
          c.windDirText = txt.replace(/\d+\s*级/, "").trim();
        }
      }
      const tm = html.match(/class="wea_tips clearfix">([\s\S]*?)<\/div>/);
      if (tm) {
        const em = tm[1].match(/<em>\s*([^<]+?)\s*<\/em>/);
        if (em) c.tips = stripTags(em[1]);
      }
      const aq = html.match(/class="wea_alert clearfix">([\s\S]*?)<\/div>\s*<\/div>/);
      if (aq) {
        const em = aq[1].match(/<em>\s*([^<]+?)\s*<\/em>/);
        if (em) {
          const txt = stripTags(em[1]);
          const v = txt.match(/(\d+)/);
          if (v) c.aqi = Number(v[1]);
          c.aqiCategory = txt.replace(/\d+/, "").trim();
        }
      }
      // 当天预报（首页 days 列表）：第一个 <li> 为「今天」，另有温度区间/风/AQI
      const dm = html.match(/<ul class="days clearfix">([\s\S]*?)<\/ul>/);
      let today = null;
      if (dm) {
        const weaAlt = (dm[1].match(/alt="([^"]*)"/) || [])[1];
        const rangeM = dm[1].match(/(-?\d+(?:\.\d+)?)°\s*\/\s*(-?\d+(?:\.\d+)?)°/);
        if (rangeM) {
          today = { descDay: weaAlt || c.desc, tempMinC: Number(rangeM[1]), tempMaxC: Number(rangeM[2]) };
        }
      }
      return { c, today };
    }

    /** 解析 `/forecastN/` 页的多日列表。 */
    function parseMojiForecast(html, days) {
      const out = [];
      const anchor = html.indexOf("wea_list");
      if (anchor < 0) return out;
      const ulOpen = html.indexOf("<ul", anchor);
      const ulClose = html.indexOf("</ul>", ulOpen);
      if (ulOpen < 0 || ulClose < 0) return out;
      const inner = html.substring(ulOpen + 4, ulClose);
      const lis = inner.match(/<li[\s\S]*?<\/li>/g) || [];
      for (const li of lis) {
        if (out.length >= days) break;
        const b = li.match(/<b>\s*(-?\d+(?:\.\d+)?)°?\s*<\/b>/);
        const st = li.match(/<strong>\s*(-?\d+(?:\.\d+)?)°?\s*<\/strong>/);
        if (!b || !st) continue;
        const weas = (li.match(/<span class="wea">\s*([^<]+?)\s*<\/span>/g) || []).map(stripTags);
        const weeks = (li.match(/<span class="week">\s*([^<]+?)\s*<\/span>/g) || []).map(stripTags);
        out.push({
          label: weeks[0] || "", dateText: weeks[1] || "",
          descDay: weas[0] || "", descNight: weas[1] || "",
          tempMaxC: Number(b[1]),   // <b> = 最高温
          tempMinC: Number(st[1]),  // <strong> = 最低温
        });
      }
      return out;
    }

    /** 解析生活指数（18+ 项，页面直接给出中文名与等级）。 */
    function parseMojiIndices(html) {
      const li = html.match(/id="live_index"([\s\S]*?)<\/ul>/);
      if (!li) return null;
      const items = (li[1].match(/<dl>\s*<dt>([^<]*)<\/dt>\s*<dd>([^<]*)<\/dd>\s*<\/dl>/g) || []);
      if (!items.length) return null;
      const acc = {};
      items.forEach((s) => {
        const m = s.match(/<dt>([^<]*)<\/dt>\s*<dd>([^<]*)<\/dd>/);
        if (!m) return;
        const level = stripTags(m[1]);
        const name = stripTags(m[2]);
        if (name) acc[name] = { level, brief: "", advice: "" };
      });
      return Object.keys(acc).length ? acc : null;
    }

    /** "10/11" → Date（补当前年份；跨年时顺延）。 */
    function mojiDateFromText(txt, base) {
      const m = String(txt || "").match(/^(\d{1,2})\/(\d{1,2})$/);
      if (!m) return null;
      const now = base || new Date();
      let d = new Date(now.getFullYear(), Number(m[1]) - 1, Number(m[2]));
      // 若解析出的日期比「今天」早了半年以上，说明跨年（例如 12 月看 1 月）
      if (d.getTime() - now.getTime() < -180 * 86400000) d = new Date(now.getFullYear() + 1, Number(m[1]) - 1, Number(m[2]));
      return d;
    }
    /** 星期几中文 → 与今天最近的该星期（用于列表没给日期时的兜底）。 */
    const MOJI_WEEK_IDX = { 日: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6 };
    function mojiDateFromWeek(label, base) {
      const m = String(label || "").match(/周([日一二三四五六])/);
      if (!m) return null;
      const now = base || new Date();
      const target = MOJI_WEEK_IDX[m[1]];
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const delta = (target - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + delta);
      return d;
    }

    function fetchMoji(loc, s, days) {
      const want = Math.max(1, Math.min(15, Number(days) || 3));
      const fetchOpts = { timeout: 15000, referer: MOJI_BASE + "/" };

      // 城市路径：有「省/市」拼音时直接构造；否则先用 /api/iplocate 换出「按 IP」的
      // 省/市 slug —— 这样即使首页只有「今天」，也能拿到多日预报，且依然不需要用户切地区。
      const prov0 = String((loc && (loc.provinceSlug || loc.provSlug)) || "").trim();
      const city0 = String((loc && (loc.citySlug || loc.slug)) || "").trim();
      const hasSlug0 = /^[a-z0-9-]+$/i.test(prov0) && /^[a-z0-9-]+$/i.test(city0);

      const resolveSlug = hasSlug0
        ? Promise.resolve({ prov: prov0, city: city0 })
        : mojiSerial(() => fetchHtml(MOJI_BASE + "/api/iplocate", s, {
            timeout: 10000, label: "墨迹天气·定位", referer: MOJI_BASE + "/", minLength: 1,
          })).then((txt) => {
            // 形如 "/weather/china/sichuan/pidu-district"
            const m = String(txt).trim().match(/\/weather\/china\/([a-z0-9-]+)\/([a-z0-9-]+)/i);
            return m ? { prov: m[1], city: m[2] } : { prov: "", city: "" };
          }).catch(() => ({ prov: "", city: "" }));   // 定位失败 → 退回首页（仅当天）

      return resolveSlug.then((slug) => {
        const hasSlug = !!(slug.prov && slug.city);
        const curPath = hasSlug ? ("/weather/china/" + slug.prov + "/" + slug.city) : "/";
        const curUrl = MOJI_BASE + curPath;

        return mojiSerial(() => fetchHtml(curUrl, s, Object.assign({ label: "墨迹天气" }, fetchOpts)))
          .then((html) => {
            const { c, today } = parseMojiCurrent(html);
            if (!isNum(c.tempC)) throw errWith(new Error("墨迹天气：未解析到实时温度"), {});
            const indices = parseMojiIndices(html);

            // 多日预报：首页只有当天；要 2 天以上需再取 forecastN 页（串行 + 限速）。
            const needMore = want > 1 && hasSlug;
            const fcUrl = MOJI_BASE + "/forecast" + (want <= 7 ? "7" : (want <= 10 ? "10" : "15")) +
              "/china/" + slug.prov + "/" + slug.city;
            const gotForecast = needMore
              ? mojiSerial(() => fetchHtml(fcUrl, s, Object.assign({ label: "墨迹天气·预报", referer: curUrl }, fetchOpts)))
                  .then((fhtml) => parseMojiForecast(fhtml, want))
                  // 预报页失败不应让整源失败：实况已拿到，退化为「仅当天」。
                  .catch(() => [])
              : Promise.resolve([]);

            return gotForecast.then((fcDays) => {
              const now = new Date();
              const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
              const rows = [];
              const seen = {};
              // 预报页有时会把「昨天」也列在第一行（实测：页面自称今天 10/11，列表却从 10/10 开始），
              // 因此这里按日期去重并丢弃早于今天的条目，避免界面出现「昨天」。
              fcDays.forEach((f) => {
                const d = mojiDateFromText(f.dateText, now) || mojiDateFromWeek(f.label, now);
                if (!d) return;
                const day0 = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
                if (day0 < today0) return;                 // 丢弃过期日
                if (seen[day0]) return;                    // 丢弃重复日
                seen[day0] = 1;
                rows.push(dailyRow(d, cnInfo(f.descDay, true), f.tempMaxC, f.tempMinC, {
                  descNight: f.descNight && f.descNight !== f.descDay ? f.descNight : null,
                }));
              });
              // 今天的实况页数据最权威（且含 AQI 等），用它覆盖/补齐第一行。
              if (today) {
                const todayRow = dailyRow(now, cnInfo(today.descDay, true), today.tempMaxC, today.tempMinC, {
                  aqi: isNum(c.aqi) ? c.aqi : null,
                });
                if (rows.length && seen[today0]) rows[0] = todayRow;
                else rows.unshift(todayRow);
              }
              return {
                ok: true, source: "moji",
                reportTime: normalizeReportTime(c.reportTime),
                placeName: ((html.match(/<title>【([^】]+)天气/) || [])[1] || ""),
                current: {
                  tempC: c.tempC,
                  feelsC: null,
                  humidity: isNum(c.humidity) ? c.humidity : null,
                  windKmh: null,
                  windDirText: c.windDirText || "",
                  windScale: c.windScale || "",
                  pressureHpa: null, precipMm: null, uvIndex: null, visibilityKm: null,
                  aqi: isNum(c.aqi) ? c.aqi : null,
                  aqiCategory: c.aqiCategory || "",
                  icon: cnInfo(c.desc, true).icon,
                  desc: c.desc || "—",
                  isDay: true,
                },
                hourly: [],
                daily: rows.slice(0, want),
                alerts: [],
                lifeIndices: indices,
                tips: c.tips || "",
              };
            });
          });
      });
    }

    /* ── 注册（顺序 = 设置页展示顺序；新增源照此加两条即可） ─────────────── */
    registerSource("uapi", {
      // retry 设为 0：适配器内部已做「多端点自动切换」，外层再叠加重试会瞬间打满
      // 免费额度（visitor-rate 4 次/秒）→ 反而更容易 429。
      label: "Uapi", free: true, timeout: 11000, retry: 0,
      desc: "国内免费聚合：实况 + 体感/AQI及污染物 + 最多 7 日预报 + 逐时 + 分钟级降水；本插件主数据源。",
      docsUrl: "https://uapis.cn/docs/api-reference/get-misc-weather",
      fetch: fetchUapi,
    });
    registerSource("open-meteo", {
      label: "Open-Meteo", free: true, timeout: 9000, retry: 1,
      desc: "免注册开放气象，按经纬度取数；无城市名时（GPS 反查失败）也能工作。",
      docsUrl: "https://open-meteo.com/en/docs",
      fetch: fetchOpenMeteo,
    });
    registerSource("wttr", {
      label: "wttr.in", free: true, timeout: 14000, retry: 0,
      desc: "独立第二源，用于交叉校验；响应偶尔偏慢。",
      docsUrl: "https://github.com/chubin/wttr.in",
      fetch: fetchWttr,
    });
    registerSource("caiyun", {
      label: "彩云天气", free: false, timeout: 10000, retry: 0,
      desc: "分钟级降水与短临预报见长；接口按「经度,纬度」取数。",
      docsUrl: "https://docs.caiyunapp.com/weather/",
      keyApplyUrl: "https://dashboard.caiyunapp.com/app/token/",
      keyFields: ["caiyun"], keyLabels: { caiyun: "彩云 Token" },
      fetch: fetchCaiyun,
    });
    registerSource("openWeather", {
      label: "OpenWeatherMap", free: false, timeout: 10000, retry: 0,
      desc: "国际主流气象 API，全球覆盖好；免费注册拿 Key。",
      docsUrl: "https://openweathermap.org/api",
      keyApplyUrl: "https://home.openweathermap.org/api_keys",
      keyFields: ["openWeather"], keyLabels: { openWeather: "OpenWeatherMap Key" },
      fetch: fetchOpenWeather,
    });
    registerSource("moji", {
      label: "墨迹天气", free: true, timeout: 16000, retry: 0,
      desc: "直接爬取 tianqi.moji.com 网页（无需 Key）：实况 + 湿度/风向风力/AQI + 最多 7 日预报 + 生活指数。" +
        "按客户端 IP 自动定位，不支持切换地区；站点无 CORS 头，需在下方开启 CORS 代理；" +
        "前置 CloudWAF，已做全局限速以免被拦截。",
      docsUrl: "https://tianqi.moji.com/",
      fetch: fetchMoji,
    });

    const SOURCE_ORDER = Object.keys(SOURCE_REGISTRY);
    /** 主源自动回退顺序（Uapi 优先）。 */
    const PRIMARY_PRIORITY = ["uapi", "open-meteo", "caiyun", "openWeather", "wttr", "moji"];

    function normalizeActive(list) {
      const out = [];
      (Array.isArray(list) ? list : []).forEach((id) => {
        if (SOURCE_REGISTRY[id] && !out.includes(id)) out.push(id);
      });
      return out.slice(0, MAX_SOURCES);
    }
    function missingKeyOf(def, settings) {
      const fields = def.keyFields || [];
      const miss = fields.filter((f) => !(settings.keys && settings.keys[f]));
      if (!miss.length) return null;
      const label = (def.keyLabels && def.keyLabels[miss[0]]) || def.keyLabel || "Key";
      return label;
    }
    function humanError(e) {
      const msg = String((e && e.message) || e || "未知错误");
      if (/aborted|AbortError|TimeoutError/i.test(msg)) return "请求超时，请稍后重试";
      return msg.length > 140 ? msg.slice(0, 140) + "…" : msg;
    }
    function sourceLabel(id) {
      const d = SOURCE_REGISTRY[id];
      return d ? d.label : String(id || "—");
    }

    /** 并行取回已启用源；任一源失败不影响其它源（失败原因记在该源的 error 里）。 */
    function loadWeather(loc, settings) {
      const active = normalizeActive(settings.activeSources);
      const days = settings.forecastDays || 3;
      const tasks = active.map((id) => {
        const def = SOURCE_REGISTRY[id];
        if (!def) return Promise.resolve({ ok: false, source: id, error: "未知数据源" });
        const miss = missingKeyOf(def, settings);
        if (miss) return Promise.resolve({ ok: false, source: id, error: "未配置 " + miss });
        const opts = { timeout: def.timeout || DEFAULT_TIMEOUT, label: def.label };
        return withRetry(() => def.fetch(loc, settings, days), def.retry || 0, 1200)
          .then((r) => r)
          .catch((e) => ({ ok: false, source: id, error: humanError(e) }));
      });
      return Promise.all(tasks).then((arr) => {
        const results = {};
        arr.forEach((r) => { results[r.source] = r; });
        return { results, active, at: Date.now() };
      });
    }

    /* ═══ 6. 定位服务 ════════════════════════════════════════════════════════ */

    /* IP 定位双源：ipwho.is 为主，ipapi.co 为备份（均为免 Key、CORS 友好）。
     * 旧版单源——ipwho.is 偶发抖动时首屏直接报「定位失败」，其实换个源就能好。
     * 两源字段语义对齐后再返回，形状与旧版完全一致。 */
    function fetchIpLocation() {
      const tryIpwho = () => fetchJson("https://ipwho.is/?fields=success,country,country_code,region,city,latitude,longitude,flag,timezone",
        { timeout: 7000, label: "IP 定位" }).then((j) => {
        if (!j || j.success === false) throw new Error("IP 定位失败" + (j && j.message ? "：" + j.message : ""));
        if (!isNum(j.latitude) || !isNum(j.longitude)) throw new Error("IP 定位未返回坐标");
        return {
          lat: Number(j.latitude), lon: Number(j.longitude),
          label: j.city || j.region || j.country || "未知位置",
          region: j.region || "", country: j.country || "", countryCode: j.country_code || "",
          flag: (j.flag && j.flag.emoji) || "", source: "ip",
        };
      });
      const tryIpapi = () => fetchJson("https://ipapi.co/json/",
        { timeout: 7000, label: "IP 定位·备份" }).then((j) => {
        if (!j || j.error) throw new Error("IP 定位失败" + (j && j.reason ? "：" + j.reason : ""));
        if (!isNum(j.latitude) || !isNum(j.longitude)) throw new Error("IP 定位未返回坐标");
        return {
          lat: Number(j.latitude), lon: Number(j.longitude),
          label: j.city || j.region || j.country_name || "未知位置",
          region: j.region || "", country: j.country_name || "", countryCode: j.country_code || "",
          flag: "", source: "ip",
        };
      });
      return tryIpwho().catch((e1) => tryIpapi().catch((e2) => {
        // 双源皆败：报主源错误（更常见、更贴近真实原因），备份原因附在后半句。
        const a = String((e1 && e1.message) || e1), b = String((e2 && e2.message) || e2);
        throw new Error(/超时|网络/.test(a) && !/超时|网络/.test(b) ? b : a + "；备份源也失败");
      }));
    }
    function fetchGpsLocation() {
      return new Promise((resolve, reject) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          reject(new Error("当前环境不支持浏览器定位")); return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude, lon = pos.coords.longitude;
            const bare = () => resolve({
              lat, lon, label: round1(lat) + "," + round1(lon), region: "", country: "",
              countryCode: "", flag: "", source: "gps",
            });
            fetchJson("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" + lat +
              "&longitude=" + lon + "&localityLanguage=zh", { timeout: 7000, label: "城市反查" })
              .then((g) => resolve({
                lat, lon,
                label: (g && (g.city || g.locality || g.principalSubdivision)) || (round1(lat) + "," + round1(lon)),
                region: (g && g.principalSubdivision) || "", country: (g && g.countryName) || "",
                countryCode: (g && g.countryCode) || "", flag: "", source: "gps",
              }))
              .catch(bare);
          },
          (err) => reject(new Error(err && err.code === 1
            ? "未授予定位权限（请在浏览器允许定位）"
            : err && err.code === 3 ? "定位超时，请重试或改用 IP 定位"
              : "定位失败：" + String((err && err.message) || ""))),
          { enableHighAccuracy: false, timeout: 9000, maximumAge: 5 * 60 * 1000 }
        );
      });
    }
    function searchCity(query) {
      const q = String(query || "").trim();
      if (!q) return Promise.resolve([]);
      return fetchJson("https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(q) +
        "&count=8&language=zh&format=json", { timeout: 8000, label: "城市搜索" })
        .then((j) => (Array.isArray(j && j.results) ? j.results : []).map((r) => ({
          lat: r.latitude, lon: r.longitude, label: r.name || "—",
          region: r.admin1 || "", country: r.country || "", countryCode: r.country_code || "",
          flag: "", source: "manual",
        })));
    }

    /* ═══ 7. 主题检测 ════════════════════════════════════════════════════════ */

    function luminance(color) {
      const nums = String(color || "").match(/(\d+(?:\.\d+)?)/g);
      if (!nums || nums.length < 3) return null;
      const r = +nums[0], g = +nums[1], b = +nums[2];
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    }
    /**
     * 优先级：用户显式指定 → DSH 主题标记 → data-theme → color-scheme →
     *         DSH 背景令牌亮度 → 系统偏好 → 兜底深色。
     */
    function detectTheme(pref) {
      if (pref === "dark" || pref === "light") return pref;
      try {
        const de = typeof document !== "undefined" ? document.documentElement : null;
        const body = typeof document !== "undefined" ? document.body : null;
        if (body) {
          if (body.hasAttribute("data-ds-dark-theme")) return "dark";
          if (body.classList && body.classList.contains("dsw-dark")) return "dark";
        }
        if (de && de.classList && de.classList.contains("dsw-dark")) return "dark";
        const t = (body && body.getAttribute("data-theme")) || (de && de.getAttribute("data-theme"));
        if (t === "dark") return "dark";
        if (t === "light") return "light";
        const el = de || body;
        if (el && typeof getComputedStyle === "function") {
          const st = getComputedStyle(el);
          const cs = String(st.colorScheme || "");
          if (cs.indexOf("dark") >= 0) return "dark";
          if (cs.indexOf("light") >= 0) return "light";
          const l = luminance(st.getPropertyValue("--dsw-alias-bg-base") ||
            st.getPropertyValue("--dsw-alias-bg-layer-1") || "");
          if (l != null) return l < 0.45 ? "dark" : "light";
        }
      } catch { /* ignore */ }
      try {
        if (typeof window !== "undefined" && window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
      } catch { /* ignore */ }
      return "dark";
    }

    /* ═══ 8. 小组件 ═════════════════════════════════════════════════════════ */

    const ICON = {
      refresh: "M12 4V1L8 5l4 4V6a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z",
      gps: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm8.94 3A8.99 8.99 0 0 0 13 3.06V1h-2v2.06A8.99 8.99 0 0 0 3.06 11H1v2h2.06A8.99 8.99 0 0 0 11 20.94V23h2v-2.06A8.99 8.99 0 0 0 20.94 13H23v-2h-2.06zM12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14z",
      search: "M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0A4.5 4.5 0 1 1 14 9.5 4.49 4.49 0 0 1 9.5 14z",
      close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
      unit: "M7 3v18M3 7h8M13 21l4-9 4 9M14.5 18h5",
      link: "M3.9 12a3.1 3.1 0 0 1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h4v-1.9H7A3.1 3.1 0 0 1 3.9 12zM8 13h8v-2H8v2zm9-6h-4V7h4a5 5 0 0 1 0 10h-4v-1.9h4A3.1 3.1 0 0 0 17 7z",
    };
    function svgIcon(path) {
      return h("svg", { viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true }, h("path", { d: path }));
    }

    /** 每秒心跳的时间 hook：开秒 1s，闭秒 15s（够用且省定时器）。 */
    function useNow(withSeconds) {
      const [now, setNow] = useState(() => Date.now());
      useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), withSeconds ? 1000 : 15000);
        return () => clearInterval(id);
      }, [withSeconds]);
      return now;
    }

    /** 卡片温度右侧的实时时钟（HH:MM，可开秒）+ 日期星期；点击时钟可快切秒针。 */
    function RealtimeClock(props) {
      const now = useNow(props.showSeconds);
      const d = new Date(now);
      const time = two(d.getHours()) + ":" + two(d.getMinutes()) +
        (props.showSeconds ? ":" + two(d.getSeconds()) : "");
      return h("div", {
        className: "dwi-nowClock",
        title: "本地时间 · 点击切换是否显示秒",
        style: { cursor: "pointer" },
        onClick: (e) => {
          e.stopPropagation();
          settingsStore.set({ clockSeconds: !settingsStore.get().clockSeconds });
        },
      },
        h("div", { className: "dwi-clockBig" }, time),
        h("div", { className: "dwi-clockDate" },
          (d.getMonth() + 1) + "月" + d.getDate() + "日 " + WEEKDAYS[d.getDay()]));
    }
    /** 胶囊内的短时钟（展开态替代城市名）。 */
    function PillClock(props) {
      const now = useNow(props.showSeconds);
      const d = new Date(now);
      return h("span", { className: "dwi-clock" },
        two(d.getHours()) + ":" + two(d.getMinutes()) + (props.showSeconds ? ":" + two(d.getSeconds()) : ""));
    }

    /* ═══ 9. 灵动岛 ═════════════════════════════════════════════════════════ */
    /*
     * 位置语义（v2.0 关键修复）：
     *   settings.pos = 胶囊锚点中心（视口坐标）。
     *   · 纯点击（位移 < 4px）→ 完全不写 pos（v1.2 会因展开后尺寸变化被重钳而搬动胶囊）。
     *   · 拖动 → 只在 pointerup 提交一次落点；拖动过程用局部 dragPos 渲染，不写 localStorage。
     *   · 卡片绝对定位在锚点旁（.dwi-anchor），不参与根节点尺寸计算，
     *     因此展开/收起、内容增减都不会反过来影响记忆的位置。
     *   · 卡片方向（上/下）与水平防出界偏移都由锚点算出，同样不回写 pos。
     */

    /* ── 首次加载欢迎指引 ────────────────────────────────────────────────────
       纯数据 + 一个小组件：每步只讲一件事，配一个柔光图标与一句「怎么做」。
       tone 决定顶部柔光与图标底色（蓝/紫/青/橙/绿），全程只做颜色过渡。 */
    const GUIDE_STEPS = [
      {
        orb: "👋", tone: "accent",
        title: "欢迎使用dsh-weather-island",
        desc: "这就是你的天气胶囊：一眼看到温度与天气，点一下就能展开完整看板。",
      },
      {
        orb: "🖐️", tone: "accent2",
        title: "拖动，放到顺手的角落",
        desc: "按住胶囊直接拖。落点会被记住，下次打开还在原位；双击可以一键复位到初始位置。",
      },
      {
        orb: "🌤️", tone: "teal",
        title: "展开看全部预报",
        desc: "单击展开后，可以看到<b>逐时趋势</b>、<b>多日预报</b>、<b>生活指数</b>与<b>双源对照</b>。预报天数可在设置里切 3 / 5 / 7 天。",
      },
      {
        orb: "📍", tone: "warn",
        title: "定位与换城市",
        desc: "默认按 IP 自动定位。想换城市：点卡片右上角的搜索图标，或用 GPS 精确定位；选过的手动城市会被记住。",
      },
      {
        orb: "⚙️", tone: "ok",
        title: "按需微调",
        desc: "在 <code>DSH 设置 → 天气看板</code> 里可以改主题、字号、玻璃透明度、数据源与刷新频率。随时点下方按钮再看一遍。",
      },
    ];
    const GUIDE_TONE = {
      accent: "var(--dwi-accent)", accent2: "var(--dwi-accent2)",
      teal: "#36d6c4", warn: "var(--dwi-warn)", ok: "var(--dwi-ok)",
    };

    /** 欢迎指引卡片：受控组件，自身不持久化，由父级决定何时展示与关闭。 */
    function GuideCard(props) {
      const i = Math.max(0, Math.min(GUIDE_STEPS.length - 1, props.index));
      const st = GUIDE_STEPS[i];
      const last = i === GUIDE_STEPS.length - 1;
      const gc = GUIDE_TONE[st.tone] || GUIDE_TONE.accent;

      return h("div", { className: "dwi-guide", style: { "--dwi-gc": gc } },
        h("div", { className: "dwi-guide-card" },
          // 顶部柔光：颜色随步骤过渡，是「动态」的主要来源
          h("div", {
            className: "dwi-guide-tint",
            style: { background: "linear-gradient(180deg,color-mix(in srgb," + gc + " 22%,transparent),transparent)" },
          }),
          h("div", { className: "dwi-guide-body" },
            h("div", { className: "dwi-guide-top" },
              h("span", { className: "dwi-guide-badge" }, h("i"), "使用指引"),
              h("button", {
                className: "dwi-guide-skip", type: "button", onClick: props.onSkip,
                title: "关闭指引（可在设置里再看一遍）",
              }, "跳过 ✕")),
            // key 变化 → 该子树重挂载 → 播一次 dwi-guide-step，步骤切换更顺
            h("div", { className: "dwi-guide-stage dwi-guide-anim", key: i },
              h("span", { className: "dwi-guide-orb" },
                h("span", { className: "dwi-guide-ring" }), st.orb),
              h("div", { className: "dwi-guide-text" },
                h("div", { className: "dwi-guide-title" }, st.title),
                h("div", { className: "dwi-guide-desc", dangerouslySetInnerHTML: { __html: st.desc } }))),
            h("div", { className: "dwi-guide-dots", role: "tablist", "aria-label": "指引步骤" },
              GUIDE_STEPS.map((s, n) => h("button", {
                key: n, type: "button", role: "tab",
                className: "dwi-guide-dot" + (n === i ? " dwi-on" : (n < i ? " dwi-done" : "")),
                "aria-label": "第 " + (n + 1) + " 步：" + s.title,
                "aria-selected": n === i ? "true" : "false",
                onClick: () => props.onGo(n),
              }))),
            h("div", { className: "dwi-guide-acts" },
              h("button", {
                className: "dwi-guide-ghost", type: "button",
                disabled: i === 0, onClick: () => props.onGo(Math.max(0, i - 1)),
              }, "上一步"),
              h("button", {
                className: "dwi-guide-go" + (last ? " dwi-plain" : ""), type: "button",
                onClick: () => (last ? props.onFinish() : props.onGo(i + 1)),
              }, last ? "开始使用 ✓" : "下一步")))));
    }

    function WeatherIsland() {
      const [settings, setSettings] = useState(() => settingsStore.get());
      const [loc, setLoc] = useState(null);
      const [weather, setWeather] = useState(null);
      const [phase, setPhase] = useState("idle");      // idle | locating | ready | error
      const [error, setError] = useState(null);
      const [expanded, setExpanded] = useState(false);
      const [searchOpen, setSearchOpen] = useState(false);
      const [query, setQuery] = useState("");
      const [suggest, setSuggest] = useState([]);
      const [sugIdx, setSugIdx] = useState(-1);      // 搜索建议的键盘高亮项
      const [locatingGps, setLocatingGps] = useState(false);
      const [refreshing, setRefreshing] = useState(false);
      const [updated, setUpdated] = useState(null);
      const [theme, setTheme] = useState(() => detectTheme(settingsStore.get().theme));
      const [dragPos, setDragPos] = useState(null);
      const [dragging, setDragging] = useState(false);
      // 首次加载：未看过指引则开场即展开（首帧就渲染，避免「先见胶囊再弹出」的闪烁）
      const [guideOpen, setGuideOpen] = useState(() => !settingsStore.get().seenGuide);
      const [guideStep, setGuideStep] = useState(0);
      const [, force] = useState(0);

      const rootRef = useRef(null);
      const locRef = useRef(null);
      const dragRef = useRef(null);
      const searchTimer = useRef(null);
      const tapTimer = useRef(null);
      const hoverTimer = useRef(null);
      const sigRef = useRef((settingsStore.get().activeSources || []).join(","));
      const daysRef = useRef(settingsStore.get().forecastDays);
      const locPrefRef = useRef(settingsStore.get().locPref);
      const selfPickRef = useRef(false);
      const errStateRef = useRef(false);
      // v2.1 竞态守卫：每次发起新的取数/定位都自增；旧的 promise 返回时序号已过期 → 丢弃，
      // 避免「快速连点刷新后，第一次慢请求晚返回并覆盖新数据」的倒退闪烁。
      const loadSeqRef = useRef(0);
      // busy 序号与 loadSeq 分开：清 spinner 只看「同类操作的最新一次」。
      // 否则「GPS 定位中点了刷新」会让定位的 finally 被竞态守卫拦下 → 转圈永久卡死。
      const gpsBusySeqRef = useRef(0);
      const refreshBusySeqRef = useRef(0);

      /* ── 订阅设置：即时生效；源/天数/定位方式变化则重取或重定位 ── */
      useEffect(() => {
        const off = settingsStore.subscribe((s) => {
          setSettings(s);
          setTheme(detectTheme(s.theme));
          const cur = (s.activeSources || []).join(",");
          const needReload = cur !== sigRef.current || daysRef.current !== s.forecastDays;
          sigRef.current = cur;
          daysRef.current = s.forecastDays;
          force((n) => n + 1);
          if (needReload && locRef.current) {
            const seq = ++loadSeqRef.current;
            loadWeather(locRef.current, s)
              .then((w) => {
                if (seq !== loadSeqRef.current) return;
                setWeather(w); setUpdated(Date.now()); persistCache(locRef.current, w);
              })
              .catch(() => { /* 单源错误已在 results.error 中体现 */ });
          }
          const prefChanged = s.locPref !== locPrefRef.current;
          locPrefRef.current = s.locPref;
          if (prefChanged && !selfPickRef.current) {
            // 用户在设置页改了定位方式：立即按新方式重新定位（卡片内选城导致的变化跳过）
            locate(s.locPref, s.locPref === "manual" ? s.manualLoc : undefined);
          }
          selfPickRef.current = false;
        });
        return off;
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      /* ── 主题：跟随 DSH 属性/类变化与系统偏好 ── */
      useEffect(() => {
        const apply = () => setTheme(detectTheme(settingsStore.get().theme));
        apply();
        let mq = null, obs = null;
        try {
          mq = window.matchMedia("(prefers-color-scheme: dark)");
          if (mq && mq.addEventListener) mq.addEventListener("change", apply);
        } catch { /* ignore */ }
        try {
          if (typeof MutationObserver !== "undefined") {
            obs = new MutationObserver(apply);
            [document.documentElement, document.body].filter(Boolean).forEach((t) => obs.observe(t, {
              attributes: true, attributeFilter: ["data-theme", "data-ds-dark-theme", "class", "style"],
            }));
          }
        } catch { /* ignore */ }
        return () => {
          try { if (mq && mq.removeEventListener) mq.removeEventListener("change", apply); } catch { /* ignore */ }
          try { if (obs) obs.disconnect(); } catch { /* ignore */ }
        };
      }, []);

      const persistCache = useCallback((nextLoc, w) => {
        if (!nextLoc || !w) return;
        try {
          window.localStorage.setItem(LS_WEATHER, JSON.stringify({
            loc: nextLoc, results: w.results, updated: Date.now(),
          }));
        } catch { /* 配额或隐私模式 */ }
      }, []);

      /* ── 定位 ── */
      const locate = useCallback((kind, manual) => {
        const s = settingsStore.get();
        let runner;
        if (manual) runner = Promise.resolve(manual);
        else if (kind === "gps") runner = fetchGpsLocation();
        else if (kind === "manual") {
          runner = s.manualLoc ? Promise.resolve(s.manualLoc) : fetchIpLocation();
        } else runner = fetchIpLocation();
        const isGps = kind === "gps";
        const b = isGps ? ++gpsBusySeqRef.current : 0;
        if (isGps) setLocatingGps(true);
        setPhase((p) => (p === "ready" ? p : "locating"));
        setError(null);
        const seq = ++loadSeqRef.current;   // 竞态守卫：本次请求的序号
        return runner
          .then((next) => {
            if (seq !== loadSeqRef.current) return null;   // 已有更新的定位/刷新 → 丢弃本次
            locRef.current = next; setLoc(next);
            if (next.source === "manual") settingsStore.set({ manualLoc: next });
            return loadWeather(next, settingsStore.get());
          })
          .then((w) => {
            if (!w || seq !== loadSeqRef.current) return;  // 过期结果不落地
            setWeather(w); setUpdated(Date.now()); setPhase("ready"); errStateRef.current = false;
            persistCache(locRef.current, w);
          })
          .catch((e) => {
            if (seq !== loadSeqRef.current) return;
            const msg = humanError(e);
            errStateRef.current = true;
            setError(msg);
            setPhase((p) => (p === "ready" ? p : "error"));
            force((n) => n + 1);
          })
          .finally(() => {
            // 清转圈只看「GPS 定位这一类操作」的最新序号，与 loadSeq 解耦
            if (isGps && b === gpsBusySeqRef.current) setLocatingGps(false);
          });
      }, [persistCache]);

      /* ── 刷新（silent = 后台轮询，不转圈不报错） ── */
      const refresh = useCallback((silent) => {
        const cur = locRef.current;
        if (!cur) return locate(settingsStore.get().locPref);
        const b = ++refreshBusySeqRef.current;
        if (!silent) setRefreshing(true);
        const seq = ++loadSeqRef.current;   // 竞态守卫：慢的旧请求回来不许覆盖新数据
        return loadWeather(cur, settingsStore.get())
          .then((w) => {
            if (seq !== loadSeqRef.current) return;
            setWeather(w); setUpdated(Date.now()); persistCache(cur, w);
            errStateRef.current = false; setError(null);
          })
          .catch((e) => {
            if (seq !== loadSeqRef.current) return;
            if (!silent) { errStateRef.current = true; setError(humanError(e)); }
          })
          .finally(() => { if (!silent && b === refreshBusySeqRef.current) setRefreshing(false); });
      }, [locate, persistCache]);

      /* ── 首挂载：缓存先上屏，再补一次数据 ── */
      useEffect(() => {
        let cached = null;
        try { cached = JSON.parse(window.localStorage.getItem(LS_WEATHER) || "null"); } catch { /* ignore */ }
        if (cached && cached.loc && cached.results) {
          locRef.current = cached.loc;
          setLoc(cached.loc);
          setWeather({ results: cached.results, active: normalizeActive(Object.keys(cached.results)) });
          setUpdated(cached.updated || Date.now());
          setPhase("ready");
        }
        const s = settingsStore.get();
        if (s.locPref === "gps") locate("gps");
        else if (s.locPref === "manual") locate("manual", s.manualLoc);
        else if (locRef.current) refresh(true);
        else locate("ip");
        return () => {
          if (tapTimer.current) clearTimeout(tapTimer.current);
          if (hoverTimer.current) clearTimeout(hoverTimer.current);
          if (searchTimer.current) clearTimeout(searchTimer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      /* ── 心跳：让页脚「x 分钟前」与过期圆点持续刷新（60s，成本可忽略） ── */
      useEffect(() => {
        const id = setInterval(() => force((n) => n + 1), 60000);
        return () => clearInterval(id);
      }, []);

      /* ── 自动刷新：页面隐藏时跳过，回前台过期即补 ── */
      useEffect(() => {
        const mins = settings.refreshMinutes || 10;
        const id = setInterval(() => {
          if (!locRef.current) return;
          if (typeof document !== "undefined" && document.hidden) return;
          refresh(true);
        }, mins * 60 * 1000);
        const onVis = () => {
          if (!document.hidden && locRef.current && Date.now() - (updated || 0) > mins * 60 * 1000) refresh(true);
        };
        try { document.addEventListener("visibilitychange", onVis); } catch { /* ignore */ }
        return () => {
          clearInterval(id);
          try { document.removeEventListener("visibilitychange", onVis); } catch { /* ignore */ }
        };
      }, [refresh, settings.refreshMinutes, updated]);

      /* ── 展开时若数据已过期，静默补一次 ── */
      useEffect(() => {
        if (expanded && updated && Date.now() - updated > STALE_MS && locRef.current) refresh(true);
      }, [expanded, updated, refresh]);

      /* ── 外部点击 / Esc 收起 ── */
      useEffect(() => {
        if (!expanded) return undefined;
        const onDown = (e) => {
          if (rootRef.current && !rootRef.current.contains(e.target)) setExpanded(false);
        };
        const onKey = (e) => {
          if (e.key !== "Escape") return;
          if (searchOpen) setSearchOpen(false);
          else setExpanded(false);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
          document.removeEventListener("mousedown", onDown);
          document.removeEventListener("keydown", onKey);
        };
      }, [expanded, searchOpen]);

      /* ── 欢迎指引：结束（跳过/看完）后标记已读，只在真正结束时写一次 ── */
      const finishGuide = useCallback(() => {
        setGuideOpen(false);
        setGuideStep(0);
        // set() 内部已做变更比对，重复调用不会反复写 localStorage / 触发订阅
        settingsStore.set({ seenGuide: true });
      }, []);
      const goGuide = useCallback((n) => {
        setGuideStep(Math.max(0, Math.min(GUIDE_STEPS.length - 1, Number(n) || 0)));
      }, []);

      /* ── 设置页点「再看一遍指引」→ 经广播重新打开（跨插槽，无 props 传递） ── */
      useEffect(() => guideReplay.on(() => { setGuideStep(0); setGuideOpen(true); }), []);

      /* ── 指引打开时：Esc 跳过、←/→ 翻页（仅在指引可见时接管按键） ── */
      useEffect(() => {
        if (!guideOpen) return undefined;
        const onKey = (e) => {
          if (e.key === "Escape") { e.preventDefault(); finishGuide(); }
          else if (e.key === "ArrowRight") goGuide(guideStep + 1);
          else if (e.key === "ArrowLeft") goGuide(guideStep - 1);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
      }, [guideOpen, guideStep, finishGuide, goGuide]);

      /* ── 城市搜索防抖 ── */
      useEffect(() => {
        if (!searchOpen) { setSuggest([]); return undefined; }
        if (searchTimer.current) clearTimeout(searchTimer.current);
        const q = query.trim();
        if (!q) { setSuggest([]); return undefined; }
        searchTimer.current = setTimeout(() => {
          searchCity(q).then(setSuggest).catch(() => setSuggest([]));
        }, 300);
        return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
      }, [query, searchOpen]);

      const pickSuggest = useCallback((next) => {
        setSearchOpen(false); setQuery(""); setSuggest([]); setSugIdx(-1);
        locRef.current = next; setLoc(next);
        selfPickRef.current = true; // 卡片内选城导致的 locPref/manualLoc 变化，不再触发重定位
        settingsStore.set({ manualLoc: next, locPref: "manual" });
        setPhase("ready"); setError(null); errStateRef.current = false;
        const seq = ++loadSeqRef.current;
        loadWeather(next, settingsStore.get())
          .then((w) => {
            if (seq !== loadSeqRef.current) return;
            setWeather(w); setUpdated(Date.now()); persistCache(next, w);
          })
          .catch((e) => {
            if (seq !== loadSeqRef.current) return;
            errStateRef.current = true; setError(humanError(e));
          });
      }, [persistCache]);

      /* ── 锚点钳制：只按胶囊尺寸（卡片不参与，故记忆位置不会被改写） ── */
      const clampAnchor = useCallback((x, y) => {
        const el = rootRef.current;
        const W = window.innerWidth, H = window.innerHeight;
        const halfW = Math.max(40, ((el && el.offsetWidth) || PILL_W) / 2);
        const halfH = Math.max(PILL_H / 2, ((el && el.offsetHeight) || PILL_H) / 2);
        return {
          x: Math.max(halfW + EDGE, Math.min(W - halfW - EDGE, x)),
          y: Math.max(halfH + EDGE, Math.min(H - halfH - EDGE, y)),
        };
      }, []);

      /**
       * 拖动 + 点击共用入口。
       * @param e        pointer 事件
       * @param opts.skipInteractive 命中按钮/输入/建议项时不开始拖动
       * @param opts.tapAction       未移动时（即纯点击）要做的事：toggle | none
       */
      const startDrag = useCallback((e, opts) => {
        const o = opts || {};
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if (o.skipInteractive && e.target && e.target.closest &&
            e.target.closest("button, input, a, textarea, select, .dwi-suggestItem, .dwi-search")) return;
        const root = rootRef.current;
        if (!root) return;
        const rect = root.getBoundingClientRect();
        const d = {
          anchorX: rect.left + rect.width / 2,   // 按下瞬间的锚点（后续位移都相对它）
          anchorY: rect.top + rect.height / 2,
          px: e.clientX, py: e.clientY, moved: false, last: null,
        };
        dragRef.current = d;
        setDragging(true);
        const move = (ev) => {
          const dx = ev.clientX - d.px, dy = ev.clientY - d.py;
          if (!d.moved && Math.hypot(dx, dy) > 4) { d.moved = true; setDragging(true); }
          if (d.moved) {
            d.last = clampAnchor(d.anchorX + dx, d.anchorY + dy);
            setDragPos(d.last);
          }
        };
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
          window.removeEventListener("pointercancel", up);
          const wasMoved = d.moved, final = d.last;
          dragRef.current = null;
          setDragging(false); setDragPos(null);
          if (wasMoved && final) settingsStore.set({ pos: final });            // 只记住拖动落点
          else if (!wasMoved && o.tapAction === "toggle") handleTap();          // 纯点击：不动位置
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
        window.addEventListener("pointercancel", up);
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [clampAnchor]);

      /* 单击：延迟 TAP_MS 以让位双击；加载失败态优先重试而不是展开 */
      function handleTap() {
        if (errStateRef.current && !locRef.current) {
          locate(settingsStore.get().locPref);
          return;
        }
        if (tapTimer.current) clearTimeout(tapTimer.current);
        tapTimer.current = setTimeout(() => {
          tapTimer.current = null;
          setExpanded((v) => !v);
        }, TAP_MS);
      }
      /* 双击：取消待定的单击，复位到顶部居中 */
      function handleDouble() {
        if (tapTimer.current) { clearTimeout(tapTimer.current); tapTimer.current = null; }
        settingsStore.set({ pos: null });
      }

      /* 悬停展开（可选）：进 140ms / 出 420ms 延迟，避免划过抖动 */
      const onEnter = useCallback(() => {
        if (!settingsStore.get().hoverExpand) return;
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(() => setExpanded(true), 140);
      }, []);
      const onLeave = useCallback(() => {
        if (!settingsStore.get().hoverExpand) return;
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        hoverTimer.current = setTimeout(() => {
          if (!dragRef.current) setExpanded(false);
        }, 420);
      }, []);

      /* 视口变化：只重钳已有锚点，避免缩窗后跑出屏幕 */
      useEffect(() => {
        const onResize = () => {
          const s = settingsStore.get();
          if (!s.pos) return;
          const c = clampAnchor(s.pos.x, s.pos.y);
          if (Math.abs(c.x - s.pos.x) > 0.5 || Math.abs(c.y - s.pos.y) > 0.5) settingsStore.set({ pos: c });
        };
        window.addEventListener("resize", onResize);
        window.addEventListener("orientationchange", onResize);
        return () => {
          window.removeEventListener("resize", onResize);
          window.removeEventListener("orientationchange", onResize);
        };
      }, [clampAnchor]);

      /* ── 派生 ── */
      const active = normalizeActive(settings.activeSources);
      const days = settings.forecastDays || 3;
      const results = (weather && weather.results) || {};
      const okList = active.map((id) => results[id]).filter((r) => r && r.ok);
      const failList = active.map((id) => results[id]).filter((r) => r && !r.ok);
      const chosen = results[active[0]];
      const primary = (chosen && chosen.ok) ? chosen
        : (PRIMARY_PRIORITY.map((id) => results[id]).find((r) => r && r.ok) || okList[0] || null);
      const cur = primary ? primary.current : null;
      const curTemp = cur ? cur.tempC : null;
      // Uapi 新版在 IP 自动定位时会回传更精确的 city·district，优先用它做标题。
      const shortLoc = (primary && primary.placeName) || (loc ? (loc.label || "—") : "");
      const allFailed = active.length > 0 && okList.length === 0;
      const alerts = okList.reduce((acc, r) => acc.concat(r.alerts || []), []).slice(0, 3);
      const noDataYet = curTemp == null && !allFailed;

      const hours = useMemo(() => {
        if (!settings.showHourly || !primary || !Array.isArray(primary.hourly)) return [];
        return primary.hourly.slice(0, Math.max(12, days * 4));
      }, [primary, settings.showHourly, days]);

      const dayRows = useMemo(() => {
        const list = (primary && Array.isArray(primary.daily)) ? primary.daily : [];
        if (!list.length) return [];
        const nums = [];
        list.forEach((d) => {
          if (isNum(d.tempMinC)) nums.push(Number(d.tempMinC));
          if (isNum(d.tempMaxC)) nums.push(Number(d.tempMaxC));
        });
        const lo = nums.length ? Math.min.apply(null, nums) : 0;
        const hi = nums.length ? Math.max.apply(null, nums) : 1;
        const span = Math.max(1, hi - lo);
        return list.slice(0, days).map((d, i) => {
          const left = isNum(d.tempMinC) ? ((Number(d.tempMinC) - lo) / span) * 100 : 0;
          const width = (isNum(d.tempMaxC) && isNum(d.tempMinC))
            ? Math.max(10, ((Number(d.tempMaxC) - Number(d.tempMinC)) / span) * 100) : 55;
          return Object.assign({}, d, {
            lo: fmtTemp(d.tempMinC, settings.unit), hi: fmtTemp(d.tempMaxC, settings.unit),
            left: Math.max(0, Math.min(100, left)), width: Math.max(10, Math.min(100, width)),
            today: i === 0,
          });
        });
      }, [primary, days, settings.unit]);

      const details = useMemo(() => {
        const cells = [];
        if (!cur) return cells;
        const push = (l, v, u, dot) => cells.push({ l, v, u: u || "", dot: dot || null });
        if (isNum(cur.feelsC)) push("体感", fmtTemp(cur.feelsC, settings.unit), "°");
        if (isNum(cur.humidity)) push("湿度", Math.round(cur.humidity), "%");
        if (isNum(cur.windKmh)) push("风速", round1(cur.windKmh), "km/h");
        if (cur.windScale) push("风力", String(cur.windScale), "");
        if (cur.windDirText) push("风向", String(cur.windDirText), "");
        if (isNum(cur.pressureHpa)) push("气压", Math.round(cur.pressureHpa), "hPa");
        if (isNum(cur.precipMm)) push("降水", round1(cur.precipMm), "mm");
        if (isNum(cur.uvIndex)) push("紫外线", Math.round(cur.uvIndex), "");
        if (isNum(cur.visibilityKm)) push("能见度", round1(cur.visibilityKm), "km");
        if (isNum(cur.cloudPct)) push("云量", Math.round(cur.cloudPct), "%");
        if (isNum(cur.aqi)) {
          const g = aqiGrade(cur.aqi);
          // 新版 extended 直接给 aqi_category；优先用它，取不到再按本地六级推算。
          push("空气质量", Math.round(cur.aqi), cur.aqiCategory || (g ? g.text : ""), g ? g.color : null);
        }
        if (cur.aqiPrimary) push("主要污染物", String(cur.aqiPrimary), "");
        const d0 = primary && primary.daily ? primary.daily[0] : null;
        if (d0) {
          if (d0.sunrise) push("日出", d0.sunrise, "");
          if (d0.sunset) push("日落", d0.sunset, "");
          if (isNum(d0.uvMax) && !isNum(cur.uvIndex)) push("紫外线峰值", Math.round(d0.uvMax), "");
          if (isNum(d0.precipSum)) push("今日降水", round1(d0.precipSum), "mm");
        }
        // 新版新增的分钟级降水摘要（仅国内城市）——有则补一格「短临」。
        const mp = primary && primary.minutely;
        if (mp && mp.summary) push("短临降水", String(mp.summary), "");
        return cells.slice(0, 12);
      }, [cur, primary, settings.unit]);

      /* 生活指数：Uapi indices=true 返回 18 项，界面只挑展示效果最好的几项。 */
      const lifeTips = useMemo(() => {
        const idx = primary && primary.lifeIndices;
        if (!idx) return [];
        const pick = [
          ["clothing", "穿衣"], ["uv", "紫外线"], ["comfort", "舒适度"], ["exercise", "运动"],
          ["car_wash", "洗车"], ["drying", "晾晒"], ["cold_risk", "感冒"], ["travel", "出行"],
          ["umbrella", "雨伞"], ["sunscreen", "防晒"], ["fishing", "钓鱼"], ["allergy", "过敏"],
          ["air_conditioner", "空调"], ["mood", "心情"], ["traffic", "交通"], ["beer", "啤酒"],
          ["air_purifier", "净化器"], ["pollen", "花粉"],
        ];
        const out = [];
        pick.forEach(([k, name]) => {
          const v = idx[k];
          if (v && (v.level || v.brief)) {
            out.push({ name, level: String(v.level || v.brief || ""), brief: String(v.brief || ""), advice: String(v.advice || "") });
          }
        });
        return out.slice(0, 8);
      }, [primary]);

      const liveState = allFailed ? "err" : (updated && Date.now() - updated > STALE_MS ? "stale" : "ok");
      const busy = phase === "locating" || locatingGps || refreshing;
      const pos = dragPos || settings.pos;

      /* 失败源汇总：README 承诺的「两源皆败时页脚上方给出汇总与重试」——
       * 之前只渲染了 .dwi-err 的 CSS 却从未挂载节点，本轮补上。
       * 单源失败在对照卡里已有具体原因；这里只在「有失败源」时给一行汇总 + 一键重试。 */
      const failSummary = useMemo(() => {
        if (!failList.length) return null;
        const lines = failList.map((r) => sourceLabel(r.source) + "：" + (r.error || "未知错误"));
        return { text: lines.join("；"), count: failList.length, all: allFailed };
      }, [failList, allFailed]);

      /* 场景化背景：由主源实况推出；无数据/关闭设置时回落默认蓝紫（视觉零差异）。
       * 输出 CSS 变量直接挂根节点 → 极光/温度渐变/细节层全部联动，且带 1.6s 过渡。 */
      const scene = useMemo(() => {
        if (settings.sceneBg === false || !cur) return null;
        const key = sceneOf(cur.desc, cur.icon, cur.isDay);
        return Object.assign({ key }, SCENES[key] || {
          c1: "#5b9bff", c2: "#8a7bff", c3: "#36d6c4", boost: 0, fx: "none",
        });
      }, [cur, settings.sceneBg]);

      /* 场景细节层（星/雨/雾霾）：纯装饰，数量克制以免抢戏；reduced-motion 时由 CSS 全局停。 */
      const sceneFx = useMemo(() => {
        if (!scene || scene.fx === "none") return [];
        const rand = (seed) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
        if (scene.fx === "stars") {
          return Array.from({ length: 14 }, (_, i) => ({
            k: "st" + i, cls: "dwi-spark",
            left: (4 + rand(i + 1) * 88).toFixed(1) + "%",
            top: (3 + rand(i + 9) * 34).toFixed(1) + "%",
            size: (1.5 + rand(i + 4) * 1.8).toFixed(1) + "px",
            delay: (rand(i + 2) * 3.4).toFixed(2) + "s",
          }));
        }
        if (scene.fx === "rain") {
          return Array.from({ length: 12 }, (_, i) => ({
            k: "dr" + i, cls: "dwi-drop",
            left: (rand(i + 3) * 96).toFixed(1) + "%",
            size: null,
            delay: (rand(i + 6) * 1.5).toFixed(2) + "s",
            dur: (1.1 + rand(i + 8) * 0.7).toFixed(2) + "s",
          }));
        }
        if (scene.fx === "haze") {
          // 雾霾：两团缓慢平移的浑浊光带（比雨更“闷”，刻意不动声色）
          return Array.from({ length: 2 }, (_, i) => ({
            k: "hz" + i, cls: "dwi-hazeband",
            left: i === 0 ? "-12%" : "46%", top: i === 0 ? "18%" : "52%",
            delay: "0s", dur: (9 + i * 4) + "s",
          }));
        }
        if (scene.fx === "snow") {
          // 飘雪：12 片慢速摇曳下落的白点（与 cloudy 的静态灰底形成动静区分）
          return Array.from({ length: 12 }, (_, i) => ({
            k: "fl" + i, cls: "dwi-flake",
            left: (rand(i + 5) * 94).toFixed(1) + "%",
            size: (2 + rand(i + 2) * 2.5).toFixed(1) + "px",
            delay: (rand(i + 7) * 7).toFixed(2) + "s",
            dur: (7 + rand(i + 3) * 6).toFixed(2) + "s",
          }));
        }
        return [];
      }, [scene]);

      /* 卡片方向与水平偏移：由锚点推导，不回写 pos */
      const placement = useMemo(() => {
        const W = window.innerWidth, H = window.innerHeight;
        const cx = pos ? pos.x : W / 2;
        const cy = pos ? pos.y : 32;
        const pillH = expanded ? 34 : PILL_H;
        const roomBelow = H - (cy + pillH / 2) - EDGE;
        const roomAbove = (cy - pillH / 2) - EDGE;
        const side = roomBelow >= roomAbove || roomBelow > 320 ? "below" : "above";
        const cw = Math.min(CARD_W, W - 20);
        const left = cx - cw / 2;
        let dx = 0;
        if (left < EDGE) dx = EDGE - left;
        else if (left + cw > W - EDGE) dx = (W - EDGE) - (left + cw);
        return { side, dx };
      }, [pos, expanded]);

      const setPrimary = useCallback((id) => {
        const list = normalizeActive(settingsStore.get().activeSources);
        if (!list.includes(id) || list[0] === id) return;
        settingsStore.set({ activeSources: [id].concat(list.filter((x) => x !== id)) });
      }, []);

      /* 胶囊内容 */
      let pillChildren;
      if (busy && noDataYet) {
        pillChildren = [
          h("div", { key: "sp", className: "dwi-spinner" }),
          h("span", { key: "t", className: "dwi-loadtxt" }, locatingGps ? "定位中…" : "加载中…"),
        ];
      } else if (errStateRef.current && noDataYet) {
        pillChildren = [
          h("span", { key: "i", className: "dwi-icon" }, "⚠️"),
          h("span", { key: "t", className: "dwi-loadtxt" }, "点击重试"),
          h("span", { key: "v", className: "dwi-live dwi-err" }),
        ];
      } else if (allFailed && loc) {
        // v2.1：已定位但所有源都失败 → 也给出明确的「点开看原因」态，
        // 而不是显示「—° 未定位」这种含糊信息。
        pillChildren = [
          h("span", { key: "i", className: "dwi-icon" }, "⚠️"),
          h("span", { key: "t", className: "dwi-loadtxt" }, "数据源失败"),
          h("span", { key: "v", className: "dwi-live dwi-err" }),
        ];
      } else {
        pillChildren = [h("span", { key: "i", className: "dwi-icon" }, cur ? cur.icon : "🌦️")];
        pillChildren.push(h("span", { key: "t", className: "dwi-temp" }, fmtTemp(curTemp, settings.unit, "—") + "°"));
        pillChildren.push(h("span", { key: "s", className: "dwi-sep" }));
        if (expanded) pillChildren.push(h(PillClock, { key: "c", showSeconds: settings.clockSeconds }));
        else if (shortLoc) pillChildren.push(h("span", { key: "l", className: "dwi-loc", title: shortLoc }, shortLoc));
        else pillChildren.push(h("span", { key: "l", className: "dwi-loc" }, "未定位"));
        pillChildren.push(h("span", {
          key: "v", className: "dwi-live" + (liveState !== "ok" ? " dwi-" + liveState : ""),
          title: liveState === "err" ? "数据源不可用" : liveState === "stale" ? "数据已过期" : "数据正常",
        }));
      }

      const locSub = [
        loc && loc.region, loc && loc.country,
        loc ? (loc.source === "ip" ? "IP" : loc.source === "gps" ? "GPS" : "手动") : null,
        primary ? sourceLabel(primary.source) : null,
      ].filter(Boolean).join(" · ") || "未定位（点右上角 GPS 或搜索城市）";

      const rootCls = "dwi-root dwi-theme-" + theme + (pos ? "" : " dwi-initial")
        + (dragging ? " dwi-dragging" : "") + (scene ? " dwi-scene" : "");
      const rootStyle = Object.assign(
        { "--dwi-fs": settings.fontSize + "px", "--dwi-alpha": String((settings.opacity || 100) / 100) },
        scene ? { "--dwi-c1": scene.c1, "--dwi-c2": scene.c2, "--dwi-c3": scene.c3,
          "--dwi-scene-boost": String(scene.boost) } : {},
        pos ? { left: pos.x + "px", top: pos.y + "px" } : {}
      );

      const pill = h("div", {
        className: "dwi-hit", role: "button", tabIndex: 0,
        "aria-label": "天气看板：单击展开，拖动移动，双击复位",
        "aria-expanded": expanded ? "true" : "false",
        title: "单击展开/收起 · 拖动移动 · 双击复位",
        onPointerDown: (e) => startDrag(e, { tapAction: "toggle" }),
        onDoubleClick: handleDouble,
        onKeyDown: (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded((v) => !v); }
          else if (e.key === "r" || e.key === "R") refresh(false);
          else if (e.key === "u" || e.key === "U") settingsStore.set({ unit: settings.unit === "C" ? "F" : "C" });
        },
      },
        h("div", {
          className: "dwi-pill" + (busy ? " dwi-loading" : "") + (expanded ? " dwi-expanded" : ""),
        }, ...pillChildren));

      return h("div", {
        ref: rootRef, className: rootCls, style: rootStyle,
        "data-dsh-plugin": name,
        onPointerEnter: onEnter, onPointerLeave: onLeave,
      },
        pill,
        // 欢迎指引优先于卡片：首次进入时先讲完，再把界面交还给看板
        guideOpen ? h("div", {
          className: "dwi-anchor dwi-pop" + (placement.side === "above" ? " dwi-above" : ""),
          style: { marginLeft: placement.dx + "px" },
          onClick: (e) => e.stopPropagation(),
        }, h(GuideCard, {
          index: guideStep, onGo: goGuide, onSkip: finishGuide, onFinish: finishGuide,
        })) : null,
        expanded ? h("div", {
          className: "dwi-anchor dwi-pop" + (placement.side === "above" ? " dwi-above" : ""),
          style: { marginLeft: placement.dx + "px" },
          onClick: (e) => e.stopPropagation(),
        },
          h("div", { className: "dwi-card" },
            h("div", { className: "dwi-bg" },
              h("span", { className: "b1" }), h("span", { className: "b2" }), h("span", { className: "b3" }),
              sceneFx.map((fx) => h("span", {
                key: fx.k, className: fx.cls,
                style: Object.assign(
                  { left: fx.left, animationDelay: fx.delay, animationDuration: fx.dur || undefined },
                  fx.top ? { top: fx.top } : {},
                  fx.size ? { width: fx.size, height: fx.size } : {},
                ),
              }))),
            h("div", { className: "dwi-card-scroll" },

              /* 头部（标题栏空白可直接拖动，无需先收起） */
              h("div", {
                className: "dwi-head", title: "按住空白处拖动移动 · 双击复位",
                onPointerDown: (e) => startDrag(e, { skipInteractive: true, tapAction: "none" }),
                onDoubleClick: handleDouble,
              },
                h("div", { className: "dwi-headLoc" },
                  loc && loc.flag ? h("span", { className: "dwi-flag" }, loc.flag) : null,
                  h("div", { style: { minWidth: 0 } },
                    h("div", { className: "dwi-locName", title: shortLoc }, shortLoc || "未定位"),
                    h("div", { className: "dwi-locSub" }, locSub))
                ),
                h("div", { className: "dwi-tools" },
                  h("button", {
                    type: "button", className: "dwi-btn" + (settings.unit === "F" ? " dwi-active" : ""),
                    title: "切换 °C / °F（快捷键 U）",
                    onClick: (e) => { e.stopPropagation(); settingsStore.set({ unit: settings.unit === "C" ? "F" : "C" }); },
                  }, svgIcon(ICON.unit)),
                  h("button", {
                    type: "button", className: "dwi-btn" + (searchOpen ? " dwi-active" : ""),
                    title: "搜索城市",
                    onClick: (e) => { e.stopPropagation(); setSearchOpen((v) => !v); },
                  }, svgIcon(ICON.search)),
                  h("button", {
                    type: "button", className: "dwi-btn" + (locatingGps ? " dwi-spinning" : ""),
                    title: "GPS 精确定位",
                    onClick: (e) => { e.stopPropagation(); locate("gps"); },
                  }, svgIcon(ICON.gps)),
                  h("button", {
                    type: "button", className: "dwi-btn" + (refreshing ? " dwi-spinning-rev" : ""),
                    title: "立即刷新（快捷键 R）",
                    onClick: (e) => { e.stopPropagation(); refresh(false); },
                  }, svgIcon(ICON.refresh)),
                  h("button", {
                    type: "button", className: "dwi-btn", title: "收起（Esc）",
                    onClick: (e) => { e.stopPropagation(); setExpanded(false); },
                  }, svgIcon(ICON.close))
                )
              ),

              /* 城市搜索（支持 ↑/↓ 键盘导航 + Enter 选中 + Esc 清空） */
              searchOpen ? h("div", { className: "dwi-search" },
                h("input", {
                  className: "dwi-searchInput", autoFocus: true, placeholder: "输入城市名，如 北京 / Tokyo / 深圳南山区",
                  value: query,
                  onChange: (e) => { setQuery(e.target.value); setSugIdx(-1); },
                  onKeyDown: (e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      if (suggest.length) setSugIdx((i) => (i + 1) % suggest.length);
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      if (suggest.length) setSugIdx((i) => (i <= 0 ? suggest.length - 1 : i - 1));
                    } else if (e.key === "Enter") {
                      const pick = suggest[sugIdx >= 0 ? sugIdx : 0];
                      if (pick) { e.preventDefault(); pickSuggest(pick); }
                    } else if (e.key === "Escape") {
                      e.stopPropagation();
                      setSearchOpen(false);
                    }
                  },
                }),
                suggest.length
                  ? h("div", { className: "dwi-suggest" }, suggest.map((it, i) => h("div", {
                    key: it.label + "_" + i,
                    className: "dwi-suggestItem" + (i === sugIdx ? " dwi-sugOn" : ""),
                    onMouseEnter: () => setSugIdx(i),
                    onClick: () => pickSuggest(it),
                  },
                    h("span", { className: "dwi-suggestName" }, it.label),
                    h("span", { className: "dwi-suggestSub" }, [it.region, it.country].filter(Boolean).join(" · ")))))
                  : (query.trim() ? h("div", { className: "dwi-suggest" },
                      h("div", {
                        className: "dwi-suggestItem",
                        style: { color: "var(--dwi-dim)", cursor: "default" },
                      }, "没有匹配的城市，换个写法试试")) : null)
              ) : null,

              /* 气象预警 */
              alerts.map((a, i) => h("div", {
                key: "al" + i,
                className: "dwi-alert" + (/红|橙|severe|extreme|red|orange/i.test((a.level || "") + (a.title || "")) ? " dwi-red" : ""),
              },
                h("span", null, "⚠️"),
                h("div", { style: { minWidth: 0 } },
                  h("b", null, a.title || a.type || "气象预警"),
                  a.level ? " · " + a.level : "",
                  a.text ? h("div", { style: { marginTop: 2 } }, a.text) : null))
              ),

              /* 生活指数（Uapi indices=true，18 项；只挑常用几项展示） */
              lifeTips.length ? h(Fragment, null,
                h("div", { className: "dwi-sectionTitle" }, "生活指数",
                  h("em", { style: { marginLeft: "auto" } }, primary ? sourceLabel(primary.source) : "")),
                h("div", { className: "dwi-tips" }, lifeTips.map((t, i) => h("div", {
                  key: "tip" + i, className: "dwi-tip", title: t.advice || "",
                },
                  h("span", { className: "dwi-tipName" }, t.name),
                  h("span", { className: "dwi-tipLv" }, t.level),
                  t.brief && t.brief !== t.level ? h("span", { className: "dwi-tipBrief" }, t.brief) : null
                )))) : null,

              /* 实况：大号温度 + 实时时钟 */
              h("div", { className: "dwi-now" },
                h("div", { className: "dwi-nowMain" },
                  h("span", { className: "dwi-nowIcon" }, cur ? cur.icon : "🌦️"),
                  h("div", { className: "dwi-nowRead" },
                    h("span", { className: "dwi-nowTemp" }, fmtTemp(curTemp, settings.unit, "--")),
                    h("span", { className: "dwi-nowDeg" }, "°")),
                  h(RealtimeClock, { showSeconds: settings.clockSeconds })
                ),
                h("div", { className: "dwi-nowCond" }, cur ? cur.desc : (allFailed ? "数据不可用" : "—")),
                h("div", { className: "dwi-nowMeta" }, [
                  isNum(cur && cur.feelsC) ? "体感 " + fmtTemp(cur.feelsC, settings.unit) + "°" : null,
                  isNum(cur && cur.tempMaxC) && isNum(cur && cur.tempMinC)
                    ? fmtTemp(cur.tempMinC, settings.unit) + "° ~ " + fmtTemp(cur.tempMaxC, settings.unit) + "°"
                    : (dayRows[0] ? dayRows[0].lo + "° ~ " + dayRows[0].hi + "°" : null),
                  (cur && cur.windDirText) ? cur.windDirText + (cur.windScale ? " " + cur.windScale : "") : null,
                ].filter(Boolean).join(" · "))
              ),

              /* 双源对照：点卡片设为主源 */
              active.length ? h(Fragment, null,
                h("div", { className: "dwi-sectionTitle" },
                  "数据源对照",
                  h("em", { style: { marginLeft: "auto" } }, "点卡片设为主源 · " + active.length + "/" + MAX_SOURCES)),
                h("div", { className: "dwi-sources" + (active.length === 1 ? " dwi-single" : "") },
                  active.map((id, i) => {
                    const def = SOURCE_REGISTRY[id];
                    const r = results[id];
                    const ok = !!(r && r.ok);
                    const isPrimary = primary && primary.source === id;
                    return h("div", {
                      key: id, role: "button", tabIndex: 0,
                      className: "dwi-sourceCard" + (isPrimary ? " dwi-primary" : ""),
                      style: { animationDelay: (i * 0.05) + "s" },
                      title: isPrimary ? "当前主数据源" : "点击设为主要数据源",
                      onClick: () => setPrimary(id),
                      onKeyDown: (e) => { if (e.key === "Enter") setPrimary(id); },
                    },
                      h("span", { className: "dwi-star" }, isPrimary ? "★ 主源" : "设为主源"),
                      h("div", { className: "dwi-sourceHead" },
                        def.label,
                        h("span", { className: "dwi-live" + (ok ? "" : " dwi-err"), style: { width: 6, height: 6 } })),
                      h("div", { className: "dwi-sourceTemp" }, ok ? fmtTemp(r.current.tempC, settings.unit) + "°" : "—"),
                      h("div", { className: "dwi-sourceCond" }, ok ? r.current.desc : (r && r.error ? r.error : "等待中…")))
                  ;
                  })
                )
              ) : null,

              /* 失败汇总 + 一键重试：单源失败看对照卡即可；两源皆败时给醒目汇总块 */
              failSummary ? h("div", { className: "dwi-err" + (failSummary.all ? " dwi-errAll" : "") },
                h("span", null, failSummary.all ? "⚠️" : "ℹ️"),
                h("div", { style: { minWidth: 0, flex: 1 } },
                  failSummary.all
                    ? h("b", null, "所有数据源都失败了")
                    : h("b", null, failSummary.count + " 个数据源未出数"),
                  h("div", null, failSummary.text)),
                h("button", {
                  type: "button", onClick: (e) => { e.stopPropagation(); refresh(false); },
                }, "重试")) : null,

              /* 详细数据（悬停有效果） */
              details.length ? h(Fragment, null,
                h("div", { className: "dwi-sectionTitle" }, "详细数据",
                  h("em", { style: { marginLeft: "auto" } }, primary ? "来自 " + sourceLabel(primary.source) : "")),
                h("div", { className: "dwi-grid" }, details.map((c, i) => h("div", {
                  key: c.l + i, className: "dwi-cell", style: { animationDelay: (i * 0.03) + "s" },
                  title: c.l + "：" + c.v + (c.u ? " " + c.u : ""),
                },
                  h("div", { className: "dwi-cellLabel" },
                    c.dot ? h("span", { className: "dwi-dot", style: { background: c.dot, boxShadow: "0 0 6px " + c.dot } }) : null,
                    c.l),
                  h("div", { className: "dwi-cellVal" }, String(c.v), c.u ? h("i", null, c.u) : null))))
              ) : null,

              /* 逐时（横向滚动到底时右缘渐隐自动淡出） */
              hours.length ? h(Fragment, null,
                h("div", { className: "dwi-sectionTitle" }, "未来逐时", h("em", { style: { marginLeft: "auto" } }, "横向可滚动")),
                h("div", { className: "dwi-hourly" },
                  h("div", {
                    className: "dwi-hourRow",
                    onScroll: (e) => {
                      const row = e.currentTarget;
                      const wrap = row.parentElement;          // .dwi-hourly（渐隐挂它身上）
                      if (!wrap) return;
                      const end = row.scrollWidth - row.clientWidth;
                      const atEnd = end <= 4 || row.scrollLeft >= end - 4;
                      wrap.classList.toggle("dwi-scrolled-end", atEnd);
                    },
                  }, hours.map((hr, i) => h("div", {
                    key: i, className: "dwi-hour" + (i === 0 ? " dwi-hnow" : ""),
                    style: { animationDelay: (i * 0.025) + "s" }, title: hr.desc || "",
                  },
                    h("div", { className: "dwi-hourTime" }, hr.time || ""),
                    h("div", { className: "dwi-hourIcon" }, hr.icon),
                    h("div", { className: "dwi-hourTemp" }, fmtTemp(hr.tempC, settings.unit) + "°"),
                    h("div", { className: "dwi-hourPop" }, isNum(hr.pop) && hr.pop > 0 ? hr.pop + "%" : "")))))) : null,

              /* 三日 / 五日 / 七日预报 */
              dayRows.length ? h(Fragment, null,
                h("div", { className: "dwi-sectionTitle" },
                  (dayRows.length >= 7 ? "七日预报" : dayRows.length >= 5 ? "五日预报" : "三日预报"),
                  h("em", { style: { marginLeft: "auto" } }, primary ? sourceLabel(primary.source) : "")),
                h("div", { className: "dwi-daily" }, dayRows.map((d, i) => h("div", {
                  key: (d.date || "d") + i,
                  className: "dwi-day" + (d.today ? " dwi-today" : ""),
                  style: { animationDelay: (i * 0.04) + "s" },
                  title: [d.desc, d.descNight ? "夜间 " + d.descNight : null,
                    d.windDay ? d.windDay + " " + (d.windScaleDay || "") : null,
                    isNum(d.pop) ? "降水概率 " + d.pop + "%" : null].filter(Boolean).join(" · "),
                },
                  h("div", { className: "dwi-dayDate" }, d.label),
                  h("div", { className: "dwi-dayIcon" }, d.icon),
                  h("div", { className: "dwi-dayCond" }, d.desc),
                  h("div", { className: "dwi-dayRange" },
                    h("div", { className: "dwi-dayLo" }, d.lo + "°"),
                    h("div", { className: "dwi-dayBar" },
                      h("div", { className: "dwi-dayBarFill", style: { left: d.left + "%", width: d.width + "%" } })),
                    h("div", { className: "dwi-dayHi" }, d.hi + "°")),
                  h("div", { className: "dwi-dayPop" }, isNum(d.pop) && d.pop > 0 ? d.pop + "%" : ""))))
              ) : null,

              /* 页脚 */
              h("div", { className: "dwi-foot" },
                h("span", { className: "dwi-live" + (liveState !== "ok" ? " dwi-" + liveState : "") }),
                h("span", null, updated ? relTime(Date.now() - updated) : "尚未取到数据"),
                primary && primary.reportTime ? h("Fragment", null,
                  h("span", null, "·"),
                  h("span", { className: "dwi-src" }, "报时 " + primary.reportTime)) : null,
                h("button", {
                  type: "button", className: "dwi-footBtn", title: "打开 DSH 设置中的天气看板页",
                  onClick: (e) => { e.stopPropagation(); setExpanded(false); openSettingsPanel(); },
                }, "设置 →"))
            )
          )
        ) : null
      );
    }

    /** 尽力打开 DSH 设置面板（找不到触发按钮就什么都不做，不抛错）。 */
    function openSettingsPanel() {
      try {
        const sel = '[data-dsh="settings"],[data-settings-trigger],[aria-label="设置"],[aria-label="Settings"]';
        const btn = document.querySelector(sel);
        if (btn && typeof btn.click === "function") btn.click();
      } catch { /* ignore */ }
    }

    /* ═══ 10. 设置页 ═════════════════════════════════════════════════════════ */

    function Row(props) {
      return h("div", { className: "dwis-row" },
        h("div", { style: { minWidth: 0 } },
          h("div", { className: "dwis-rowLabel" }, props.label),
          props.hint ? h("div", { className: "dwis-rowHint" }, props.hint) : null),
        h("div", { className: "dwis-ctl" }, props.children));
    }
    function Seg(props) {
      return h("div", { className: "dwis-seg" }, props.options.map((o) => h("button", {
        key: String(o.value), type: "button",
        className: props.value === o.value ? "dwis-on" : "",
        onClick: () => props.onChange(o.value),
      }, o.label)));
    }
    function Switch(props) {
      return h("button", {
        type: "button", role: "switch", "aria-checked": props.checked ? "true" : "false",
        "aria-label": props.label || "开关", title: props.title || "",
        className: "dwis-switch" + (props.checked ? " dwis-on" : ""),
        onClick: () => props.onChange(!props.checked),
      }, h("span", null));
    }

    function SettingsPage() {
      const [s, setSettings] = useState(() => settingsStore.get());
      useEffect(() => settingsStore.subscribe(setSettings), []);
      const active = normalizeActive(s.activeSources);
      const upd = (patch) => settingsStore.set(patch);

      const toggleSource = (id, on) => {
        let next = active.slice();
        if (on) {
          if (!next.includes(id)) {
            if (next.length >= MAX_SOURCES) next = next.slice(1).concat(id); // 挤掉最早的
            else next.push(id);
          }
        } else next = next.filter((x) => x !== id);
        upd({ activeSources: next });
      };

      return h("div", { className: "dwis-wrap" },
        /* hero 横幅：与悬浮卡片同源的「极光 + 玻璃」语言 */
        h("div", { className: "dwis-hero" },
          h("div", { className: "dwis-heroTitle" },
            h("span", { className: "dwis-heroOrb" }, "🌤️"),
            "天气看板 · dsh-weather-island"),
          h("div", { className: "dwis-heroSub" },
            h("span", { className: "dwis-chip" }, h("i"), "灵动岛悬浮看板"),
            "所有修改即时生效 · 界面跟随 DSH 深浅主题 · 默认 Uapi + Open-Meteo 双源（免 Key 开箱可用）")),

        /* 外观 */
        h("div", { className: "dwis-sec" },
          h("div", { className: "dwis-secT" }, "外观"),
          h(Row, { label: "界面主题", hint: "自动 = 跟随 DSH 与系统深浅色；也可在此强制指定。" },
            h(Seg, {
              value: s.theme, onChange: (v) => upd({ theme: v }),
              options: [{ value: "auto", label: "自动" }, { value: "dark", label: "深色" }, { value: "light", label: "浅色" }],
            })),
          h(Row, { label: "字体大小", hint: "看板内所有文字按此基准等比缩放。" },
            h("input", {
              type: "range", className: "dwis-range", min: 12, max: 22, step: 1, value: s.fontSize,
              style: { "--dwis-fill": ((s.fontSize - 12) / 10 * 100) + "%" },
              onChange: (e) => upd({ fontSize: Number(e.target.value) }),
            }),
            h("span", { className: "dwis-val" }, s.fontSize + "px")),
          h(Row, { label: "玻璃透明度", hint: "只影响毛玻璃背板，文字始终满不透明。" },
            h("input", {
              type: "range", className: "dwis-range", min: 45, max: 100, step: 1, value: s.opacity,
              style: { "--dwis-fill": ((s.opacity - 45) / 55 * 100) + "%" },
              onChange: (e) => upd({ opacity: Number(e.target.value) }),
            }),
            h("span", { className: "dwis-val" }, s.opacity + "%")),
          h(Row, { label: "场景化背景", hint: "卡片背景随当前天气与昼夜自动切换配色（晴/夜/雨/雪/雷/霾各有一套极光），关闭则固定蓝紫。" },
            h(Switch, {
              checked: s.sceneBg !== false, onChange: (v) => upd({ sceneBg: v }),
              label: "场景化背景", title: "按天气与昼夜自动切换卡片背景配色",
            })),
          h(Row, { label: "温度单位", hint: "也可在胶囊聚焦时按 U 键快速切换。" },
            h(Seg, {
              value: s.unit, onChange: (v) => upd({ unit: v }),
              options: [{ value: "C", label: "°C" }, { value: "F", label: "°F" }],
            })),
          h(Row, { label: "实时时钟显示秒", hint: "卡片大号温度右侧的时钟；关闭时只显示 HH:MM。" },
            h(Switch, {
              checked: s.clockSeconds, onChange: (v) => upd({ clockSeconds: v }),
              label: "时钟显示秒", title: "开启后时钟显示 HH:MM:SS",
            })),
          h(Row, { label: "预报天数", hint: "影响多日预报与逐时条长度。墨迹爬虫取 forecast7 页，最多 7 天。" },
            h(Seg, {
              value: s.forecastDays, onChange: (v) => upd({ forecastDays: Number(v) }),
              options: [{ value: 3, label: "三日" }, { value: 5, label: "五日" }, { value: 7, label: "七日" }],
            })),
          h(Row, { label: "显示逐时预报", hint: "关闭后卡片更紧凑。" },
            h(Switch, { checked: s.showHourly, onChange: (v) => upd({ showHourly: v }), label: "逐时预报" })),
          h(Row, { label: "悬停即展开", hint: "鼠标移到胶囊上自动展开，移开自动收起。" },
            h(Switch, { checked: s.hoverExpand, onChange: (v) => upd({ hoverExpand: v }), label: "悬停展开" })),
          h(Row, { label: "自动刷新", hint: "页面在后台时自动暂停，回到前台若已过期立即补一次。" },
            h(Seg, {
              value: s.refreshMinutes, onChange: (v) => upd({ refreshMinutes: Number(v) }),
              options: [5, 10, 15, 30].map((m) => ({ value: m, label: m + " 分" })),
            })),
          h(Row, { label: "灵动岛位置", hint: "拖动胶囊或卡片标题栏即可移动，只记住拖动落点；单纯点击不会移动位置。" },
            h("button", { className: "dwis-btn", onClick: () => upd({ pos: null }) },
              s.pos ? "复位到顶部居中" : "已是顶部居中")))

        /* 数据源 */
        , h("div", { className: "dwis-sec" },
          h("div", { className: "dwis-secT" },
            "数据源（最多 " + MAX_SOURCES + " 个 · 勾选顺序即主源顺序）",
            h("span", { className: "dwis-srcTag dwis-primary", style: { marginLeft: "auto" } },
              "已选 " + active.length + "/" + MAX_SOURCES)),
          SOURCE_ORDER.map((id) => {
            const def = SOURCE_REGISTRY[id];
            const on = active.includes(id);
            const isPrimary = on && active[0] === id;
            const blocked = !on && active.length >= MAX_SOURCES;
            const keyFields = def.keyFields || [];
            return h("div", { key: id, className: "dwis-src" },
              h("input", {
                type: "checkbox", className: "dwis-check", checked: on, disabled: blocked,
                title: blocked ? "最多同时启用 " + MAX_SOURCES + " 个源，先取消一个再勾选" : (on ? "已启用" : "未启用"),
                onChange: (e) => toggleSource(id, e.target.checked),
              }),
              h("div", { className: "dwis-srcMain" },
                h("span", { className: "dwis-srcName" }, def.label),
                isPrimary ? h("span", { className: "dwis-srcTag dwis-primary" }, "主源") : null,
                def.free ? h("span", { className: "dwis-srcTag" }, "免 Key") : h("span", { className: "dwis-srcTag dwis-key" }, "需 Key"),
                h("div", { className: "dwis-srcDesc" }, def.desc),
                blocked ? h("div", { className: "dwis-srcDesc" }, "已达上限：取消一个已启用源后即可勾选") : null),
              def.docsUrl ? h("a", {
                className: "dwis-link", href: def.docsUrl, target: "_blank", rel: "noreferrer noopener", title: "接口文档",
              }, svgIcon(ICON.link), "文档 ↗") : null,
              keyFields.length ? h("div", { className: "dwis-srcKey" },
                keyFields.map((f) => h("input", {
                  key: f, className: "dwis-input", type: "text", autoComplete: "off", spellcheck: false,
                  placeholder: (def.keyLabels && def.keyLabels[f]) || "Key",
                  value: s.keys[f] || "",
                  onChange: (e) => upd({ keys: Object.assign({}, s.keys, { [f]: e.target.value }) }),
                })),
                def.keyApplyUrl ? h("a", {
                  className: "dwis-link", href: def.keyApplyUrl, target: "_blank", rel: "noreferrer noopener",
                }, svgIcon(ICON.link), "获取 Key ↗") : null,
                keyFields.every((f) => s.keys[f]) ? h("span", { className: "dwis-ok" }, "✓ 已填写") : null) : null
            );
          }),
          h("div", { className: "dwis-tip" },
            "主数据源决定大字温度、详细数据与多日预报的取数；该源失败时自动回退到另一个已启用源。",
            h("br"), "当前优先序：", active.map((id) => SOURCE_REGISTRY[id].label).join(" → ") || "（未选择）"))

        /* 定位与网络 */
        , h("div", { className: "dwis-sec" },
          h("div", { className: "dwis-secT" }, "定位与网络"),
          h(Row, { label: "启动时定位方式", hint: "上次手动 = 使用卡片里搜索选定过的城市（会持久记住，最准）。" },
            h(Seg, {
              value: s.locPref, onChange: (v) => upd({ locPref: v }),
              options: [{ value: "ip", label: "IP" }, { value: "gps", label: "GPS" }, { value: "manual", label: "上次手动" }],
            })),
          h(Row, { label: "已记住的城市", hint: "在卡片里用搜索图标选定城市后自动记录。" },
            h("span", { className: "dwis-val", style: { minWidth: 0, textAlign: "left", maxWidth: 260 } },
              s.manualLoc ? s.manualLoc.label + "（" + round1(s.manualLoc.lat) + ", " + round1(s.manualLoc.lon) + "）" : "尚无记录")),
          h(Row, { label: "CORS 代理", hint: "留空 = 全部直连（默认，最快）。Uapi 被 CORS/防盗链拦或 429、以及墨迹爬虫（该站无 CORS 头）都需要它。支持 {{url}} 占位符，或以 = 结尾自动拼接。公共免费代理大多已失效，建议填自建（如 Cloudflare Worker）。" },
            h("input", {
              className: "dwis-input", value: s.corsProxy, spellcheck: false,
              placeholder: "https://your-worker.example.dev/?url={{url}}",
              onChange: (e) => upd({ corsProxy: e.target.value }),
            })),
          h("div", { className: "dwis-note", style: { marginTop: 8 } },
            "⚠️ 代理会把含 Key 的完整请求地址交给第三方中转，请自行评估；只在必须代理的源上开启。"))

        /* 使用提示与数据 */
        , h("div", { className: "dwis-sec" },
          h("div", { className: "dwis-secT" }, "操作方式与本地数据"),
          h("div", { className: "dwis-note" },
            "· 单击胶囊 = 展开 / 收起；拖动 = 移动并记住落点；双击 = 复位到顶部居中。", h("br"),
            "· 展开后标题栏空白处可直接拖动，不必先收起。", h("br"),
            "· 键盘：胶囊聚焦时 Enter / Space 展开，R 刷新，U 切换 °C/°F；Esc 收起。", h("br"),
            "· 搜索城市时可用 ↑ / ↓ 选择建议、Enter 确认。", h("br"),
            "· 定位、天气与设置都只存在本机浏览器 localStorage，不会上传。"),
          h("div", { style: { height: 6 } }),
          h("div", { className: "dwis-row" },
            h("div", null,
              h("div", { className: "dwis-rowLabel" }, "欢迎指引"),
              h("div", { className: "dwis-rowHint" }, s.seenGuide
                ? "首次加载时的操作指引，已看过；可随时再看一遍。"
                : "首次加载时会自动展示的操作指引。")),
            h("button", {
              className: "dwis-btn",
              onClick: () => { settingsStore.set({ seenGuide: false }); guideReplay.fire(); },
            }, "再看一遍指引")),
          h("div", { className: "dwis-row" },
            h("div", null,
              h("div", { className: "dwis-rowLabel" }, "清除天气缓存"),
              h("div", { className: "dwis-rowHint" }, "删除首屏缓存的定位与天气数据（设置保留）。")),
            h("button", {
              className: "dwis-btn",
              onClick: () => { try { window.localStorage.removeItem(LS_WEATHER); } catch { /* ignore */ } },
            }, "清除缓存")),
          h("div", { className: "dwis-row" },
            h("div", null,
              h("div", { className: "dwis-rowLabel" }, "恢复默认设置"),
              h("div", { className: "dwis-rowHint" }, "外观、数据源、Key、位置全部回到出厂状态。")),
            h("button", { className: "dwis-btn dwis-danger", onClick: () => settingsStore.reset() }, "恢复默认")))

        , h("div", { className: "dwis-note" },
          "数据来源：",
          SOURCE_ORDER.map((id) => {
            const d = SOURCE_REGISTRY[id];
            return h("span", { key: id },
              d.docsUrl
                ? h("a", { className: "dwis-link", href: d.docsUrl, target: "_blank", rel: "noreferrer noopener" }, d.label)
                : d.label,
              "  ");
          }),
          h("br"), "定位：ipwho.is（IP）· 浏览器定位 + BigDataCloud 反查（GPS）· Open-Meteo Geocoding（城市搜索）。")
      );
    }

    /* ═══ 11. 装配 ═══════════════════════════════════════════════════════════ */

    const apply = (ctx) => {
      ctx.inject(inject, (scope) => {
        const slots = scope.get("slots");
        slots.inject(OVERLAY_SLOT, () => slots.register(
          { name: OVERLAY_SLOT, id: PLUGIN_ID, order: 200, label: "天气" },
          (props) => h(WeatherIsland, props)));
        slots.inject(SETTINGS_SLOT, () => slots.register(
          { name: SETTINGS_SLOT, id: PLUGIN_ID, order: 46, label: "天气看板设置" },
          (props) => h(SettingsPage, props)));
      });
    };

    const Config = {
      "~standard": {
        version: 1, vendor: PLUGIN_ID,
        validate(config) {
          if (config === undefined || config === null) return { value: {} };
          if (typeof config !== "object" || Array.isArray(config)) {
            return { issues: [{ message: "plugin config must be an object" }] };
          }
          // Host 侧可下发默认值覆盖；客户端仍会逐键清洗，脏值不会破坏界面。
          const allow = ["fontSize", "unit", "refreshMinutes", "locPref", "forecastDays",
            "activeSources", "corsProxy", "theme", "opacity", "clockSeconds",
            "hoverExpand", "showHourly", "sceneBg", "keys"];
          const value = {};
          Object.keys(config).forEach((k) => { if (allow.indexOf(k) >= 0) value[k] = config[k]; });
          return { value };
        },
      },
    };

    exports.name = name;
    exports.inject = inject;
    exports.apply = apply;
    exports.Config = Config;
    /** 暴露纯逻辑层，供 verify-client.cjs 在无浏览器环境下做单元断言。 */
    exports.internals = {
      fetchJson, fetchSource, withProxy, withRetry, sanitize, DEFAULTS, CLAMP,
      fetchEndpoints, uapiEndpoints, proxyUrl, EP_HEALTH,
      isRetryableError, errWith, numFromHeader, epReady, epMarkOk, epMarkFail,
      SOURCE_REGISTRY, SOURCE_ORDER, PRIMARY_PRIORITY, normalizeActive, missingKeyOf,
      loadWeather, detectTheme, aqiGrade, settingsStore,
      LS_SETTINGS, LS_SETTINGS_LEGACY, GUIDE_STEPS, guideReplay,
      SCENES, sceneOf, fetchIpLocation,
      wmoInfo, qweatherInfo, cnInfo, wttrInfo, caiyunInfo, owmInfo,
      fmtTemp, degToCompass, parseLocal, parseIso, normalizeReportTime, dayLabel, hhmm, relTime,
      fetchUapi, fetchOpenMeteo, fetchWttr, fetchCaiyun, fetchOpenWeather, fetchMoji,
      fetchHtml, parseMojiCurrent, parseMojiForecast, parseMojiIndices,
      mojiDateFromText, mojiDateFromWeek, stripTags,
    };
    return module.exports;
  },
});
