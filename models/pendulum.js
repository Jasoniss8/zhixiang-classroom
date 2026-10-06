"use strict";
// pendulum: model metadata, rendering and lifecycle hooks.

function pendulumPeriod(p) {
  const small = 2 * Math.PI * Math.sqrt(p.length / p.g),
    k = Math.sin(rad(p.angle) / 2),
    n = 128,
    step = Math.PI / (2 * n);
  let sum = 0;
  for (let i = 0; i <= n; i++) {
    const f = 1 / Math.sqrt(1 - k * k * Math.sin(i * step) ** 2);
    sum += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * f;
  }
  const period = (4 * Math.sqrt(p.length / p.g) * step * sum) / 3;
  return { period, small, error: (period / small - 1) * 100 };
}

function pendulumEnergy(p, theta, omega) {
  return {
    potential: p.mass * p.g * p.length * (1 - Math.cos(theta)),
    kinetic: 0.5 * p.mass * p.length * p.length * omega * omega,
    total: p.mass * p.g * p.length * (1 - Math.cos(rad(p.angle))),
  };
}

function rk4Pendulum(theta, omega, dt, p) {
  return ZhixiangPhysics.pendulumStep(
    theta,
    omega,
    dt,
    p,
    isResistanceCompare(p) ? p.damping : 0,
  );
}

function recordPendulumEnergy() {
  const p = state.p,
    actual = pendulumEnergy(p, state.theta, state.omega),
    ideal = pendulumEnergy(p, state.idealTheta, state.idealOmega);
  state.pendulumHistory.push({
    t: state.time,
    actual: { ...actual, total: actual.kinetic + actual.potential },
    ideal: { ...ideal, total: ideal.kinetic + ideal.potential },
  });
  trimHistory(state.pendulumHistory);
}

function drawPendulumScene(ctx, w, h, p) {
  const env = isResistanceCompare(p),
    scale = Math.min((h - 145) / 3, (w * 0.43) / (3 * Math.sin(rad(60)))),
    cx = w / 2,
    cy = 48,
    L = p.length * scale,
    angle = state.theta,
    bx = cx + Math.sin(angle) * L,
    by = cy + Math.cos(angle) * L;
  roundRect(ctx, cx - 40, cy - 11, 80, 8, 3, "#dce4d3");
  for (let x = cx - 36; x <= cx + 35; x += 8)
    line(ctx, x, cy - 13, x + 4, cy - 18, "#becbb0", 1);
  line(ctx, cx, cy, cx, cy + L + 20, "#ccd9bc", 1, [4, 4]);
  ctx.beginPath();
  ctx.arc(cx, cy, L, Math.PI / 2 - rad(p.angle), Math.PI / 2 + rad(p.angle));
  ctx.strokeStyle = "#e2dcc6";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
  if (env) {
    const ix = cx + Math.sin(state.idealTheta) * L,
      iy = cy + Math.cos(state.idealTheta) * L;
    line(ctx, cx, cy, ix, iy, PALETTE.orange, 2, [5, 4]);
    circle(ctx, ix, iy, 11, "#fff", PALETTE.orange, 1.7);
  }
  line(ctx, cx, cy, bx, by, "#6f8879", 2);
  circle(ctx, cx, cy, 4, "#95a784");
  circle(ctx, bx, by, 12, PALETTE.green, "#fff", 2);
  if (state.labels) {
    text(
      ctx,
      `L = ${num(p.length)} m`,
      clamp(cx + Math.sin(angle) * L * 0.48 + 16, 60, w - 95),
      cy + Math.cos(angle) * L * 0.48,
      12,
      PALETTE.muted,
    );
    text(ctx, `${num(deg(angle), 1)}°`, cx + 22, cy + 31, 12, PALETTE.orange);
    if (!env)
      text(
        ctx,
        p.angle > 15 ? "大角度 · 完整单摆方程" : "无阻力单摆",
        w - 19,
        25,
        12,
        PALETTE.muted,
        "right",
      );
  }
  const en = pendulumEnergy(p, state.theta, state.omega);
  energyBars(
    ctx,
    w,
    h,
    en.kinetic,
    en.potential,
    en.total,
    env ? Math.max(0, en.total - en.kinetic - en.potential) : null,
  );
}

