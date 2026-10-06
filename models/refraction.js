"use strict";
// refraction: model metadata, rendering and lifecycle hooks.

function opticalData(p) {
  const ratio = (p.n1 / p.n2) * Math.sin(rad(p.angle));
  return {
    tir: ratio > 1 + 1e-12,
    refracted: ratio <= 1 + 1e-12 ? deg(Math.asin(clamp(ratio, -1, 1))) : null,
    critical: p.n1 > p.n2 ? deg(Math.asin(p.n2 / p.n1)) : null,
  };
}

function arcAngle(ctx, cx, cy, r, start, end, color) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, start, end);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.1;
  ctx.stroke();
}

function rayPulse(ctx, x1, y1, x2, y2, phase, color) {
  const t = ((phase % 1) + 1) % 1;
  circle(ctx, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 3.5, color);
}

function drawRefraction(ctx, w, h, p) {
  const d = opticalData(p),
    cx = w * 0.5,
    cy = h * 0.49,
    r = Math.min(w * 0.37, h * 0.36),
    a = rad(p.angle),
    start = { x: cx - Math.sin(a) * r, y: cy - Math.cos(a) * r },
    ref = { x: cx + Math.sin(a) * r, y: cy - Math.cos(a) * r };
  ctx.fillStyle = "#f6f8f3";
  ctx.fillRect(0, 0, w, cy);
  ctx.fillStyle = "#edf2f1";
  ctx.fillRect(0, cy, w, h - cy);
  line(ctx, 0, cy, w, cy, "#b9cbc1", 1.2);
  line(ctx, cx, 22, cx, h - 33, "#b9c7ad", 1, [4, 5]);
  arrow(ctx, start.x, start.y, cx, cy, "#ba9c68", 2.3);
  if (Math.abs(p.n1 - p.n2) > 1e-10)
    arrow(
      ctx,
      cx,
      cy,
      ref.x,
      ref.y,
      d.tir ? PALETTE.orange : "#c2d1b4",
      d.tir ? 2.8 : 1.4,
    );
  rayPulse(ctx, start.x, start.y, cx, cy, state.time * 0.5, "#d0a964");
  if (d.tir)
    rayPulse(ctx, cx, cy, ref.x, ref.y, state.time * 0.5, PALETTE.orange);
  if (!d.tir) {
    const a2 = rad(d.refracted),
      end = { x: cx + Math.sin(a2) * r, y: cy + Math.cos(a2) * r };
    arrow(ctx, cx, cy, end.x, end.y, PALETTE.green, 2.8);
    rayPulse(ctx, cx, cy, end.x, end.y, state.time * 0.5, PALETTE.green);
    if (state.labels) {
      arcAngle(ctx, cx, cy, 39, Math.PI / 2 - a2, Math.PI / 2, "#86a773");
      text(
        ctx,
        `θ₂ = ${num(d.refracted, 1)}°`,
        cx + 50,
        cy + 55,
        11,
        PALETTE.green,
      );
    }
  }
  if (state.labels) {
    arcAngle(ctx, cx, cy, 34, -Math.PI / 2 - a, -Math.PI / 2, "#bfa372");
    text(
      ctx,
      `θ₁ = ${num(p.angle, 1)}°`,
      cx - 40,
      cy - 47,
      11,
      "#b5986c",
      "right",
    );
    text(ctx, `n₁ = ${num(p.n1)}`, 21, 32, 12, "#a1ac92");
    text(ctx, `n₂ = ${num(p.n2)}`, 21, h - 41, 12, "#8baba0");
    text(ctx, "法线", cx + 10, 20, 10, "#9eac90");
    if (d.tir) {
      roundRect(ctx, w - 117, 17, 100, 24, 6, "#fcf1df");
      text(ctx, "全反射", w - 67, 29, 11, "#be985f", "center");
    }
  }
  circle(ctx, cx, cy, 3.5, "#a6b995");
}

