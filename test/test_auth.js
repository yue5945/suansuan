// auth + storage 测试
const assert = require("assert");
const auth = require("../web/js/auth.js");
const { createStore, createMemoryBackend } = require("../web/js/storage.js");

(async () => {
  let pass = 0, fail = 0;
  const check = async (name, fn) => {
    try { await fn(); pass++; console.log("PASS", name); }
    catch (e) { fail++; console.log("FAIL", name, "—", e.message); }
  };

  // 密码算法与 Python 版逐位一致（期望值由源程序 PasswordGenerator 算出）
  await check("password 13800138000", async () =>
    assert.strictEqual(await auth.generatePassword("13800138000"), "qNtqeq"));
  await check("password 13912345678", async () =>
    assert.strictEqual(await auth.generatePassword("13912345678"), "H6HbHr"));
  await check("password 00000000000", async () =>
    assert.strictEqual(await auth.generatePassword("00000000000"), "BHmdVF"));

  // 纯 JS SHA-256 兜底与标准向量一致（"abc"）
  await check("sha256 fallback abc", async () => {
    const d = auth._sha256Bytes(new TextEncoder().encode("abc"));
    const hex = [...d].map((b) => b.toString(16).padStart(2, "0")).join("");
    assert.strictEqual(hex, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  await check("password 非11位报错", async () => {
    await assert.rejects(() => auth.generatePassword("123"));
  });

  // 日期校验
  await check("有效期 2026/12/31 在 2026-07-31 有效", async () =>
    assert.strictEqual(auth.checkDateValidity("2026/12/31", new Date(2026, 6, 31)), true));
  await check("有效期 2025/10/26 在 2026-07-31 过期", async () =>
    assert.strictEqual(auth.checkDateValidity("2025/10/26", new Date(2026, 6, 31)), false));
  await check("有效期当天有效", async () =>
    assert.strictEqual(auth.checkDateValidity("2026/7/31", new Date(2026, 6, 31)), true));

  // 登录验证（内存存储 + 固定时间）
  const store = createStore(createMemoryBackend());
  const NOW = new Date(2026, 0, 15); // 2026-01-15：0/0 有效，admin/test 已过期

  await check("特殊用户 0/0 有效期内登录成功", async () =>
    assert.strictEqual(await auth.validateLogin("0", "0", store, NOW), true));
  await check("特殊用户 admin 过期后登录失败", async () =>
    assert.strictEqual(await auth.validateLogin("admin", "admin123", store, NOW), false));
  await check("手机号+正确密码登录成功", async () =>
    assert.strictEqual(await auth.validateLogin("13800138000", "qNtqeq", store, NOW), true));
  await check("手机号+错误密码登录失败", async () =>
    assert.strictEqual(await auth.validateLogin("13800138000", "xxxxxx", store, NOW), false));
  await check("非法用户名登录失败", async () =>
    assert.strictEqual(await auth.validateLogin("abc", "123456", store, NOW), false));
  await check("密码非6位登录失败", async () =>
    assert.strictEqual(await auth.validateLogin("13800138000", "qNtqe", store, NOW), false));

  // 授权管理 CRUD
  await check("新增授权用户并登录", async () => {
    auth.addSpecialUser(store, { username: "vip01", password: "p88888", expire_date: "2027/1/1" });
    assert.strictEqual(await auth.validateLogin("vip01", "p88888", store, NOW), true);
  });
  await check("重复用户名拒绝", async () => {
    assert.throws(() => auth.addSpecialUser(store, { username: "vip01", password: "x", expire_date: "2027/1/1" }));
  });
  await check("修改有效期", async () => {
    auth.updateSpecialUser(store, "vip01", { expire_date: "2025/1/1" });
    assert.strictEqual(await auth.validateLogin("vip01", "p88888", store, NOW), false);
  });
  await check("删除授权用户", async () => {
    auth.deleteSpecialUser(store, "vip01");
    assert.strictEqual(await auth.validateLogin("vip01", "p88888", store, NOW), false);
  });
  await check("非法有效期拒绝", async () => {
    assert.throws(() => auth.addSpecialUser(store, { username: "u2", password: "p", expire_date: "2027-13-40" }));
  });

  // 管理密码
  await check("默认管理密码 admin123", async () =>
    assert.strictEqual(auth.verifyAdminPassword(store, "admin123"), true));
  await check("修改管理密码", async () => {
    auth.setAdminPassword(store, "newpass9");
    assert.strictEqual(auth.verifyAdminPassword(store, "admin123"), false);
    assert.strictEqual(auth.verifyAdminPassword(store, "newpass9"), true);
  });

  console.log(`\n== auth 测试: ${pass} PASS, ${fail} FAIL ==`);
  process.exit(fail ? 1 : 0);
})();
