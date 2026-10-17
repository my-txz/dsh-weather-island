# dsh-weather-island



![Version](https://img.shields.io/badge/version-2.1.0-blue?style=flat-square)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)
![Platform](https://img.shields.io/badge/platform-DSH-7B61FF?style=flat-square)
![Weather Island](https://img.shields.io/badge/weather-island-00BFFF?style=flat-square)
![Data Sources](https://img.shields.io/badge/data%20sources-6-ff69b4?style=flat-square)
![No Key](https://img.shields.io/badge/API%20Key-Free%20Friendly-brightgreen?style=flat-square)
![CORS](https://img.shields.io/badge/CORS-Friendly-blue?style=flat-square)
![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=flat-square)
![AI](https://img.shields.io/badge/AI-DeepSeek%20v4.1%20%2B%20GLM5.3-9cf?style=flat-square)

![GitHub stars](https://img.shields.io/github/stars/my-txz/dsh-weather-island)

**简体中文** | [English](./README.en.md)

> 天气不该只是一个小数字。  
> 它应该是一块能拖到任何角落、随晴雨昼夜换肤、双源对照、还能提醒你什么时候下雨的「灵动岛」。

**dsh-weather-island** 是 DeepSeek Harness（DSH）的天气插件：可拖动的灵动岛式悬浮天气看板。  
免 Key 开箱即用，默认 **Uapi（主）+ Open-Meteo** 双源并排；6 大数据源可选，最多 2 源对照；深浅主题自动适配；失败自动换源，界面无感。

![icon](https://github.com/my-txz/dsh-weather-island/blob/main/dsh-weather-island/icon.svg)

![DSH icon](https://picui.ogmua.cn/s1/2026/10/17/6ad32644828d2.webp)

<p align="center">
  <img src="https://picui.ogmua.cn/s1/2026/10/17/6ad3257930151.webp" alt="dsh-weather-island 界面预览 5" width="60%" />
  <img src="https://picui.ogmua.cn/s1/2026/10/17/6ad3257878eee.webp" alt="dsh-weather-island 界面预览 2" width="48%" />
</p>
<p align="center">
  <img src="https://picui.ogmua.cn/s1/2026/10/17/6ad325786ccb9.webp" alt="dsh-weather-island 界面预览 3" width="48%" />
  <img src="https://picui.ogmua.cn/s1/2026/10/17/6ad32578860ea.webp" alt="dsh-weather-island 界面预览 4" width="48%" />
</p>
<p align="center">
  
  <img src="https://picui.ogmua.cn/s1/2026/10/17/6ad325786fecb.webp" alt="dsh-weather-island 界面预览 1" width="48%" />
</p>

---

## ✨ 为什么是它

- **像灵动岛一样顺手**：拖到顺手的角落，落点会记住；单击展开/收起，不改变位置；双击复位。
- **会看天气的皮肤**：晴昼、夜间、多云、雨、雷暴、雪、霾 7 套场景化背景，随天气与昼夜自动切换。
- **不做“单源赌徒”**：Uapi 失败自动切换 wttr.in / Open-Meteo；双源对照可点选主源，失败有汇总与一键重试。
- **该有的都有**：实时时钟、3/5/7 日预报、逐时 24 格、分钟级降水、生活指数、AQI 六级色点、体感/风力/云量/日出日落。
- **定位不折腾**：IP 双源回退、GPS + 反查、城市搜索；手动城市持久记忆，可设为“上次手动”。
- **好看也好读**：玻璃透明度只调背板，文字始终满不透明；场景配色通过对比度与区分度验证。
- **开箱即用**：默认数据源免 Key；需要 Key 的源在设置页直接给申请入口与文档链接。

---

## 🎨 7 套场景化卡片背景

卡片背景不再是一成不变的蓝紫极光，而是随当前天气与昼夜自动切换。  
大温度渐变、度数符号与细节层全部联动，切换时 1.6s 平滑过渡；7 套场景按色相错开设计，浅色主题下也肉眼可辨。

| 场景 | 判定 | 配色 | 细节层 |
| --- | --- | --- | --- |
| 晴昼 `day_clear` | 晴 + 白天 | 金橙暖阳（Hue 35） | — |
| 夜间 `night` | `isDay=false` | 靛蓝（Hue 230） | ✨ 14 颗闪烁星星 |
| 多云 `cloudy` | 多云/阴/大风 | 低饱和青灰（Hue 200，静态沉闷感） | — |
| 雨 `rain` | 雨/阵雨/毛毛雨 | 高饱和青蓝（Hue 197） | 💧 12 条雨丝下落 |
| 雷暴 `storm` | 雷 | 乌云紫红 + 电紫（Hue 290） | 💧 12 条雨丝下落 |
| 雪 `snow` | 雪 | 近白冰蓝（全场最亮） | ❄️ 12 片飘雪粒子 |
| 霾 `haze` | 霾/沙/浮尘/雾 | 浊黄绿（Hue 58） | 🌫 两团缓慢平移的浑浊光带 |

- 14 组深浅背景 × 文字对比度全部 ≥ 7.2:1；场景两两区分度 ΔE 跨色系 ≥ 12 / 蓝系 ≥ 8 / 暖色对 ≥ 11。
- 浅色主题下夜间/雷暴呈「黄昏」观感；新增噪点纹理压住大面积渐变的「塑料感」。
- `prefers-reduced-motion` 下所有场景动画自动停；设置页「外观 → 场景化背景」可一键关闭，回落固定蓝紫。

---

## 🌤️ 功能全景

### 悬浮看板

- 可拖动灵动岛：拖动只提交落点，点击完全不写位置；展开/收起不再“跑位”。
- 卡片智能弹出：锚点靠近顶部往下展开、靠近底部往上展开，水平自动防出界。
- 大号温度 + 实时时钟（默认 HH:MM，可开秒；点击时钟可快切）。
- 逐时最多 24 格 + 降水概率；详细数据补齐体感/风力/云量/降水/日出日落/主要污染物，最多 12 格。
- 三日 / 五日 / 七日预报；分钟级降水（短临）；生活指数最多 8 项，悬停看完整建议。
- 双源对照卡可点选 ★ 设为主源；主源失败按优先级自动回退。
- 页脚每 60s 心跳刷新「x 分钟前」；AQI 显示六级色点。
- 页面后台自动暂停轮询，回到前台若过期立即补一次。

### 定位与城市

- IP 定位双源回退：`ipwho.is`（主）→ `ipapi.co`（备份）。
- GPS：浏览器定位 + BigDataCloud 反查。
- 城市搜索：Open-Meteo Geocoding 建议。
- 手动城市持久记忆，可设为启动定位方式「上次手动」。
- 搜索建议支持 ↑/↓ 移动、Enter 选中、Esc 关闭搜索框。

### 主题与设置

- 主题三选：自动（跟随 DSH/系统）/ 强制深色 / 强制浅色；MutationObserver 实时响应 DSH 切主题。
- 玻璃透明度 45–100% 只调背板，文字始终满不透明。
- 字号 12–22px、°C/°F、时钟显示秒、预报 3/5/7 日、逐时开关、悬停即展开、自动刷新 5/10/15/30 分、位置复位。
- 数据源 6 选最多 2，勾选顺序即主源优先序；需 Key 的源就地填 Key，并提供「获取 Key ↗」「文档 ↗」。
- 操作方式与本地数据：快捷键说明、欢迎指引重播、清除天气缓存、恢复默认设置。

### 首次欢迎指引

第一次打开时，胶囊首帧直接展开一张 5 步欢迎指引卡：欢迎 / 拖动 / 展开 / 定位 / 微调。  
支持 ← / → 翻页、Esc 跳过、点进度点跳步；末步按钮切为「开始使用 ✓」。看过后写入 `seenGuide`，之后不再自动弹出，可在设置页随时重播。

### 交互细节

- 单击胶囊/卡片头部展开或收起；拖动移动位置；抬起时记住落点；双击复位。
- 键盘：Enter/Space 展开，R 刷新，Esc 收起；胶囊聚焦时 U 键切换 °C/°F。
- 逐时条右缘渐隐，提示「还有更多可横滑」，滑到底自动淡出。
- 双源皆败时胶囊显示「⚠️ 数据源失败」，点开可见各源具体原因与重试按钮。
- 失败源汇总行 + 一键重试；单源失败为中性信息色，不虚张声势。

---

## 🗂️ 数据源

| 源 | Key | CORS | 覆盖 |
| --- | --- | --- | --- |
| Uapi (`uapis.cn`) | 免 | ✓ | 实况+体感/AQI及污染物+逐时+7 日预报+分钟级降水+18 项生活指数；失败自动切换 |
| Open-Meteo | 免 | ✓ | 按经纬度、预报最全（WMO 码） |
| wttr.in | 免 | ✓ | 独立第二源，交叉校验 |
| 彩云天气 | Token | ✓ | 分钟级降水；接口为「经,纬」顺序 |
| OpenWeatherMap | Key | ✓ | current + 5day/3h 聚合 |
| 墨迹天气 | 免 | 需代理 | 网页爬虫：实况+湿度/风力/AQI+7 日预报+生活指数；按 IP 定位，不支持切地区 |

- 默认 **Uapi（主）+ Open-Meteo**，均免 Key、开箱即用。
- 6 源最多选 2 源并排对照；勾选顺序即主源优先序。
- IP 双源回退 + GPS + 城市搜索；`localStorage` 缓存首屏即时上屏。
- 墨迹天气无 CORS 响应头，浏览器端需配置 CORS 代理；站点前置 CloudWAF，已做全局限速与单飞串行。

---

## 🛡️ 可靠性设计

- **多端点自动切换**：Uapi 主端点失败按序切换等价端点；业务 4xx 直接上抛，不乱切、不浪费请求。
- **端点健康冷却**：失败端点按 `Retry-After` 让路，避免对已挂端点反复冲。
- **未配代理不重发主端点**：代理 URL 退化直连时直接跳过，避免多消耗访客速率桶。
- **备份端点超时收紧到 ≤9s**：避免主端点 + 备份 + 下一跳把用户晾 30s+。
- **竞态守卫 `loadSeq`**：快速连点刷新/换城时，慢的旧请求晚返回不再覆盖新数据。
- **失败汇总 + 重试**：双源对照卡下方给出汇总行；两源皆败升级为醒目 `dwi-errAll` 态。
- **CORS 代理默认关闭**：默认全部直连；仅非 CORS 源或 Uapi 被拦时手动开启，支持 `{{url}}` 占位符。
- **墨迹爬虫限速**：全局限速 + 单飞串行，主动识别 CloudWAF 拦截页并抛出可重试错误。
- **可读错误**：先 `text()` 再 `JSON.parse`，4xx/5xx/非 JSON 翻译成中文原因，含 `Retry-After`。
- **无障碍与动效**：`prefers-reduced-motion` 自动降级；键盘可达；对比度与场景区分度有确定性验证。

---

## 🚀 快速开始

1. 将本仓库按 DSH 插件方式加载，插件清单为 `cordis.patch.yml`。
2. 打开 DSH 设置 → 天气看板。
3. 默认 Uapi + Open-Meteo 免 Key 可用；需要时在设置页配置 CORS 代理或数据源 Key。
4. 把胶囊拖到顺手的角落，单击展开；双击复位。

> 首次打开会自动展示 5 步欢迎指引；看过后可在设置页「操作方式与本地数据 → 欢迎指引 → 再看一遍指引」重播。

---

## 🎛️ 设置项速览

- **外观**：主题（自动/深/浅）、字号 12–22px、玻璃透明度、场景化背景开关、°C/°F、时钟显示秒、预报 3/5/7 日、逐时开关、悬停即展开、自动刷新 5/10/15/30 分、位置复位。
- **数据源**：6 选最多 2，勾选顺序即主源优先序；需 Key 的源就地填 Key + 获取 Key / 文档链接。
- **定位与网络**：启动定位方式（IP / GPS / 上次手动）、已记住城市一览、CORS 代理（默认留空直连，支持 `{{url}}`）。
- **操作方式与本地数据**：快捷键说明（Enter/Space/R/U）、欢迎指引重播、清除天气缓存、恢复默认设置。

---


## 📦 仓库结构

```text
dsh-weather-island/
├── index.js                客户端半身：数据源、场景化渲染、设置页
├── host.js                 host 半身：静态资源与注入
├── cordis.patch.yml        插件清单
├── icon.svg                图标
├── package.json            version 2.1.0
├── verify-client.cjs       离线自检（单元断言）
├── render-smoke.cjs        渲染冒烟
├── guide-visual.cjs        指引视觉检查
├── guide-interact.cjs      指引交互检查
├── scene-contrast.cjs      场景配色确定性验证
├── ui-screenshot.cjs       完整看板 8 状态截图 + 几何断言
├── ui-pixel-verify.cjs     像素级独立验证
├── settings-screenshot.cjs 设置页截图 + hero/渐变断言
├── live-probe.cjs          真实网络验证
├── moji-live-probe.cjs     墨迹爬虫真实网络验证
└── shots/                  截图输出目录（自检产物，已 gitignore）
```

---

## 🌐 数据来源

- Uapi `uapis.cn/api/v1/misc/weather`（免 Key，CORS；`extended/forecast/hourly/minutely/indices` 全开，支持 `city`/`adcode`/IP 自动定位；被限流或被拦时自动切换 `wttr.in` / Open-Meteo）
- Open-Meteo `api.open-meteo.com/v1/forecast`（免 Key，CORS）
- wttr.in `wttr.in/<lat>,<lon>?format=j1`（免 Key，CORS）
- 彩云天气 `api.caiyunapp.com/v2.6/{token}/{lng},{lat}/weather.json`（免费 Token）
- OpenWeatherMap `api.openweathermap.org/data/2.5/weather` + `/forecast`（免费 Key）
- 墨迹天气 `tianqi.moji.com`（网页爬虫，免 Key；无 CORS 头 → 浏览器需代理；前置 CloudWAF，已限速）
- 定位：ipwho.is → ipapi.co（IP 双源回退）+ 浏览器 Geolocation + BigDataCloud 反查 + Open-Meteo Geocoding

> 任一源失败不影响其它：对照卡显示该源的具体中文原因；两源皆败时页脚上方给出汇总与「重试」。


---

## 🤝 关于实现与贡献

这个插件的实现分工如下：

- **插件功能与底层实现**：DeepSeek v4.1
- **UI 设计、交互完善与后续打磨**：GLM5.3
- **BUG 修复**：作者手写

欢迎 Issue、PR 和建议。提交前建议先跑一遍 `node verify-client.cjs` 与 `node render-smoke.cjs`；涉及视觉/场景的改动再跑对应截图与对比度脚本。

---

## 📄 License

本项目采用 **MIT 协议** 开源（见 [LICENSE](./LICENSE)）。  
你可以自由使用、修改、分发，唯一要求是保留版权声明与许可声明。

[English README](./README.en.md) · [回到顶部](#dsh-weather-island)
