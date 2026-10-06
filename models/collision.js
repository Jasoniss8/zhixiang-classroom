"use strict";
// collision: model metadata, rendering and lifecycle hooks.

function collisionNumber(value, scale = 0) {
  if (!Number.isFinite(value)) return "—";
  return (
    Math.abs(value) <= 32 * Number.EPSILON * scale ? 0 : value
  ).toPrecision(4);
}

function collisionDuration(p, solution = SCIENCE.collisionSolution(p)) {
  return solution.collides
    ? Math.max(3, solution.collisionTime * 1.5 + 0.5)
    : 6;
}

function collisionReadout(p) {
  const d = SCIENCE.collisionSolution(p),
    current = SCIENCE.collisionState(p, state.time, d),
    before = d.before,
    after = d.after;
  const momentumScale = Math.abs(before.p1) + Math.abs(before.p2),
    n = (v) => collisionNumber(v, momentumScale);
  const status = !d.collides
    ? "不会碰撞"
    : current.collided
      ? p.e === 0
        ? "碰后共同运动"
        : "碰后分离"
      : "碰撞前";
  const row = (i) =>
    `m=${collisionNumber(p["mass" + i])} kg；v：${collisionNumber(p["u" + i])} → ${after ? collisionNumber(after["v" + i]) : "—"} m/s；p：${n(before["p" + i])} → ${after ? n(after["p" + i]) : "—"} kg·m/s；K：${collisionNumber(before["kinetic" + i])} → ${after ? collisionNumber(after["kinetic" + i]) : "—"} J`;
  return {
    formula: "m₁u₁ + m₂u₂ = m₁v₁ + m₂v₂　　v₂ − v₁ = e(u₁ − u₂)",
    caption: d.collides
      ? "u 为初速度，v 为碰后速度。碰后读数为解析预测；动画到达接触时刻才改变速度。"
      : "不会碰撞：球 1 初始在左且 u₁≤u₂，两球间距不减小；没有碰后状态。",
    metrics: [
      ["当前阶段", status, ""],
      [
        "碰撞时刻 t碰",
        d.collides ? collisionNumber(d.collisionTime) : "不会碰撞",
        d.collides ? "s" : "",
      ],
      ["动能损失 ΔK", d.collides ? collisionNumber(d.energyLoss) : "—", "J"],
      ["碰前总动量 P", n(before.momentum), "kg·m/s"],
      ["碰后总动量 P", after ? n(after.momentum) : "—", "kg·m/s"],
      [
        "总动量差 ΔP",
        after ? n(after.momentum - before.momentum) : "—",
        "kg·m/s",
      ],
      ["碰前总动能 K", collisionNumber(before.kinetic), "J"],
      ["碰后总动能 K", after ? collisionNumber(after.kinetic) : "—", "J"],
      ["恢复系数 e", collisionNumber(p.e), ""],
    ],
    details: [
      ["球 1：碰前 → 碰后", row(1)],
      ["球 2：碰前 → 碰后", row(2)],
      [
        "动能损失公式",
        "ΔK=½μ(1−e²)(u₁−u₂)²，μ=m₁m₂/(m₁+m₂)。损失的平动动能转化为内能等。",
      ],
      [
        "初始位置与方向",
        "球 1 在 −3 m，球 2 在 3 m；半径均为 0.25 m，向右为正。上方视窗跟随两球，坐标仍为实验室坐标。",
      ],
      [
        "数值精度",
        "读数保留 4 位有效数字；总量用未舍入数据计算，不能直接相加已经舍入的分量。",
      ],
    ],
  };
}

