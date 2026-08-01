// DeepSeek AI 解卦模块 —— 与 liuyao_0519.py DeepSeekAnalyzer 对应移植
(function (global) {
  const LY_DATA = (typeof module !== "undefined") ? require("./data.js") : global.LY_DATA;

  const API_URL = "https://api.deepseek.com/chat/completions";

  function buildUserInput({ matter, mode, benInfo, zhiInfo, dayGan, timestamp }) {
    return `占卜时间：${timestamp}
日干：${dayGan}
占卜模式：${mode}
占卜之事：${matter}

本卦信息：
卦名：${benInfo["卦名"]}
卦辞：${benInfo["卦辞"]}
宫位：${benInfo["宫位"]}
世爻：第${benInfo["世爻"]}爻
应爻：第${benInfo["应爻"]}爻
变爻：${benInfo["变爻"]}

本卦六亲：${benInfo["六亲"].join(", ")}
本卦六神：${benInfo["六神"].join(", ")}
本卦地支：${benInfo["地支"].join(", ")}
本卦爻辞：${benInfo["爻辞"].join(", ")}

之卦信息：
卦名：${zhiInfo["卦名"]}
卦辞：${zhiInfo["卦辞"]}
宫位：${zhiInfo["宫位"]}
世爻：第${zhiInfo["世爻"]}爻
应爻：第${zhiInfo["应爻"]}爻

之卦六亲：${zhiInfo["六亲"].join(", ")}
之卦六神：${zhiInfo["六神"].join(", ")}
之卦地支：${zhiInfo["地支"].join(", ")}
之卦爻辞：${zhiInfo["爻辞"].join(", ")}

请基于以上信息，对占卜之事进行详细分析和解读。`;
  }

  /**
   * 调用 DeepSeek 解卦
   * @param {object} p { matter, mode, benInfo, zhiInfo, dayGan, timestamp, apiKey }
   * @returns {Promise<string>} 解读文本；失败抛出带中文提示的 Error
   */
  async function analyzeDivination(p) {
    const apiKey = (p.apiKey || "").trim();
    if (!apiKey) throw new Error("尚未设置 API Key，请到「设置」页填写");

    const systemPrompt = p.mode === "问道" ? LY_DATA.PROMPTS_WENDAO : LY_DATA.PROMPTS_YIKANG;
    const body = {
      model: "deepseek-v4-pro",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildUserInput(p) },
      ],
      max_tokens: 4000,
      temperature: 0.7,
      stream: false,
    };

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 60000) : null;

    let resp;
    try {
      resp = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller ? controller.signal : undefined,
      });
    } catch (e) {
      if (e && e.name === "AbortError") throw new Error("请求超时（60秒），请检查网络后重试");
      throw new Error("网络连接失败，请检查网络后重试");
    } finally {
      if (timer) clearTimeout(timer);
    }

    if (resp.status === 401 || resp.status === 403) {
      throw new Error("API Key 无效或已过期，请到「设置」页更新");
    }
    if (resp.status === 402) {
      throw new Error("API 账户余额不足，请充值后重试");
    }
    if (!resp.ok) {
      throw new Error(`API调用失败: HTTP ${resp.status}`);
    }

    let result;
    try {
      result = await resp.json();
    } catch (e) {
      throw new Error("API 返回格式异常");
    }
    const text = result && result.choices && result.choices[0] &&
      result.choices[0].message && result.choices[0].message.content;
    if (!text) throw new Error("API 返回内容为空");
    return text;
  }

  const api = { analyzeDivination, buildUserInput, API_URL };
  if (typeof module !== "undefined") module.exports = api;
  global.LYApi = api;
})(typeof window !== "undefined" ? window : globalThis);
