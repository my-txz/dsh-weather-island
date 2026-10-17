/**
 * dsh-weather-island — Host half.
 *
 * 这是一个纯客户端插件：所有天气与定位数据都在浏览器半身（index.js）里
 * 通过支持 CORS 的公开接口直接拉取，因此 Host 半身只需提供一个最小的可被
 * 扫描与加载的入口，让 DSH 能挂载本包并加载其浏览器半身即可。
 *
 * Host 半身声明 name / inject / Config / apply 四件套，与 dsh-effort-switcher
 * 等官方示范插件保持同一形状，确保跨机器加载一致。
 *
 * Host 侧 Config 只做形状校验（必须为对象）；具体键值由浏览器半身按自己的
 * 白名单逐键清洗（index.js · Config.validate + sanitize），脏值一律回落默认。
 */

export const name = "weather-island";
export const inject = [];

export const Config = {
  "~standard": {
    version: 1,
    vendor: "dsh-weather-island",
    validate(config) {
      if (config === undefined || config === null) return { value: {} };
      if (typeof config !== "object" || Array.isArray(config)) {
        return { issues: [{ message: "plugin config must be an object" }] };
      }
      // 已知可选键：fontSize/unit/refreshMinutes/locPref/forecastDays/activeSources/
      // corsProxy/theme/opacity/clockSeconds/hoverExpand/showHourly/sceneBg/keys。
      // 一律放行，客户端读取后自行逐键清洗。
      return { value: config };
    },
  },
};

export function apply() {
  // 无 Host 端业务逻辑：保持空实现。
}
