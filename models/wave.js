"use strict";
// wave: model metadata, rendering and lifecycle hooks.

function drawWave(ctx, w, h, p) {
  const plot = makePlot(ctx, w, h, {
    xmin: 0,
    xmax: 9,
    ymin: -1.6,
    ymax: 1.6,
    equal: false,
    left: 44,
    right: 32,
    top: 65,
    bottom: 80,
    xLabel: "x / m",
    yLabel: "y / m",
  });
  const f = (x) =>
    p.amp * Math.sin(2 * Math.PI * (x / p.lambda - p.freq * state.time));
  plotCurve(ctx, plot, f, PALETTE.green, 2.5);
  plot.clip();
  for (let x = 0; x <= 9; x += 0.3)
    circle(ctx, plot.x(x), plot.y(f(x)), 2.3, "#a8c394");
  const marked = 3,
    xx = plot.x(marked),
    yy = plot.y(f(marked));
  line(
    ctx,
    xx,
    plot.y(p.amp + 0.2),
    xx,
    plot.y(-p.amp - 0.2),
    "#dcc59e",
    1,
    [4, 4],
  );
  circle(ctx, xx, yy, 7, PALETTE.orange, "#fff", 2);
  plot.end();
  if (state.labels) {
    arrow(ctx, w * 0.37, 29, w * 0.63, 29, PALETTE.green, 1.5);
    text(ctx, "波的传播方向", w * 0.5, 47, 10, "#91a180", "center");
    text(
      ctx,
      "固定横坐标的质点",
      clamp(xx + 12, 20, w - 136),
      yy - 20,
      10,
      "#c29968",
    );
    const from = 0.4,
      to = 0.4 + p.lambda,
      y = h - 64;
    doubleArrow(ctx, plot.x(from), y, plot.x(to), y, "#b2bd9e");
    text(
      ctx,
      `λ = ${num(p.lambda)} m`,
      (plot.x(from) + plot.x(to)) / 2,
      y + 15,
      10,
      "#99aa87",
      "center",
    );
  }
}

ZhixiangModels.register({
  exportData: () => waveChartData(),
  id: "wave",
  cat: "physics",
  level: "高中",
  title: "波的传播与振动",
  desc: "观察波形传播与单个质点的振动。",
  tags: "波 波长 波速 频率 振幅 质点 横波 机械波",
  time: true,
  defaults: { amp: 0.65, lambda: 3, freq: 0.5 },
  controls: [
    ["amp", "A", "振幅", 0.1, 1, 0.05, "m"],
    ["lambda", "λ", "波长", 1, 6, 0.1, "m"],
    ["freq", "f", "频率", 0.2, 2, 0.1, "Hz"],
  ],
  presets: [
    ["标准行波", { amp: 0.65, lambda: 3, freq: 0.5 }],
    ["提高频率", { amp: 0.65, lambda: 3, freq: 1 }],
    ["增大振幅", { amp: 1, lambda: 3, freq: 0.5 }],
  ],
  hint: "追踪橙色质点：它上下振动，不随波形向右平移。",
  question: "波峰一直向右移动，橙色质点也会跟着一直向右走吗？",
  answer:
    "不会。这里是理想横向行波：介质质点在各自平衡位置附近上下振动，向右传播的是振动状态。波速 v = fλ。",
  note: "y(x,t) = A sin[2π(x/λ − ft)]，沿 +x 方向传播，无衰减。质点横坐标固定。纵横轴单位都是 m，但为便于观察采用不同绘图比例。频率、波长可独立调整，表示不同传播条件；在确定介质和条件下，波速通常由介质决定。",
  sources: ["wave"],
  draw: (ctx, w, h, p, comparison) => drawWave(ctx, w, h, p, comparison),
  readout: (p, m) => {
    return {
      formula: "y(x,t) = A sin[2π(x/λ − ft)]",
      caption: "沿 +x 传播的理想横波 · 质点在固定横坐标处振动",
      metrics: [
        ["传播速度", num(p.freq * p.lambda), "m/s"],
        ["振动周期", num(1 / p.freq), "s"],
        ["波长", num(p.lambda), "m"],
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
      line(ctx, 16, cy, w - 16, cy, "#e2d8c6", 1);
      ctx.beginPath();
      ctx.strokeStyle = "#bb9b6d";
      ctx.lineWidth = 2;
      for (let i = 0; i < w; i++) {
        const y = cy - Math.sin((i / w) * 4 * Math.PI) * h * 0.22;
        i ? ctx.lineTo(i, y) : ctx.moveTo(i, y);
      }
      ctx.stroke();
      const x = w * 0.39,
        y = cy - Math.sin(0.39 * 4 * Math.PI) * h * 0.22;
      circle(ctx, x, y, 5, "#d4a66c", "#fff9eb", 1);
      arrow(ctx, w * 0.42, 34, w * 0.7, 34, "#bea97f", 1, 4);
      text(ctx, "v = fλ", w * 0.74, h * 0.88, 13, "#bda178", "center", "math");
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
