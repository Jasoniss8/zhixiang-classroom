"use strict";
// derivative: model metadata, rendering and lifecycle hooks.

function derivativeFormula(p, prime = false) {
  if (p.kind === "poly")
    return prime
      ? `${mathNumber(3 * p.a, 10)}x² ${mathSigned(2 * p.b)}x ${mathSigned(p.c)}`
      : `${mathNumber(p.a, 10)}x³ ${mathSigned(p.b)}x² ${mathSigned(p.c)}x ${mathSigned(p.d)}`;
  const f = {
    sin: ["sin x", "cos x"],
    exp: ["eˣ", "eˣ"],
    log: ["ln x", "1/x"],
    reciprocal: ["1/x", "−1/x²"],
  }[p.kind];
  return `${mathNumber(p.a, 10)}·${f[prime ? 1 : 0]}${prime ? "" : ` ${mathSigned(p.d)}`}`;
}

function derivativeYRange(p, prime = false) {
  const fn = prime ? MATH_TOOLS.derivativeAnalytic : MATH_TOOLS.derivativeValue,
    values = [];
  const center = MATH_TOOLS.derivativeDomain(p.kind, p.x0) ? p.x0 : 1,
    lo = Math.max(-6, center - 2),
    hi = Math.min(6, center + 2);
  for (let i = 0; i <= 240; i++) {
    const x = lo + ((hi - lo) * i) / 240;
    if (["log", "reciprocal"].includes(p.kind) && Math.abs(x) < 0.05) continue;
    const y = fn(p, x);
    if (Number.isFinite(y)) values.push(y);
  }
  const focus = fn(p, p.x0);
  if (Number.isFinite(focus)) values.push(focus);
  const low = Math.min(-1, ...values),
    high = Math.max(1, ...values),
    gap = (high - low) * 0.12;
  return { ymin: low - gap, ymax: high + gap };
}

function drawDerivative(ctx, w, h, p, comparison) {
  const stacked = w < 580,
    margin = stacked ? 0 : 16,
    paneW = stacked ? w : (w - margin) / 2,
    paneH = stacked ? (h - 16) / 2 : h;
  const d = MATH_TOOLS.derivativeReadings(p),
    analysis = MATH_TOOLS.derivativeAnalysis(p),
    plots = [];
  for (let index = 0; index < 2; index++) {
    const dx = stacked ? 0 : index * (paneW + margin),
      dy = stacked ? index * (paneH + 16) : 0;
    ctx.save();
    ctx.translate(dx, dy);
    const range = derivativeYRange(p, !!index),
      plot = makePlot(ctx, paneW, paneH, {
        xmin: -6,
        xmax: 6,
        ...range,
        equal: false,
        left: 43,
        right: 23,
        top: 58,
        bottom: 35,
      });
    plots.push({ plot, dx, dy });
    const fn = index
      ? MATH_TOOLS.derivativeAnalytic
      : MATH_TOOLS.derivativeValue;
    text(
      ctx,
      index ? "导函数 f′(x)" : "原函数 f(x)",
      plot.left,
      22,
      14,
      PALETTE.deep,
    );
    text(
      ctx,
      index ? "同一 x₀ 对应切线斜率" : "紫色切线 · 蓝灰虚线割线",
      plot.left,
      41,
      11,
      PALETTE.muted,
    );
    if (comparison)
      plotCurve(
        ctx,
        plot,
        (x) => fn(comparison, x),
        PALETTE.orange,
        1.7,
        [5, 4],
        comparison.kind === "reciprocal" ? [0] : [],
      );
    if (state.labels && ["log", "reciprocal"].includes(p.kind)) {
      plot.clip();
      line(
        ctx,
        plot.x(0),
        plot.top,
        plot.x(0),
        paneH - plot.bottom,
        "#c7b6cc",
        1,
        [4, 4],
      );
      plot.end();
    }
    plotCurve(
      ctx,
      plot,
      (x) => fn(p, x),
      PALETTE.green,
      2.5,
      [],
      p.kind === "reciprocal" ? [0] : [],
    );
    if (d.valid) {
      if (!index) {
        plotCurve(
          ctx,
          plot,
          (x) => d.y + d.analytic * (x - p.x0),
          PALETTE.purple,
          1.8,
        );
        if (Number.isFinite(d.secant)) {
          plotCurve(
            ctx,
            plot,
            (x) => d.y + d.secant * (x - p.x0),
            "#748d99",
            1.5,
            [5, 4],
          );
          mathMarker(
            ctx,
            plot,
            { x: d.x1, y: MATH_TOOLS.derivativeValue(p, d.x1) },
            "Q",
            "#748d99",
            4,
          );
        }
      }
      plot.clip();
      line(
        ctx,
        plot.x(p.x0),
        plot.top,
        plot.x(p.x0),
        paneH - plot.bottom,
        "#c5b88a",
        1,
        [3, 4],
      );
      plot.end();
      mathMarker(
        ctx,
        plot,
        { x: p.x0, y: index ? d.analytic : d.y },
        index ? "f′(x₀)" : "P",
        PALETTE.orange,
        6,
      );
    }
    if (state.labels)
      for (const point of analysis.critical)
        mathMarker(
          ctx,
          plot,
          { x: point.x, y: index ? 0 : point.y },
          index
            ? "0"
            : point.type === "极大值"
              ? "极大"
              : point.type === "极小值"
                ? "极小"
                : "驻点",
          PALETTE.purple,
          3.5,
        );
    ctx.restore();
  }
  if (!stacked) line(ctx, w / 2, 15, w / 2, h - 20, "#dfe6df");
  else line(ctx, 20, h / 2, w - 20, h / 2, "#dfe6df");
  stageInfo = {
    kind: "derivative",
    ...plots[0],
    point: d.valid ? { x: p.x0, y: d.y } : null,
  };
}

