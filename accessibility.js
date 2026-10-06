"use strict";
const DISPLAY_KEY = "zhixiang-display-v1";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let displayPreferences = { contrast: false, large: false };
try {
  const saved = JSON.parse(localStorage.getItem(DISPLAY_KEY) || "{}");
  for (const key of ["contrast", "large"])
    if (typeof saved[key] === "boolean") displayPreferences[key] = saved[key];
} catch {}
function applyDisplayPreferences(redraw = true) {
  document.documentElement.dataset.contrast = displayPreferences.contrast
    ? "high"
    : "normal";
  document.documentElement.dataset.typeSize = displayPreferences.large
    ? "large"
    : "normal";
  if (redraw) {
    if (state.model) requestDraw();
    else $$("canvas[data-thumb]").forEach(drawThumbnail);
  }
}
function displayDialog() {
  openDialog(
    "显示与投屏",
    `<label class="checkline"><input type="checkbox" data-display="contrast" ${displayPreferences.contrast ? "checked" : ""}>高对比度</label><label class="checkline"><input type="checkbox" data-display="large" ${displayPreferences.large ? "checked" : ""}>投屏大字号</label><p>设置保存在本机。大屏模式隐藏导航；这两项调整文字和图线显示。</p><p>Tab 选择参数，方向键微调；画布或滑块聚焦时，空格播放 / 暂停，R 重置。数值输入框内保留输入操作。</p><p>${reducedMotion.matches ? "系统已启用减少动态效果；模型保持静止，点击播放后才运动。" : "模型默认静止，点击播放后开始运动。"}</p>`,
  );
}
function isEditingModelInput(element) {
  if (!element) return false;
  if (element.isContentEditable) return true;
  if (element.tagName === "TEXTAREA" || element.tagName === "SELECT")
    return true;
  return element.tagName === "INPUT" && element.type !== "range";
}
let canvasLabelTarget = null,
  canvasLabelLatest = "",
  canvasLabelTime = 0,
  canvasLabelTimer = 0;
function updateCanvasDescription(reading) {
  const canvas = $("#simCanvas");
  if (!canvas) return;
  const label =
    `${state.model.title}。${state.running ? "播放中" : "已暂停"}。${reading.formula}。${reading.metrics.map(([name, value, unit]) => `${name}：${value}${unit}`).join("；")}。Tab 调整参数；空格播放暂停，R 重置。`.slice(
      0,
      1800,
    );
  canvasLabelLatest = label;
  const now = performance.now();
  function commit() {
    canvasLabelTimer = 0;
    if (
      canvasLabelTarget?.isConnected &&
      canvasLabelTarget.getAttribute("aria-label") !== canvasLabelLatest
    )
      canvasLabelTarget.setAttribute("aria-label", canvasLabelLatest);
    canvasLabelTime = performance.now();
  }
  if (canvas !== canvasLabelTarget) {
    clearTimeout(canvasLabelTimer);
    canvasLabelTimer = 0;
    canvasLabelTarget = canvas;
    commit();
  } else if (now - canvasLabelTime >= 1000) commit();
  else if (!canvasLabelTimer)
    canvasLabelTimer = setTimeout(commit, 1000 - (now - canvasLabelTime));
}
function contrastInk(color, isText = false) {
  if (typeof color !== "string") return color;
  const hex = color.match(/^#([a-f\d]{6})(?:[a-f\d]{2})?$/i);
  const rgb = hex
    ? [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16))
    : color
        .match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
        ?.slice(1)
        .map(Number);
  if (!rgb) return color;
  const [r, g, b] = rgb,
    hi = Math.max(...rgb),
    lo = Math.min(...rgb);
  if (!isText && lo > 205) return "#b8c1ba"; // grid and construction lines
  if (hi - lo < 22) return "#203229";
  if (g >= r && g >= b) return "#005437";
  if (b > r && b > g) return "#254993";
  if (r > g && b > g) return "#663391";
  return "#884000";
}
const accessibleContexts = new WeakMap();
function accessibleCanvasContext(ctx) {
  if (!displayPreferences.contrast && !displayPreferences.large) return ctx;
  if (!accessibleContexts.has(ctx))
    accessibleContexts.set(
      ctx,
      new Proxy(ctx, {
        get(target, key) {
          if (key === "strokeText")
            return (...args) => {
              const before = target.strokeStyle;
              if (displayPreferences.contrast) target.strokeStyle = "#fff";
              target.strokeText(...args);
              target.strokeStyle = before;
            };
          if (key === "fillText")
            return (...args) => {
              const before = target.fillStyle;
              if (displayPreferences.contrast)
                target.fillStyle = contrastInk(before, true);
              target.fillText(...args);
              target.fillStyle = before;
            };
          const value = Reflect.get(target, key, target);
          return typeof value === "function" ? value.bind(target) : value;
        },
        set(target, key, value) {
          if (key === "strokeStyle" && displayPreferences.contrast)
            value = contrastInk(value);
          if (key === "font" && displayPreferences.large)
            value = value.replace(
              /([\d.]+)px/,
              (_, size) => `${Number(size) * 1.18}px`,
            );
          Reflect.set(target, key, value, target);
          return true;
        },
      }),
    );
  return accessibleContexts.get(ctx);
}
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-display-dialog]")) displayDialog();
});
document.addEventListener("change", (e) => {
  const key = e.target.dataset.display;
  if (!["contrast", "large"].includes(key)) return;
  displayPreferences[key] = e.target.checked;
  try {
    localStorage.setItem(DISPLAY_KEY, JSON.stringify(displayPreferences));
  } catch {
    toast("显示已调整；当前环境不能保存设置。");
  }
  applyDisplayPreferences();
});
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) stopAnimation();
});
applyDisplayPreferences(false);
