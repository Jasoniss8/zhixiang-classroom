"use strict";
// circular: model metadata, rendering and lifecycle hooks.

function drawCircular(ctx, w, h, p) {
  const d = SCIENCE.circularData(p, state.circular),
    r = p.radius,
    plot = makePlot(ctx, w, h, {
      xmin: -1.85 * r,
      xmax: 1.85 * r,
      ymin: -1.6 * r,
      ymax: 1.6 * r,
      top: 55,
      bottom: 38,
      xLabel: "x / m",
      yLabel: "y / m",
    });
  const cx = plot.x(0),
    cy = plot.y(0),
    px = plot.x(d.x),
    py = plot.y(d.y),
    radius = plot.x(r) - cx;
  plot.clip();
  if (!d.slack) {
    ctx.save();
    ctx.setLineDash([5, 5]);
    circle(ctx, cx, cy, radius, null, "#c6d4ca", 1.5);
    ctx.restore();
  }
  const trail = state.circularTrail || [];
  ctx.beginPath();
  ctx.strokeStyle = "#aac6ae";
  ctx.lineWidth = 2;
  trail.forEach((q, i) =>
    i
      ? ctx.lineTo(plot.x(q.x), plot.y(q.y))
      : ctx.moveTo(plot.x(q.x), plot.y(q.y)),
  );
  ctx.stroke();
  if (d.slack) {
    line(
      ctx,
      cx,
      cy,
      (cx + px) / 2 + 12,
      (cy + py) / 2 + 14,
      "#b0b8b1",
      1.5,
      [4, 4],
    );
    line(
      ctx,
      (cx + px) / 2 + 12,
      (cy + py) / 2 + 14,
      px,
      py,
      "#b0b8b1",
      1.5,
      [4, 4],
    );
  } else line(ctx, cx, cy, px, py, "#9ba99e", 1.5);
  circle(ctx, cx, cy, 4, PALETTE.deep);
  circle(ctx, px, py, 9, d.slack ? "#9b9d96" : PALETTE.green, "#fff", 2);
  const vector = (vx, vy, length, label, color) => {
    const n = Math.hypot(vx, vy);
    if (n < 1e-12) return;
    const x = px + (length * vx) / n,
      y = py - (length * vy) / n;
    arrow(ctx, px, py, x, y, color, 2, 6);
    if (state.labels)
      text(
        ctx,
        label,
        clamp(x + 8, plot.left + 6, w - plot.right - 26),
        clamp(y - 9, plot.top + 8, h - plot.bottom - 10),
        13,
        color,
      );
  };
  vector(d.vx, d.vy, Math.min(85, 35 + 8 * d.speed), "v", PALETTE.green);
  if (!d.slack) {
    vector(d.ax, d.ay, 76, "F向", PALETTE.purple);
    vector(d.ax, d.ay, 47, "a向", PALETTE.orange);
  }
  if (p.plane === "vertical" && state.labels)
    vector(0, -p.g, 35, "mg", "#85918b");
  plot.end();
  text(
    ctx,
    d.slack
      ? "绳松弛 · 圆周演示停止"
      : p.plane === "vertical"
        ? "竖直平面 · 速度随高度变化"
        : "水平面俯视 · 匀速圆周",
    plot.left,
    23,
    14,
    d.slack ? PALETTE.orange : PALETTE.deep,
  );
  stageInfo = { kind: "circular", plot, point: { x: d.x, y: d.y } };
}