function energyBars(ctx, w, h, kinetic, potential, total, loss = null) {
  const left = w * 0.19,
    bw = w * 0.5,
    yy = h - 78,
    rows = [
      ["动能", kinetic, PALETTE.green],
      ["势能", potential, PALETTE.orange],
    ];
  if (loss !== null) rows.push(["已耗散", loss, PALETTE.purple]);
  rows.forEach(([label, val, col], i) => {
    const y = yy + i * 22;
    text(ctx, label, left - 12, y + 4, 12, PALETTE.muted, "right");
    roundRect(ctx, left, y, bw, 7, 3, "#edf1e6");
    roundRect(ctx, left, y, bw * clamp(val / (total || 1), 0, 1), 7, 3, col);
    text(ctx, `${num(val, 2)} J`, left + bw + 8, y + 4, 12, PALETTE.muted);
  });
}

function drawPendulum(ctx, w, h, p) {
  const sceneH = p.energyGraph ? Math.min(340, h * 0.53) : h;
  drawPendulumScene(ctx, w, sceneH, p);
  if (p.energyGraph) {
    const source =
        isResistanceCompare(p) && p.energySource === "ideal"
          ? "ideal"
          : "actual",
      history = state.pendulumHistory || [],
      max = Math.max(0.01, ...history.map((q) => q[source].total)) * 1.08;
    ctx.save();
    ctx.translate(0, sceneH);
    line(ctx, 14, 0, w - 14, 0, "#dde5d9");
    drawTimeGraph(
      ctx,
      w,
      h - sceneH,
      history,
      [
        ["kinetic", "动能 K", PALETTE.green],
        ["potential", "势能 U", PALETTE.orange],
        ["total", "机械能 E", PALETTE.purple],
      ].map(([key, name, color]) => ({
        name,
        color,
        value: (q) => q[source][key],
      })),
      {
        title: `${isResistanceCompare(p) ? (source === "ideal" ? "理想摆" : "含阻力摆") : "理想摆"} · 能量—时间`,
        unit: "E / J",
        ymax: max,
      },
    );
    ctx.restore();
  }
  stageInfo = {
    kind: "pendulum",
    time: state.time,
    energyTime: state.pendulumHistory?.at(-1)?.t,
  };
}

