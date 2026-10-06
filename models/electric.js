"use strict";
// electric: model metadata, rendering and lifecycle hooks.

const electricPlotCache = new Map();

function electricLevels(charges) {
  const q = Math.max(...charges.map((c) => Math.abs(c.q)), 0);
  return q
    ? [-4, -2, -1, -0.5, 0, 0.5, 1, 2, 4].map(
        (v) => (v * SCIENCE.COULOMB_K * 1e-9 * q) / 2,
      )
    : [0];
}

function electricPlotData(p) {
  const charges = SCIENCE.electricCharges(p),
    key = JSON.stringify(charges);
  if (!electricPlotCache.has(key)) {
    const levels = electricLevels(charges);
    if (electricPlotCache.size >= 5)
      electricPlotCache.delete(electricPlotCache.keys().next().value);
    electricPlotCache.set(key, {
      charges,
      lines: SCIENCE.electricFieldLines(charges),
      contours: SCIENCE.equipotentialContours(charges, levels),
    });
  }
  return electricPlotCache.get(key);
}

function drawElectric(ctx, w, h, p) {
  const plot = makePlot(ctx, w, h, {
      ...SCIENCE.FIELD_BOUNDS,
      top: 56,
      bottom: 35,
      equal: true,
      xLabel: "x / m",
      yLabel: "y / m",
    }),
    data = electricPlotData(p),
    f = SCIENCE.electricField(data.charges, p.probeX, p.probeY);
  plot.clip();
  const b = SCIENCE.FIELD_BOUNDS;
  ctx.save();
  ctx.setLineDash([3, 5]);
  ctx.strokeStyle = "#dce3db";
  ctx.strokeRect(
    plot.x(b.xmin),
    plot.y(b.ymax),
    plot.x(b.xmax) - plot.x(b.xmin),
    plot.y(b.ymin) - plot.y(b.ymax),
  );
  ctx.restore();
  if (p.showPotential) {
    ctx.save();
    ctx.strokeStyle = "#9683a9";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.globalAlpha = 0.7;
    for (const contour of data.contours) {
      ctx.beginPath();
      for (const [a, b] of contour.segments) {
        ctx.moveTo(plot.x(a.x), plot.y(a.y));
        ctx.lineTo(plot.x(b.x), plot.y(b.y));
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  if (p.showField)
    for (const field of data.lines) {
      ctx.beginPath();
      ctx.strokeStyle = "#719e7a";
      ctx.lineWidth = 1.3;
      field.points.forEach((q, i) =>
        i
          ? ctx.lineTo(plot.x(q.x), plot.y(q.y))
          : ctx.moveTo(plot.x(q.x), plot.y(q.y)),
      );
      ctx.stroke();
      for (const fraction of [0.3, 0.68]) {
        const i = Math.floor((field.points.length - 2) * fraction),
          a = field.points[i],
          b = field.points[i + 1];
        arrow(
          ctx,
          plot.x(a.x),
          plot.y(a.y),
          plot.x(b.x),
          plot.y(b.y),
          "#4e875f",
          1,
          5,
        );
      }
    }
  for (const c of data.charges) {
    const x = plot.x(c.x),
      y = plot.y(c.y),
      r = Math.max(10, plot.x(SCIENCE.CHARGE_CUTOFF) - plot.x(0));
    circle(ctx, x, y, r + 2, "#fff");
    circle(
      ctx,
      x,
      y,
      r,
      c.q > 0 ? "#be8453" : c.q < 0 ? "#647eaa" : "#a6afa8",
      "#fff",
      1.5,
    );
    text(ctx, c.q > 0 ? "+" : c.q < 0 ? "−" : "0", x, y, 15, "#fff", "center");
    if (state.labels)
      text(ctx, `q${c.id}`, x + r + 5, y - r - 4, 12, PALETTE.ink);
  }
  const x = plot.x(p.probeX),
    y = plot.y(p.probeY);
  circle(ctx, x, y, 5, "#fff", f.valid ? PALETTE.orange : "#b75e4c", 2);
  if (f.valid && f.magnitude >= 1e-8) {
    const ex = x + (55 * f.ex) / f.magnitude,
      ey = y - (55 * f.ey) / f.magnitude;
    arrow(ctx, x, y, ex, ey, PALETTE.orange, 2.3, 7);
    if (state.labels) text(ctx, "E", ex + 7, ey - 7, 13, PALETTE.orange);
  }
  if (state.labels) text(ctx, "P", x + 8, y + 13, 13, PALETTE.orange);
  plot.end();
  text(ctx, "绿色：电场线 →", plot.left, 21, 12, PALETTE.green);
  text(ctx, "紫色：等势线", plot.left + 128, 21, 12, PALETTE.purple);
  text(ctx, "电荷 nC · 坐标 m · 电势 V", plot.left, 40, 12, PALETTE.muted);
  stageInfo = { kind: "electric", plot, charges: data.charges };
}

ZhixiangModels.register({
  id: "electric",
  cat: "physics",
  level: "高中",
  title: "电场线与等势线",
  desc: "拖动点电荷，观察电场叠加并测量场强与电势。",
  tags: "电场 电荷 电场线 等势线 电势 库仑 叠加 电偶极子",
  science: true,
  time: false,
  defaults: {
    count: "2",
    q1: 1,
    x1: -1.5,
    y1: 0,
    q2: -1,
    x2: 1.5,
    y2: 0,
    q3: 1,
    x3: 0,
    y3: 2,
    probeX: 0,
    probeY: 2,
    showField: true,
    showPotential: true,
  },
  choices: { count: ["1", "2", "3"] },
  bools: ["showField", "showPotential"],
  controls: [
    ...Array.from({ length: 3 }, (_, j) => {
      const i = j + 1;
      return [
        ["q" + i, "q" + i, "电荷量", -5, 5, 0.1, "nC"],
        ["x" + i, "x" + i, "横坐标", -4, 4, 0.1, "m"],
        ["y" + i, "y" + i, "纵坐标", -3, 3, 0.1, "m"],
      ];
    }).flat(),
    ["probeX", "xP", "测量点横坐标", -30, 30, 0.1, "m"],
    ["probeY", "yP", "测量点纵坐标", -30, 30, 0.1, "m"],
  ],
  presets: [
    ["单个电荷", { count: "1", q1: 1, x1: 0, y1: 0, probeX: 2, probeY: 1 }],
    [
      "等量同号",
      {
        count: "2",
        q1: 1,
        q2: 1,
        x1: -1.5,
        x2: 1.5,
        y1: 0,
        y2: 0,
        probeX: 0,
        probeY: 2,
      },
    ],
    [
      "等量异号",
      {
        count: "2",
        q1: 1,
        q2: -1,
        x1: -1.5,
        x2: 1.5,
        y1: 0,
        y2: 0,
        probeX: 0,
        probeY: 2,
      },
    ],
    [
      "电偶极子",
      {
        count: "2",
        q1: 1,
        q2: -1,
        x1: -0.45,
        x2: 0.45,
        y1: 0,
        y2: 0,
        probeX: 0,
        probeY: 2,
      },
    ],
  ],
  hint: "拖动带符号的电荷；点击任意位置测量 E、V。绿色箭头为电场线方向，紫色虚线为等势线。",
  question:
    "等量异号电荷中点的电势是 0，电场强度也一定是 0 吗？电场线是带电粒子的运动轨迹吗？",
  answer:
    "不是。电势是标量，中点的正负电势相消；场强是矢量，中点两电荷产生的场强同向相加。电场线表示电场方向，不是粒子的运动轨迹。电偶极子是相距较近的等量异号电荷，本模型仍按两个点电荷精确叠加，不套用远场近似。",
  note: "真空中固定的 1–3 个点电荷，展示 z=0 平面内的三维静电场截面，不考虑电荷运动、介质极化或边界导体。k=8.99×10⁹ N·m²/C²，输入 q 用 nC（1 nC=10⁻⁹ C），坐标用 m，E 用 N/C，V 用 V，无穷远电势取 0。E=kΣq(r−ri)/|r−ri|³，V=kΣq/|r−ri|。距任一非零电荷≤0.16 m 不计算或外推，画白色避让区；不以软化公式掩盖奇点。电荷中心至少相距 0.35 m。场线沿 E 积分，负电荷可反向追踪后倒序绘制，箭头总沿正试探电荷受力方向；从正电荷或区域外进入，到负电荷或区域外结束。到达避让区、|E|≤10⁻⁸ N/C、区域边界、累计长度 40 m 或 1400 步时终止。绘图区 x∈[−6,6] m、y∈[−4.5,4.5] m；线条数量和箭头长度不作为场强定量标尺。等势线由 0.1 m 网格插值，定量测量直接使用解析叠加。",
  sources: ["electric", "potential"],
  draw: (ctx, w, h, p, comparison) => drawElectric(ctx, w, h, p, comparison),
  readout: (p, m) => scienceReadout(m, p),
  thumbnail: (canvas, m) => {
    const { ctx, w, h } = setupCanvas(canvas),
      cx = w * 0.5,
      cy = h * 0.6,
      col = CATS[m.cat].color;
    ctx.save();
    {
      const left = w * 0.3,
        right = w * 0.7,
        y = h * 0.55;
      for (const shift of [-0.8, -0.4, 0, 0.4, 0.8]) {
        ctx.beginPath();
        ctx.strokeStyle = "#97b28e";
        ctx.lineWidth = 1.2;
        ctx.moveTo(left, y);
        ctx.bezierCurveTo(
          left + 30,
          y + shift * h,
          right - 30,
          y + shift * h,
          right,
          y,
        );
        ctx.stroke();
      }
      for (const x of [left, right]) {
        ctx.save();
        ctx.setLineDash([3, 4]);
        circle(ctx, x, y, 27, null, "#baa6c7", 1);
        ctx.restore();
      }
      circle(ctx, left, y, 8, "#be8453");
      circle(ctx, right, y, 8, "#647eaa");
      text(ctx, "+", left, y, 14, "#fff", "center");
      text(ctx, "−", right, y, 14, "#fff", "center");
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