ZhixiangModels.register({
  id: "circular",
  cat: "physics",
  level: "高中",
  title: "圆周运动与向心力",
  desc: "比较速度、向心加速度与绳张力，观察竖直圆周的临界条件。",
  tags: "圆周运动 向心力 角速度 线速度 张力 临界速度 绳松弛",
  science: true,
  time: true,
  defaults: {
    mass: 1,
    radius: 2,
    omega: 2.8,
    g: 9.8,
    plane: "horizontal",
    start: "top",
  },
  choices: { plane: ["horizontal", "vertical"], start: ["top", "bottom"] },
  controls: [
    ["mass", "m", "质量", 0.1, 5, 0.1, "kg"],
    ["radius", "r", "半径", 0.3, 5, 0.1, "m"],
    ["omega", "ω₀", "初始角速度", 0, 20, 0.05, "rad/s"],
    ["g", "g", "重力加速度", 1.62, 15, 0.01, "m/s²"],
  ],
  presets: [
    [
      "水平匀速",
      { plane: "horizontal", mass: 1, radius: 2, omega: 2.8, g: 9.8 },
    ],
    [
      "竖直完整圆周",
      { plane: "vertical", start: "top", mass: 1, radius: 2, omega: 3, g: 9.8 },
    ],
    [
      "最高点临界",
      {
        plane: "vertical",
        start: "top",
        mass: 1,
        radius: 2,
        omega: Math.sqrt(9.8 / 2),
        g: 9.8,
      },
    ],
    [
      "最高点绳松弛",
      {
        plane: "vertical",
        start: "top",
        mass: 1,
        radius: 2,
        omega: 1.5,
        g: 9.8,
      },
    ],
  ],
  hint: "绿色 v 沿切线；橙色 a向 与紫色 F向 指向圆心。箭头示意方向，大小以下方 SI 读数为准。",
  question:
    "竖直圆周最高点的“向心力”就是绳张力吗？从最低点出发的整周临界速度也等于 √(gr) 吗？",
  answer:
    "向心力是合力沿半径向内的分量。最高点有 T+mg=mv²/r，所以 T=0 时 v=√(gr)。从最低点上升到最高点还需增加 2mgr 势能；忽略阻力时，最低点整周临界初速度为 √(5gr)。较小的最低点初速度可能只来回摆动，不能一律判为绳松弛。",
  note: "水平模式为光滑水平面上的质点，重力与支持力抵消；匀速角位置 θ=ωt 使用解析解。竖直模式为固定支点、无质量且不可伸长的柔绳和质点，忽略空气阻力，g 恒定；ω₀ 是所选起点的初值，随后速度随高度改变。θ 从最低点量起，θ″=−(g/r)sinθ，T=m(rω²+g cosθ)，内部 RK4 步长≤1/240 s；用初始机械能核对整周临界条件，避免积分误差造成假松弛。张力首次降到零且将变负时定位事件并停止，松弛后不继续画圆周，也不模拟自由飞行或再次绷紧。a向=v²/r=ω²r，F向=ma向 是所需径向合力，不等于竖直模式的张力或总合力。松弛后不再显示有效向心量。箭头只示意矢量方向，大小由读数给出，不跨量纲比较箭头长度。",
  sources: ["circular", "pendulum"],
  draw: (ctx, w, h, p, comparison) => drawCircular(ctx, w, h, p, comparison),
  readout: (p, m) => scienceReadout(m, p),
  thumbnail: (canvas, m) => {
    const { ctx, w, h } = setupCanvas(canvas),
      cx = w * 0.5,
      cy = h * 0.6,
      col = CATS[m.cat].color;
    ctx.save();
    {
      const x = w * 0.47,
        y = h * 0.59,
        r = Math.min(w * 0.25, h * 0.32);
      circle(ctx, x, y, r, null, "#b7cbb5", 1.5);
      const px = x + r * 0.8,
        py = y - r * 0.6;
      line(ctx, x, y, px, py, "#a6b9a6");
      circle(ctx, px, py, 5, PALETTE.green);
      arrow(ctx, px, py, px - 28, py + 21, PALETTE.purple, 1.5, 5);
      arrow(ctx, px, py, px + 18, py + 24, PALETTE.green, 1.5, 5);
      text(ctx, "F = mω²r", w * 0.2, 30, 13, PALETTE.muted);
    }
    ctx.restore();
  },
  renderControls: renderScienceControls,
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
  bind: bindScienceStage,
});
