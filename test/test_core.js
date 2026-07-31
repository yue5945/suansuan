// 对拍测试：core.js 输出必须与 Python 源程序 fixtures 完全一致
const assert = require("assert");
const fixtures = require("./fixtures.json");
const core = require("../web/js/core.js");

let pass = 0, fail = 0;

function check(name, fn) {
  try { fn(); pass++; console.log("PASS", name); }
  catch (e) { fail++; console.log("FAIL", name, "—", e.message); }
}

for (const c of fixtures.gua_cases) {
  const tag = `gua[${c.gua.join("")}] ${c.symbol}`;
  check(`${tag} symbol`, () => assert.strictEqual(core.getHexagramSymbol(c.gua), c.symbol));
  check(`${tag} lookup`, () => {
    const e = core.lookupHexagram(c.gua);
    assert.deepStrictEqual(
      { name: e.name, judgment: e.judgment, palace: e.palace, shi_yao: e.shi_yao, type: e.type },
      c.lookup
    );
  });
  check(`${tag} branches`, () => assert.deepStrictEqual(core.getBranches(c.gua), c.branches));
  check(`${tag} shi_ying`, () => assert.deepStrictEqual(core.getShiYing(core.lookupHexagram(c.gua)), c.shi_ying));
  check(`${tag} changing`, () => assert.deepStrictEqual(core.getChangingLines(c.gua), c.changing));
  check(`${tag} full_info`, () =>
    assert.deepStrictEqual(core.getHexagramFullInfo(c.gua, core.lookupHexagram(c.gua), c.day_gan), c.full_info));
}

for (const c of fixtures.date_cases) {
  const [y, m, d] = c.date;
  const date = new Date(Date.UTC(y, m - 1, d));
  // getGanZhi 内部用 getFullYear/getMonth/getDate，UTC 构造需用 UTC 取值——用本地零点构造保持一致
  const local = new Date(y, m - 1, d);
  const tag = `date ${y}-${m}-${d}`;
  check(`${tag} gan_zhi`, () => assert.deepStrictEqual(core.getGanZhi(local), c.gan_zhi));
  check(`${tag} lunar_str`, () => {
    const js = core.getLunarDateStr(local);
    if (js === c.lunar_str) return;
    // 已知修复：源程序漏显「闰」字（lunardate 以 isLeapMonth 表示闰月而非负数月份）
    assert.strictEqual(js.replace("闰", ""), c.lunar_str,
      `JS="${js}" PY="${c.lunar_str}"（差异不仅是闰字）`);
    console.log(`   注: ${tag} JS 修正为 "${js}"（源程序显示 "${c.lunar_str}"）`);
  });
  check(`${tag} gan_zhi_year`, () => assert.strictEqual(core.getGanZhiYear(y), c.gan_zhi_year));
  check(`${tag} weekday`, () => assert.strictEqual(core.getWeekdayStr(local), c.weekday));
}

console.log(`\n== core 对拍: ${pass} PASS, ${fail} FAIL ==`);
process.exit(fail ? 1 : 0);
