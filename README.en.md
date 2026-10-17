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

> Weather shouldn't just be a tiny number.  
> It should be a Dynamic Island you can drag to any corner, that changes skin with sun, rain, and day/night, compares two sources side by side, and even reminds you when it's going to rain.

**dsh-weather-island** is a weather plugin for DeepSeek Harness (DSH): a draggable Dynamic Island-style floating weather dashboard.  
Key-free and ready out of the box. Defaults to **Uapi (primary) + Open-Meteo** side by side; 6 data sources available, compare up to 2. Auto-adapts to dark/light themes; automatic failover on failure, seamless in the UI.

![icon](https://github.com/my-txz/dsh-weather-island/blob/main/dsh-weather-island/icon.svg)

![DSH icon](https://picui.ogmua.cn/s1/2026/10/17/6ad32644828d2.webp)

<p align="center">
  <img src="https://picui.ogmua.cn/s1/2026/10/17/6ad3257930151.webp" alt="dsh-weather-island interface preview 5" width="60%" />
  <img src="https://picui.ogmua.cn/s1/2026/10/17/6ad3257878eee.webp" alt="dsh-weather-island interface preview 2" width="48%" />
</p>
<p align="center">
  <img src="https://picui.ogmua.cn/s1/2026/10/17/6ad325786ccb9.webp" alt="dsh-weather-island interface preview 3" width="48%" />
  <img src="https://picui.ogmua.cn/s1/2026/10/17/6ad32578860ea.webp" alt="dsh-weather-island interface preview 4" width="48%" />
</p>
<p align="center">
  
  <img src="https://picui.ogmua.cn/s1/2026/10/17/6ad325786fecb.webp" alt="dsh-weather-island interface preview 1" width="48%" />
</p>

---

## ✨ Why This One

- **As handy as a Dynamic Island**: drag it to a convenient corner and the drop position is remembered; click to expand/collapse without changing position; double-click to reset.
- **Skins that understand the weather**: 7 scenario-based backgrounds — clear daytime, night, cloudy, rain, storm, snow, haze — automatically switch with weather and day/night.
- **Not a "single-source gambler"**: if Uapi fails, automatically switch to wttr.in / Open-Meteo; dual-source comparison lets you pick the primary source; failures have a summary and one-click retry.
- **Everything you'd expect**: real-time clock, 3/5/7-day forecast, up to 24 hourly cells, minute-level precipitation, life indices, six-level AQI color dot, feels-like/wind/cloud cover/sunrise/sunset.
- **No location hassle**: IP dual-source fallback, GPS + reverse geocoding, city search; manual city is persisted and can be set as "Last manual".
- **Good-looking and readable**: glass opacity only adjusts the backplate; text always stays fully opaque; scenario colors validated for contrast and distinguishability.
- **Ready out of the box**: default data sources are key-free; sources requiring a key provide application links and docs directly in Settings.

---

## 🎨 7 Scenario-Based Card Backgrounds

Card backgrounds are no longer a fixed blue-purple aurora; they automatically switch with current weather and day/night.  
The large temperature gradient, degree symbol, and detail layer all stay in sync, with a 1.6s smooth transition; the 7 scenarios are hue-separated and remain visually distinguishable even in light theme.

| Scenario | Condition | Palette | Detail Layer |
| --- | --- | --- | --- |
| Clear daytime `day_clear` | Clear + daytime | Golden-orange warm sun (Hue 35) | — |
| Night `night` | `isDay=false` | Indigo (Hue 230) | ✨ 14 twinkling stars |
| Cloudy `cloudy` | Cloudy/overcast/windy | Low-saturation cyan-gray (Hue 200, static dull feel) | — |
| Rain `rain` | Rain/showers/drizzle | High-saturation cyan-blue (Hue 197) | 💧 12 falling rain streaks |
| Storm `storm` | Thunder | Dark-cloud purple-red + electric purple (Hue 290) | 💧 12 falling rain streaks |
| Snow `snow` | Snow | Near-white ice blue (brightest overall) | ❄️ 12 drifting snow particles |
| Haze `haze` | Haze/sand/dust/fog | Murky yellow-green (Hue 58) | 🌫 Two slow-moving murky light bands |

- All 14 light/dark background × text contrast pairs are ≥ 7.2:1; pairwise scenario distinguishability ΔE is ≥ 12 across color families, ≥ 8 within the blue family, and ≥ 11 for warm pairs.
- In light theme, Night/Storm take on a "dusk" look; a new noise texture suppresses the "plastic" feel of large gradients.
- All scenario animations stop automatically under `prefers-reduced-motion`; Settings → Appearance → Scenario Backgrounds can disable them with one click, falling back to a fixed blue-purple.

---

## 🌤️ Feature Overview

### Floating Dashboard

- Draggable Dynamic Island: dragging only commits the drop position; clicking never writes position; expand/collapse no longer "jumps around".
- Smart card popup: anchor near top expands downward, near bottom expands upward, and horizontal position is automatically kept in bounds.
- Large temperature + real-time clock (HH:MM by default, seconds optional; click the clock for quick toggle).
- Up to 24 hourly cells + precipitation probability; detailed data fills in feels-like/wind/cloud cover/precipitation/sunrise/sunset/primary pollutants, up to 12 cells.
- 3/5/7-day forecast; minute-level precipitation (nowcasting); up to 8 life indices, hover for full advice.
- Dual-source comparison cards let you click ★ to set the primary source; if the primary fails, it automatically falls back by priority.
- Footer heartbeat refreshes "x minutes ago" every 60s; AQI shows a six-level color dot.
- Polling pauses automatically when the page is in the background; if stale when returning to the foreground, it refreshes immediately once.

### Location & City

- IP geolocation dual-source fallback: `ipwho.is` (primary) → `ipapi.co` (backup).
- GPS: browser geolocation + BigDataCloud reverse geocoding.
- City search: Open-Meteo Geocoding suggestions.
- Manual city is persisted and can be set as the startup location mode "Last manual".
- Search suggestions support ↑/↓ to move, Enter to select, and Esc to close the search box.

### Theme & Settings

- Three theme options: Auto (follow DSH/system) / Force Dark / Force Light; MutationObserver responds to DSH theme changes in real time.
- Glass opacity 45–100% only adjusts the backplate; text always remains fully opaque.
- Font size 12–22px, °C/°F, show clock seconds, 3/5/7-day forecast, hourly toggle, expand on hover, auto-refresh 5/10/15/30 min, reset position.
- Choose up to 2 of 6 data sources; check order defines primary-source priority; sources requiring a key let you enter it inline and provide "Get Key ↗" and "Docs ↗".
- Controls & Local Data: shortcut help, replay welcome guide, clear weather cache, restore default settings.

### First-run Welcome Guide

On first open, the capsule immediately expands on the first frame into a 5-step welcome guide card: Welcome / Drag / Expand / Location / Fine-tune.  
Supports ← / → to page, Esc to skip, and clicking progress dots to jump; the final button changes to "Get Started ✓". After viewing, `seenGuide` is written and it will not auto-open again; replay anytime from the settings page.

### Interaction Details

- Click the capsule/card header to expand or collapse; drag to move; drop position is remembered on release; double-click to reset.
- Keyboard: Enter/Space to expand, R to refresh, Esc to collapse; when the capsule is focused, U toggles °C/°F.
- The hourly strip fades at the right edge to hint "more to scroll"; it fades out when scrolled to the end.
- When both sources fail, the capsule shows "⚠️ Data source failed"; open it to see each source's specific reason and a retry button.
- Failed-source summary row + one-click retry; single-source failure uses a neutral info color, without drama.

---

## 🗂️ Data Sources

| Source | Key | CORS | Coverage |
| --- | --- | --- | --- |
| Uapi (`uapis.cn`) | Free | ✓ | Current + feels-like/AQI & pollutants + hourly + 7-day forecast + minute-level precipitation + 18 life indices; automatic failover on failure |
| Open-Meteo | Free | ✓ | By lat/lon; most complete forecast (WMO codes) |
| wttr.in | Free | ✓ | Independent second source for cross-checking |
| Caiyun Weather | Token | ✓ | Minute-level precipitation; API expects "lon,lat" order |
| OpenWeatherMap | Key | ✓ | current + 5day/3h aggregation |
| Moji Weather | Free | Proxy required | Web scraper: current conditions + humidity/wind/AQI + 7-day forecast + life indices; IP-based location only, no region switching |

- Default **Uapi (primary) + Open-Meteo**, both key-free and ready out of the box.
- Choose up to 2 of 6 sources side by side; check order defines primary-source priority.
- IP dual-source fallback + GPS + city search; `localStorage` cache renders the first screen instantly.
- Moji Weather has no CORS response headers, so browser use requires a CORS proxy; the site is fronted by CloudWAF, with global rate limiting and single-flight serialization.

---

## 🛡️ Reliability Design

- **Multi-endpoint automatic failover**: if the Uapi primary endpoint fails, switch to equivalent endpoints in order; business 4xx errors are thrown directly, avoiding random switching and wasted requests.
- **Endpoint health cooldown**: failed endpoints back off according to `Retry-After`, avoiding repeated hits on dead endpoints.
- **Do not resend to primary endpoint when no proxy is configured**: when the proxy URL degrades to direct connection, skip it to avoid consuming more of the visitor rate-limit bucket.
- **Backup endpoint timeout tightened to ≤9s**: avoid leaving users waiting 30s+ across primary + backup + next hop.
- **Race guard `loadSeq`**: during rapid refresh/city changes, slow old responses returning late no longer overwrite new data.
- **Failure summary + retry**: a summary row appears below the dual-source comparison cards; if both sources fail, escalate to the prominent `dwi-errAll` state.
- **CORS proxy disabled by default**: all direct connections by default; manually enable only for non-CORS sources or when Uapi is blocked; supports `{{url}}` placeholder.
- **Moji scraper rate limiting**: global rate limiting + single-flight serialization; actively detects CloudWAF block pages and throws retryable errors.
- **Readable errors**: call `text()` before `JSON.parse`; translate 4xx/5xx/non-JSON into readable Chinese reasons, including `Retry-After`.
- **Accessibility & motion**: `prefers-reduced-motion` auto-degrades; keyboard accessible; contrast and scenario distinguishability have deterministic verification.

---

## 🚀 Quick Start

1. Load this repository as a DSH plugin; the plugin manifest is `cordis.patch.yml`.
2. Open DSH Settings → Weather Dashboard.
3. Uapi + Open-Meteo are key-free and available by default; configure a CORS proxy or data-source keys in Settings when needed.
4. Drag the capsule to a convenient corner; click to expand; double-click to reset.

> On first open, a 5-step welcome guide appears automatically; after viewing, replay it from Settings → Controls & Local Data → Welcome Guide → View Guide Again.

---

## 🎛️ Settings Overview

- **Appearance**: theme (Auto/Dark/Light), font size 12–22px, glass opacity, scenario background toggle, °C/°F, show clock seconds, 3/5/7-day forecast, hourly toggle, expand on hover, auto-refresh 5/10/15/30 min, reset position.
- **Data Sources**: choose up to 2 of 6; check order defines primary-source priority; sources requiring a key let you enter it inline + Get Key / Docs links.
- **Location & Network**: startup location mode (IP / GPS / Last manual), remembered cities list, CORS proxy (blank by default for direct connection; supports `{{url}}`).
- **Controls & Local Data**: shortcut help (Enter/Space/R/U), replay welcome guide, clear weather cache, restore default settings.

---


## 📦 Repository Structure

```text
dsh-weather-island/
├── index.js                client half: data sources, scenario rendering, settings page
├── host.js                 host half: static assets and injection
├── cordis.patch.yml        plugin manifest
├── icon.svg                icon
├── package.json            version 2.1.0
├── verify-client.cjs       offline self-check (unit assertions)
├── render-smoke.cjs        render smoke test
├── guide-visual.cjs        guide visual check
├── guide-interact.cjs      guide interaction check
├── scene-contrast.cjs      scenario color deterministic verification
├── ui-screenshot.cjs       full dashboard 8-state screenshots + geometry assertions
├── ui-pixel-verify.cjs     independent pixel-level verification
├── settings-screenshot.cjs settings page screenshots + hero/gradient assertions
├── live-probe.cjs          live network verification
├── moji-live-probe.cjs     Moji scraper live network verification
└── shots/                  screenshot output directory (self-check artifacts, gitignored)
```

---

## 🌐 Data Sources

- Uapi `uapis.cn/api/v1/misc/weather` (key-free, CORS; `extended/forecast/hourly/minutely/indices` all enabled, supports `city`/`adcode`/IP auto-location; automatically switches to `wttr.in` / Open-Meteo when rate-limited or blocked)
- Open-Meteo `api.open-meteo.com/v1/forecast` (key-free, CORS)
- wttr.in `wttr.in/<lat>,<lon>?format=j1` (key-free, CORS)
- Caiyun Weather `api.caiyunapp.com/v2.6/{token}/{lng},{lat}/weather.json` (free token)
- OpenWeatherMap `api.openweathermap.org/data/2.5/weather` + `/forecast` (free key)
- Moji Weather `tianqi.moji.com` (web scraper, key-free; no CORS headers → browser requires proxy; fronted by CloudWAF, rate-limited)
- Location: ipwho.is → ipapi.co (IP dual-source fallback) + browser Geolocation + BigDataCloud reverse geocoding + Open-Meteo Geocoding

> Failure of any source does not affect others: the comparison card shows that source's specific Chinese reason; if both sources fail, a summary and "Retry" appear above the footer.


---

## 🤝 About Implementation & Contributions

This plugin was implemented as follows:

- **Plugin functionality & core implementation**: DeepSeek v4.1
- **UI design, interaction refinement & follow-up polish**: GLM5.3
- **Bug fixes**: hand-written by the author

Issues, PRs, and suggestions are welcome. Before submitting, run `node verify-client.cjs` and `node render-smoke.cjs`; for visual/scenario changes, also run the corresponding screenshot and contrast scripts.

---

## 📄 License

This project is open-sourced under the **MIT License** (see [LICENSE](./LICENSE)).  
You are free to use, modify, and distribute it; the only requirement is to retain the copyright and license notices.

[Chinese README](./README.md) · [Back to top](#dsh-weather-island)