ZhixiangModels.register({
  exportData: () => pendulumChartData(),
  id: "pendulum",
  cat: "physics",
  level: "高中",
  title: "单摆与能量转化",
  desc: "比较无阻尼与有阻尼的摆动和能量变化。",
  tags: "物理 单摆 摆长 周期 重力 动能 势能 能量 阻尼 理想 实际 对照",
  time: true,
  environment: true,
  choices: {
    motionMode: ["ideal", "compare"],
    energySource: ["actual", "ideal"],
  },
  bools: ["energyGraph"],
  defaults: {
    length: 1.5,
    angle: 15,
    g: 9.8,
    mass: 1,
    motionMode: "ideal",
    damping: 0.15,
    energyGraph: true,
    energySource: "actual",
  },
  controls: [
    ["length", "L", "摆长", 0.5, 3, 0.1, "m"],
    ["angle", "θ₀", "初始摆角", 5, 60, 1, "°"],
    ["g", "g", "重力加速度", 1.62, 15, 0.01, "m/s²"],
    ["mass", "m", "摆球质量", 0.1, 2, 0.1, "kg"],
    ["damping", "b", "线性阻尼系数", 0, 0.6, 0.01, "kg/s"],
  ],
  presets: [
    ["小角度摆动", { length: 1.5, angle: 15, g: 9.8, mass: 1 }],
    ["摆长加倍", { length: 3, angle: 15, g: 9.8, mass: 1 }],
    ["大角度观察", { length: 1.5, angle: 60, g: 9.8, mass: 1 }],
  ],
  hint: "使用完整的 sinθ 回复项；对照时橙色虚线为无阻尼摆，绿色为有阻尼摆。",
  question: "只把摆球质量变成原来的 2 倍，单摆摆动会明显变慢吗？",
  answer:
    "在理想模型中，质量不改变周期。若切向阻力 F = −bv 且 b 保持不变，衰减率 b/m 随质量改变；不能把无阻尼结论直接套到有阻尼模型。大摆角下，小角度周期公式也不再精确。",
  note: "理想：θ″ = −(g/L)sinθ。含线性阻尼：θ″ = −(g/L)sinθ − (b/m)θ̇，对应切向力 F = −bv；b 单位 kg/s（等价于 N·s/m）。两种摆从相同角度静止释放，在相同时间和比例下计算；四阶 Runge–Kutta 步长 ≤ 1/240 s。U = mgL(1−cosθ)，K = ½mL²θ̇²，dE/dt = −bL²θ̇²；已耗散能量为初始机械能减当前机械能。b = 0 时两种结果重合。T₀ = 2π√(L/g) 仅为小角近似；椭圆积分周期 T 只对应无阻尼摆，不能作为有阻尼摆的恒定周期。阻尼为线性黏性近似，不是轴摩擦与空气阻力的完整实测模型；强阻尼下可能不再往复摆动。不计驱动力、绳质量，摆球视为质点。",
  sources: ["pendulum", "pendulumPeriod", "damping"],
  draw: (ctx, w, h, p, comparison) => drawPendulum(ctx, w, h, p, comparison),
  readout: (p, m) => {
    {
      const d = pendulumPeriod(p);
      if (isResistanceCompare(p)) {
        const actual = pendulumEnergy(p, state.theta, state.omega),
          ideal = pendulumEnergy(p, state.idealTheta, state.idealOmega),
          e = actual.kinetic + actual.potential;
        const rows = comparisonRows([
          ["当前摆角", deg(state.idealTheta), deg(state.theta), "°", 1],
          [
            "当前速率",
            Math.abs(p.length * state.idealOmega),
            Math.abs(p.length * state.omega),
            "m/s",
          ],
          ["机械能", ideal.kinetic + ideal.potential, e, "J", 3],
          ["已耗散能量", 0, Math.max(0, actual.total - e), "J", 3],
        ]);
        return {
          formula: "θ″ = −(g/L) sin θ − (b/m) θ̇",
          caption: `切向阻力 F = −bv · b = ${num(p.damping)} kg/s · 有阻尼摆不标作恒定周期`,
          metrics: rows.map(([name, a, b, diff, unit]) => [
            name,
            `理想 ${a} / 含阻力 ${b}`,
            unit,
          ]),
          comparison: rows,
        };
      }
      return {
        formula: "θ″ = −(g/L) sin θ",
        caption: `无阻力质点单摆 · T 比小角近似长 ${num(d.error, 2)}%`,
        metrics: [
          ["计入摆角的周期 T", num(d.period, 3), "s"],
          ["小角近似周期 T₀", num(d.small, 3), "s"],
          ["当前摆球速率", num(Math.abs(p.length * state.omega)), "m/s"],
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
      const x = cx,
        y = h * 0.25,
        L = h * 0.52,
        a = 0.5;
      line(ctx, x - 24, y - 3, x + 24, y - 3, "#cdbd9f", 4);
      line(ctx, x, y, x, y + L + 8, "#e1d7c4", 1, [3, 4]);
      ctx.beginPath();
      ctx.arc(x, y, L, Math.PI / 2 - 0.55, Math.PI / 2 + 0.55);
      ctx.strokeStyle = "#dccdb4";
      ctx.setLineDash([3, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
      line(ctx, x, y, x + Math.sin(a) * L, y + Math.cos(a) * L, "#beab8a", 1.5);
      circle(ctx, x + Math.sin(a) * L, y + Math.cos(a) * L, 10, "#c4a57a");
      text(ctx, "T ≈ 2π√(L/g)", w * 0.72, 44, 11, "#b19b7a", "center", "math");
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
