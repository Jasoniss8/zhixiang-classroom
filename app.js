"use strict";
/* 知象 · 教学模型 | Zero-dependency, offline-first teaching simulations.
   All formulas use SI units unless a control explicitly states otherwise.
   Models run offline. Only desktop downloads and explicit update checks use network. */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const SUPPORT_QR_SRC = "assets/support-qr.jpg";
if (SUPPORT_QR_SRC) {
  const supportImage = new Image();
  supportImage.onload = () => {
    document.documentElement.dataset.supportReady = "true";
  };
  supportImage.src = SUPPORT_QR_SRC;
}
const IS_DESKTOP_APP =
  !!window.zhixiangDesktop ||
  location.protocol === "zhixiang:" ||
  location.pathname.includes(".app/Contents/Resources/standalone.html");
const STORAGE_CONTEXT = IS_DESKTOP_APP ? "知象应用" : "浏览器";
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rad = (x) => (x * Math.PI) / 180,
  deg = (x) => (x * 180) / Math.PI;
const fmt = (v, d = 2) =>
  Number.isFinite(v)
    ? (Math.abs(v) < Math.pow(10, -d) / 2 ? 0 : v)
        .toFixed(d)
        .replace(/\.?0+$/, "")
        .replace(/^$/, "0")
    : "—";
const num = (v, d = 2) =>
  Number.isFinite(v) ? Number(v.toFixed(d)).toString() : "—";
const signed = (v) => (v < 0 ? `− ${num(Math.abs(v))}` : `+ ${num(v)}`);
const ICONS = {
  classroom:
    '<rect x="3" y="3" width="18" height="13" rx="2"/><path d="M7 8h10M7 11h6M12 16v5m-4 0h8"/>',
  math: '<path d="M4 3v17h17M7 16c2-9 5-10 7-5s4 6 7-5"/>',
  physics:
    '<path d="M4 4h16M8 4l8 12M6 17a10 10 0 0 0 6 3"/><circle cx="17" cy="18" r="3"/>',
  earth:
    '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  solid: '<path d="m12 3 9 5-9 5-9-5Zm-9 5v9l9 5 9-5V8M12 13v9"/>',
  cube: '<path d="m12 2 9 5v10l-9 5-9-5V7Zm-9 5 9 5 9-5M12 12v10M7.5 4.5l9 5"/>',
  rotate:
    '<path d="M20 7v5h-5M4 17v-5h5M6.1 6.1A8 8 0 0 1 20 12M4 12a8 8 0 0 0 13.9 5.9"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  heart:
    '<path d="M20.7 4.9a5.4 5.4 0 0 0-7.6 0L12 6l-1.1-1.1a5.4 5.4 0 0 0-7.6 7.6L12 21l8.7-8.5a5.4 5.4 0 0 0 0-7.6Z"/>',
  folder:
    '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 11h18"/>',
  atom: '<ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6h14M5 18h14"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1 .7-1.5 1-1.5 2.5M12 17h.01"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
  play: '<path d="m8 4 12 8-12 8Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  reset: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>',
  fullscreen: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  shrink: '<path d="M3 8h5V3m8 0v5h5M3 16h5v5m8 0v-5h5"/>',
  pencil: '<path d="m16 3 5 5L8 21H3v-5ZM13 6l5 5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  camera:
    '<path d="M4 6h4l2-3h4l2 3h4a1 1 0 0 1 1 1v13H3V7a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="4"/>',
  compare:
    '<rect x="3" y="5" width="7" height="14" rx="1"/><rect x="14" y="5" width="7" height="14" rx="1"/>',
  save: '<path d="M4 3h13l4 4v14H3V3Zm3 0v6h10V3M7 21v-8h10v8"/>',
  share: '<path d="M12 15V3m-4 4 4-4 4 4M5 11H3v10h18V11h-2"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  spark:
    '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>',
  sliders:
    '<path d="M3 7h5m5 0h8M3 17h10m5 0h3"/><circle cx="10.5" cy="7" r="2.5"/><circle cx="15.5" cy="17" r="2.5"/>',
  book: '<path d="M12 5v16M12 5C8 2 4 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-4-1-7-1-10 1Z"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  step: '<path d="m6 5 10 7-10 7ZM20 5v14"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2m-3-7 1.5-1.5M5 19l1.5-1.5m-3-14L5 5m14 14 1.5 1.5"/>',
};
function icon(name) {
  return `<i data-icon="${name}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.spark}</svg></i>`;
}
function hydrateIcons(root = document) {
  $$("i[data-icon]:empty", root).forEach(
    (el) =>
      (el.innerHTML = icon(el.dataset.icon).match(/<svg[\s\S]*<\/svg>/)[0]),
  );
}
const CATS = {
  math: { name: "数学", color: "#578659", bg: "#eff4e9" },
  physics: { name: "物理", color: "#bd905b", bg: "#f8f1e8" },
  geography: { name: "地理", color: "#8a82b4", bg: "#f1f0f7" },
};
const SOURCES = {
  lens: [
    "OpenStax · Thin Lenses",
    "https://openstax.org/books/university-physics-volume-3/pages/2-4-thin-lenses",
  ],
  forced: [
    "OpenStax · Forced Oscillations",
    "https://openstax.org/books/university-physics-volume-1/pages/15-6-forced-oscillations",
  ],
  faraday: [
    "OpenStax · Faraday’s Law",
    "https://openstax.org/books/university-physics-volume-2/pages/13-1-faradays-law",
  ],
  lenz: [
    "OpenStax · Lenz’s Law",
    "https://openstax.org/books/university-physics-volume-2/pages/13-2-lenzs-law",
  ],
  doubleSlit: [
    "OpenStax · Young’s Double-Slit Interference",
    "https://openstax.org/books/university-physics-volume-3/pages/3-1-youngs-double-slit-interference",
  ],
  momentum: [
    "OpenStax · Types of Collisions",
    "https://openstax.org/books/university-physics-volume-1/pages/9-4-types-of-collisions",
  ],
  circular: [
    "OpenStax · Centripetal Force",
    "https://openstax.org/books/university-physics-volume-1/pages/6-3-centripetal-force",
  ],
  electric: [
    "OpenStax · Electric Field Lines",
    "https://openstax.org/books/university-physics-volume-2/pages/5-6-electric-field-lines",
  ],
  potential: [
    "OpenStax · Equipotential Lines",
    "https://openstax.org/books/college-physics-2e/pages/19-4-equipotential-lines",
  ],
  seasons: [
    "NOAA · Solar Declination",
    "https://gml.noaa.gov/grad/solcalc/glossary.html",
  ],
  terms: [
    "香港天文台 · 二十四节气",
    "https://www.hko.gov.hk/en/gts/time/24solarterms.htm",
  ],
  conics: [
    "OpenStax · Conic Sections",
    "https://openstax.org/books/calculus-volume-2/pages/7-5-conic-sections",
  ],
  derivative: [
    "OpenStax · Defining the Derivative",
    "https://openstax.org/books/calculus-volume-1/pages/3-1-defining-the-derivative",
  ],
  drag: [
    "OpenStax · Drag Forces",
    "https://openstax.org/books/college-physics/pages/5-2-drag-forces",
  ],
  damping: [
    "OpenStax · Damped Oscillations",
    "https://openstax.org/books/university-physics-volume-1/pages/15-5-damped-oscillations",
  ],
  geometry: [
    "OpenStax · Volume and Surface Area",
    "https://openstax.org/books/prealgebra-2e/pages/9-6-solve-geometry-applications-volume-and-surface-area",
  ],
  trig: [
    "OpenStax · Unit Circle: Sine and Cosine Functions",
    "https://openstax.org/books/precalculus-2e/pages/5-2-unit-circle-sine-and-cosine-functions",
  ],
  collisions: [
    "OpenStax · The Kinetic-Molecular Theory",
    "https://openstax.org/books/chemistry/pages/9-5-the-kinetic-molecular-theory",
  ],
  kinetic: [
    "OpenStax · Kinetic Theory of Gases",
    "https://openstax.org/books/college-physics-2e/pages/13-4-kinetic-theory-atomic-and-molecular-explanation-of-pressure-and-temperature",
  ],
  functions: [
    "OpenStax · Transformation of Functions",
    "https://openstax.org/books/algebra-and-trigonometry-2e/pages/3-5-transformation-of-functions",
  ],
  solar: [
    "NOAA · Solar Position Calculator / 角度定义",
    "https://gml.noaa.gov/grad/solcalc/azel.html",
  ],
  solarLimits: [
    "NOAA · Solar Calculation Details / 模型局限",
    "https://gml.noaa.gov/grad/solcalc/calcdetails.html",
  ],
  gas: [
    "OpenStax · The Ideal Gas Law",
    "https://openstax.org/books/college-physics-2e/pages/13-3-the-ideal-gas-law",
  ],
  projectile: [
    "OpenStax · Projectile Motion",
    "https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion",
  ],
  pendulumPeriod: [
    "OpenStax · Period of a Pendulum",
    "https://openstax.org/books/calculus-volume-2/pages/6-4-working-with-taylor-series",
  ],
  pendulum: [
    "OpenStax · Pendulums",
    "https://openstax.org/books/university-physics-volume-1/pages/15-4-pendulums",
  ],
  wave: [
    "OpenStax · Mathematics of Waves",
    "https://openstax.org/books/university-physics-volume-1/pages/16-2-mathematics-of-waves",
  ],
  optics: [
    "OpenStax · Refraction",
    "https://openstax.org/books/university-physics-volume-3/pages/1-3-refraction",
  ],
  spring: [
    "OpenStax · Simple Harmonic Motion",
    "https://openstax.org/books/university-physics-volume-1/pages/15-1-simple-harmonic-motion",
  ],
};
// Control definition: [key, symbol, Chinese label, min, max, step, unit].