function drawCollision(ctx, w, h, p) {
  const d = SCIENCE.collisionSolution(p),
    now = SCIENCE.collisionState(p, state.time, d),
    end = collisionDuration(p, d),
    last = SCIENCE.collisionState(p, end, d);
  const mid = (now.x1 + now.x2) / 2,
    half = Math.max(4, (now.x2 - now.x1) / 2 + 0.8),
    scale = (w - 36) / (2 * half),
    x = (v) => w / 2 + (v - mid) * scale;
  for (const i of [1, 2]) {
    const left = i === 1 ? 16 : w / 2 + 8,
      color = i === 1 ? PALETTE.green : PALETTE.purple;
    text(
      ctx,
      `球 ${i}　v=${collisionNumber(now["v" + i])} m/s`,
      left,
      21,
      12,
      color,
    );
    text(
      ctx,
      `x=${collisionNumber(now["x" + i])} m`,
      left,
      43,
      12,
      PALETTE.muted,
    );
  }
  ctx.save();
  ctx.beginPath();
  ctx.rect(12, 65, w - 24, 116);
  ctx.clip();
  line(ctx, 18, 154, w - 18, 154, PALETTE.axis, 1.2);
  const tick = niceStep((2 * half) / (w < 450 ? 4 : 7));
  for (
    let v = Math.ceil((mid - half) / tick) * tick;
    v <= mid + half;
    v += tick
  ) {
    line(ctx, x(v), 151, x(v), 158, PALETTE.axis);
    if (state.labels)
      text(ctx, mathNumber(v, 3), x(v), 170, 12, PALETTE.muted, "center");
  }
  for (const i of [1, 2]) {
    const cx = x(now["x" + i]),
      color = i === 1 ? PALETTE.green : PALETTE.purple,
      r = Math.max(4, SCIENCE.COLLISION_GEOMETRY.radius * scale),
      v = now["v" + i];
    circle(ctx, cx, 113, r, color, "#fff", 1.5);
    text(ctx, i, cx, 113, 12, "#fff", "center");
    if (state.labels && v !== 0) {
      const yy = i === 1 ? 82 : 139;
      arrow(
        ctx,
        cx,
        yy,
        cx + Math.sign(v) * Math.min(52, 10 + Math.abs(v) * 9),
        yy,
        color,
        1.8,
        5,
      );
    }
  }
  ctx.restore();
  const status = !d.collides
    ? "不会碰撞：两球间距不减小"
    : now.collided
      ? p.e === 0
        ? "碰后共同运动 · e=0"
        : "碰后分离"
      : "接近中";
  text(ctx, status, 16, 195, 12, !d.collides ? PALETTE.orange : PALETTE.deep);
  if (w > 430)
    text(ctx, "实验室坐标 x / m", w - 16, 195, 12, PALETTE.muted, "right");
  line(ctx, 16, 215, w - 16, 215, "#e0e6df");
  const top = 220,
    ch = h - top,
    left = 66,
    right = 20,
    bottom = 36,
    ptop = 48,
    pw = w - left - right,
    ph = ch - ptop - bottom,
    isVelocity = p.graph === "velocity";
  const values = isVelocity
    ? [p.u1, p.u2, ...(d.after ? [d.after.v1, d.after.v2] : [])]
    : [
        SCIENCE.COLLISION_GEOMETRY.x1,
        SCIENCE.COLLISION_GEOMETRY.x2,
        last.x1,
        last.x2,
        ...(d.contact ? [d.contact.x1, d.contact.x2] : []),
      ];
  const low = Math.min(0, ...values),
    high = Math.max(0, ...values),
    padding = Math.max(0.5, (high - low) * 0.15),
    ymin = low - padding,
    ymax = high + padding;
  const tx = (t) => left + (t / end) * pw,
    ty = (v) => ch - bottom - ((v - ymin) / (ymax - ymin)) * ph;
  ctx.save();
  ctx.translate(0, top);
  text(
    ctx,
    `${isVelocity ? "速度—时间" : "位置—时间"} · 球 2 为紫色虚线`,
    16,
    13,
    12,
    PALETTE.deep,
  );
  text(ctx, isVelocity ? "v / (m/s)" : "x / m", left, 34, 12, PALETTE.muted);
  const ticks = w < 450 ? 3 : 5;
  for (let i = 0; i <= ticks; i++) {
    const t = (end * i) / ticks,
      xx = tx(t);
    if (state.grid) line(ctx, xx, ptop, xx, ch - bottom, PALETTE.grid);
    text(
      ctx,
      mathNumber(t, 3),
      xx,
      ch - bottom + 15,
      12,
      PALETTE.muted,
      "center",
    );
  }
  for (let i = 0; i <= 4; i++) {
    const v = ymin + ((ymax - ymin) * i) / 4,
      yy = ty(v);
    if (state.grid) line(ctx, left, yy, w - right, yy, PALETTE.grid);
    text(ctx, mathNumber(v, 3), left - 7, yy, 12, PALETTE.muted, "right");
  }
  line(ctx, left, ptop, left, ch - bottom, PALETTE.axis);
  line(ctx, left, ch - bottom, w - right, ch - bottom, PALETTE.axis);
  line(ctx, left, ty(0), w - right, ty(0), PALETTE.axis);
  text(ctx, "t / s", w - right, ch - 7, 12, PALETTE.muted, "right");
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, ptop, pw, ph);
  ctx.clip();
  if (d.collides)
    line(
      ctx,
      tx(d.collisionTime),
      ptop,
      tx(d.collisionTime),
      ch - bottom,
      "#b9bfb6",
      1,
      [3, 4],
    );
  line(
    ctx,
    tx(state.time),
    ptop,
    tx(state.time),
    ch - bottom,
    PALETTE.orange,
    1,
    [2, 3],
  );
  for (const i of [1, 2]) {
    const color = i === 1 ? PALETTE.green : PALETTE.purple,
      dash = i === 1 ? [] : [7, 4],
      initial = isVelocity ? p["u" + i] : SCIENCE.COLLISION_GEOMETRY["x" + i];
    if (d.collides) {
      const before = isVelocity ? p["u" + i] : d.contact["x" + i],
        after = isVelocity ? d.after["v" + i] : d.contact["x" + i];
      line(
        ctx,
        tx(0),
        ty(initial),
        tx(d.collisionTime),
        ty(before),
        color,
        2,
        dash,
      );
      if (isVelocity) {
        line(
          ctx,
          tx(d.collisionTime),
          ty(before),
          tx(d.collisionTime),
          ty(after),
          color,
          1,
          [2, 4],
        );
        circle(ctx, tx(d.collisionTime), ty(before), 4, "#fcfdfa", color, 1.5);
        circle(ctx, tx(d.collisionTime), ty(after), 3, color);
      }
      line(
        ctx,
        tx(d.collisionTime),
        ty(after),
        tx(end),
        ty(isVelocity ? d.after["v" + i] : last["x" + i]),
        color,
        2,
        dash,
      );
    } else
      line(
        ctx,
        tx(0),
        ty(initial),
        tx(end),
        ty(isVelocity ? p["u" + i] : last["x" + i]),
        color,
        2,
        dash,
      );
    circle(
      ctx,
      tx(state.time),
      ty(now[(isVelocity ? "v" : "x") + i]),
      4,
      color,
      "#fff",
      1,
    );
  }
  ctx.restore();
  if (d.collides)
    text(
      ctx,
      "碰撞",
      clamp(tx(d.collisionTime) + 5, left + 3, w - right - 28),
      ptop + 12,
      12,
      PALETTE.muted,
    );
  ctx.restore();
  stageInfo = {
    kind: "collision",
    solution: d,
    current: now,
    track: { mid, half, scale },
    graph: { x: tx, y: ty, top, end, ymin, ymax, key: p.graph },
  };
}

