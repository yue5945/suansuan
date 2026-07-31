// 概率校验：单爻采样 40 万次（= 10 万卦），与目标分布对比
const { sampleOne } = require("../web/js/core.js");
const LY_DATA = require("../web/js/data.js");

const N = 400000;
const counts = { 6: 0, 7: 0, 8: 0, 9: 0 };
for (let i = 0; i < N; i++) counts[sampleOne()]++;

let ok = true;
console.log("目标分布:", LY_DATA.HEXAGRAM_PROBABILITIES);
[6, 7, 8, 9].forEach((v, i) => {
  const actual = counts[v] / N;
  const target = LY_DATA.HEXAGRAM_PROBABILITIES[i];
  const diff = Math.abs(actual - target);
  if (diff > 0.005) ok = false;
  console.log(`${v}: 实测 ${(actual * 100).toFixed(2)}% 目标 ${(target * 100).toFixed(2)}% 偏差 ${(diff * 100).toFixed(3)}% ${diff <= 0.005 ? "OK" : "FAIL"}`);
});
process.exit(ok ? 0 : 1);
