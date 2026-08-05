// 六爻核心引擎 —— 与 liuyao_0519.py DivinationSystem 逐行对应移植
// 浏览器: window.LYCore; Node: module.exports
(function (global) {
  const LY_DATA = (typeof module !== "undefined")
    ? require("./data.js")
    : global.LY_DATA;
  const Lunar = (typeof module !== "undefined")
    ? require("./lunar.js")
    : global.Lunar;

  const TIAN_GAN = LY_DATA.TIAN_GAN;
  const DI_ZHI = LY_DATA.DI_ZHI;
  const EIGHT_PALACES = LY_DATA.EIGHT_PALACES;
  const LIU_SHEN_MAP = LY_DATA.LIU_SHEN_MAP;
  const BRANCH_WUXING = LY_DATA.BRANCH_WUXING;
  const HEXAGRAM_DB = LY_DATA.HEXAGRAM_DB;
  const PROBS = LY_DATA.HEXAGRAM_PROBABILITIES;

  const LIUQIN_RELATIONS = {
    "金": { "金": "兄弟", "水": "子孙", "木": "妻财", "火": "官鬼", "土": "父母" },
    "木": { "木": "兄弟", "火": "子孙", "土": "妻财", "金": "官鬼", "水": "父母" },
    "水": { "水": "兄弟", "木": "子孙", "火": "妻财", "土": "官鬼", "金": "父母" },
    "火": { "火": "兄弟", "土": "子孙", "金": "妻财", "水": "官鬼", "木": "父母" },
    "土": { "土": "兄弟", "金": "子孙", "水": "妻财", "木": "官鬼", "火": "父母" },
  };

  // ---- 随机起卦 ----

  // 单爻加权采样，与 numpy.random.choice([6,7,8,9], p=PROBS) 等价
  function sampleOne(rand) {
    const r = (typeof rand === "function") ? rand() : Math.random();
    const V = [6, 7, 8, 9];
    let acc = 0;
    for (let i = 0; i < 4; i++) {
      acc += PROBS[i];
      if (r < acc) return V[i];
    }
    return 9; // 浮点兜底
  }

  // 生成六爻（未逆序），供概率测试复用
  function sampleSixRaw(rand) {
    const out = [];
    for (let k = 0; k < 6; k++) out.push(sampleOne(rand));
    return out;
  }

  function generateHexagram(matter, mode, now) {
    const results = sampleSixRaw();
    const reversed = results.slice().reverse(); // 与源程序 reversed_results 一致
    const current = now || new Date();
    const gz = getGanZhi(current);
    return {
      ben_gua: reversed,
      zhi_gua: reversed.map((y) => (y === 6 ? 9 : y === 9 ? 6 : y)),
      timestamp: formatTimestamp(current),
      day_gan: gz[0],
      day_zhi: gz[1],
      matter: matter || "",
      mode: mode || "问道",
    };
  }

  function formatTimestamp(d) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  // ---- 干支 / 农历 ----

  // 基准日：2025-01-01 为庚午日（六十甲子序号 6，已与真实万年历核对）
  function getGanZhi(date) {
    const base = Date.UTC(2025, 0, 1);
    const target = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const delta = Math.round((target - base) / 86400000);
    const idx = (((delta + 6) % 60) + 60) % 60;
    return [TIAN_GAN[idx % 10], DI_ZHI[idx % 12]];
  }

  const LUNAR_MONTH_NAMES = {
    1: "正月", 2: "二月", 3: "三月", 4: "四月", 5: "五月", 6: "六月",
    7: "七月", 8: "八月", 9: "九月", 10: "十月", 11: "冬月", 12: "腊月",
  };
  const LUNAR_DAY_NAMES = {
    1: "初一", 2: "初二", 3: "初三", 4: "初四", 5: "初五",
    6: "初六", 7: "初七", 8: "初八", 9: "初九", 10: "初十",
    11: "十一", 12: "十二", 13: "十三", 14: "十四", 15: "十五",
    16: "十六", 17: "十七", 18: "十八", 19: "十九", 20: "二十",
    21: "廿一", 22: "廿二", 23: "廿三", 24: "廿四", 25: "廿五",
    26: "廿六", 27: "廿七", 28: "廿八", 29: "廿九", 30: "三十",
  };

  // 与源程序一致：年份干支按公历年；闰月以 isLeap 判定（修正源程序漏显「闰」字）
  function getLunarDateStr(date) {
    try {
      const L = Lunar.lunarFromSolar(date.getFullYear(), date.getMonth() + 1, date.getDate());
      let monthStr = LUNAR_MONTH_NAMES[L.month] || String(L.month);
      if (L.isLeap) monthStr = "闰" + monthStr;
      const dayStr = LUNAR_DAY_NAMES[L.day] || String(L.day);
      return `${getGanZhiYear(date.getFullYear())}年${monthStr}${dayStr}`;
    } catch (e) {
      const yearDiff = date.getFullYear() - 1900 + 36;
      return `${TIAN_GAN[yearDiff % 10]}${DI_ZHI[yearDiff % 12]}年`;
    }
  }

  function getGanZhiYear(year) {
    const idx = (((36 + (year - 1900)) % 60) + 60) % 60;
    return `${TIAN_GAN[idx % 10]}${DI_ZHI[idx % 12]}`;
  }

  function getWeekdayStr(date) {
    const names = ["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];
    return names[(date.getDay() + 6) % 7]; // Python weekday(): 周一=0
  }

  // ---- 排盘 ----

  function getTrigramBinary(guaPart) {
    return guaPart.map((y) => (y === 7 || y === 9 ? "1" : "0")).join("");
  }

  function getBranches(gua) {
    const upper = gua.slice(0, 3);
    const lower = gua.slice(3, 6);
    const upperPalace = EIGHT_PALACES[getTrigramBinary(upper)] || {};
    const lowerPalace = EIGHT_PALACES[getTrigramBinary(lower)] || {};
    return (upperPalace.inner || ["?", "?", "?"]).concat(lowerPalace.outer || ["?", "?", "?"]);
  }

  function calculateLiuqin(palaceWx, branch) {
    const dzChar = branch.length >= 2 ? branch[1] : "未知";
    const branchWx = BRANCH_WUXING[dzChar] || "未知";
    const rel = LIUQIN_RELATIONS[palaceWx];
    return rel ? (rel[branchWx] || "未知") : "未知";
  }

  function getShiYing(hexInfo) {
    const shi = hexInfo.shi_yao != null ? hexInfo.shi_yao : 6;
    const ying = ((shi + 3) % 6) || 6;
    return [shi, ying];
  }

  function getChangingLines(benGua) {
    const out = [];
    benGua.forEach((y, i) => {
      if (y === 6 || y === 9) out.push(6 - i);
    });
    return out;
  }

  function getHexagramSymbol(gua) {
    const binary = gua.map((y) => (y === 7 || y === 9 ? "1" : "0")).join("");
    for (const name of Object.keys(HEXAGRAM_DB)) {
      if (HEXAGRAM_DB[name].binary === binary) return name;
    }
    return "未知卦";
  }

  function lookupHexagram(gua) {
    const symbol = getHexagramSymbol(gua);
    return HEXAGRAM_DB[symbol] || {
      name: "未知卦", judgment: "无卦辞", palace: "111",
      shi_yao: 6, type: "本宫", xinxi: "", lines: {},
    };
  }

  // 与源程序 get_hexagram_full_info 输出结构完全一致
  function getHexagramFullInfo(gua, hexInfo, dayGan) {
    const branches = getBranches(gua);
    const palaceWx = (EIGHT_PALACES[hexInfo.palace || "111"] || {}).wu_xing || "";
    const [shi, ying] = getShiYing(hexInfo);
    const liuShenOrder = LIU_SHEN_MAP[dayGan] || ["青龙", "青龙", "青龙", "青龙", "青龙", "青龙"];

    const info = {
      "卦名": hexInfo.name,
      "卦辞": hexInfo.judgment || "无卦辞",
      "宫位": hexInfo.type || "未知",
      "世爻": shi,
      "应爻": ying,
      "变爻": getChangingLines(gua),
      "爻辞": [],
      "六亲": [],
      "六神": [],
      "地支": [],
    };

    for (let pos = 6; pos >= 1; pos--) {
      const idx = 6 - pos;
      if (idx < gua.length) {
        const branch = branches[idx];
        const lq = calculateLiuqin(palaceWx, branch);
        const liuShen = liuShenOrder[pos - 1];
        const explanation = (hexInfo.lines && hexInfo.lines[String(pos)]) || "无爻辞记录";
        info["爻辞"].push(`${pos}爻: ${explanation}`);
        info["六亲"].push(`${pos}爻: ${lq}`);
        info["六神"].push(`${pos}爻: ${liuShen}`);
        info["地支"].push(`${pos}爻: ${branch}`);
      } else {
        info["爻辞"].push(`${pos}爻: 数据不完整`);
        info["六亲"].push(`${pos}爻: 未知`);
        info["六神"].push(`${pos}爻: 未知`);
        info["地支"].push(`${pos}爻: 未知`);
      }
    }
    return info;
  }

  const api = {
    sampleOne, sampleSixRaw, generateHexagram, formatTimestamp,
    getGanZhi, getLunarDateStr, getGanZhiYear, getWeekdayStr,
    getTrigramBinary, getBranches, calculateLiuqin, getShiYing,
    getChangingLines, getHexagramSymbol, lookupHexagram, getHexagramFullInfo,
  };
  if (typeof module !== "undefined") module.exports = api;
  global.LYCore = api;
})(typeof window !== "undefined" ? window : globalThis);