ZhixiangModels.register({
  id: "collision",
  cat: "physics",
  level: "高中",
  title: "碰撞与动量守恒",
  desc: "调整两球质量、初速度与恢复系数，比较碰撞前后的动量和动能。",
  tags: "碰撞 动量守恒 弹性 非弹性 恢复系数 速度 时间 位置",
  science: true,
  time: true,
  defaults: { mass1: 1, mass2: 2, u1: 3, u2: -1, e: 1, graph: "velocity" },
  choices: { graph: ["velocity", "position"] },
  controls: [
    ["mass1", "m₁", "球 1 质量", 0.1, 10, 0.1, "kg"],
    ["mass2", "m₂", "球 2 质量", 0.1, 10, 0.1, "kg"],
    ["u1", "u₁", "球 1 初速度", -10, 10, 0.1, "m/s"],
    ["u2", "u₂", "球 2 初速度", -10, 10, 0.1, "m/s"],
    ["e", "e", "恢复系数", 0, 1, 0.01, ""],
  ],
  presets: [
    ["等质量弹性", { mass1: 1, mass2: 1, u1: 3, u2: -1, e: 1 }],
    ["完全非弹性", { mass1: 1, mass2: 2, u1: 3, u2: -1, e: 0 }],
    ["同向追赶", { mass1: 2, mass2: 1, u1: 4, u2: 1, e: 0.6 }],
    ["不会碰撞", { mass1: 1, mass2: 2, u1: -2, u2: 1, e: 1 }],
  ],
  hint: "球 1 为绿色，球 2 为紫色；向右为正。拖动时间条可查看碰撞前后，时间图可切换。",
  question: "动量守恒是否意味着动能也守恒？两球都向右运动时，一定不会碰撞吗？",
  answer:
    "外界沿运动方向的总冲量为 0，所以两球总动量守恒。仅 e=1 时总动能也守恒；e=0 时两球碰后速度相同，损失的平动动能最多，转化为形变、内能等。球 1 初始在左，只要 u₁>u₂ 就会追上球 2，同向运动也可能碰撞。",
  note: "经典力学中的一维正碰，光滑水平轨道、无空气阻力、无外界水平冲量；忽略自转和碰撞持续时间，不模拟形变过程。两球初始中心 x₁=−3 m、x₂=3 m，半径固定为 0.25 m，质量可独立改变。球 1 始终初始在左，向右为正；只有 u₁>u₂ 才会接触，t碰=5.5/(u₁−u₂)。联立 m₁u₁+m₂u₂=m₁v₁+m₂v₂ 和 v₂−v₁=e(u₁−u₂) 得解析碰后速度；碰前、碰后各做匀速运动。e=0 表示接触后共同运动；e=1 表示弹性碰撞。ΔK=½μ(1−e²)(u₁−u₂)²，μ=m₁m₂/(m₁+m₂)。动能损失转为内能等，不表示总能量消失。速度在 t碰 瞬时跳变，位置连续；v-t 图的虚线仅标示跳变，不代表有限加速度过程。上方视窗随两球平移和缩放，坐标仍属于实验室参考系；画布尺寸不参与物理计算。下方读数保留 4 位有效数字，内部计算和守恒核对不使用已舍入读数；零附近的机器舍入残差显示为 0.000。",
  sources: ["momentum"],
  draw: (ctx, w, h, p, comparison) => drawCollision(ctx, w, h, p, comparison),
  readout: (p, m) => scienceReadout(m, p),
  thumbnail: (canvas, m) => {
    const { ctx, w, h } = setupCanvas(canvas),
      cx = w * 0.5,
      cy = h * 0.6,
      col = CATS[m.cat].color;
    ctx.save();
    {
      const x1 = w * 0.3,
        x2 = w * 0.7,
        y = h * 0.6;
      line(ctx, 18, y + 22, w - 18, y + 22, "#ccd5c9");
      circle(ctx, x1, y, 15, PALETTE.green);
      circle(ctx, x2, y, 15, PALETTE.purple);
      text(ctx, "1", x1, y, 12, "#fff", "center");
      text(ctx, "2", x2, y, 12, "#fff", "center");
      arrow(ctx, x1 + 21, y, x1 + 53, y, PALETTE.green, 1.6, 5);
      arrow(ctx, x2 - 21, y, x2 - 45, y, PALETTE.purple, 1.6, 5);
      text(ctx, "m₁u₁ + m₂u₂ = 常量", w * 0.5, 29, 13, PALETTE.muted, "center");
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