ZhixiangModels.register({
  id: "refraction",
  cat: "physics",
  level: "初中 · 高中",
  title: "光的折射与全反射",
  desc: "调整折射率和入射角，观察光路。",
  tags: "光学 光 折射 反射 全反射 临界角 折射率",
  time: true,
  defaults: { n1: 1, n2: 1.5, angle: 40 },
  controls: [
    ["n1", "n₁", "上方介质折射率", 1, 2.4, 0.01, ""],
    ["n2", "n₂", "下方介质折射率", 1, 2.4, 0.01, ""],
    ["angle", "θ₁", "入射角（相对法线）", 0, 85, 1, "°"],
  ],
  presets: [
    ["空气 → 玻璃", { n1: 1, n2: 1.5, angle: 40 }],
    ["玻璃 → 空气", { n1: 1.5, n2: 1, angle: 30 }],
    ["观察全反射", { n1: 1.5, n2: 1, angle: 55 }],
  ],
  hint: "所有角度都相对竖直法线测量；光线宽度不代表实际强度。",
  question:
    "为什么只有光从折射率较大的介质射向较小的介质时，才可能发生全反射？",
  answer:
    "根据 n₁sinθ₁ = n₂sinθ₂，当 n₁ > n₂ 且入射角大于临界角 asin(n₂/n₁) 时，不再存在实数折射角，出现全反射。临界角处折射光沿界面传播。",
  note: "采用斯涅尔定律 n₁sinθ₁ = n₂sinθ₂。n₁ > n₂ 时 θc = asin(n₂/n₁)。超过临界角只绘制全反射光，不绘制不存在的折射光。界面平直、介质均匀透明，未模拟偏振、吸收、频散或菲涅耳强度；动画为方向示意，不表示真实光速。",
  sources: ["optics"],
  draw: (ctx, w, h, p, comparison) => drawRefraction(ctx, w, h, p, comparison),
  readout: (p, m) => {
    {
      const d = opticalData(p);
      return {
        formula: "n₁ sin θ₁ = n₂ sin θ₂",
        caption: d.tir
          ? "已发生全反射 · 不存在实数折射角"
          : "斯涅尔定律 · 角度均相对法线测量",
        metrics: [
          ["入射角", num(p.angle, 1), "°"],
          ["折射角", d.tir ? "全反射" : num(d.refracted, 1), d.tir ? "" : "°"],
          [
            "临界角",
            d.critical === null ? "无" : num(d.critical, 1),
            d.critical === null ? "" : "°",
          ],
        ],
      };
    }
  },
  thumbnail: (canvas, m) => {
    const { ctx, w, h } = setupCanvas(canvas),
      cx = w * 0.5,
      cy = h * 0.6,
      col = CATS[m.cat].color;
    ctx.save();
    {
      const x = w * 0.53,
        y = h * 0.57;
      ctx.fillStyle = "#e9e4d8";
      ctx.fillRect(10, y, w - 20, h - y);
      line(ctx, 10, y, w - 10, y, "#d1c7b5", 1);
      line(ctx, x, 28, x, h - 12, "#c5bda9", 1, [3, 4]);
      arrow(ctx, x - 45, y - 39, x, y, "#d0aa71", 1.7, 4);
      arrow(ctx, x, y, x + 28, y + 40, "#91a981", 1.7, 4);
      arrow(ctx, x, y, x + 45, y - 39, "#d9ceb8", 1, 4);
      text(ctx, "n₁", w * 0.77, 44, 12, "#b6a485", "left", "math");
      text(ctx, "n₂", w * 0.25, h * 0.8, 12, "#aab091", "left", "math");
    }
    ctx.restore();
  },
  renderControls: renderLegacyControls,
  normalize: (p, m) => {
    return normalizeGeometryParams(
      m,
      normalizeSpringParams(
        m,
        normalizeScienceParams(m, normalizeMathParams(m, p)),
      ),
    );
  },
  parsePrecision: () => 4,
  setParam: setLegacyParam,
  reset: resetLegacySolver,
  advance: advanceLegacyModel,
  bind: () => {},
});
