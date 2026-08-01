// 登录授权模块 —— 与 liuyao_0519.py PasswordGenerator/LoginValidator 对应移植
(function (global) {
  const LY_DATA = (typeof module !== "undefined") ? require("./data.js") : global.LY_DATA;

  const CHAR_SET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

  // ---------- 纯 JS SHA-256（crypto.subtle 不可用时的兜底，如部分旧 WebView） ----------
  function sha256Bytes(msgBytes) {
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a,
        h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

    const bitLen = msgBytes.length * 8;
    const padded = Array.from(msgBytes);
    padded.push(0x80);
    while (padded.length % 64 !== 56) padded.push(0);
    for (let i = 7; i >= 0; i--) padded.push((bitLen / Math.pow(2, i * 8)) & 0xff);

    const rr = (x, n) => ((x >>> n) | (x << (32 - n))) >>> 0;
    const w = new Array(64);

    for (let chunk = 0; chunk < padded.length; chunk += 64) {
      for (let i = 0; i < 16; i++) {
        w[i] = ((padded[chunk + i * 4] << 24) | (padded[chunk + i * 4 + 1] << 16) |
                (padded[chunk + i * 4 + 2] << 8) | padded[chunk + i * 4 + 3]) >>> 0;
      }
      for (let i = 16; i < 64; i++) {
        const s0 = (rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3)) >>> 0;
        const s1 = (rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10)) >>> 0;
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
      for (let i = 0; i < 64; i++) {
        const S1 = (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) >>> 0;
        const ch = ((e & f) ^ (~e & g)) >>> 0;
        const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) >>> 0;
        const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        const t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
    }
    const out = [];
    for (const hh of [h0, h1, h2, h3, h4, h5, h6, h7]) {
      out.push((hh >>> 24) & 0xff, (hh >>> 16) & 0xff, (hh >>> 8) & 0xff, hh & 0xff);
    }
    return new Uint8Array(out);
  }

  async function sha256Digest(msgBytes) {
    const subtle = global.crypto && global.crypto.subtle;
    if (subtle && subtle.digest) {
      try {
        return new Uint8Array(await subtle.digest("SHA-256", msgBytes));
      } catch (e) { /* fall through to pure JS */ }
    }
    return sha256Bytes(msgBytes);
  }

  // ---------- 密码生成（与 Python 版逐位一致） ----------
  async function generatePassword(phone) {
    phone = String(phone || "").trim();
    if (!/^\d{11}$/.test(phone)) throw new Error("请输入有效的11位数字");
    const msgBytes = new TextEncoder().encode(phone);
    const digest = await sha256Digest(msgBytes);
    let n = 0n;
    for (const b of digest) n = (n << 8n) | BigInt(b);
    let pwd = "";
    for (let i = 0; i < 6; i++) {
      pwd += CHAR_SET[Number(n % 62n)];
      n /= 62n;
    }
    return pwd;
  }

  // ---------- 授权用户 ----------
  function getSpecialUsers(store) {
    let users = store.getJSON("special_users", null);
    if (!Array.isArray(users)) users = [];
    // 代码中的默认账户覆盖同名存储项：开发者改 data.js 即生效（如账户 0 的期限与 AI 权限）
    const extras = users.filter((stored) =>
      !LY_DATA.DEFAULT_SPECIAL_USERS.some((d) => d.username === stored.username));
    const merged = LY_DATA.DEFAULT_SPECIAL_USERS.map((u) => ({ ...u })).concat(extras);
    store.setJSON("special_users", merged);
    return merged;
  }

  function saveSpecialUsers(store, users) {
    store.setJSON("special_users", users);
  }

  function parseExpireDate(str) {
    const m = String(str || "").trim().match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (!m) return null;
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const date = new Date(y, mo - 1, d);
    // 回读校验，排除 2月30日 之类的虚假日期
    if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
    return date;
  }

  function checkDateValidity(expireStr, now) {
    const expire = parseExpireDate(expireStr);
    if (!expire) return false;
    const cur = now || new Date();
    const curDate = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate());
    return curDate.getTime() <= expire.getTime();
  }

  async function validateLogin(username, password, store, now) {
    username = String(username || "").trim();
    password = String(password || "").trim();

    for (const u of getSpecialUsers(store)) {
      if (username === u.username && password === u.password) {
        return checkDateValidity(u.expire_date, now);
      }
    }
    if (!/^\d{11}$/.test(username)) return false;
    if (password.length !== 6) return false;
    try {
      return (await generatePassword(username)) === password;
    } catch (e) {
      return false;
    }
  }

  function addSpecialUser(store, user) {
    const users = getSpecialUsers(store);
    if (users.some((u) => u.username === user.username)) {
      throw new Error("用户名已存在");
    }
    if (!user.username || !user.password) throw new Error("用户名和密码不能为空");
    if (!parseExpireDate(user.expire_date)) throw new Error("有效期格式应为 YYYY/M/D");
    users.push({ username: user.username, password: user.password, expire_date: user.expire_date });
    saveSpecialUsers(store, users);
  }

  function updateSpecialUser(store, username, patch) {
    const users = getSpecialUsers(store);
    const u = users.find((x) => x.username === username);
    if (!u) throw new Error("用户不存在");
    if (patch.password !== undefined) u.password = patch.password;
    if (patch.expire_date !== undefined) {
      if (!parseExpireDate(patch.expire_date)) throw new Error("有效期格式应为 YYYY/M/D");
      u.expire_date = patch.expire_date;
    }
    saveSpecialUsers(store, users);
  }

  function deleteSpecialUser(store, username) {
    const users = getSpecialUsers(store).filter((u) => u.username !== username);
    saveSpecialUsers(store, users);
  }

  // ---------- 授权管理入口密码 ----------
  const DEFAULT_ADMIN_PWD = "admin123";

  function verifyAdminPassword(store, pwd) {
    return store.getJSON("admin_pwd", DEFAULT_ADMIN_PWD) === String(pwd || "");
  }

  function setAdminPassword(store, newPwd) {
    if (!newPwd || String(newPwd).length < 4) throw new Error("管理密码至少 4 位");
    store.setJSON("admin_pwd", String(newPwd));
  }

  // ---------- AI 解卦权限：账户条目中 allow_ai:false 则禁用（如账户 0） ----------
  function canUseAI(username, store) {
    const u = getSpecialUsers(store).find((x) => x.username === String(username || "").trim());
    if (!u) return true;   // 手机号生成的账户默认可用
    return u.allow_ai !== false;
  }

  const api = {
    generatePassword, getSpecialUsers, saveSpecialUsers, checkDateValidity,
    validateLogin, addSpecialUser, updateSpecialUser, deleteSpecialUser,
    verifyAdminPassword, setAdminPassword, parseExpireDate, canUseAI,
    _sha256Bytes: sha256Bytes,
  };
  if (typeof module !== "undefined") module.exports = api;
  global.LYAuth = api;
})(typeof window !== "undefined" ? window : globalThis);
