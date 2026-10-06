"use strict";
// parabola: model metadata, rendering and lifecycle hooks.

function drawParabola(ctx, w, h, p, comparison) {
  const plot = makePlot(ctx, w, h, {
    xmin: -6 / state.zoom,
    xmax: 6 / state.zoom,
    ymin: -3 / state.zoom,
    ymax: 7 / state.zoom,
  });
  stageInfo = { kind: "parabola", plot };
  if (comparison)
    plotCurve(
      ctx,
      plot,
      (x) => comparison.a * (x - comparison.h) ** 2 + comparison.k,
      PALETTE.orange,
      2,
      [5, 4],
    );
  plotCurve(ctx, plot, (x) => p.a * (x - p.h) ** 2 + p.k, PALETTE.green, 2.8);
  if (p.a !== 0) {
    if (state.labels) {
      plot.clip();
      line(
        ctx,
        plot.x(p.h),
        plot.top,
        plot.x(p.h),
        h - plot.bottom,
        "#c4d6b5",
        1,
        [4, 5],
      );
      plot.end();
    }
    const vx = plot.x(p.h),
      vy = plot.y(p.k);
    if (
      vx >= plot.left &&
      vx <= w - plot.right &&
      vy >= plot.top &&
      vy <= h - plot.bottom
    ) {
      circle(ctx, vx, vy, 13, "#dcebd180");
      circle(ctx, vx, vy, 5.5, "#fff", PALETTE.green, 2.2);
      if (state.labels)
        text(
          ctx,
          `V (${num(p.h)}, ${num(p.k)})`,
          clamp(vx + 16, 50, w - 111),
          clamp(vy + 23, 37, h - 51),
          11,
          PALETTE.green,
        );
    }
  } else if (state.labels)
    text(
      ctx,
      `常数函数 y = ${num(p.k)}`,
      w - 45,
      42,
      12,
      PALETTE.green,
      "right",
    );
}

ZhixiangModels.register({
  exportData: () => functionChartData('parabola'),
  id: "parabola",
  cat: "math",
  level: "初中 · 高中",
  title: "二次函数与抛物线",
  desc: "调整顶点与系数，观察开口和平移。",
  tags: "抛物线 二次函数 顶点 对称轴 平移 开口",
  time: false,
  compare: true,
  defaults: { a: 1, h: 0, k: 0 },
  controls: [
    ["a", "a", "开口与伸缩", -3, 3, 0.1, ""],
    ["h", "h", "水平平移", -5, 5, 0.1, ""],
    ["k", "k", "竖直平移", -4, 5, 0.1, ""],
  ],
  presets: [
    ["标准抛物线", { a: 1, h: 0, k: 0 }],
    ["向右上平移", { a: 1, h: 2, k: 1 }],
    ["开口向下", { a: -0.7, h: 0, k: 3 }],
  ],
  hint: "拖动图中的顶点，或调节右侧滑块。",
  question: "保持 a、k 不变，只增大 h，抛物线会向左还是向右移动？",
  answer:
    "h 增大，图像向右平移；h 减小，图像向左平移。顶点始终位于 (h, k)。a ≠ 0 时，|a| 越大，同一高度差处的开口越窄。",
  note: "y = a(x − h)² + k。a = 0 时退化为常数函数，不再是抛物线；此时不显示唯一顶点或对称轴。坐标轴等比例。",
  sources: ["functions"],
  draw: (ctx, w, h, p, comparison) => drawParabola(ctx, w, h, p, comparison),
  readout: (p, m) => {
    const precise = (value) => Number.isFinite(value) ? String(value) : "—";
    const sign = (value) => value < 0 ? `− ${precise(-value)}` : `+ ${precise(value)}`;
    return {
      formula: `y = ${precise(p.a)}(x ${sign(-p.h)})² ${sign(p.k)}`,
      caption: p.a === 0 ? "a = 0：退化为常数函数" : "等比例坐标 · 顶点 (h, k)",
      metrics:
        p.a === 0
          ? [
              ["函数类型", "常数函数", ""],
              ["函数值", precise(p.k), ""],
              ["图像方向", "水平直线", ""],
            ]
          : [
              ["顶点坐标", `(${precise(p.h)}, ${precise(p.k)})`, ""],
              ["对称轴", `x = ${precise(p.h)}`, ""],
              ["开口方向", p.a > 0 ? "向上" : "向下", ""],
            ],
    };
  },
  thumbnail: (canvas, m) => {
    const { ctx, w, h } = setupCanvas(canvas),
      cx = w * 0.5,
      cy = h * 0.6,
      col = CATS[m.cat].color;
    ctx.save();
    {
      const ox = w * 0.5,
        oy = h * 0.73,
        s = h * 0.21;
      for (let x = ox % s; x < w; x += s * 0.7)
        line(ctx, x, 28, x, h, "#e0e8d8", 0.6);
      for (let y = oy % (s * 0.7); y < h; y += s * 0.7)
        line(ctx, 9, y, w - 9, y, "#e0e8d8", 0.6);
      line(ctx, 15, oy, w - 15, oy, "#bdcdb1", 0.9);
      line(ctx, ox, 30, ox, h - 9, "#bdcdb1", 0.9);
      ctx.beginPath();
      ctx.rect(7, 28, w - 14, h - 32);
      ctx.clip();
      for (const [factor, color] of [
        [0.25, "#d2b086"],
        [1, col],
      ]) {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8;
        for (let i = 0; i <= w; i++) {
          let x = (i - ox) / s,
            y =
              m.id === "parabola"
                ? oy - (factor === 1 ? 0.7 : 0.3) * x * x * s
                : oy - Math.sin(x * factor) * s * 1.35;
          i ? ctx.lineTo(i, y) : ctx.moveTo(i, y);
        }
        ctx.stroke();
      }
      circle(ctx, ox, oy, 3, col, "#fff", 1);
      if (m.id === "parabola")
        text(ctx, "y = ax²", w * 0.72, 45, 14, col, "center", "math");
      else text(ctx, "y = sin x", w * 0.73, 39, 13, col, "center", "math");
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
