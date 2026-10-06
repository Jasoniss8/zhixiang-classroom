/* 知象后台：登录与统计仪表盘。所有文本经 esc() 或 textContent 写入。 */
(function () {
  "use strict";
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const SVG = "http://www.w3.org/2000/svg";
  const FEATURE_NAMES = {
    present: "大屏模式",
    save: "保存课堂",
    screenshot: "截图导出",
    export_params: "导出参数",
    export_data: "导出数据",
    share: "复制分享链接",
    ink: "板书",
    question_submit: "做题提交",
    download_desktop: "下载桌面版",
  };
  const DEVICE_NAMES = { desktop: "电脑", tablet: "平板", mobile: "手机" };
  const RANGE_NAMES = { today: "今天", "7d": "近 7 天", "30d": "近 30 天", "90d": "近 90 天" };
  const view = { range: "7d", cat: "all", expanded: false, model: null, data: null };
  let lockTimer = 0,
    loadToken = 0;

  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const fmt = (n) => Number(n || 0).toLocaleString("zh-CN");

  class Unauthorized extends Error {}

  async function api(path, options = {}) {
    const res = await fetch(path, { credentials: "same-origin", ...options });
    if (res.status === 401 && !path.endsWith("/login")) throw new Unauthorized();
    let body = null;
    try {
      body = await res.json();
    } catch {
      /* Non-JSON error page. */
    }
    return { status: res.status, body };
  }

  // ---- Login ----
  function showLogin(message = "") {
    $("#dashboard").hidden = true;
    $("#login").hidden = false;
    $("#loginMessage").textContent = message;
    $("#password").value = "";
    $("#password").focus();
  }

  function lockFor(seconds) {
    clearInterval(lockTimer);
    const until = Date.now() + seconds * 1000;
    const button = $("#loginButton"),
      input = $("#password");
    const tick = () => {
      const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      if (!left) {
        clearInterval(lockTimer);
        button.disabled = input.disabled = false;
        $("#loginMessage").textContent = "可以重新登录。";
        input.focus();
        return;
      }
      button.disabled = input.disabled = true;
      $("#loginMessage").textContent = `尝试次数过多，已锁定，请在 ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")} 后重试。`;
    };
    tick();
    lockTimer = setInterval(tick, 1000);
  }

  $("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = $("#password").value;
    if (!password) {
      $("#loginMessage").textContent = "请输入密码。";
      return;
    }
    $("#loginButton").disabled = true;
    $("#loginButton").textContent = "正在登录…";
    $("#loginMessage").textContent = "";
    try {
      const { status, body } = await api("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (status === 200) {
        $("#password").value = "";
        showDashboard();
        return;
      }
      if (status === 429) return lockFor(body?.retryAfter || 900);
      $("#loginMessage").textContent =
        status === 401
          ? `密码错误，还可尝试 ${body?.remaining ?? 0} 次。`
          : status === 500 && body?.error === "not_configured"
            ? "后台尚未配置数据库或密钥，请按 README 完成设置。"
            : "登录失败，请稍后再试。";
    } catch {
      $("#loginMessage").textContent = "无法连接服务器，请检查网络。";
    } finally {
      $("#loginButton").textContent = "登录";
      if (!$("#password").disabled) {
        $("#loginButton").disabled = false;
        $("#password").select();
      }
    }
  });

  // ---- Dashboard ----
  function showDashboard() {
    clearInterval(lockTimer);
    lockTimer = 0;
    $("#login").hidden = true;
    $("#dashboard").hidden = false;
    load();
  }

  async function load() {
    const token = ++loadToken;
    const dashboard = $("#dashboard");
    dashboard.classList.add("loading");
    $("#refresh").classList.add("spinning");
    try {
      const query = new URLSearchParams({ range: view.range, ...(view.model ? { model: view.model } : {}) });
      const { status, body } = await api("/api/admin/stats?" + query);
      if (token !== loadToken) return;
      if (status !== 200 || !body) throw new Error(body?.error || String(status));
      view.data = body;
      $("#banner").hidden = true;
      render();
    } catch (error) {
      if (token !== loadToken) return;
      if (error instanceof Unauthorized) return showLogin("登录已过期，请重新登录。");
      $("#banner").textContent = `数据读取失败（${error.message || "网络错误"}），请点击刷新重试。`;
      $("#banner").hidden = false;
    } finally {
      if (token === loadToken) {
        dashboard.classList.remove("loading");
        $("#refresh").classList.remove("spinning");
      }
    }
  }

  function delta(el, current, previous) {
    el.className = "";
    if (!previous) {
      el.textContent = current ? "上一时段无数据" : "暂无数据";
      return;
    }
    const pct = Math.round(((current - previous) / previous) * 100);
    el.textContent = `${pct > 0 ? "↑" : pct < 0 ? "↓" : "→"} ${Math.abs(pct)}% 较上一时段`;
    if (pct) el.className = pct > 0 ? "up" : "down";
  }

  function render() {
    const d = view.data;
    $("#updated").textContent = `${RANGE_NAMES[d.range.name]} · ${d.range.from === d.range.to ? d.range.from : d.range.from + " 至 " + d.range.to} · 更新于 ${new Date(d.generatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
    $("#exportCSV").href = "/api/admin/export?range=" + encodeURIComponent(view.range);
    for (const [id, key] of [["Views", "views"], ["Visitors", "visitors"], ["Opens", "opens"], ["Present", "present"]]) {
      $("#kpi" + id).textContent = fmt(d.totals[key]);
      delta($(`#kpi${id}Delta`), d.totals[key], d.totals.previous[key]);
    }
    lineChart($("#trendChart"), d.trend, [
      ["views", "浏览量"],
      ["opens", "模型打开"],
    ]);
    renderModels();
    renderFeatures();
    renderSources();
    renderDevices();
    renderSearches();
  }

  function setWidths(root) {
    // CSP forbids inline style attributes; widths are applied through the CSSOM.
    requestAnimationFrame(() => $$("[data-width]", root).forEach((el) => (el.style.width = el.dataset.width + "%")));
  }

  function renderModels() {
    const all = view.data.models.filter((m) => view.cat === "all" || m.cat === view.cat);
    const shown = view.expanded ? all : all.slice(0, 5);
    const max = Math.max(1, ...all.map((m) => m.opens));
    $("#modelList").innerHTML = shown.length
      ? shown
          .map(
            (m) =>
              `<li class="${view.model === m.id ? "selected" : ""}"><button class="name" data-model="${esc(m.id)}" title="查看${esc(m.title)}的趋势">${esc(m.title)}</button><span class="track"><span class="fill ${esc(m.cat)}" data-width="${((m.opens / max) * 100).toFixed(1)}"></span></span><span class="count">${fmt(m.opens)}</span></li>`,
          )
          .join("")
      : '<li class="muted">没有模型</li>';
    setWidths($("#modelList"));
    const more = $("#modelMore");
    more.hidden = all.length <= 5;
    more.textContent = view.expanded ? "收起" : `展开全部 ${all.length} 个`;
    const drill = view.data.modelTrend;
    $("#modelDrill").hidden = !drill;
    if (drill) {
      $("#drillTitle").textContent = `${drill.title} · 打开次数`;
      lineChart($("#drillChart"), drill.points, [["opens", "打开次数"]]);
    }
  }

  function renderFeatures() {
    const list = [...view.data.features].sort((a, b) => b.count - a.count);
    const max = Math.max(1, ...list.map((f) => f.count));
    $("#featureList").innerHTML = list
      .map(
        (f) =>
          `<li><span class="name">${esc(FEATURE_NAMES[f.name] || f.name)}</span><span class="track"><span class="fill" data-width="${((f.count / max) * 100).toFixed(1)}"></span></span><span class="count">${fmt(f.count)}</span></li>`,
      )
      .join("");
    setWidths($("#featureList"));
  }

  function renderSources() {
    const d = view.data;
    const rows = [{ host: "直接访问", count: d.direct }, ...d.referrers].filter((r) => r.count);
    const total = rows.reduce((a, r) => a + r.count, 0);
    $("#sourceList").innerHTML = total
      ? rows
          .sort((a, b) => b.count - a.count)
          .map(
            (r) =>
              `<li><span class="host" title="${esc(r.host)}">${esc(r.host)}</span><span class="pct">${fmt(r.count)} · ${Math.round((r.count / total) * 100)}%</span></li>`,
          )
          .join("")
      : '<li class="muted">暂无数据</li>';
  }

  function renderDevices() {
    const d = view.data.devices;
    const total = d.desktop + d.tablet + d.mobile;
    const pct = (n) => (total ? Math.round((n / total) * 100) : 0);
    $("#deviceBar").innerHTML = ["desktop", "tablet", "mobile"]
      .map((k) => `<span class="d-${k}" data-width="${total ? ((d[k] / total) * 100).toFixed(2) : 0}" title="${DEVICE_NAMES[k]}"></span>`)
      .join("");
    setWidths($("#deviceBar"));
    $("#deviceLegend").innerHTML = ["desktop", "tablet", "mobile"]
      .map((k) => `<li><i class="d-${k}"></i>${DEVICE_NAMES[k]}<b>${fmt(d[k])} · ${pct(d[k])}%</b></li>`)
      .join("");
  }

  function renderSearches() {
    const list = view.data.searches;
    $("#searchList").innerHTML = list.length
      ? list.map((s) => `<span title="${esc(s.q)}">${esc(s.q)}<b>${fmt(s.count)}</b></span>`).join("")
      : '<p class="muted">暂无搜索</p>';
  }

  // ---- Line chart (SVG) ----
  // Smallest "round" axis maximum ≥ value whose four ticks are whole numbers.
  function niceMax(value) {
    const raw = Math.max(1, value / 4);
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
      const tick = m * magnitude;
      if (tick >= raw && Number.isInteger(tick)) return tick * 4;
    }
    return 40 * magnitude;
  }

  function shortLabel(label) {
    const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(label);
    return m ? `${Number(m[1])}/${Number(m[2])}` : label;
  }

  function el(name, attrs = {}, parent) {
    const node = document.createElementNS(SVG, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  }

  // Charts redraw from their last data whenever their own box changes size.
  const chartData = new WeakMap();
  const chartSizes = new WeakMap();
  const resizer = new ResizeObserver((entries) => {
    for (const { target, contentRect } of entries) {
      const last = chartSizes.get(target);
      if (last && Math.abs(last - contentRect.width) < 1) continue;
      const data = chartData.get(target);
      if (data && contentRect.width) lineChart(target, ...data);
    }
  });

  function lineChart(container, points, series) {
    chartData.set(container, [points, series]);
    chartSizes.set(container, container.clientWidth);
    resizer.observe(container);
    container.replaceChildren();
    if (!points.length || points.every((p) => series.every(([key]) => !p[key]))) {
      container.innerHTML = '<div class="empty">这段时间还没有数据</div>';
      return;
    }
    const w = Math.max(container.clientWidth, 260),
      h = container.clientHeight || 240;
    const pad = { left: 40, right: 12, top: 12, bottom: 26 };
    const pw = w - pad.left - pad.right,
      ph = h - pad.top - pad.bottom;
    const max = niceMax(Math.max(...points.flatMap((p) => series.map(([key]) => p[key]))));
    const x = (i) => pad.left + (points.length === 1 ? pw / 2 : (i / (points.length - 1)) * pw);
    const y = (v) => pad.top + ph - (v / max) * ph;
    const svg = el("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": series.map(([, name]) => name).join("与") + "趋势图" }, container);
    for (let i = 0; i <= 4; i++) {
      const v = (max / 4) * i;
      el("line", { class: "gridline", x1: pad.left, x2: w - pad.right, y1: y(v), y2: y(v) }, svg);
      el("text", { class: "axis", x: pad.left - 8, y: y(v) + 4, "text-anchor": "end" }, svg).textContent = fmt(v);
    }
    const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(pw / 64))));
    points.forEach((p, i) => {
      if (i % every && i !== points.length - 1) return;
      if (i !== points.length - 1 && points.length - 1 - i < every) return;
      el("text", { class: "axis", x: x(i), y: h - 6, "text-anchor": "middle" }, svg).textContent = shortLabel(p.label);
    });
    for (const [key] of series) {
      const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join("");
      el("path", { class: `area ${key}`, d: `${path}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z` }, svg);
      el("path", { class: `line ${key}`, d: path, fill: "none" }, svg);
    }
    const guide = el("line", { class: "guide", y1: pad.top, y2: pad.top + ph, visibility: "hidden" }, svg);
    const dots = series.map(([key]) => el("circle", { class: `dot ${key}`, r: 4.5, visibility: "hidden" }, svg));
    const tip = document.createElement("div");
    tip.className = "tip";
    tip.hidden = true;
    container.appendChild(tip);
    const hide = () => {
      guide.setAttribute("visibility", "hidden");
      dots.forEach((d) => d.setAttribute("visibility", "hidden"));
      tip.hidden = true;
    };
    const show = (clientX) => {
      const box = svg.getBoundingClientRect();
      const px = ((clientX - box.left) / box.width) * w;
      const i = Math.max(0, Math.min(points.length - 1, Math.round(((px - pad.left) / pw) * (points.length - 1))));
      const p = points[i];
      guide.setAttribute("x1", x(i));
      guide.setAttribute("x2", x(i));
      guide.setAttribute("visibility", "visible");
      series.forEach(([key], k) => {
        dots[k].setAttribute("cx", x(i));
        dots[k].setAttribute("cy", y(p[key]));
        dots[k].setAttribute("visibility", "visible");
      });
      tip.innerHTML = `<b>${esc(p.label)}</b>` + series.map(([key, name]) => `${esc(name)}：${fmt(p[key])}`).join("<br>");
      tip.hidden = false;
      const left = Math.min(Math.max((x(i) / w) * box.width, tip.offsetWidth / 2), box.width - tip.offsetWidth / 2);
      tip.style.left = left + "px";
    };
    svg.addEventListener("pointermove", (e) => show(e.clientX));
    svg.addEventListener("pointerleave", hide);
  }

  // ---- Controls ----
  $$(".segmented [data-range]").forEach((button) =>
    button.addEventListener("click", () => {
      view.range = button.dataset.range;
      $$(".segmented [data-range]").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      load();
    }),
  );
  $$(".chips [data-cat]").forEach((button) =>
    button.addEventListener("click", () => {
      view.cat = button.dataset.cat;
      $$(".chips [data-cat]").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      if (view.data) renderModels();
    }),
  );
  $("#modelMore").addEventListener("click", () => {
    view.expanded = !view.expanded;
    renderModels();
  });
  $("#modelList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-model]");
    if (!button) return;
    view.model = view.model === button.dataset.model ? null : button.dataset.model;
    load();
  });
  $("#drillClose").addEventListener("click", () => {
    view.model = null;
    load();
  });
  $("#refresh").addEventListener("click", load);
  $("#logout").addEventListener("click", async () => {
    try {
      await api("/api/admin/logout", { method: "POST" });
    } catch {
      /* Cookie expires on its own. */
    }
    view.data = null;
    showLogin("已退出。");
  });

  // Session cookies are HttpOnly, so ask the server whether we are signed in.
  (async () => {
    try {
      const { status, body } = await api("/api/admin/session");
      if (status === 500 && body?.error === "not_configured") return showLogin("后台尚未配置数据库或密钥，请按 README 完成设置。");
      if (body?.signedIn) showDashboard();
      else showLogin();
    } catch {
      showLogin("无法连接服务器，请检查网络。");
    }
  })();
})();