function modelById(id) {
  return MODELS.find((m) => m.id === id);
}
function safeParams(m, p) {
  const out = { ...m.defaults };
  if (!p || typeof p !== "object") return out;
  // Question fields must retain the same values through v1 save/import/share.
  const exactFields = ZhixiangQuestions.types.find((type) => type.modelId === m.id)?.fields || [];
  m.controls.forEach(([key, s, label, min, max, step]) => {
    if (typeof p[key] === "number" && Number.isFinite(p[key])) {
      const bounded = clamp(p[key], min, max);
      out[key] = m.keepNumericPrecision || exactFields.some((field) => field.key === key && field.type === "number")
        ? bounded : Number(bounded.toFixed(m.parsePrecision?.() ?? 4));
    }
  });
  if (m.id === "functions" && Object.hasOwn(FUNCTIONS, p.kind))
    out.kind = p.kind;
  for (const [key, values] of Object.entries(m.choices || {}))
    if (values.includes(p[key])) out[key] = p[key];
  for (const key of m.bools || [])
    if (typeof p[key] === "boolean") out[key] = p[key];
  return m.normalize ? m.normalize(out, m) : out;
}
const MODELS = ZhixiangModels.list();
const GEOMETRY_MODELS = MODELS.filter((m) => m.threeD && m.geometryUI !== false);
function readout(m, p) {
  return m.readout(p, m);
}
function drawThumbnail(canvas) {
  const m = modelById(canvas.dataset.thumb);
  if (m?.thumbnail) m.thumbnail(canvas, m);
}
function renderControls() {
  if (state.model) state.model.renderControls();
}
function setParam(key, value) {
  return state.model?.setParam(key, value);
}
function resetSolver() {
  state.model?.reset();
}
function updateSimulation(dt) {
  state.model?.advance(dt);
}
function drawStage() {
  const canvas = $("#simCanvas");
  if (!canvas || !state.model) return;
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.fillStyle = "#fcfdfa";
  ctx.fillRect(0, 0, w, h);
  stageInfo = null;
  state.model.draw(ctx, w, h, state.p, state.compare);
  if (stageInfo) stageInfo.modelId = state.model.id;
  const legend = $("#comparisonLegend");
  if (legend) {
    const env = state.model.environment && isResistanceCompare(state.p);
    legend.hidden = !state.compare && !env;
    legend.style.display = state.compare || env ? "flex" : "none";
    setHTML(legend, env
      ? `<span class="legend-item"><span class="legend-line"></span>含阻力</span><span class="legend-item"><span class="legend-line compare"></span>理想</span>${state.compare ? '<span class="legend-item"><span class="legend-line retained"></span>保留曲线</span>' : ""}`
      : '<span class="legend-item"><span class="legend-line"></span>当前模型</span><span class="legend-item"><span class="legend-line compare"></span>对照曲线</span>');
  }
  drawAnnotations();
}
const STORAGE_KEY = "zhixiang-lab-v1";
let storageOK = true;
function loadStore() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      favorites: Array.isArray(data.favorites)
        ? data.favorites.filter((id) => modelById(id))
        : [],
      classes: Array.isArray(data.classes)
        ? data.classes
            .filter(
              (s) => s && modelById(s.model) && typeof s.title === "string",
            )
            .slice(0, 150)
            .map((s) => ({
              id: String(s.id),
              model: s.model,
              title: s.title.slice(0, 80),
              p: safeParams(modelById(s.model), s.p),
              date: String(s.date || ""),
            }))
        : [],
    };
  } catch {
    return { favorites: [], classes: [] };
  }
}
let store = loadStore();
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    storageOK = true;
    return true;
  } catch {
    storageOK = false;
    toast("本机未允许保存；请导出备份，以免关闭后丢失。");
    return false;
  }
}
const state = {
  only3d: false,
  geoSpin: false,
  geoFold: false,
  geoDirection: 1,
  view: "all",
  category: "all",
  query: "",
  grade: "all",
  model: null,
  p: null,
  time: 0,
  running: false,
  speed: 1,
  compare: null,
  grid: true,
  labels: true,
  inking: false,
  strokes: [],
  answer: false,
  presenting: false,
  particles: [],
  theta: 0,
  omega: 0,
  zoom: 1,
};
let pendingFrame = 0,
  prevFrame = 0,
  lastReadout = 0,
  resizeObserver,
  stageInfo = null,
  toastTimer;
