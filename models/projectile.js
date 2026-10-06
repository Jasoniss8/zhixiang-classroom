"use strict";
// projectile: model metadata, rendering and lifecycle hooks.

function projectileData(p) {
  const vx = p.v * Math.cos(rad(p.angle)),
    vy = p.v * Math.sin(rad(p.angle)),
    flight = (vy + Math.sqrt(vy * vy + 2 * p.g * p.height)) / p.g;
  return {
    vx,
    vy,
    flight,
    range: vx * flight,
    peak: p.height + (vy * vy) / (2 * p.g),
  };
}

function resistedProjectile(p) {
  const key = JSON.stringify([
    p.v,
    p.angle,
    p.height,
    p.g,
    p.mass,
    p.rho,
    p.cd,
    p.area,
  ]);
  if (!projectilePathCache.has(key)) {
    if (projectilePathCache.size >= 12)
      projectilePathCache.delete(projectilePathCache.keys().next().value);
    projectilePathCache.set(key, ZhixiangPhysics.projectilePath(p));
  }
  return projectilePathCache.get(key);
}

function projectileDuration(p) {
  const ideal = projectileData(p);
  return isResistanceCompare(p)
    ? Math.max(ideal.flight, resistedProjectile(p).flight)
    : ideal.flight;
}

function projectileAt(p, t, resisted = false) {
  if (resisted) return ZhixiangPhysics.samplePath(resistedProjectile(p), t);
  const d = projectileData(p),
    time = clamp(t, 0, d.flight);
  return {
    t: time,
    x: d.vx * time,
    y: Math.max(0, p.height + d.vy * time - 0.5 * p.g * time * time),
    vx: d.vx,
    vy: d.vy - p.g * time,
  };
}

const projectilePathCache = new Map();