ZhixiangModels.register({
  exportData: () => derivativeChartData(),
  id: "derivative",
  cat: "math",
  level: "高中",
  title: "导数与切线",
  desc: "比较割线、切线斜率，并对应观察导函数。",
  tags: "导数 切线 割线 中心差分 多项式 单调 极值 正弦 指数 对数",
  advanced: true,
  compare: true,
  time: false,
  defaults: { kind: "poly", a: 0.25, b: 0, c: -1, d: 0, x0: 1, h: 1 },
  choices: { kind: Object.keys(DERIVATIVE_NAMES) },
  controls: [
    ["a", "A", "三次项 / 函数系数", -3, 3, 0.05, ""],
    ["b", "B", "二次项系数", -3, 3, 0.1, ""],
    ["c", "C", "一次项系数", -4, 4, 0.1, ""],
    ["d", "D", "常数项", -4, 4, 0.1, ""],
    ["x0", "x₀", "切点横坐标", -6, 6, 0.01, ""],
    ["h", "h", "割线横向增量", -2, 2, 0.01, ""],
  ],
  presets: [
    ["三次函数", { kind: "poly", a: 0.25, b: 0, c: -1, d: 0, x0: 1, h: 1 }],
    ["水平切线非极值", { kind: "poly", a: 1, b: 0, c: 0, d: 0, x0: 0, h: 1 }],
    ["正弦函数", { kind: "sin", a: 1, d: 0, x0: 1, h: 1 }],
    ["对数函数", { kind: "log", a: 1, d: 0, x0: 1, h: 0.5 }],
  ],
  hint: "拖动原函数上的橙色切点；绿色为函数、紫色为切线、蓝灰虚线为割线。窄屏上下排列。",
  question: "割线的 h 越小，数值就一定越准确吗？f′(x₀)=0 能否直接判断极值？",
  answer:
    "h 趋于 0 时割线斜率趋于导数，但浮点运算中 h 过小会放大相消与舍入误差。中心差分的 δ 单独自动选取，不等于割线的 h。f′=0 只是驻点条件；必须结合导数变号判断极值，例如 x³ 在 0 处导数为 0，却没有极值。",
  note: "x、y 和系数均为无量纲数；sin 的自变量为弧度。多项式最高三次，其余函数为 A·f(x)+D。ln x 的定义域 x>0；1/x 的定义域 x≠0，即使 A=0 也保留原定义域。在 x=0 处不绘制或外推切线；跨越该边界的割线禁用。中心差分 [f(x₀+δ)−f(x₀−δ)]/(2δ)，δ≈∛ε·max(1,|x₀|)；对 ln、1/x 使用 ∛ε·|x₀| 以保持在同一连通定义域。解析导数用于对照。两图横轴同为 [−6,6]，纵轴按切点左右 2 个单位的范围独立缩放，超出视窗的曲线裁切；单调区间、驻点与极值仅列此横轴范围内，端点不作为局部极值。",
  sources: ["derivative"],
  draw: (ctx, w, h, p, comparison) => drawDerivative(ctx, w, h, p, comparison),
  readout: (p, m) => mathReadout(m, p),
  thumbnail: (canvas, m) => {
    const { ctx, w, h } = setupCanvas(canvas),
      cx = w * 0.5,
      cy = h * 0.6,
      col = CATS[m.cat].color;
    ctx.save();
    {
      const plot = makePlot(ctx, w, h, {
        xmin: -3,
        xmax: 3,
        ymin: -3,
        ymax: 3,
        labels: false,
        left: 18,
        right: 18,
        top: 22,
        bottom: 12,
        equal: false,
      });
      plotCurve(ctx, plot, (x) => (x * x) / 2 - 1, PALETTE.green, 1.7);
      plotCurve(ctx, plot, (x) => x - 1.5, PALETTE.purple, 1.5);
      circle(ctx, plot.x(1), plot.y(-0.5), 4, PALETTE.orange);
    }
    ctx.restore();
  },
  renderControls: renderMathControls,
  normalize: (p, m) => {
    return normalizeGeometryParams(
      m,
      normalizeSpringParams(
        m,
        normalizeScienceParams(m, normalizeMathParams(m, p)),
      ),
    );
  },
  parsePrecision: () => 10,
  setParam: setLegacyParam,
  reset: resetLegacySolver,
  advance: advanceLegacyModel,
  bind: bindMathStage,
});