function toast(message) {
  const el = $("#toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3300);
}
function updateCounts() {
  $("[data-nav=all] .nav-count").textContent = MODELS.length;
  $$("[data-category]").forEach((b) => {
    const el = b.querySelector("small");
    if (el)
      el.textContent = MODELS.filter(
        (m) => m.cat === b.dataset.category,
      ).length;
  });
  $("#favoriteCount").textContent = store.favorites.length;
  $("#classCount").textContent = store.classes.length;
}
function mobileNav() {
  return `<nav class="mobile-nav" aria-label="模型与课堂">${[
    ["all", "grid", "模型库"],
    ["questions", "pencil", "做题"],
    ["favorites", "heart", "我的收藏"],
    ["classes", "classroom", "我的课堂"],
    ["downloads", "download", IS_DESKTOP_APP ? "更新" : "下载"],
  ]
    .map(
      ([view, glyph, label]) =>
        `<button class="button ${state.view === view ? "active" : ""}" data-nav="${view}" ${state.view === view ? 'aria-current="page"' : ""}>${icon(glyph)}${label}</button>`,
    )
    .join(
      "",
    )}</nav><div class="mobile-support"><button data-action="support">${icon("heart")}<span>支持知象</span><small>自愿支持维护</small></button></div>`;
}
function emptyHTML(title, desc, button = "查看全部模型") {
  return `<div class="empty-state">${icon("grid")}<h3>${esc(title)}</h3><p>${esc(desc)}</p><button class="button primary" data-action="clear-filter">${esc(button)}${icon("arrow")}</button></div>`;
}
function setActiveNav() {
  const navView = activeQuestion ? "questions" : state.view;
  const browsingModels = (state.view === "all" || state.view === "demo") && !activeQuestion;
  const category = state.model?.cat || state.category;
  const geometry = state.model
    ? !!state.model.threeD
    : state.only3d && (category === "all" || category === "math");
  $$(".nav-item").forEach((el) => {
    const active = el.dataset.nav
      ? el.dataset.nav === navView &&
        (navView !== "all" || (category === "all" && !geometry))
      : browsingModels &&
        (el.dataset.collection === "geometry"
          ? geometry
          : el.dataset.category === category && !geometry);
    el.classList.toggle("active", active);
    if (active) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
  updateCounts();
}
function setRoute(hash = "") {
  try {
    const url = new URL(location.href);
    url.hash = hash;
    history.replaceState(null, "", url.href);
  } catch {
    /* Sandboxed previews may disallow history changes; local UI remains usable. */
  }
}
function showLibrary(view = "all", category = "all") {
  stopAnimation();
  exitPresentation();
  activeQuestion = null;
  state.view = view;
  state.category = category;
  state.only3d = false;
  state.model = null;
  state.query = "";
  state.grade = "all";
  state.inking = false;
  if (resizeObserver) resizeObserver.disconnect();
  setRoute(
    view === "all" && category === "all"
      ? ""
      : `view=${view}&category=${category}`,
  );
  renderLibrary();
  window.scrollTo(0, 0);
}
const VIEW_PAGES = { all: "home", favorites: "favorites", classes: "classes", questions: "questions", downloads: "downloads" };
function renderLibrary() {
  setActiveNav();
  ZhixiangAnalytics.view(VIEW_PAGES[state.view] || "home");
  if (state.view === "questions") {
    $("#pageCrumb").textContent = "做题";
    renderQuestionPage();
    return;
  }
  if (state.view === "downloads") {
    $("#pageCrumb").textContent = IS_DESKTOP_APP ? "版本与更新" : "下载桌面版";
    renderDownloads();
    return;
  }
  $("#pageCrumb").textContent =
    state.view === "classes"
      ? "我的课堂"
      : state.view === "favorites"
        ? "我的收藏"
        : state.category !== "all"
          ? CATS[state.category].name
          : "模型库";
  if (state.view === "classes") {
    renderClasses();
    return;
  }
  const title =
    state.view === "favorites"
      ? "我的收藏"
      : state.category === "all"
        ? "模型库"
        : CATS[state.category].name;
  const subtitle =
    state.view === "favorites"
      ? "已收藏的模型。"
      : state.category === "all"
        ? "数学、物理、地理的课堂演示。"
        : "按知识点选择模型，打开后可调整参数。";
  $("#main").innerHTML =
    mobileNav() +
    `<section id="exploreSection"><div class="library-heading"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="searchbox">${icon("search")}<input id="searchInput" type="search" placeholder="搜索，如：抛物线、截面" aria-label="搜索模型、知识点"><span class="search-shortcut">/</span></div></div><div class="library-toolbar"><div class="tabs">${[
      ["all", "全部"],
      ["math", "数学"],
      ["physics", "物理"],
      ["geography", "地理"],
    ]
      .map(
        ([id, label]) =>
          `<button class="tab ${state.category === id ? "active" : ""}" data-filter="${id}">${label}<span class="tab-count">${id === "all" ? MODELS.length : MODELS.filter((m) => m.cat === id).length}</span></button>`,
      )
      .join(
        "",
      )}</div><div class="filter-controls"><label class="three-filter"><input id="threeDFilter" type="checkbox" ${state.only3d ? "checked" : ""}>只看三维</label><select id="gradeFilter" class="grade-filter" aria-label="按学段筛选"><option value="all">全部学段</option><option value="初中">初中</option><option value="高中">高中</option><option value="大学">大学</option></select></div></div><div class="result-row"><span id="resultCount"></span></div><div class="model-grid" id="modelGrid"></div></section>`;
  if (!storageOK)
    $("#main").insertAdjacentHTML(
      "afterbegin",
      '<div class="storage-warning">当前预览不支持本地保存。可通过导出配置备份课堂。</div>',
    );
  renderCards();
  updateRanges();
}

function filteredModels() {
  return MODELS.filter(
    (m) =>
      (!state.only3d || m.threeD) &&
      (state.category === "all" || m.cat === state.category) &&
      (state.view !== "favorites" || store.favorites.includes(m.id)) &&
      (state.grade === "all" || m.level.includes(state.grade)) &&
      (!state.query ||
        (m.title + " " + m.desc + " " + m.tags + " " + CATS[m.cat].name)
          .toLowerCase()
          .includes(state.query.toLowerCase())),
  );
}
function renderCards() {
  const models = filteredModels();
  $("#resultCount").textContent = `${models.length} 个模型`;
  $("#modelGrid").innerHTML = models.length
    ? models
        .map(
          (m) =>
            `<article class="model-card"><button class="card-favorite ${store.favorites.includes(m.id) ? "on" : ""}" data-favorite="${m.id}" aria-label="${store.favorites.includes(m.id) ? "取消收藏" : "收藏"}${m.title}" aria-pressed="${store.favorites.includes(m.id)}" title="${store.favorites.includes(m.id) ? "取消收藏" : "加入收藏"}">${icon("heart")}</button><button class="card-open" data-open="${m.id}" aria-label="打开${m.title}互动演示"><div class="card-art ${m.cat}"><canvas data-thumb="${m.id}" aria-hidden="true"></canvas></div><div class="card-body"><h3>${m.title}</h3><p>${m.desc}</p><div class="card-meta"><span class="tag ${m.cat}">${CATS[m.cat].name}</span><span>${m.level}</span></div></div></button></article>`,
        )
        .join("")
    : emptyHTML(
        state.view === "favorites" && !store.favorites.length
          ? "还没有收藏的模型"
          : "没有找到匹配模型",
        state.view === "favorites" && !store.favorites.length
          ? "点击模型卡片右上角的爱心，即可加入收藏。"
          : "试试其他关键词，或清除学科与学段筛选。",
      );
  requestAnimationFrame(() => $$("canvas[data-thumb]").forEach(drawThumbnail));
}
function toggleFavorite(id) {
  if (!modelById(id)) return;
  const ix = store.favorites.indexOf(id);
  if (ix >= 0) store.favorites.splice(ix, 1);
  else store.favorites.push(id);
  persist();
  updateCounts();
  if (!state.model) renderCards();
  toast(ix >= 0 ? "已取消收藏" : "已加入我的收藏");
}
function renderClasses() {
  $("#main").innerHTML =
    mobileNav() +
    `<div class="section-heading"><div class="page-title" style="margin-bottom:0"><h1>我的课堂</h1><p>保存模型与参数，下次直接打开。</p></div><div class="class-actions"><button class="button secondary" data-action="import">${icon("upload")}导入配置</button><button class="button secondary" data-action="backup">${icon("download")}导出备份</button></div></div><div class="dialog-message" style="margin-bottom:20px">${icon("save")} 课堂配置仅保存在当前${STORAGE_CONTEXT}。清理本机数据或更换设备前，请导出备份。</div><div class="model-grid">${
      store.classes.length
        ? store.classes
            .map((c) => {
              const m = modelById(c.model);
              return `<article class="saved-card"><span class="demo-tag ${m.cat}">${CATS[m.cat].name}</span><h3 style="margin-top:12px">${esc(c.title)}</h3><p>${m.title}</p><small>${esc(c.date || "本地课堂配置")}</small><div class="saved-actions"><button class="button primary small" data-class-open="${esc(c.id)}">打开演示${icon("arrow")}</button><button class="button secondary small" data-class-share="${esc(c.id)}">复制分享链接</button><button class="icon-button" data-class-export="${esc(c.id)}" aria-label="导出${esc(c.title)}" title="导出配置">${icon("download")}</button><button class="icon-button" data-class-delete="${esc(c.id)}" aria-label="删除${esc(c.title)}" title="删除课堂">${icon("trash")}</button></div></article>`;
            })
            .join("")
        : emptyHTML(
            "还没有保存的课堂",
            "打开任意模型，调整参数，然后点击「保存课堂」。",
          )
    }</div>`;
  hydrateIcons($("#main"));
}

function paramHTML(c, p) {
  const [key, symbol, label, min, max, step, unit] = c;
  return `<div class="param"><div class="param-head"><label class="param-label" for="range-${key}"><span class="param-symbol">${symbol}</span>${label}</label><div class="param-value"><input id="number-${key}" data-param-number="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${p[key]}" aria-label="${label}数值"><span>${unit}</span></div></div><input id="range-${key}" type="range" data-param="${key}" min="${min}" max="${max}" step="${step}" value="${p[key]}" aria-label="${label}"><div class="range-extents"><span>${min}${unit ? " " + unit : ""}</span><span>${max}${unit ? " " + unit : ""}</span></div></div>`;
}

function openModel(id, params = null, question = null, via = "other") {
  const m = modelById(id);
  if (!m) {
    toast("未找到这个模型，已返回模型库。");
    showLibrary();
    return;
  }
  // A question must pass strict validation before normal model initialization.
  let questionParams = null;
  if (question) {
    const checked = ZhixiangQuestions.validate(question.typeId, question.values);
    if (!checked.ok || question.modelId !== id || question.issues?.length) {
      toast("题目条件未通过核对，请返回做题页面检查。");
      showLibrary("questions");
      return;
    }
    questionParams = safeParams(m, checked.params);
  }
  stopAnimation();
  exitPresentation();
  if (resizeObserver) resizeObserver.disconnect();
  activeQuestion = question;
  Object.assign(state, {
    view: "demo",
    model: m,
    p: questionParams || safeParams(m, params),
    time: 0,
    compare: null,
    answer: false,
    inking: false,
    strokes: [],
    zoom: 1,
    grid: true,
    labels: true,
  });
  if (activeQuestion) activeQuestion.originalParams = { ...state.p };
  stageInfo = null;
  resetSolver();
  renderDemo();
  ZhixiangAnalytics.track("model_open", { model: id, via: question ? "question" : via });
  setRoute(
    new URLSearchParams({
      model: id,
      ...(params ? { params: JSON.stringify(state.p) } : {}),
    }).toString(),
  );
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
}
function playbackDuration() {
  if (state.model?.playback) return state.model.playback.duration(state.p);
  return state.model.id === "collision"
    ? collisionDuration(state.p)
    : state.model.id === "induction"
      ? state.p.period
      : projectileDuration(state.p);
}
function standardPlayback(m) {
  return `${m.time ? `<button class="button primary small" id="playButton" data-action="play">${icon("play")}播放</button><button class="icon-button" data-action="step" title="${m.playback ? "暂停并推进一个模拟步长" : m.id === "seasons" ? "暂停并推进公转位置 0.75°" : m.id === "solar" ? "暂停并推进 1.5 分钟地方真太阳时" : "暂停并单步推进 0.05 秒"}" aria-label="暂停并单步推进">${icon("step")}</button>` : ""}<button class="icon-button" data-action="reset" title="恢复默认参数 (R)" aria-label="恢复默认参数">${icon("reset")}</button>${m.playback || ["projectile", "collision", "induction"].includes(m.id) ? `<input id="timeline" type="range" min="0" max="1000" step="1" value="0" aria-label="${m.playback ? "模拟时间进度" : m.id === "collision" ? "碰撞演示进度" : m.id === "induction" ? "电磁感应演示进度" : "飞行进度"}"><span class="time-label" id="timeLabel">0.00 s</span>` : m.time ? `<span class="time-label" id="timeLabel">0.00 s</span><span style="flex:1"></span>` : `<span class="note">按 R 恢复默认参数</span>`}${m.time ? `<select id="speedSelect" class="speed-select" aria-label="播放速度"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select>` : ""}`;
}
function renderDemo() {
  const m = state.model;
  setActiveNav();
  ZhixiangAnalytics.view("model");
  $("#pageCrumb").textContent = (activeQuestion ? "做题" : CATS[m.cat].name) + " / " + m.title;
  $("#main").innerHTML =
    `<section class="demo-header"><div class="demo-heading"><button class="icon-button back-button" data-action="home" aria-label="返回模型库">${icon("back")}</button><div><div class="demo-title-row"><h1>${m.title}</h1><span class="demo-tag ${m.cat}">${CATS[m.cat].name}</span></div><p>${m.desc}</p></div></div><div class="demo-actions">${m.exportData ? `<button class="button secondary" data-export-data>${icon("download")}<span>导出数据</span></button>` : ""}<button class="button secondary" data-action="share" title="导出当前模型参数">${icon("share")}<span>导出参数</span></button><button class="button secondary" data-action="save">${icon("save")}<span>保存课堂</span></button><button class="button primary" data-action="present">${icon("fullscreen")}<span id="presentLabel">大屏模式</span></button></div></section><div class="demo-layout model-${m.id} ${m.advanced ? "advanced-layout advanced-" + m.id : ""} ${m.science ? "science-layout science-" + m.id : ""} ${m.threeD ? "geometry-layout geometry-" + m.id : ""}"><div class="demo-left"><section class="canvas-panel" aria-label="互动模型演示"><div class="canvas-toolbar"><div class="status"><span id="simulationStatus">${m.threeD ? "拖动旋转 · 滚轮缩放" : m.time ? "点击播放" : "拖动参数"}</span><button class="mobile-param-jump" data-action="to-params">参数 ↓</button></div><div class="canvas-tools">${m.compare ? `<button class="icon-button" data-action="compare" title="对照曲线" aria-label="保存或清除对照曲线">${icon("compare")}</button><span class="sep"></span>` : ""}<button class="icon-button" id="inkButton" data-action="ink" title="板书 / 自由标注" aria-label="开启板书" aria-pressed="false">${icon("pencil")}</button><button class="icon-button" data-action="clear-ink" title="清空板书" aria-label="清空板书">${icon("trash")}</button><span class="sep"></span><button class="icon-button" data-action="screenshot" title="导出当前模型图片" aria-label="导出当前模型图片">${icon("camera")}</button></div></div>${m.threeD && m.geometryUI !== false ? geometryToolbar() : ""}<div class="stage ${m.threeD ? "stage-3d" : ""}" id="stage"><canvas id="simCanvas" tabindex="0" role="img" aria-live="off" aria-label="${m.title}动态图。可通过参数滑块或数值输入操作；结果显示在下方。"></canvas><canvas id="annotation" aria-label="课堂板书画布"></canvas><div class="comparison-legend" id="comparisonLegend" hidden><span class="legend-item"><span class="legend-line"></span>当前模型</span><span class="legend-item"><span class="legend-line compare"></span>对照曲线</span></div></div><div class="stage-hint">${m.hint}</div><div class="formula-bar"><div><div class="formula-text" id="formula"></div><div class="formula-caption" id="formulaCaption"></div></div></div><div class="playback">${m.threeD && m.geometryUI !== false ? geometryPlayback() : standardPlayback(m)}</div></section><div class="metrics" id="metrics" aria-live="off"></div><details class="model-question"><summary>讨论问题</summary><p>${m.question}</p><button data-action="answer" id="answerButton">查看解答</button><p class="answer" id="answerText" hidden>${m.answer}</p></details></div><aside class="control-panel" id="controlPanel" aria-label="模型参数"><div class="control-heading">参数<button class="mobile-stage-jump" data-action="to-model">回到模型 ↑</button></div><div class="control-body" id="controlBody"></div></aside></div>`;
  if (activeQuestion) {
    $(".demo-header").insertAdjacentHTML("afterend", questionContextHTML());
    const back = $(".back-button");
    back.removeAttribute("data-action");
    back.id = "questionBack";
    back.setAttribute("aria-label", "返回题目核对");
  }
  renderControls();
  renderReadout();
  state.speed = 1;
  bindStage();
  m.bind?.();
  resizeObserver = new ResizeObserver(() => requestDraw());
  resizeObserver.observe($("#stage"));
  requestDraw();
}
function renderReadout() {
  if (!state.model || !$("#formula")) return;
  const d = readout(state.model, state.p);
  updateQuestionVariation();
  updateCanvasDescription(d);
  $("#formula").textContent = d.formula;
  $("#formulaCaption").textContent = d.caption;
  $("#metrics").classList.toggle("has-comparison", !!d.comparison);
  setHTML($("#metrics"), d.comparison
    ? comparisonHTML(
        d.comparison,
        state.model.id === "projectile" ? "落地结果对照" : "同一时刻对照",
      )
    : d.metrics
        .map(
          (v) =>
            `<div class="metric"><span>${esc(v[0])}</span><strong>${esc(v[1])}${v[2] ? `<small>${esc(v[2])}</small>` : ""}</strong></div>`,
        )
        .join("") +
      (d.details
        ? `<dl class="math-details">${d.details.map(([name, value]) => `<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl>`
        : ""));
  if (state.model.advanced) updateMathNotice();
  if (state.model.science) updateScienceNotice();
  if ($("#timeLabel"))
    $("#timeLabel").textContent =
      state.model.playback
        ? state.model.playback.formatTime(state.time, state.p)
        : state.model.id === "collision"
        ? `${collisionNumber(state.time)} s`
        : state.model.id === "seasons"
          ? `λ = ${num(state.p.phase, 1)}°`
          : state.model.id === "solar"
            ? `${num(state.p.hour, 1)} h`
            : state.model.id === "trig"
              ? `${num(state.p.angle, 0)}°`
              : `${state.time.toFixed(2)} s`;
  if ($("#timeline")) {
    const total = playbackDuration();
    $("#timeline").value = total ? Math.round((state.time / total) * 1000) : 0;
    setRangeProgress($("#timeline"));
  }
  if (state.model.id === "seasons") syncParam("phase");
  if (state.model.id === "solar") syncParam("hour");
  if (state.model.id === "trig") syncParam("angle");
  if (state.model.threeD && state.model.geometryUI !== false) geometrySyncView();
}
function syncParam(key) {
  const range = $(`#range-${key}`),
    number = $(`#number-${key}`);
  if (range) {
    range.value = state.p[key];
    setRangeProgress(range);
  }
  if (number && document.activeElement !== number)
    number.value =
      state.model?.id === "seasons" && key === "phase"
        ? num(state.p[key], 4)
        : state.model?.keepNumericPrecision || state.model?.id === "spring" ||
            state.model?.id === "derivative" ||
            state.model?.science
          ? String(state.p[key])
          : num(
              state.p[key],
              Math.max(
                2,
                (
                  String(
                    state.model.controls.find((c) => c[0] === key)?.[5] || 0.01,
                  ).split(".")[1] || ""
                ).length,
              ),
            );
}
// Skips identical rewrites so per-frame updates keep focus, selection and layout stable.
const lastHTML = new WeakMap();
function setHTML(el, html) {
  if (lastHTML.get(el) !== html) {
    el.innerHTML = html;
    lastHTML.set(el, html);
  }
}
function setRangeProgress(el) {
  const min = Number(el.min),
    max = Number(el.max),
    v = Number(el.value);
  el.style.setProperty("--progress", `${((v - min) / (max - min)) * 100}%`);
}
function updateRanges(root = document) {
  $$("input[type=range]", root).forEach(setRangeProgress);
}

function requestDraw() {
  if (!pendingFrame) pendingFrame = requestAnimationFrame(frame);
}
function frame(now) {
  pendingFrame = 0;
  if (state.running && state.model) {
    const dt = Math.min((now - (prevFrame || now)) / 1000, 0.04) * state.speed;
    if (dt > 0) updateSimulation(dt * (state.model.playback?.rate?.(state.p) ?? 1));
  }
  prevFrame = now;
  if (state.model) {
    drawStage();
    if (now - lastReadout > 100) {
      renderReadout();
      lastReadout = now;
    }
  }
  if (state.running) requestDraw();
}
function stopAnimation() {
  state.running = false;
  state.geoSpin = false;
  state.geoFold = false;
  prevFrame = 0;
  updatePlayback();
  if (state.model?.threeD && state.model.geometryUI !== false) geometrySyncView();
}
function updatePlayback() {
  const b = $("#playButton");
  if (b)
    b.innerHTML =
      icon(state.running ? "pause" : "play") +
      (state.running ? "暂停" : "播放");
  if ($("#simulationStatus") && state.model?.time)
    $("#simulationStatus").textContent =
      state.model.id === "circular" && state.circular?.slack
        ? "绳松弛，已停止"
        : (state.model.playback || ["collision", "induction"].includes(state.model.id)) &&
            state.time >= playbackDuration()
          ? "演示结束"
          : state.running
            ? "播放中"
            : "已暂停";
  if (state.model && $('#simCanvas')) {
    updateCanvasDescription(readout(state.model, state.p));
  }
}
function togglePlay() {
  if (!state.model?.time) return;
  const validity = state.model.validate?.(state.p);
  if (validity && !validity.valid) { toast(validity.message); return; }
  if (state.model.playback && state.time >= playbackDuration()) state.time = 0;
  if (state.model.id === "circular" && state.circular?.slack) {
    updateScienceNotice();
    return;
  }
  if (
    (state.model.id === "projectile" &&
      state.time >= projectileDuration(state.p)) ||
    (["collision", "induction"].includes(state.model.id) &&
      state.time >= playbackDuration())
  ) {
    state.time = 0;
  }
  state.running = !state.running;
  prevFrame = 0;
  updatePlayback();
  requestDraw();
}
// ---- Canvas rendering. Graphics remain local and export without cross-origin assets. ----
const PALETTE = {
  green: "#397251",
  deep: "#216b51",
  orange: "#b97c3c",
  purple: "#796a9b",
  grid: "#e8ece9",
  axis: "#aabbb0",
  muted: "#65716a",
  ink: "#445b4b",
};
function setupCanvas(canvas) {
  const w = canvas.clientWidth || canvas.width || 400,
    h = canvas.clientHeight || canvas.height || 250,
    dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (
    canvas.width !== Math.round(w * dpr) ||
    canvas.height !== Math.round(h * dpr)
  ) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx: accessibleCanvasContext(ctx), w, h, dpr };
}
function line(ctx, x1, y1, x2, y2, color = PALETTE.axis, width = 1, dash = []) {
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}
function circle(ctx, x, y, r, fill, stroke = null, width = 1) {
  if (!Number.isFinite(x + y + r) || r < 0) return;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}
function roundRect(ctx, x, y, w, h, r, fill, stroke = null, width = 1) {
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(0, w), Math.max(0, h), r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}
function text(
  ctx,
  txt,
  x,
  y,
  size = 11,
  color = PALETTE.muted,
  align = "left",
  font = "sans-serif",
) {
  ctx.save();
  if (state.model && size < 12) size = 12;
  ctx.font = `${size}px ${font === "math" ? "Georgia, serif" : '"PingFang SC", "Microsoft YaHei", sans-serif'}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(String(txt), x, y);
  ctx.restore();
}
function arrow(
  ctx,
  x1,
  y1,
  x2,
  y2,
  color = PALETTE.green,
  width = 1.5,
  head = 6,
) {
  line(ctx, x1, y1, x2, y2, color, width);
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45));
  ctx.lineTo(x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}
function doubleArrow(ctx, x1, y1, x2, y2, color = PALETTE.orange) {
  arrow(ctx, x1, y1, x2, y2, color, 1, 4);
  arrow(ctx, x2, y2, x1, y1, color, 1, 4);
}
function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw)),
    v = raw / p;
  return (v <= 1 ? 1 : v <= 2 ? 2 : v <= 5 ? 5 : 10) * p;
}
function makePlot(ctx, w, h, options = {}) {
  let {
    xmin = -6,
    xmax = 6,
    ymin = -3,
    ymax = 7,
    equal = true,
    grid = state.grid,
    labels = state.labels,
    left = 40,
    right = 27,
    top = 26,
    bottom = 39,
  } = options;
  const pw = w - left - right,
    ph = h - top - bottom;
  if (equal) {
    const scale = Math.min(pw / (xmax - xmin), ph / (ymax - ymin));
    const cx = (xmin + xmax) / 2,
      cy = (ymin + ymax) / 2;
    xmin = cx - pw / scale / 2;
    xmax = cx + pw / scale / 2;
    ymin = cy - ph / scale / 2;
    ymax = cy + ph / scale / 2;
  }
  const x = (v) => left + ((v - xmin) / (xmax - xmin)) * pw,
    y = (v) => h - bottom - ((v - ymin) / (ymax - ymin)) * ph,
    ix = (v) => xmin + ((v - left) / pw) * (xmax - xmin),
    iy = (v) => ymin + ((h - bottom - v) / ph) * (ymax - ymin),
    preciseTicks = options.preciseTicks ?? !!state.model?.university,
    sx = niceStep((xmax - xmin) / (preciseTicks ? Math.max(3, pw / 55) : 14)),
    sy = equal ? sx : niceStep((ymax - ymin) / (preciseTicks ? Math.max(3, ph / 48) : 7)),
    tick = (v) => preciseTicks ? (Math.abs(v) < 1e-14 ? "0" : String(Number(v.toPrecision(4)))) : num(v, 1),
    ox = x(0),
    oy = y(0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, pw, ph);
  ctx.clip();
  if (grid) {
    for (let v = Math.ceil(xmin / sx) * sx; v <= xmax + (preciseTicks ? sx * 1e-6 : 1e-7); v += sx)
      line(ctx, x(v), top, x(v), h - bottom, PALETTE.grid, 1);
    for (let v = Math.ceil(ymin / sy) * sy; v <= ymax + (preciseTicks ? sy * 1e-6 : 1e-7); v += sy)
      line(ctx, left, y(v), w - right, y(v), PALETTE.grid, 1);
  }
  line(ctx, left, oy, w - right, oy, PALETTE.axis, 1);
  line(ctx, ox, top, ox, h - bottom, PALETTE.axis, 1);
  ctx.restore();
  if (labels) {
    for (let v = Math.ceil(xmin / sx) * sx; v <= xmax + (preciseTicks ? sx * 1e-6 : 1e-7); v += sx)
      if (Math.abs(v) > (preciseTicks ? 1e-14 : 1e-7))
        text(
          ctx,
          tick(v),
          x(v),
          clamp(oy + 14, top + 11, h - bottom + 14),
          9,
          "#a3ae99",
          "center",
        );
    for (let v = Math.ceil(ymin / sy) * sy; v <= ymax + (preciseTicks ? sy * 1e-6 : 1e-7); v += sy)
      if (Math.abs(v) > (preciseTicks ? 1e-14 : 1e-7))
        text(
          ctx,
          tick(v),
          clamp(ox - 9, left + 19, w - right - 5),
          y(v),
          9,
          "#a3ae99",
          "right",
        );
    if (ox >= left && ox <= w - right && oy >= top && oy <= h - bottom)
      text(ctx, "O", ox - 10, oy + 13, 10, "#9bad8d");
    text(
      ctx,
      options.xLabel || "x",
      options.xLabel ? w - 8 : w - right + 8,
      clamp(oy + 3, top + 10, h - bottom + 3),
      12,
      "#92a585",
      options.xLabel ? "right" : "left",
      "math",
    );
    text(
      ctx,
      options.yLabel || "y",
      clamp(ox + 5, left + 4, w - right - 8),
      top - 10,
      12,
      "#92a585",
      "left",
      "math",
    );
  }
  return {
    x,
    y,
    ix,
    iy,
    xmin,
    xmax,
    ymin,
    ymax,
    left,
    right,
    top,
    bottom,
    w,
    h,
    pw,
    ph,
    clip: () => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(left, top, pw, ph);
      ctx.clip();
    },
    end: () => ctx.restore(),
  };
}
function plotCurve(
  ctx,
  plot,
  fn,
  color = PALETTE.green,
  width = 2.3,
  dash = [],
  breaks = [],
) {
  plot.clip();
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.setLineDash(dash);
  let last = null,
    prevX = null;
  const samples = Math.ceil(plot.pw * 1.6);
  for (let i = 0; i <= samples; i++) {
    const xv = plot.xmin + ((plot.xmax - plot.xmin) * i) / samples,
      yv = fn(xv),
      px = plot.x(xv),
      py = plot.y(yv);
    if (!Number.isFinite(py) || Math.abs(py) > 1e5) {
      last = null;
      prevX = xv;
      continue;
    }
    const crossed = prevX !== null && breaks.some((b) => prevX <= b && xv >= b);
    if (last === null || crossed || Math.abs(py - last) > plot.ph * 2)
      ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
    last = py;
    prevX = xv;
  }
  ctx.stroke();
  plot.end();
}

// Display histories sample the existing solvers; they never feed back into motion.

document.addEventListener("change", (e) => {
  const el = e.target,
    m = state.model;
  if (!m) return;
  const toggle = el.dataset.motionToggle,
    key = el.dataset.motionSelect;
  if (toggle && m.bools?.includes(toggle)) {
    state.p[toggle] = el.checked;
    requestDraw();
  }
  if (key && m.choices?.[key]?.includes(el.value)) {
    state.p[key] = el.value;
    requestDraw();
  }
  if (el.dataset.springSelect && m.id === "spring") {
    stopAnimation();
    state.p.springMode = el.value;
    if (el.value === "under") state.p.zeta = 0.2;
    if (el.value === "over") state.p.zeta = 1.6;
    normalizeSpringParams(m, state.p);
    state.time = 0;
    resetSolver();
    renderControls();
    renderReadout();
    requestDraw();
  }
});

function drawAnnotations() {
  const canvas = $("#annotation");
  if (!canvas) return;
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = "#c27c45";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const stroke of state.strokes) {
    ctx.beginPath();
    stroke.forEach((pt, i) =>
      i ? ctx.lineTo(pt.x * w, pt.y * h) : ctx.moveTo(pt.x * w, pt.y * h),
    );
    ctx.stroke();
    if (stroke.length === 1)
      circle(ctx, stroke[0].x * w, stroke[0].y * h, 1.4, "#c27c45");
  }
}
function bindStage() {
  let dragging = null,
    stroke = null;
  const canvas = $("#simCanvas"),
    annotation = $("#annotation");
  const pos = (e, el) => {
    const r = el.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * el.clientWidth) / r.width,
      y: ((e.clientY - r.top) * el.clientHeight) / r.height,
    };
  };
  canvas.addEventListener("pointerdown", (e) => {
    if (state.inking) return;
    const pt = pos(e, canvas);
    if (stageInfo?.kind === "parabola" && state.p.a !== 0) {
      const plot = stageInfo.plot;
      if (Math.hypot(pt.x - plot.x(state.p.h), pt.y - plot.y(state.p.k)) < 28) {
        dragging = "vertex";
        canvas.setPointerCapture(e.pointerId);
      }
    } else if (
      stageInfo?.kind === "trig" &&
      Math.hypot(pt.x - stageInfo.cx, pt.y - stageInfo.cy) < stageInfo.r + 35
    ) {
      dragging = "circle";
      stopAnimation();
      canvas.setPointerCapture(e.pointerId);
      updateDrag(pt);
    }
  });
  function updateDrag(pt) {
    if (dragging === "vertex") {
      setParam("h", Math.round(stageInfo.plot.ix(pt.x) * 10) / 10);
      setParam("k", Math.round(stageInfo.plot.iy(pt.y) * 10) / 10);
    } else if (dragging === "circle") {
      setParam(
        "angle",
        (deg(Math.atan2(stageInfo.cy - pt.y, pt.x - stageInfo.cx)) + 360) % 360,
      );
    }
  }
  canvas.addEventListener("pointermove", (e) => {
    const pt = pos(e, canvas);
    if (dragging) updateDrag(pt);
    else if (stageInfo?.kind === "parabola" && state.p.a !== 0)
      canvas.style.cursor =
        Math.hypot(
          pt.x - stageInfo.plot.x(state.p.h),
          pt.y - stageInfo.plot.y(state.p.k),
        ) < 25
          ? "grab"
          : "default";
    else if (stageInfo?.kind === "trig")
      canvas.style.cursor =
        Math.hypot(pt.x - stageInfo.cx, pt.y - stageInfo.cy) < stageInfo.r + 25
          ? "grab"
          : "default";
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) =>
    canvas.addEventListener(type, () => (dragging = null)),
  );
  annotation.addEventListener("pointerdown", (e) => {
    if (!state.inking) return;
    const pt = pos(e, annotation);
    stroke = [
      { x: pt.x / annotation.clientWidth, y: pt.y / annotation.clientHeight },
    ];
    state.strokes.push(stroke);
    annotation.setPointerCapture(e.pointerId);
    drawAnnotations();
  });
  annotation.addEventListener("pointermove", (e) => {
    if (!stroke) return;
    const pt = pos(e, annotation);
    stroke.push({
      x: pt.x / annotation.clientWidth,
      y: pt.y / annotation.clientHeight,
    });
    drawAnnotations();
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) =>
    annotation.addEventListener(type, () => (stroke = null)),
  );
}

// ---- Teacher workspace, portable configuration, and accessible event handling. ----
let pendingImport = null;
function openDialog(title, html) {
  const dialog = $("#dialog");
  if (dialog.open) dialog.close();
  $("#dialogTitle").textContent = title;
  $("#dialogBody").innerHTML = html;
  dialog.showModal();
}
function closeDialog() {
  $("#dialog").close();
}
function modelInfo() {
  if (!state.model) return;
  const m = state.model;
  openDialog(
    m.title + " · 模型说明",
    `<h3>模型与适用条件</h3><p>${esc(m.note)}</p><h3>参考资料</h3>${[...m.sources.map((id) => SOURCES[id]).filter(Boolean), ...(m.references || [])].map(([title, url]) => `<div class="source-row"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a></div>`).join("")}<div class="dialog-message">本站是课堂可视化工具。动画中的比例、速度或粒子数量可能为教学做过简化；请以明确标出的公式、单位及适用条件为准。</div>`,
  );
}
function showAbout() {
  openDialog(
    "关于知象 · 模型与参考资料",
    `<p>知象提供数学、物理和地理的课堂演示模型。</p><div class="dialog-message">${MODELS.length} 个模型，包含 3 个立体几何模块。收藏和课堂配置保存在当前${STORAGE_CONTEXT}，可导出文件备份。</div><h3>计算与可视化</h3><p>函数使用定义式直接绘制；抛体、波和理想弹簧使用解析方程；单摆使用完整非线性方程的数值积分。太阳高度角使用理想几何关系。气体宏观值按状态方程计算，微观动画为二维示意。新增三维模型采用空间坐标、面片深度排序和正投影；体积、面积不按屏幕投影计算。每个模型都可以单独查看假设与限制。</p><h3>访问统计</h3><p>${IS_DESKTOP_APP ? "桌面版不发送任何统计。" : "网站 zhixiang-classroom.pages.dev 会匿名记录页面浏览、打开的模型、使用的功能按钮和搜索词，用于改进模型。"}不使用 cookie，不保存 IP，不上传参数、题目文本、课堂名称、收藏或板书。浏览器开启“请勿追踪”时不发送。本地文件、单文件版和桌面版都不统计。</p><h3>参考资料</h3>${Object.values(
      SOURCES,
    )
      .map(
        ([title, url]) =>
          `<div class="source-row"><a href="${url}" target="_blank" rel="noopener noreferrer">${esc(title)} ↗</a></div>`,
      )
      .join(
        "",
      )}<p style="margin-top:16px;font-size:10px">以上为理论参考，并非合作方或背书。NOAA 的旧太阳计算器已停止维护；本站不依赖该服务，也不提供精密天文预报。</p>`,
  );
}
function showSupportDialog() {
  if (!document.documentElement.dataset.supportReady) return;
  openDialog(
    "支持知象",
    `<p>如果知象对你的课堂有帮助，可以自愿支持后续维护。</p><div class="support-code"><img src="${esc(SUPPORT_QR_SRC)}" alt="微信支付收款码"></div><p class="support-caption">使用微信扫码支持。支持完全自愿，不影响模型使用。</p>`,
  );
}
function showGuide() {
  openDialog(
    "使用说明",
    `<div class="modal-steps"><p><strong>选择模型</strong><br>按数学、物理、地理或学段筛选，也可以直接搜索“抛物线”“太阳”“气体”等关键词。</p><p><strong>调整参数</strong><br>打开模型，拖动滑块或直接输入数值。预设可快速切换常用情况。</p><p><strong>播放、暂停、比较</strong><br>运动模型支持播放、暂停、单步和倍速。物理运动单步推进 0.05 秒；太阳时单步推进 1.5 分钟。抛体可以拖动时间进度。函数与抛体支持保存一条对照曲线；抛物线顶点和单位圆上的点可直接拖动。</p><p><strong>旋转与展开</strong><br>三维模型可拖动旋转，滚轮或双指缩放，也可用正视、俯视和侧视按钮。点击画布后可用方向键旋转、加减键缩放。展开图支持连续展开或折叠。相机视角与显示选项一并保存到课堂配置。</p><p><strong>保存课堂</strong><br>点击「保存课堂」保存当前参数，或通过「导出参数」导出 JSON 文件。打开「我的课堂」可导入配置、导出全部备份。保存内容是模型与参数，不含播放进度、板书或对照曲线。</p><p><strong>让演示更适合投屏</strong><br>「大屏模式」隐藏导航；铅笔按钮开启自由板书，相机按钮导出带公式和数据的 PNG 图片。按 Esc 退出大屏。</p></div><div class="dialog-message"><strong>快捷键：</strong>空格播放 / 暂停，R 恢复默认参数，/ 聚焦搜索。数值或文字输入框内保留输入操作；滑块聚焦时可用模型快捷键。<br><strong>离线与分享：</strong>${IS_DESKTOP_APP ? "知象内置全部模型，断网可用。需要迁移课堂时，在「我的课堂」导出备份，再在另一台设备导入。" : "standalone.html 可直接打开并离线使用。在线版可分享浏览器网址；带参数的演示链接可在「导出参数」中复制。访问按网站的分享权限决定。配置文件只包含参数，不包含网站程序。"}</div>`,
  );
}
function safeFileName(s) {
  return String(s)
    .replace(/[\\/:*?"<>|]/g, "-")
    .slice(0, 65);
}
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function exportJSON(data, name) {
  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8",
    }),
    safeFileName(name) + ".json",
  );
}
function currentConfig(title = null) {
  return {
    app: "zhixiang",
    version: 1,
    type: "model",
    title: title || state.model.title,
    model: state.model.id,
    params: { ...state.p },
  };
}
function saveDialog() {
  if (!state.model) return;
  openDialog(
    "保存到我的课堂",
    `<p>为这组参数起一个容易找到的名字，下次直接开始演示。</p><label for="classTitle">课堂名称</label><input type="text" id="classTitle" maxlength="80" value="${esc(state.model.title)}" placeholder="例如：抛物线向右平移 2 个单位"><div class="dialog-message">保存当前模型与参数，不含动画进度、板书和对照曲线。仅保存在本机${STORAGE_CONTEXT}；可在「我的课堂」导出备份。</div><div class="dialog-actions"><button class="button secondary" data-action="close-dialog">取消</button><button class="button primary" data-action="confirm-save">${icon("save")}保存课堂</button></div>`,
  );
  setTimeout(() => {
    $("#classTitle")?.select();
  }, 30);
}
function makeId() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );
}
function confirmSave() {
  const input = $("#classTitle");
  if (!input || !state.model) return;
  const title = input.value.trim();
  if (!title) {
    input.focus();
    toast("请先填写课堂名称。");
    return;
  }
  if (store.classes.length >= 150) {
    toast("已保存 150 个课堂，请先导出备份并删除不再需要的配置。");
    return;
  }
  store.classes.unshift({
    id: makeId(),
    title: title.slice(0, 80),
    model: state.model.id,
    p: { ...state.p },
    date: new Date().toLocaleString("zh-CN", { hour12: false }),
  });
  const saved = persist();
  updateCounts();
  closeDialog();
  if (saved) toast("已保存到「我的课堂」。");
}
function shareDialog() {
  if (!state.model) return;
  const config = currentConfig(),
    hosted =
      /^https?:$/.test(location.protocol) &&
      !["localhost", "127.0.0.1", "0.0.0.0"].includes(location.hostname);
  openDialog(
    "导出模型参数",
    `<p>保存这组参数。在「我的课堂 → 导入配置」中可重新打开。</p><div class="dialog-actions"><button class="button secondary" data-action="copy-link">分享链接 / 二维码</button><button class="button secondary" data-action="copy-config">复制参数</button><button class="button primary" data-action="export-config">${icon("download")}下载配置文件</button></div><details class="config-details"><summary>查看配置内容</summary><textarea id="configText" readonly aria-label="当前课堂参数 JSON">${esc(JSON.stringify(config, null, 2))}</textarea></details>`,
  );
}

async function copyText(value, fallback = null) {
  try {
    await navigator.clipboard.writeText(value);
    toast("已复制。");
    return true;
  } catch {
    if (fallback) {
      const details = fallback.closest("details");
      if (details) details.open = true;
      fallback.focus();
      fallback.select();
      try {
        if (document.execCommand("copy")) {
          toast("已复制。");
          return true;
        }
      } catch {}
    }
    toast("未能自动复制，请选中内容手动复制。");
    return false;
  }
}
function backup() {
  exportJSON(
    {
      app: "zhixiang",
      version: 1,
      type: "backup",
      exportedAt: new Date().toISOString(),
      favorites: [...store.favorites],
      classes: store.classes.map((c) => ({ ...c, p: { ...c.p } })),
    },
    "知象-课堂与收藏备份",
  );
  toast("已生成备份文件。");
}
function validateImport(data) {
  if (
    !data ||
    typeof data !== "object" ||
    data.app !== "zhixiang" ||
    data.version !== 1
  )
    throw new Error("这不是支持的知象 v1 配置文件。");
  if (data.type === "backup") {
    if (
      !Array.isArray(data.classes) ||
      !Array.isArray(data.favorites) ||
      data.classes.length > 150
    )
      throw new Error("备份格式不完整，或课堂数量超过 150。");
    const classes = data.classes.map((c) => {
      if (
        !c ||
        typeof c.title !== "string" ||
        !modelById(c.model) ||
        !c.p ||
        typeof c.p !== "object"
      )
        throw new Error("备份中存在无效课堂，未进行导入。");
      return {
        id: makeId(),
        model: c.model,
        title: c.title.slice(0, 80),
        p: safeParams(modelById(c.model), c.p),
        date: typeof c.date === "string" ? c.date.slice(0, 60) : "",
      };
    });
    if (store.classes.length + classes.length > 150)
      throw new Error("导入后课堂超过 150 个，请先整理当前课堂。");
    return {
      type: "backup",
      classes,
      favorites: data.favorites.filter(
        (id) => typeof id === "string" && modelById(id),
      ),
    };
  }
  if (
    data.type === "model" &&
    modelById(data.model) &&
    data.params &&
    typeof data.params === "object"
  )
    return {
      type: "model",
      model: data.model,
      params: safeParams(modelById(data.model), data.params),
      title:
        typeof data.title === "string"
          ? data.title.slice(0, 80)
          : modelById(data.model).title,
    };
  throw new Error("找不到有效的模型或参数。");
}
async function handleImport(file) {
  if (!file) return;
  if (file.size > 1024 * 1024) {
    toast("配置文件超过 1 MB，已停止导入。");
    return;
  }
  try {
    pendingImport = validateImport(JSON.parse(await file.text()));
    const p = pendingImport;
    openDialog(
      "确认导入课堂配置",
      `<p>${p.type === "backup" ? `发现 ${p.classes.length} 个课堂配置和 ${p.favorites.length} 个收藏。将合并到当前${STORAGE_CONTEXT}，不覆盖已有课堂。` : `模型：${esc(modelById(p.model).title)}<br>名称：${esc(p.title)}`}</p><div class="dialog-message">参数会检查是否在模型允许的范围内。导入只处理数据，不执行文件中的代码。</div><div class="dialog-actions"><button class="button secondary" data-action="cancel-import">取消</button><button class="button primary" data-action="confirm-import">${p.type === "backup" ? "确认合并" : "导入并演示"}</button></div>`,
    );
  } catch (error) {
    pendingImport = null;
    toast(
      error instanceof SyntaxError
        ? "无法解析 JSON 文件，请检查配置文件是否完整。"
        : error.message,
    );
  } finally {
    $("#importFile").value = "";
  }
}
function confirmImport() {
  if (!pendingImport) return;
  const p = pendingImport;
  pendingImport = null;
  closeDialog();
  if (p.type === "backup") {
    store.classes = [...p.classes, ...store.classes];
    store.favorites = [...new Set([...store.favorites, ...p.favorites])];
    const saved = persist();
    showLibrary("classes");
    if (saved) toast("课堂和收藏已合并导入。");
  } else {
    openModel(p.model, p.params);
    toast("已载入参数；点击「保存课堂」可保存在本机。");
  }
}
async function togglePresentation() {
  if (!state.model) return;
  if (state.presenting) {
    await exitPresentation();
    return;
  }
  state.presenting = true;
  document.body.classList.add("presenting");
  $("#presentLabel").textContent = "退出大屏";
  try {
    await document.documentElement.requestFullscreen?.();
    // A user may leave the layout while the native fullscreen request is pending.
    if (!state.presenting && document.fullscreenElement) await exitPresentation();
  } catch {
    if (state.presenting) toast("已进入大屏布局；系统未允许全屏。");
  }
  requestDraw();
}
async function exitPresentation() {
  if (!state.presenting && !document.fullscreenElement) return;
  state.presenting = false;
  document.body.classList.remove("presenting");
  if ($("#presentLabel")) $("#presentLabel").textContent = "大屏模式";
  requestDraw();
  if (document.fullscreenElement) await document.exitFullscreen?.().catch(() => {});
}
function wrapCanvasText(
  ctx,
  content,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines = 4,
) {
  let current = "",
    lineNumber = 0;
  for (const ch of content) {
    if (ctx.measureText(current + ch).width > maxWidth && current) {
      ctx.fillText(current, x, y + lineNumber * lineHeight);
      lineNumber++;
      current = ch;
      if (lineNumber >= maxLines) break;
    } else current += ch;
  }
  if (lineNumber < maxLines)
    ctx.fillText(current, x, y + lineNumber * lineHeight);
  return (lineNumber + 1) * lineHeight;
}
function exportMathImage() {
  stopAnimation();
  renderReadout();
  drawStage();
  const source = $("#simCanvas"),
    anno = $("#annotation"),
    w = source.clientWidth,
    h = source.clientHeight,
    d = readout(state.model, state.p),
    canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d"),
    blocks = [];
  const add = (content, size = 13, color = "#445b4b") => {
    ctx.font = `${size}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    let current = "",
      lines = [];
    for (const ch of content) {
      if (ch === "\n") {
        lines.push(current);
        current = "";
        continue;
      }
      if (ctx.measureText(current + ch).width > w - 40 && current) {
        lines.push(current);
        current = ch;
      } else current += ch;
    }
    if (current) lines.push(current);
    blocks.push({ lines, size, color, height: lines.length * (size + 8) + 10 });
  };
  add(d.formula, 17);
  add(d.caption, 12, "#65716a");
  if (state.compare) add("绿色：当前曲线；橙色虚线：保留曲线。", 12);
  for (const [label, value, unit] of d.metrics)
    add(`${label}：${value}${unit ? " " + unit : ""}`);
  for (const [label, value] of d.details || []) add(`${label}：${value}`, 12);
  add(`模型条件：${state.model.note}`, 12, "#65716a");
  const total = h + 78 + blocks.reduce((v, b) => v + b.height, 0) + 35;
  canvas.width = w * 2;
  canvas.height = total * 2;
  ctx.scale(2, 2);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, total);
  text(ctx, state.model.title, 20, 26, 18, PALETTE.deep);
  ctx.drawImage(source, 0, 50, w, h);
  ctx.drawImage(anno, 0, 50, w, h);
  let y = h + 70;
  ctx.textBaseline = "top";
  for (const b of blocks) {
    ctx.font = `${b.size}px "PingFang SC", "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = b.color;
    for (const value of b.lines) {
      ctx.fillText(value, 20, y);
      y += b.size + 8;
    }
    y += 10;
  }
  text(ctx, "知象 · 教学模型", 20, total - 20, 12, PALETTE.muted);
  canvas.toBlob((blob) => {
    if (blob) {
      downloadBlob(blob, safeFileName(state.model.title) + "-知象.png");
      toast("已导出模型、板书、公式与数值。");
    } else toast("图片导出失败，请重试。");
  }, "image/png");
}

function exportImage() {
  if (!state.model) return;
  if (
    state.model.university ||
    state.model.advanced ||
    state.model.science ||
    state.model.threeD ||
    state.model.id === "spring"
  ) {
    exportMathImage();
    return;
  }
  stopAnimation();
  renderReadout();
  drawStage();
  const source = $("#simCanvas"),
    anno = $("#annotation"),
    w = source.clientWidth,
    h = source.clientHeight,
    narrow = w < 480 || isResistanceCompare(state.p),
    header = isResistanceCompare(state.p) ? 76 : 52,
    footer = narrow
      ? 178 + readout(state.model, state.p).metrics.length * 54
      : 258,
    dpr = 2,
    output = document.createElement("canvas");
  output.width = w * dpr;
  output.height = (h + header + footer) * dpr;
  const ctx = output.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h + header + footer);
  text(ctx, state.model.title, 20, 26, 17, "#314c3e");
  if (isResistanceCompare(state.p))
    text(ctx, "绿色实线：含阻力　橙色虚线：理想", 20, 52, 12, "#58665f");
  ctx.drawImage(source, 0, header, w, h);
  ctx.drawImage(anno, 0, header, w, h);
  const d = readout(state.model, state.p);
  let y = h + header + 14;
  ctx.fillStyle = "#314c3e";
  ctx.font = '16px Georgia, "PingFang SC", sans-serif';
  ctx.textBaseline = "top";
  y += wrapCanvasText(ctx, d.formula, 20, y, w - 40, 22, 3) + 8;
  ctx.fillStyle = "#58665f";
  ctx.font = '12px "PingFang SC", sans-serif';
  ctx.textBaseline = "top";
  y += wrapCanvasText(ctx, d.caption, 20, y, w - 40, 18, 3) + 14;
  d.metrics.forEach((v, i) => {
    if (narrow) {
      const row = y + i * 54;
      text(ctx, v[0], 20, row + 7, 12, "#58665f");
      text(ctx, `${v[1]} ${v[2]}`, 20, row + 29, 17, "#314c3e");
    } else {
      const x = 20 + (i * (w - 40)) / 3;
      text(ctx, v[0], x, y + 7, 12, "#58665f");
      text(ctx, `${v[1]} ${v[2]}`, x, y + 30, 17, "#314c3e");
    }
  });
  text(ctx, "知象 · 教学模型", 20, h + header + footer - 18, 12, "#58665f");
  output.toBlob((blob) => {
    if (!blob) {
      toast("图片导出失败，请重试。");
      return;
    }
    downloadBlob(blob, safeFileName(state.model.title) + "-知象.png");
    toast("已导出模型、板书、公式与数值。");
  }, "image/png");
}
function action(name) {
  switch (name) {
    case "spring-resonance":
      if (state.model?.id === "spring")
        setParam(
          "driveFreq",
          Math.sqrt(state.p.stiff / state.p.mass) / (2 * Math.PI),
        );
      break;
    case "collision-start":
    case "collision-contact":
      if (state.model?.id === "collision") {
        const d = SCIENCE.collisionSolution(state.p);
        if (name === "collision-contact" && !d.collides) break;
        stopAnimation();
        state.time = name === "collision-contact" ? d.collisionTime : 0;
        renderReadout();
        updatePlayback();
        requestDraw();
      }
      break;
    case "critical-speed":
      if (state.model?.id === "circular")
        setParam(
          "omega",
          Math.sqrt(
            ((state.p.start === "bottom" ? 5 : 1) * state.p.g) / state.p.radius,
          ),
        );
      break;
    case "season-shadow":
      if (state.model?.id === "seasons") {
        const d = SCIENCE.seasonData(state.p);
        openModel("solar", { lat: state.p.lat, dec: d.dec, hour: 12, pole: 2 });
      }
      break;
    case "halve-h":
      if (
        state.model?.id === "derivative" &&
        MATH_TOOLS.derivativeReadings(state.p).valid
      )
        setParam("h", Math.abs(state.p.h) < 1e-8 ? 0 : state.p.h / 2);
      break;
    case "reset-point":
      if (state.model?.id === "conics") {
        setParam("angle", 45);
        setParam("u", 0.6);
      }
      break;
    case "home":
      showLibrary();
      break;
    case "explore":
      $("#exploreSection")?.scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
      });
      break;
    case "guide":
      showGuide();
      break;
    case "about":
      showAbout();
      break;
    case "support":
      showSupportDialog();
      break;
    case "close-dialog":
      closeDialog();
      break;
    case "clear-filter":
      if (
        (state.view === "favorites" && !store.favorites.length) ||
        state.view === "classes"
      )
        showLibrary();
      else {
        state.query = "";
        state.category = "all";
        state.grade = "all";
        state.only3d = false;
        renderLibrary();
      }
      break;
    case "play":
      togglePlay();
      break;
    case "step":
      if (state.model?.time) {
        stopAnimation();
        updateSimulation(state.model.playback?.step(state.p) ?? 0.05);
        renderReadout();
        requestDraw();
      }
      break;
    case "reset":
      if (state.model) {
        stopAnimation();
        state.p = { ...state.model.defaults };
        state.time = 0;
        state.compare = null;
        state.strokes = [];
        resetSolver();
        if (state.model.threeD && state.model.geometryUI !== false) geometrySyncView();
        renderControls();
        renderReadout();
        requestDraw();
        toast("已恢复默认参数。");
      }
      break;
    case "compare":
      if (state.model?.compare) {
        state.compare = state.compare ? null : { ...state.p };
        const label = $("#compareText");
        if (label)
          label.textContent = state.compare ? "清除对照曲线" : "保留当前曲线";
        requestDraw();
        toast(
          state.compare
            ? isResistanceCompare(state.p)
              ? "已保留紫色曲线；现在可以改变参数。"
              : "已保留橙色对照曲线；现在可以改变参数。"
            : "已清除对照曲线。",
        );
      }
      break;
    case "ink":
      state.inking = !state.inking;
      $("#stage")?.classList.toggle("inking", state.inking);
      $("#inkButton")?.classList.toggle("active", state.inking);
      $("#inkButton")?.setAttribute("aria-pressed", String(state.inking));
      $("#inkButton")?.setAttribute(
        "aria-label",
        state.inking ? "关闭板书" : "开启板书",
      );
      toast(
        state.inking
          ? "板书已开启；拖动可书写，再点铅笔恢复模型操作。"
          : "已恢复模型操作。",
      );
      break;
    case "clear-ink":
      state.strokes = [];
      drawAnnotations();
      toast("已清空板书。");
      break;
    case "screenshot":
      exportImage();
      break;
    case "answer":
      state.answer = !state.answer;
      $("#answerText").hidden = !state.answer;
      $("#answerButton").innerHTML = state.answer ? "收起解答" : "查看解答";
      break;
    case "to-params":
      $("#controlPanel")?.scrollIntoView({ block: "start" });
      break;
    case "to-model":
      $(".canvas-panel")?.scrollIntoView({ block: "start" });
      break;
    case "model-info":
      modelInfo();
      break;
    case "save":
      saveDialog();
      break;
    case "confirm-save":
      confirmSave();
      break;
    case "share":
      shareDialog();
      break;
    case "present":
      togglePresentation();
      break;
    case "copy-config":
      copyText($("#configText").value, $("#configText"));
      break;
    case "copy-link":
      showShareLink();
      break;
    case "export-config":
      exportJSON(currentConfig(), state.model.title + "-课堂配置");
      toast("已导出当前参数配置。");
      break;
    case "backup":
      backup();
      break;
    case "import":
      $("#importFile").click();
      break;
    case "confirm-import":
      confirmImport();
      break;
    case "cancel-import":
      pendingImport = null;
      closeDialog();
      break;
  }
}
document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  if (b.dataset.open) return openModel(b.dataset.open, null, null, "card");
  if (b.dataset.favorite) return toggleFavorite(b.dataset.favorite);
  if (b.dataset.nav) return showLibrary(b.dataset.nav);
  if (b.dataset.category) return showLibrary("all", b.dataset.category);
  if (b.dataset.filter) {
    state.category = b.dataset.filter;
    $$("[data-filter]").forEach((el) =>
      el.classList.toggle("active", el === b),
    );
    setActiveNav();
    renderCards();
    return;
  }
  if (b.dataset.preset !== undefined && state.model) {
    stopAnimation();
    Object.assign(state.p, state.model.presets[Number(b.dataset.preset)][1]);
    if (state.model.normalize)
      state.p = state.model.normalize(state.p, state.model);
    state.time = 0;
    resetSolver();
    renderControls();
    $(`[data-preset="${b.dataset.preset}"]`)?.classList.add("active");
    renderReadout();
    if (state.model.playback || ["collision", "induction"].includes(state.model.id)) updatePlayback();
    requestDraw();
    return;
  }
  if (b.dataset.classOpen) {
    const c = store.classes.find((s) => s.id === b.dataset.classOpen);
    if (c) openModel(c.model, c.p, null, "class");
    return;
  }
  if (b.dataset.classExport) {
    const c = store.classes.find((s) => s.id === b.dataset.classExport);
    if (c)
      exportJSON(
        {
          app: "zhixiang",
          version: 1,
          type: "model",
          title: c.title,
          model: c.model,
          params: c.p,
        },
        c.title + "-课堂配置",
      );
    return;
  }
  if (b.dataset.classDelete) {
    const c = store.classes.find((s) => s.id === b.dataset.classDelete);
    if (c)
      openDialog(
        "删除这个课堂？",
        `<p>将从当前${STORAGE_CONTEXT}移除「${esc(c.title)}」。已经导出的文件不会受影响。</p><div class="dialog-actions"><button class="button secondary" data-action="close-dialog">取消</button><button class="button danger" data-confirm-delete="${esc(c.id)}">确认删除</button></div>`,
      );
    return;
  }
  if (b.dataset.confirmDelete) {
    store.classes = store.classes.filter(
      (c) => c.id !== b.dataset.confirmDelete,
    );
    persist();
    closeDialog();
    showLibrary("classes");
    toast("已删除课堂。");
    return;
  }
  if (b.dataset.action) action(b.dataset.action);
});
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.id === "searchInput") {
    state.query = el.value.trim();
    renderCards();
  } else if (el.dataset.param && state.model) {
    setParam(el.dataset.param, Number(el.value));
  } else if (
    el.id === "timeline" &&
    (state.model?.playback || ["projectile", "collision", "induction"].includes(state.model?.id))
  ) {
    stopAnimation();
    state.time = (Number(el.value) / 1000) * playbackDuration();
    state.model.playback?.seek?.(state.time);
    renderReadout();
    updatePlayback();
    requestDraw();
  }
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (
    el.dataset.environment &&
    state.model?.environment &&
    state.model.choices.motionMode.includes(el.value)
  ) {
    stopAnimation();
    state.p.motionMode = el.value;
    state.time = 0;
    state.compare = null;
    resetSolver();
    renderControls();
    renderReadout();
    requestDraw();
  } else if (el.id === "gradeFilter") {
    state.grade = el.value;
    renderCards();
  } else if (el.dataset.paramNumber && state.model) {
    const key = el.dataset.paramNumber,
      value = Number(el.value);
    if (el.value.trim() === "" || !Number.isFinite(value)) {
      el.value = state.p[key];
      toast("请输入范围内的有效数字。");
    } else {
      setParam(key, value);
      el.value = state.p[key];
    }
  } else if (el.id === "functionSelect") {
    if (Object.hasOwn(FUNCTIONS, el.value)) {
      state.p.kind = el.value;
      renderReadout();
      requestDraw();
    }
  } else if (el.id === "speedSelect") {
    state.speed = Number(el.value);
  } else if (el.dataset.flag) {
    state[el.dataset.flag] = el.checked;
    requestDraw();
  } else if (el.id === "importFile") {
    handleImport(el.files[0]);
  }
});
document.addEventListener("keydown", (e) => {
  if (e.defaultPrevented) return;
  const editing = isEditingModelInput(document.activeElement);
  if (
    document.activeElement?.id === "timeline" &&
    ["Home", "End"].includes(e.key) &&
    (state.model?.playback || ["projectile", "collision", "induction"].includes(state.model?.id))
  ) {
    e.preventDefault();
    stopAnimation();
    state.time = e.key === "Home" ? 0 : playbackDuration();
    state.model.playback?.seek?.(state.time);
    renderReadout();
    updatePlayback();
    requestDraw();
    return;
  }
  if (e.key === "Escape" && state.presenting) {
    exitPresentation();
    return;
  }
  if ($("#dialog").open) {
    if (e.key === "Enter" && document.activeElement?.id === "classTitle") {
      e.preventDefault();
      confirmSave();
    }
    return;
  }
  if (editing) return;
  if (
    e.code === "Space" &&
    state.model?.time &&
    document.activeElement?.tagName !== "BUTTON"
  ) {
    e.preventDefault();
    togglePlay();
  } else if (e.key.toLowerCase() === "r" && state.model) {
    e.preventDefault();
    action("reset");
  } else if (e.key === "/" && !state.model) {
    e.preventDefault();
    $("#searchInput")?.focus();
  }
});
$("#dialog").addEventListener("click", (e) => {
  if (e.target === $("#dialog")) {
    const r = $("#dialog").getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      closeDialog();
  }
});
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && state.presenting) {
    state.presenting = false;
    document.body.classList.remove("presenting");
    if ($("#presentLabel")) $("#presentLabel").textContent = "大屏模式";
    requestDraw();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopAnimation();
  }
});
let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (state.model) requestDraw();
    else {
      $$("canvas[data-thumb]").forEach(drawThumbnail);
    }
  }, 100);
});
function routeFromHash() {
  const hash = location.hash.slice(1);
  if (hash.length > SHARE_HASH_LIMIT) {
    showLibrary();
    toast("链接过长，未载入参数。请改用配置文件。");
    return;
  }
  if (hash === "downloads") {
    showLibrary("downloads");
    return;
  }
  const args = new URLSearchParams(hash),
    model = args.get("model");
  if (model && modelById(model)) {
    let p = null;
    try {
      p = decodeShareParams(args);
    } catch {
      toast("链接中的参数无法读取，使用默认参数。");
    }
    openModel(model, p, null, "link");
  } else {
    const v = ["all", "favorites", "classes", "downloads", "questions"].includes(args.get("view"))
        ? args.get("view")
        : "all",
      c = Object.hasOwn(CATS, args.get("category"))
        ? args.get("category")
        : "all";
    showLibrary(v, c);
  }
}
window.addEventListener("hashchange", routeFromHash);
hydrateIcons();
$$("[data-desktop-nav-label]").forEach((el) => {
  el.textContent = IS_DESKTOP_APP ? "版本与更新" : "下载桌面版";
});
$$(".nav-item").forEach((b) => {
  const label =
    b.dataset.collection === "geometry"
      ? "三维模型"
      : b.dataset.category
        ? CATS[b.dataset.category].name
        : b.dataset.nav === "all"
          ? "模型库"
          : b.dataset.nav === "favorites"
            ? "我的收藏"
            : b.dataset.nav === "downloads"
              ? (IS_DESKTOP_APP ? "版本与更新" : "下载桌面版")
              : "我的课堂";
  b.setAttribute("aria-label", label);
  b.title = label;
});
// Verify storage availability without collecting or transmitting anything.
try {
  localStorage.setItem("zhixiang-storage-check", "1");
  localStorage.removeItem("zhixiang-storage-check");
} catch {
  storageOK = false;
  setTimeout(
    () => toast("当前环境未开放本地存储；使用导出配置功能保存课堂。"),
    500,
  );
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  if (b.dataset.collection === "geometry") {
    showLibrary("all", "math");
    state.only3d = true;
    $("#threeDFilter").checked = true;
    setActiveNav();
    renderCards();
  }
  if (b.dataset.geoView && state.model?.threeD && state.model.geometryUI !== false) {
    geoStop();
    const v = {
      iso: [-35, state.model.id === "nets" ? 38 : 24],
      front: [0, 0],
      top: [0, 90],
      side: [90, 0],
    }[b.dataset.geoView];
    if (v) {
      state.p.yaw = v[0];
      state.p.pitch = v[1];
      geometrySyncView();
      requestDraw();
    }
  }
  if (b.dataset.geoAction) geometryAction(b.dataset.geoAction);
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.id === "threeDFilter") {
    state.only3d = el.checked;
    setActiveNav();
    renderCards();
  }
  if (el.dataset.geoSelect && state.model?.threeD && state.model.geometryUI !== false) {
    const k = el.dataset.geoSelect;
    if (state.model.choices?.[k]?.includes(el.value)) {
      geoStop();
      state.p[k] = el.value;
      normalizeGeometryParams(state.model, state.p);
      renderControls();
      renderReadout();
      requestDraw();
    }
  }
  if (el.dataset.geoToggle && state.model?.threeD && state.model.geometryUI !== false) {
    const k = el.dataset.geoToggle;
    if (state.model.bools?.includes(k)) {
      state.p[k] = el.checked;
      requestDraw();
    }
  }
});

routeFromHash();
// Small documented math API for independent verification and future extensions.
window.ZhixiangMath = Object.freeze({
  solid: solidData,
  section: sectionData,
  net: netMesh,
  solidMesh,
  solar: solarData,
  projectile: projectileData,
  gas: gasData,
  refraction: opticalData,
  spring: springData,
  pendulumStep: rk4Pendulum,
  pendulumEnergy,
  pendulumPeriod,
});

// Choice controls only affect the two analytic math models. Existing v1 model parameters keep their format.
document.addEventListener("change", (e) => {
  const key = e.target.dataset.mathSelect,
    m = state.model;
  if (!key || !m?.advanced || !m.choices[key]?.includes(e.target.value)) return;
  state.p[key] = e.target.value;
  normalizeMathParams(m, state.p);
  if (
    m.id === "derivative" &&
    key === "kind" &&
    !MATH_TOOLS.derivativeDomain(state.p.kind, state.p.x0)
  )
    state.p.x0 = 1;
  renderControls();
  renderReadout();
  requestDraw();
});

// Science model choices retain the v1 parameter object and existing classroom actions.
document.addEventListener("change", (e) => {
  const m = state.model,
    el = e.target;
  if (!m?.science) return;
  const key = el.dataset.scienceSelect;
  if (key && m.choices?.[key]?.includes(el.value)) {
    const viewOnly = m.id === "collision" && key === "graph";
    if (!viewOnly) stopAnimation();
    state.p[key] = el.value;
    normalizeScienceParams(m, state.p);
    if (!viewOnly) {
      state.time = 0;
      resetSolver();
      updatePlayback();
    }
    renderControls();
    renderReadout();
    requestDraw();
  }
  const toggle = el.dataset.scienceToggle;
  if (toggle && m.bools?.includes(toggle)) {
    state.p[toggle] = el.checked;
    renderReadout();
    requestDraw();
  }
});