function drawProjectile(ctx, w, h, p, comparison) {
  const env = isResistanceCompare(p),
    ideal = projectileData(p),
    d = env ? resistedProjectile(p) : ideal;
  const other = comparison
    ? isResistanceCompare(comparison)
      ? resistedProjectile(comparison)
      : projectileData(comparison)
    : null;
  const maxR = Math.max(d.range, ideal.range, other?.range || 0, 10),
    maxH = Math.max(d.peak, ideal.peak, other?.peak || 0, 5);
  const plot = makePlot(ctx, w, h, {
    xmin: -maxR * 0.07,
    xmax: maxR * 1.08,
    ymin: -maxH * 0.17,
    ymax: maxH * 1.2 + 1,
    equal: true,
    top: 46,
    bottom: 38,
    xLabel: "x / m",
    yLabel: "y / m",
  });
  stageInfo = { kind: "projectile", plot, strobeInterval: p.strobeInterval };
  plot.clip();
  ctx.fillStyle = "#eef3e6";
  ctx.fillRect(
    plot.left,
    plot.y(0),
    plot.pw,
    Math.max(0, h - plot.bottom - plot.y(0)),
  );
  line(ctx, plot.left, plot.y(0), w - plot.right, plot.y(0), "#bccca9", 1.3);
  function trace(pp, resisted, col, dash = [], end = null, width = 2) {
    const dd = resisted ? resistedProjectile(pp) : projectileData(pp),
      total = end === null ? dd.flight : Math.min(end, dd.flight);
    ctx.beginPath();
    ctx.strokeStyle = col;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    for (let i = 0; i <= 180; i++) {
      const q = projectileAt(pp, (total * i) / 180, resisted);
      i
        ? ctx.lineTo(plot.x(q.x), plot.y(q.y))
        : ctx.moveTo(plot.x(q.x), plot.y(q.y));
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  if (comparison)
    trace(
      comparison,
      isResistanceCompare(comparison),
      env ? PALETTE.purple : PALETTE.orange,
      [3, 5],
    );
  if (env) trace(p, false, PALETTE.orange, [6, 5]);
  trace(p, env, "#b2cbbd", [], null, 1.5);
  if (p.showStrobe) {
    for (
      let t = 0;
      t <= Math.max(d.flight, env ? ideal.flight : 0) + 1e-10;
      t += p.strobeInterval
    ) {
      if (t <= d.flight) {
        const q = projectileAt(p, t, env);
        circle(ctx, plot.x(q.x), plot.y(q.y), 2.5, "#9cb5a7");
      }
      if (env && t <= ideal.flight) {
        const q = projectileAt(p, t, false);
        circle(ctx, plot.x(q.x), plot.y(q.y), 2.5, "#fff", PALETTE.orange, 1);
      }
    }
  }
  trace(p, env, PALETTE.green, [], state.time, 2.7);
  if (env) {
    const q = projectileAt(p, state.time);
    circle(ctx, plot.x(q.x), plot.y(q.y), 7, "#fff", PALETTE.orange, 1.7);
  }
  const t = clamp(state.time, 0, d.flight),
    q = projectileAt(p, t, env),
    x = plot.x(q.x),
    y = plot.y(q.y),
    moving = t < d.flight;
  if (moving) {
    const vScale = Math.min(3, (w * 0.17) / Math.max(p.v, Math.abs(q.vy), 1));
    if (p.showVelocity) {
      arrow(
        ctx,
        x,
        y,
        x + q.vx * vScale,
        y - q.vy * vScale,
        PALETTE.purple,
        2.2,
      );
      text(
        ctx,
        "v",
        clamp(x + q.vx * vScale + 10, plot.left, w - 35),
        clamp(y - q.vy * vScale - 12, plot.top + 10, h - 55),
        12,
        PALETTE.purple,
      );
    }
    if (p.showComponents) {
      arrow(ctx, x, y, x + q.vx * vScale, y, PALETTE.green, 1.8);
      arrow(ctx, x, y, x, y - q.vy * vScale, PALETTE.orange, 1.8);
      text(
        ctx,
        "vₓ",
        clamp(x + q.vx * vScale + 7, plot.left, w - 40),
        y - 12,
        12,
        PALETTE.green,
        "left",
        "math",
      );
      if (Math.abs(q.vy) > 0.5)
        text(
          ctx,
          "vᵧ",
          clamp(x + 9, plot.left, w - 40),
          clamp(y - q.vy * vScale, plot.top + 12, h - 55),
          12,
          PALETTE.orange,
          "left",
          "math",
        );
    }
  }
  circle(ctx, x, y, 9, "#e7eddc");
  circle(ctx, x, y, 6, PALETTE.green, "#fff", 1.5);
  plot.end();
  if (p.showStrobe)
    text(
      ctx,
      `频闪 Δt=${num(p.strobeInterval)} s`,
      w - (state.labels ? 110 : 20),
      25,
      12,
      PALETTE.muted,
      "right",
    );
  if (state.labels) {
    if (moving) {
      const [ax, ay] = env
          ? ZhixiangPhysics.acceleration(q.vx, q.vy, p)
          : [0, -p.g],
        dragY = ay + p.g,
        drag = Math.hypot(ax, dragY),
        aScale = Math.min(4, (h * 0.18) / Math.max(p.g, drag, 1)),
        ox = x + 16,
        oy = y;
      arrow(ctx, ox, oy, ox, oy + p.g * aScale, "#49545e", 1.7);
      text(
        ctx,
        `g = ${num(p.g)} m/s²`,
        clamp(ox + 9, 85, w - 100),
        clamp(oy + (p.g * aScale) / 2, 65, h - 15),
        12,
        "#49545e",
        ox > w - 130 ? "right" : "left",
      );
      if (env && drag > 1e-6) {
        arrow(
          ctx,
          x,
          y,
          x + ax * aScale,
          y - dragY * aScale,
          PALETTE.purple,
          1.8,
        );
        text(
          ctx,
          `aᴅ = ${num(drag)} m/s²`,
          w - 20,
          63,
          12,
          PALETTE.purple,
          "right",
        );
      }
    }
    text(
      ctx,
      `t = ${state.time.toFixed(2)} s`,
      w - 20,
      25,
      12,
      PALETTE.green,
      "right",
    );
  }
}

ZhixiangModels.register({
  exportData: () => projectileChartData(),
  id: "projectile",
  cat: "physics",
  level: "高中",
  title: "平抛与斜抛运动",
  desc: "观察抛体轨迹，对照有无空气阻力的射程。",
  tags: "物理 平抛 斜抛 抛体 速度 加速度 重力 分解 空气阻力 理想 实际 对照",
  time: true,
  compare: true,
  environment: true,
  choices: { motionMode: ["ideal", "compare"] },
  bools: ["showVelocity", "showComponents", "showStrobe"],
  defaults: {
    v: 20,
    angle: 45,
    height: 0,
    g: 9.8,
    motionMode: "ideal",
    mass: 0.15,
    rho: 1.225,
    cd: 0.47,
    area: 0.0042,
    showVelocity: true,
    showComponents: true,
    showStrobe: true,
    strobeInterval: 0.2,
  },
  controls: [
    ["strobeInterval", "Δt", "频闪间隔", 0.05, 1, 0.05, "s"],
    ["v", "v₀", "初速度", 5, 40, 0.5, "m/s"],
    ["angle", "θ", "发射仰角", 0, 85, 1, "°"],
    ["height", "h₀", "初始高度", 0, 20, 0.5, "m"],
    ["g", "g", "重力加速度", 1.62, 15, 0.01, "m/s²"],
    ["mass", "m", "物体质量", 0.05, 2, 0.05, "kg"],
    ["rho", "ρ", "空气密度", 0, 1.5, 0.025, "kg/m³"],
    ["cd", "Cᴅ", "阻力系数", 0, 1.2, 0.01, ""],
    ["area", "A", "迎风面积", 0.001, 0.02, 0.0001, "m²"],
  ],
  presets: [
    ["45° 斜抛", { v: 20, angle: 45, height: 0, g: 9.8, rho: 1.225 }],
    ["水平抛出", { v: 15, angle: 0, height: 15, g: 9.8, rho: 1.225 }],
    ["月球真空", { v: 20, angle: 45, height: 0, g: 1.62, rho: 0 }],
  ],
  hint: "圆点为等时间间隔；对照模式中，橙色虚线为理想轨迹，绿色为含阻力轨迹。",
  question: "抛体到达最高点时，竖直速度为 0，那么它的加速度也是 0 吗？",
  answer:
    "不是。忽略空气阻力时，加速度仍为竖直向下的 g。含空气阻力时，最高点仍有水平速度，因此还存在反向的水平阻力加速度；两个方向的运动不再相互独立。",
  note: "理想模型：x = v₀cosθ·t，y = h₀ + v₀sinθ·t − ½gt²。含阻力模型：Fᴅ = −½ρCᴅA|v|v，a = (0,−g) + Fᴅ/m；用四阶 Runge–Kutta 积分，步长 ≤ 1/240 s，细化最高点与落地时刻。显示开关分别控制速度合矢量、分速度和频闪点；频闪从 t=0 按同一 Δt 取样，仅保留落地前的整间隔点。两种轨迹使用同初值、同一时间与同一等比例坐标；各自落地后停止，不模拟碰撞。ρ（kg/m³）、Cᴅ（无量纲）、A（m²）及 m（kg）可调，ρ 或 Cᴅ 为零时回到理想结果。此处采用静止、恒密度空气与恒定阻力系数，不计风、旋转、升力、浮力、地球曲率或自转。二次阻力是简化模型，不是实测轨迹；低速微粒等情况不适用。重力设置与空气密度独立，月球预设为真空。45° 射程最大仅适用于无阻力、起落同高和相同初速度。",
  sources: ["projectile", "drag"],
  draw: (ctx, w, h, p, comparison) => drawProjectile(ctx, w, h, p, comparison),
  readout: (p, m) => {
    {
      const ideal = projectileData(p),
        compare = isResistanceCompare(p),
        d = compare ? resistedProjectile(p) : ideal;
      const rows = compare
        ? comparisonRows([
            ["飞行时间", ideal.flight, d.flight, "s"],
            ["水平射程", ideal.range, d.range, "m"],
            ["最高点高度", ideal.peak, d.peak, "m"],
          ])
        : null;
      return {
        formula: compare
          ? "Fᴅ = −½ρCᴅA |v|v　　a = (0, −g) + Fᴅ/m"
          : "x = v₀ cos θ · t　　y = h₀ + v₀ sin θ · t − ½gt²",
        caption: compare
          ? `同初值、同一时间与比例 · 静止空气的二次阻力近似${d.completed ? "" : " · 尚未落地，结果未完成"}`
          : "忽略空气阻力 · 两个方向独立运动 · 落地停止",
        metrics: rows
          ? rows.map(([name, a, b, diff, unit]) => [
              name,
              `理想 ${a} / 含阻力 ${b}`,
              unit,
            ])
          : [
              ["总飞行时间", num(d.flight), "s"],
              ["水平射程", num(d.range), "m"],
              ["最高点离地高度", num(d.peak), "m"],
            ],
        comparison: rows,
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
      const ox = w * 0.17,
        oy = h * 0.81;
      line(ctx, ox - 7, oy, w * 0.88, oy, "#d8c9ac");
      line(ctx, ox, 35, ox, oy + 5, "#d8c9ac");
      ctx.beginPath();
      ctx.strokeStyle = "#c5a371";
      ctx.lineWidth = 1.7;
      ctx.setLineDash([3, 3]);
      for (let i = 0; i <= 80; i++) {
        const u = i / 80,
          x = ox + w * 0.65 * u,
          y = oy - h * 0.49 * 4 * u * (1 - u);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i <= 8; i++) {
        const u = i / 8;
        circle(
          ctx,
          ox + w * 0.65 * u,
          oy - h * 0.49 * 4 * u * (1 - u),
          2.1,
          "#d4ba94",
        );
      }
      const u = 0.35,
        x = ox + w * 0.65 * u,
        y = oy - h * 0.49 * 4 * u * (1 - u);
      circle(ctx, x, y, 5, "#b59262");
      arrow(ctx, x, y, x + 30, y, "#93a276", 1.3, 4);
      arrow(ctx, x, y, x, y - 21, "#dca967", 1.3, 4);
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
