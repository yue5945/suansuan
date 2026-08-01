// 算算 · 页面路由与渲染（登录版：每次打开先登录；账户 0 不可用 AI 解卦）
(function () {
  "use strict";

  const store = LYStore.createStore();
  const $ = (id) => document.getElementById(id);

  const DEV_EMAIL = "304610517@qq.com";   // 开发者邮箱（AI 申请提示统一引用）

  // ---------- 状态 ----------
  let currentUser = null;    // 当前登录的账户名（未登录时只能停留在登录页）
  let currentMode = "问道";
  let currentRecord = null;   // 当前查看的卦记录
  let clockTimer = null;

  const MODE_DESC = {
    "问道": "问道模式：周易解卦，引经据典",
    "易康": "易康模式：周易解卦，兼参身心调养",
  };

  // ---------- 路由 ----------
  const NAV_PAGES = ["home", "history", "notes", "donation"];

  function showPage(name) {
    if (!currentUser && name !== "login") name = "login";  // 未登录一律先到登录页
    document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
    const page = $("page-" + name);
    if (page) page.classList.add("active");
    $("bottom-nav").classList.toggle("hidden", name === "login");
    document.querySelectorAll(".nav-item").forEach((b) =>
      b.classList.toggle("active", b.dataset.nav === name));
    if (name === "home") startClock(); else stopClock();
    if (name === "history") renderHistory();
    if (name === "notes") renderNotes();
    if (location.hash !== "#/" + name) location.hash = "#/" + name;
    window.scrollTo(0, 0);
  }

  function routeFromHash() {
    const name = (location.hash || "#/home").replace("#/", "") || "home";
    showPage(document.getElementById("page-" + name) ? name : "home");
  }

  // ---------- 登录 ----------
  function initLogin() {
    // 默认账户 0/0；上次输入的账户密码自动填回
    const saved = store.getJSON("login_creds", null) || { username: "0", password: "0" };
    $("login-username").value = saved.username || "0";
    $("login-password").value = saved.password || "0";

    // 每次输入后自动保存（任何账户都保存）
    const saveCreds = () => store.setJSON("login_creds", {
      username: $("login-username").value,
      password: $("login-password").value,
    });
    $("login-username").addEventListener("input", saveCreds);
    $("login-password").addEventListener("input", saveCreds);

    const tryLogin = async () => {
      const u = $("login-username").value.trim();
      const p = $("login-password").value.trim();
      saveCreds();
      $("login-error").textContent = "";
      $("login-btn").disabled = true;
      try {
        if (await LYAuth.validateLogin(u, p, store)) {
          currentUser = u;
          showPage("home");
        } else {
          $("login-error").textContent = "账户名或密码错误，或账户已过有效期";
        }
      } catch (e) {
        $("login-error").textContent = "登录异常，请重试";
      } finally {
        $("login-btn").disabled = false;
      }
    };
    $("login-btn").onclick = tryLogin;
    $("login-password").addEventListener("keydown", (e) => {
      if (e.key === "Enter") tryLogin();
    });
  }

  // ---------- 弹窗 ----------
  function confirmModal(text, onOk) {
    $("modal-text").textContent = text;
    $("modal-mask").classList.remove("hidden");
    $("modal-ok").onclick = () => { $("modal-mask").classList.add("hidden"); onOk(); };
    $("modal-cancel").onclick = () => $("modal-mask").classList.add("hidden");
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
    $("matter-input").value = "";  // 起卦后自动清空输入框
    renderResult($("result-body"), record);
    showPage("result");
  }

  // ---------- 排盘渲染 ----------
  function yaoFigure(yaoNum) {
    const yang = yaoNum === 7 || yaoNum === 9;
    const mark = yaoNum === 9 ? "○" : yaoNum === 6 ? "×" : "";
    const bars = yang
      ? '<div class="yao-bar"></div>'
      : '<div class="yao-bar"></div><div class="yao-bar"></div>';
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

  // 渲染卦象结果（结果页与历史详情页共用；按钮在容器内查找，避免跨页串扰）
  function renderResult(container, record) {
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
      <button class="btn btn-primary ai-btn">AI 解卦</button>
      <button class="btn btn-secondary note-btn">写备注（${benEntry.name}）</button>
    </div>
    <div class="ai-area"></div>
    <div class="note-area"></div>`;

    container.innerHTML = html;

    // 已保存的 AI 解读直接展示
    if (record.ai_analysis) {
      container.querySelector(".ai-area").innerHTML =
        `<div class="ai-result">${escapeHtml(record.ai_analysis)}</div>`;
    }

    container.querySelector(".ai-btn").onclick = () => {
      // 账户 0 等未开通 AI 的账户：提示联系开发者申请
      if (!LYAuth.canUseAI(currentUser, store)) {
        container.querySelector(".ai-area").innerHTML =
          `<div class="ai-result">当前账户未开通 AI 解卦<br>请联系开发者邮箱 ${DEV_EMAIL} 申请账户</div>`;
        return;
      }
      runAnalysis(container, record, benEntry, zhiEntry);
    };
    container.querySelector(".note-btn").onclick = () =>
      showNoteEditor(container, record, benEntry.name);
  }

  // ---------- AI 解卦 ----------
  async function runAnalysis(container, record, benEntry, zhiEntry) {
    const area = container.querySelector(".ai-area");
    const btn = container.querySelector(".ai-btn");
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
      area.innerHTML = '<div class="ai-result"><span class="ai-text"></span><span class="ai-cursor">▌</span></div>';
      typewriter(area.querySelector(".ai-text"), text, () => {
        // 解读完成后写入历史记录，之后在历史详情中可直接查看
        record.ai_analysis = text;
        const h = store.getJSON("history", []);
        const idx = h.findIndex((x) => x.timestamp === record.timestamp && x.matter === record.matter);
        if (idx >= 0) {
          h[idx].ai_analysis = text;
          store.setJSON("history", h);
        }
        area.innerHTML = `<div class="ai-result">${escapeHtml(text)}</div>`;
      });
    } catch (e) {
      area.innerHTML = `<div class="ai-result">⚠ ${escapeHtml(e.message)}</div>`;
    } finally {
      btn.disabled = false;
    }
  }

  function typewriter(el, text, onDone) {
    let i = 0;
    const step = () => {
      i = Math.min(i + 4, text.length);
      el.textContent = text.slice(0, i);
      if (i < text.length) {
        setTimeout(step, 18);
      } else {
        if (onDone) onDone();
      }
    };
    step();
  }

  // ---------- 备注 ----------
  function showNoteEditor(container, record, hexName) {
    const area = container.querySelector(".note-area");
    const notes = store.getJSON("user_notes", {});
    area.innerHTML = `<div class="note-editor">
      <textarea class="note-text" placeholder="写下对「${hexName}」的心得备注…">${escapeHtml(notes[hexName] || "")}</textarea>
      <button class="btn btn-secondary note-save-btn">保存备注</button>
    </div>`;
    area.querySelector(".note-text").focus();
    area.querySelector(".note-save-btn").onclick = () => {
      const val = area.querySelector(".note-text").value.trim();
      const all = store.getJSON("user_notes", {});
      if (val) all[hexName] = val; else delete all[hexName];
      store.setJSON("user_notes", all);
      renderResult(container, record); // 重渲染以显示备注
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
      const aiMark = r.ai_analysis ? ' · <span class="hi-ai">含AI解读</span>' : "";
      return `<div class="history-item">
        <div class="hi-top">
          <span class="hi-hex">${entry.name}</span>
          <span class="hi-time">${r.timestamp}</span>
        </div>
        <div class="hi-matter">${escapeHtml(r.matter || "")}</div>
        <div class="hi-mode">${r.mode || "问道"} · ${r.day_gan || ""}${r.day_zhi || ""}日${aiMark}</div>
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
        renderResult($("history-detail-body"), r);
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
            <textarea class="note-text">${escapeHtml(notes2[name] || "")}</textarea>
            <button class="btn btn-secondary note-save-btn">保存</button>
          </div>`;
        item.querySelector(".note-save-btn").onclick = () => {
          const val = item.querySelector(".note-text").value.trim();
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

  // ---------- 事件绑定 ----------
  function bindEvents() {
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

    $("donation-qr").onerror = () => {
      $("donation-qr").classList.add("hidden");
      $("donation-qr-fallback").classList.remove("hidden");
    };

    // 收款码点按/长按放大（App 内无浏览器长按识别菜单，放大后截屏再用微信识别）
    const zoomMask = $("qr-zoom-mask");
    const openZoom = (src) => {
      $("qr-zoom-img").src = src;
      zoomMask.classList.remove("hidden");
    };
    const qr = $("donation-qr");
    qr.onclick = () => openZoom(qr.src);
    qr.addEventListener("contextmenu", (e) => {  // 长按触发
      e.preventDefault();
      openZoom(qr.src);
    });
    zoomMask.onclick = () => zoomMask.classList.add("hidden");

    window.addEventListener("hashchange", routeFromHash);
  }

  // ---------- 启动（每次打开先登录，账户密码已自动填好，点「登录」即可） ----------
  bindEvents();
  initLogin();
  showPage("login");
})();
