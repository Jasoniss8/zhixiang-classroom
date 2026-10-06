"use strict";
// functions: model metadata, rendering and lifecycle hooks.

function functionValue(p, x) {
  return p.a * FUNCTIONS[p.kind].f(p.b * (x - p.h)) + p.k;
}

function drawFunctions(ctx, w, h, p, comparison) {
  const plot = makePlot(ctx, w, h, { xmin: -6, xmax: 6, ymin: -4, ymax: 6 });
  stageInfo = { kind: "functions", plot };
  if (comparison)
    plotCurve(
      ctx,
      plot,
      (x) => functionValue(comparison, x),
      PALETTE.orange,
      2,
      [5, 4],
      comparison.kind === "reciprocal" ? [comparison.h] : [],
    );
  if (state.labels && (p.kind === "log" || p.kind === "reciprocal")) {
    plot.clip();
    line(
      ctx,
      plot.x(p.h),
      plot.top,
      plot.x(p.h),
      h - plot.bottom,
      "#c6b4cf",
      1,
      [4, 4],
    );
    if (p.kind === "reciprocal")
      line(
        ctx,
        plot.left,
        plot.y(p.k),
        w - plot.right,
        plot.y(p.k),
        "#c6b4cf",
        1,
        [4, 4],
      );
    plot.end();
  }
  plotCurve(
    ctx,
    plot,
    (x) => functionValue(p, x),
    PALETTE.green,
    2.6,
    [],
    p.kind === "reciprocal" ? [p.h] : [],
  );
}

ZhixiangModels.register({
  exportData: () => functionChartData('functions'),
  id: "functions",
  cat: "math",
  level: "高中",
  title: "函数图像与变换",
  desc: "比较 8 类函数的平移、伸缩与翻折。",
  tags: "函数 一次 正弦 余弦 指数 对数 反比例 平方根 绝对值",
  time: false,
  compare: true,
  defaults: { kind: "sin", a: 1, b: 1, h: 0, k: 0 },
  controls: [
    ["a", "A", "纵向伸缩 / 翻折", -3, 3, 0.1, ""],
    ["b", "B", "横向压缩", 0.2, 3, 0.1, ""],
    ["h", "h", "水平平移", -4, 4, 0.1, ""],
    ["k", "k", "竖直平移", -4, 4, 0.1, ""],
  ],
  presets: [
    ["标准图像", { a: 1, b: 1, h: 0, k: 0 }],
    ["纵向拉伸", { a: 2, b: 1, h: 0, k: 0 }],
    ["关于 x 轴翻折", { a: -1, b: 1, h: 0, k: 0 }],
  ],
  hint: "先选基础函数，再比较伸缩和平移；虚线表示渐近线。",
  question: "对正弦函数，将 B 从 1 变成 2，一个完整波形的宽度会发生什么变化？",
  answer:
    "B 增大到 2，正弦图像在水平方向压缩为原来的一半，周期由 2π 变成 π。注意：横向变换作用在自变量内部。对数与反比例函数还要检查定义域。",
  note: "统一使用 y = A·f(B(x−h)) + k；B > 0。ln 的输入必须大于 0，√ 的输入不能为负，1/x 的输入不能为 0。图像在不连续点断开，不跨越渐近线连线。",
  sources: ["functions"],
  draw: (ctx, w, h, p, comparison) => drawFunctions(ctx, w, h, p, comparison),
  readout: (p, m) => {
    return {
      formula: `y = ${num(p.a)} · f(${num(p.b)}(x ${signed(-p.h)})) ${signed(p.k)}`,
      caption: `基础函数：f(x) = ${FUNCTIONS[p.kind].formula}`,
      metrics: [
        ["基础函数", FUNCTIONS[p.kind].formula, ""],
        [
          "定义域",
          p.kind === "log"
            ? `x > ${num(p.h)}`
            : p.kind === "sqrt"
              ? `x ≥ ${num(p.h)}`
              : p.kind === "reciprocal"
                ? `x ≠ ${num(p.h)}`
                : "全体实数",
          "",
        ],
        [
          p.kind === "sin" || p.kind === "cos" ? "图像周期" : "纵向系数",
          p.a === 0 && (p.kind === "sin" || p.kind === "cos")
            ? "常数函数"
            : p.kind === "sin" || p.kind === "cos"
              ? num((2 * Math.PI) / p.b)
              : num(p.a),
          "",
        ],
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
    if (!Object.hasOwn(FUNCTIONS, p.kind)) p.kind = m.defaults.kind;
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
