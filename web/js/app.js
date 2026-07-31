// 算算 · 页面路由与渲染
(function () {
  "use strict";

  const store = LYStore.createStore();
  const $ = (id) => document.getElementById(id);

  // ---------- 状态 ----------
  let currentMode = "问道";
  let currentRecord = null;   // 本次起卦记录
  let clockTimer = null;

  const MODE_DESC = {
    "问道": "问道模式：周易六爻解卦，兼融诗词国学、佛道经典",
    "易康": "易康模式：六爻参合中医西医、心理营养、运动康复",
  };

  // ---------- 路由 ----------
  const NAV_PAGES = ["home", "history", "notes", "settings"];

  function showPage(name) {
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    const page = $("page-" + name);
    if (page) page.classList.add("active");
    const nav = $("bottom-nav");
    if (NAV_PAGES.includes(name)) {
      nav.classList.remove("hidden");
      document.querySelectorAll(".nav-item").forEach((b) =>
        b.classList.toggle("active", b.dataset.nav === name));
    } else {
      nav.classList.add("hidden");
    }
    if (name === "home") startClock(); else stopClock();
    if (name === "history") renderHistory();
    if (name === "notes") renderNotes();
    if (name === "settings") renderSettings();
    if (location.hash !== "#/" + name) location.hash = "#/" + name;
    window.scrollTo(0, 0);
  }

  function isLoggedIn() {
    return sessionStorage.getItem("suansuan_session") === "1";
  }

  function routeFromHash() {
    if (!isLoggedIn()) { showPage("login"); return; }
    const name = (location.hash || "#/home").replace("#/", "") || "home";
    showPage(document.getElementById("page-" + name) ? name : "home");
  }

  // ---------- 弹窗 ----------
  function confirmModal(text, onOk) {
    $("modal-text").textContent = text;
    $("modal-mask").classList.remove("hidden");
    $("modal-ok").onclick = () => { $("modal-mask").classList.add("hidden"); onOk(); };
    $("modal-cancel").onclick = () => $("modal-mask").classList.add("hidden");
  }

  function toast(el, msg, ok) {
    el.textContent = msg;
    el.className = "settings-hint " + (ok ? "ok" : "err");
  }

  // ---------- 登录 ----------
  async function doLogin() {
    const u = $("login-username").value;
    const p = $("login-password").value;
    const err = $("login-error");
    err.textContent = "";
    const btn = $("login-btn");
    btn.disabled = true;
    btn.textContent = "验证中…";
    try {
      const ok = await LYAuth.validateLogin(u, p, store);
      if (ok) {
        sessionStorage.setItem("suansuan_session", "1");
        $("login-password").value = "";
        showPage("home");
      } else {
        err.textContent = "用户名或密码错误，或授权已过期";
      }
    } catch (e) {
      err.textContent = "验证失败：" + e.message;
    } finally {
      btn.disabled = false;
      btn.textContent = "登 录";
    }
  }

  // ---------- 主页时钟 ----------
  function startClock() {
    stopClock();
    const tick = () => {
      const now = new Date();
      const gz = LYCore.getGanZhi(now);
      $("home-clock").textContent =
        `${LYCore.formatTimestamp(now).slice(0, 16)} ${gz[0]}${gz[1]}日`;
    };
    tick();
    clockTimer = setInterval(tick, 1000);
  }
  function stopClock() { if (clockTimer) { clearInterval(clockTimer); clockTimer = null; } }

  // ---------- 起卦 ----------
  function performDivination() {
    const matter = $("matter-input").value.trim();
    if (!matter) {
      $("matter-input").focus();
      $("matter-input").placeholder = "请先写下所占之事再起卦…";
      return;
    }
    const record = LYCore.generateHexagram(matter, currentMode, new Date());
    record.lunar = LYCore.getLunarDateStr(new Date());
    record.weekday = LYCore.getWeekdayStr(new Date());
    record.day_zhi = record.day_zhi || LYCore.getGanZhi(new Date())[1];

    // 保存历史
    const history = store.getJSON("history", []);
    history.unshift(record);
    store.setJSON("history", history);

    currentRecord = record;
    renderResult($("result-body"), record, { from: "home" });
    showPage("result");
  }

  // ---------- 排盘渲染 ----------
  function yaoFigure(yaoNum) {
    const yang = yaoNum === 7 || yaoNum === 9;
    const moving = yaoNum === 6 || yaoNum === 9;
    const mark = yaoNum === 9 ? "○" : yaoNum === 6 ? "×" : "";
    const bars = yang
      ? '<div class="yao-bar"></div>'
      : '<div class="yao-bar yin"></div><div class="yao-bar yin"></div>';
    return `<div class="yao-fig">${bars}<span class="yao-mark">${mark}</span></div>`;
  }

  function renderHexPanel(title, gua, hexInfo, dayGan, isZhi, notes) {
    const info = LYCore.getHexagramFullInfo(gua, hexInfo, dayGan);
    const branches = LYCore.getBranches(gua);
    const [shi, ying] = [info["世爻"], info["应爻"]];
    const liuShenOrder = LY_DATA.LIU_SHEN_MAP[dayGan] || [];
    const changing = info["变爻"];

    let rows = "";
    for (let pos = 6; pos >= 1; pos--) {
      const idx = 6 - pos;
      const yaoNum = gua[idx];
      const branch = branches[idx];
      const lq = LYCore.calculateLiuqin(
        (LY_DATA.EIGHT_PALACES[hexInfo.palace] || {}).wu_xing || "", branch);
      const ls = liuShenOrder[pos - 1] || "";
      let badge = "";
      if (pos === shi) badge = '<span class="shi-ying-badge">世</span>';
      else if (pos === ying) badge = '<span class="shi-ying-badge ying">应</span>';
      const ci = (hexInfo.lines && hexInfo.lines[String(pos)]) || "无爻辞记录";
      rows += `<div class="yao-row">
        ${yaoFigure(yaoNum)}
        <div class="yao-info">
          <div class="yao-line1"><span class="lq">${lq}</span> ${branch}${badge}</div>
          <div class="yao-line2">${ls} · ${ci}</div>
        </div>
        <div class="yao-pos">${pos === 6 ? "上爻" : pos + "爻"}</div>
      </div>`;
    }

    const note = notes[hexInfo.name];
    const noteHtml = note
      ? `<div class="note-block"><b>我的备注</b><br>${escapeHtml(note)}</div>` : "";
    const changingTxt = changing.length ? `变爻：第 ${changing.join("、")} 爻` : "无变爻（静卦）";

    return `<div class="hex-panel${isZhi ? " changed" : ""}">
      <div class="hex-head">
        <span class="hex-tag${isZhi ? " changed-tag" : ""}">${title}</span>
        <span class="hex-name">${hexInfo.name}</span>
      </div>
      <div class="hex-judgment">卦辞：${info["卦辞"]}</div>
      <div class="hex-gong">${info["宫位"]}宫 · 世${shi}应${ying} · ${changingTxt}</div>
      ${rows}
      ${noteHtml}
    </div>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function renderResult(container, record, opts) {
    const notes = store.getJSON("user_notes", {});
    const benEntry = LYCore.lookupHexagram(record.ben_gua);
    const zhiEntry = LYCore.lookupHexagram(record.zhi_gua);
    const hasChange = record.ben_gua.some((y) => y === 6 || y === 9);
    const gz = record.day_zhi ? record.day_gan + record.day_zhi : record.day_gan;

    let html = `<div class="divi-meta">
      <div><b>${record.timestamp}</b> ${record.weekday || ""}</div>
      <div>干支：${gz}日 · 农历：${record.lunar || ""}</div>
      <div>模式：${record.mode || currentMode} · 所占之事：<span class="divi-matter">${escapeHtml(record.matter)}</span></div>
    </div>`;
    html += renderHexPanel("本 卦", record.ben_gua, benEntry, record.day_gan, false, notes);
    if (hasChange) {
      html += renderHexPanel("之 卦（变卦）", record.zhi_gua, zhiEntry, record.day_gan, true, notes);
    } else {
      html += `<div class="divi-meta">六爻安静，无之卦。本卦即为断卦依据。</div>`;
    }
    html += `<div class="result-actions">
      <button class="btn btn-primary" id="ai-btn">AI 解卦</button>
      <button class="btn btn-secondary" id="note-btn">写备注（${benEntry.name}）</button>
    </div>
    <div id="ai-area"></div>
    <div id="note-area"></div>`;

    container.innerHTML = html;

    $("ai-btn").onclick = () => runAnalysis(record, benEntry, zhiEntry);
    $("note-btn").onclick = () => showNoteEditor(benEntry.name);
  }

  // ---------- AI 解卦 ----------
  async function runAnalysis(record, benEntry, zhiEntry) {
    const area = $("ai-area");
    const btn = $("ai-btn");
    btn.disabled = true;
    area.innerHTML = '<div class="ai-loading">正在请 AI 解卦，请稍候（约 10-60 秒）…</div>';
    try {
      const apiKey = store.getJSON("api_key", LY_DATA.DEFAULT_API_KEY);
      const benInfo = LYCore.getHexagramFullInfo(record.ben_gua, benEntry, record.day_gan);
      const zhiInfo = LYCore.getHexagramFullInfo(record.zhi_gua, zhiEntry, record.day_gan);
      const text = await LYApi.analyzeDivination({
        matter: record.matter,
        mode: record.mode || currentMode,
        benInfo, zhiInfo,
        dayGan: record.day_gan,
        timestamp: record.timestamp,
        apiKey,
      });
      area.innerHTML = '<div class="ai-result"><span id="ai-text"></span><span class="ai-cursor">▌</span></div>';
      typewriter($("ai-text"), text);
    } catch (e) {
      area.innerHTML = `<div class="ai-result">⚠ ${escapeHtml(e.message)}</div>`;
    } finally {
      btn.disabled = false;
    }
  }

  function typewriter(el, text) {
    let i = 0;
    const step = () => {
      i = Math.min(i + 4, text.length);
      el.textContent = text.slice(0, i);
      if (i < text.length) setTimeout(step, 18);
      else {
        const cursor = document.querySelector(".ai-cursor");
        if (cursor) cursor.remove();
      }
    };
    step();
  }

  // ---------- 备注 ----------
  function showNoteEditor(hexName) {
    const area = $("note-area");
    const notes = store.getJSON("user_notes", {});
    area.innerHTML = `<div class="note-editor">
      <textarea id="note-text" placeholder="写下对「${hexName}」的心得备注…">${escapeHtml(notes[hexName] || "")}</textarea>
      <button class="btn btn-secondary" id="note-save-btn">保存备注</button>
    </div>`;
    $("note-text").focus();
    $("note-save-btn").onclick = () => {
      const val = $("note-text").value.trim();
      const all = store.getJSON("user_notes", {});
      if (val) all[hexName] = val; else delete all[hexName];
      store.setJSON("user_notes", all);
      area.innerHTML = '<p class="settings-hint ok">备注已保存</p>';
      if (currentRecord) {
        // 刷新排盘以显示备注
        setTimeout(() => {
          const body = $("result-body");
          if (body.classList.contains("active") || $("page-result").classList.contains("active")) {
            renderResult(body, currentRecord, {});
          }
        }, 300);
      }
    };
  }

  // ---------- 历史 ----------
  function renderHistory() {
    const body = $("history-body");
    const history = store.getJSON("history", []);
    if (!history.length) {
      body.innerHTML = '<div class="empty-state">暂无历史记录<br>起卦后会自动保存在这里</div>';
      return;
    }
    body.innerHTML = history.map((r, i) => {
      const entry = LYCore.lookupHexagram(r.ben_gua);
      return `<div class="history-item">
        <div class="hi-top">
          <span class="hi-hex">${entry.name}</span>
          <span class="hi-time">${r.timestamp}</span>
        </div>
        <div class="hi-matter">${escapeHtml(r.matter || "")}</div>
        <div class="hi-mode">${r.mode || "问道"} · ${r.day_gan || ""}${r.day_zhi || ""}日</div>
        <div class="hi-actions">
          <button class="btn btn-secondary" data-detail="${i}">查看详情</button>
          <button class="btn btn-ghost" data-del="${i}">删除</button>
        </div>
      </div>`;
    }).join("");

    body.querySelectorAll("[data-detail]").forEach((b) =>
      b.onclick = () => {
        const r = store.getJSON("history", [])[Number(b.dataset.detail)];
        currentRecord = r;
        renderResult($("history-detail-body"), r, {});
        showPage("history-detail");
      });
    body.querySelectorAll("[data-del]").forEach((b) =>
      b.onclick = () => confirmModal("确定删除这条历史记录吗？", () => {
        const h = store.getJSON("history", []);
        h.splice(Number(b.dataset.del), 1);
        store.setJSON("history", h);
        renderHistory();
      }));
  }

  // ---------- 备注页 ----------
  function renderNotes() {
    const body = $("notes-body");
    const notes = store.getJSON("user_notes", {});
    const names = Object.keys(notes);
    if (!names.length) {
      body.innerHTML = '<div class="empty-state">暂无备注<br>在卦象结果页点击「写备注」即可添加</div>';
      return;
    }
    body.innerHTML = names.map((name) => `<div class="note-item">
      <div class="ni-name">${name}</div>
      <div class="ni-text">${escapeHtml(notes[name])}</div>
      <div class="ni-actions">
        <button class="btn btn-secondary" data-edit="${name}">编辑</button>
        <button class="btn btn-ghost" data-del="${name}">删除</button>
      </div>
    </div>`).join("");

    body.querySelectorAll("[data-edit]").forEach((b) =>
      b.onclick = () => {
        const name = b.dataset.edit;
        const item = b.closest(".note-item");
        const notes2 = store.getJSON("user_notes", {});
        item.innerHTML = `<div class="ni-name">${name}</div>
          <div class="note-editor">
            <textarea id="ne-${name}">${escapeHtml(notes2[name] || "")}</textarea>
            <button class="btn btn-secondary" id="nes-${name}">保存</button>
          </div>`;
        $("nes-" + name).onclick = () => {
          const val = $("ne-" + name).value.trim();
          const all = store.getJSON("user_notes", {});
          if (val) all[name] = val; else delete all[name];
          store.setJSON("user_notes", all);
          renderNotes();
        };
      });
    body.querySelectorAll("[data-del]").forEach((b) =>
      b.onclick = () => confirmModal(`确定删除「${b.dataset.del}」的备注吗？`, () => {
        const all = store.getJSON("user_notes", {});
        delete all[b.dataset.del];
        store.setJSON("user_notes", all);
        renderNotes();
      }));
  }

  // ---------- 设置 ----------
  function renderSettings() {
    $("api-key-input").value = store.getJSON("api_key", LY_DATA.DEFAULT_API_KEY);
    $("api-key-hint").textContent = "";
    $("admin-lock").classList.remove("hidden");
    $("admin-panel").classList.add("hidden");
    $("admin-pwd-input").value = "";
    $("admin-lock-hint").textContent = "";
    $("clear-hint").textContent = "";
  }

  function renderAdminUsers() {
    const users = LYAuth.getSpecialUsers(store);
    const list = $("admin-user-list");
    list.innerHTML = users.map((u) => {
      const valid = LYAuth.checkDateValidity(u.expire_date);
      return `<div class="admin-user-row">
        <div class="au-info">
          <div class="au-name">${escapeHtml(u.username)} / ${escapeHtml(u.password)}</div>
          <div class="au-exp${valid ? "" : " expired"}">有效期至 ${u.expire_date}${valid ? "" : "（已过期）"}</div>
        </div>
        <button class="btn btn-secondary" data-editexp="${escapeHtml(u.username)}">改期</button>
        <button class="btn btn-danger" data-deluser="${escapeHtml(u.username)}">删除</button>
      </div>`;
    }).join("");

    list.querySelectorAll("[data-deluser]").forEach((b) =>
      b.onclick = () => confirmModal(`确定删除授权用户「${b.dataset.deluser}」吗？`, () => {
        LYAuth.deleteSpecialUser(store, b.dataset.deluser);
        renderAdminUsers();
      }));
    list.querySelectorAll("[data-editexp]").forEach((b) =>
      b.onclick = () => {
        const uname = b.dataset.editexp;
        const row = b.closest(".admin-user-row");
        row.innerHTML = `<div class="au-info"><div class="au-name">${uname}</div>
          <input id="exp-input-${uname}" type="text" placeholder="新有效期 如 2027/12/31" style="margin:6px 0"></div>
          <button class="btn btn-secondary" id="exp-save-${uname}">保存</button>`;
        $("exp-save-" + uname).onclick = () => {
          try {
            LYAuth.updateSpecialUser(store, uname, { expire_date: $("exp-input-" + uname).value.trim() });
            renderAdminUsers();
          } catch (e) {
            toast($("admin-panel-hint"), e.message, false);
          }
        };
      });
  }

  // ---------- 事件绑定 ----------
  function bindEvents() {
    $("login-btn").onclick = doLogin;
    $("login-password").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });

    document.querySelectorAll(".mode-pill").forEach((b) =>
      b.onclick = () => {
        document.querySelectorAll(".mode-pill").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        currentMode = b.dataset.mode;
        $("mode-desc").textContent = MODE_DESC[currentMode];
      });

    $("cast-btn").onclick = performDivination;

    document.querySelectorAll(".nav-item").forEach((b) =>
      b.onclick = () => showPage(b.dataset.nav));
    document.querySelectorAll(".btn-back").forEach((b) =>
      b.onclick = () => showPage(b.dataset.go));

    $("goto-donation").onclick = () => showPage("donation");
    $("donation-qr").onerror = () => {
      $("donation-qr").classList.add("hidden");
      $("donation-qr-fallback").classList.remove("hidden");
    };

    // 设置页
    $("api-key-toggle").onclick = () => {
      const inp = $("api-key-input");
      inp.type = inp.type === "password" ? "text" : "password";
      $("api-key-toggle").textContent = inp.type === "password" ? "显示" : "隐藏";
    };
    $("api-key-save").onclick = () => {
      const v = $("api-key-input").value.trim();
      if (!v) { toast($("api-key-hint"), "Key 不能为空", false); return; }
      store.setJSON("api_key", v);
      toast($("api-key-hint"), "API Key 已保存", true);
    };

    $("admin-unlock-btn").onclick = () => {
      if (LYAuth.verifyAdminPassword(store, $("admin-pwd-input").value)) {
        $("admin-lock").classList.add("hidden");
        $("admin-panel").classList.remove("hidden");
        $("admin-panel-hint").textContent = "";
        renderAdminUsers();
      } else {
        toast($("admin-lock-hint"), "管理密码错误", false);
      }
    };
    $("add-user-btn").onclick = () => {
      try {
        LYAuth.addSpecialUser(store, {
          username: $("add-username").value.trim(),
          password: $("add-password").value.trim(),
          expire_date: $("add-expire").value.trim(),
        });
        $("add-username").value = $("add-password").value = $("add-expire").value = "";
        toast($("admin-panel-hint"), "已添加授权用户", true);
        renderAdminUsers();
      } catch (e) {
        toast($("admin-panel-hint"), e.message, false);
      }
    };
    $("change-admin-pwd-btn").onclick = () => {
      try {
        LYAuth.setAdminPassword(store, $("new-admin-pwd").value.trim());
        $("new-admin-pwd").value = "";
        toast($("admin-panel-hint"), "管理密码已修改", true);
      } catch (e) {
        toast($("admin-panel-hint"), e.message, false);
      }
    };

    $("clear-history-btn").onclick = () =>
      confirmModal("确定清空全部历史记录吗？此操作不可恢复。", () => {
        store.setJSON("history", []);
        toast($("clear-hint"), "历史记录已清空", true);
      });

    $("logout-btn").onclick = () => {
      sessionStorage.removeItem("suansuan_session");
      showPage("login");
    };

    window.addEventListener("hashchange", routeFromHash);
  }

  // ---------- 启动 ----------
  bindEvents();
  routeFromHash();
})();
