"use strict";
// spring: model metadata, rendering and lifecycle hooks.

function springData(p, t) {
  const omega = Math.sqrt(p.stiff / p.mass),
    x = p.amp * Math.cos(omega * t),
    v = -p.amp * omega * Math.sin(omega * t);
  return {
    x,
    v,
    force: -p.stiff * x,
    period: (2 * Math.PI) / omega,
    kinetic: 0.5 * p.mass * v * v,
    potential: 0.5 * p.stiff * x * x,
    total: 0.5 * p.stiff * p.amp * p.amp,
  };
}

function normalizeSpringParams(m, p) {
  if (m.id !== "spring") return p;
  if (p.springMode === "under") p.zeta = clamp(p.zeta, 0.01, 0.99);
  if (p.springMode === "critical") p.zeta = 1;
  if (p.springMode === "over") p.zeta = clamp(p.zeta, 1.01, 3);
  return p;
}

function springSpecs(p) {
  return modelById("spring")
    .controls.filter((c) =>
      c[0] === "zeta"
        ? !["ideal", "critical"].includes(p.springMode)
        : ["driveFreq", "driveForce"].includes(c[0])
          ? p.springMode === "forced"
          : true,
    )
    .map((c) => {
      const q = [...c];
      if (q[0] === "zeta") {
        q[3] =
          p.springMode === "under" ? 0.01 : p.springMode === "over" ? 1.01 : 0;
        q[4] = p.springMode === "under" ? 0.99 : 3;
      }
      return q;
    });
}

function renderSpringControls() {
  const m = state.model,
    p = state.p;
  $("#stage").dataset.springMode = p.springMode;
  $("#controlBody").innerHTML =
    `<label class="control-select-label" for="springMode">振动条件</label><select id="springMode" class="control-select" data-spring-select="springMode">${[
      ["ideal", "理想简谐运动"],
      ["under", "欠阻尼自由振动"],
      ["critical", "临界阻尼"],
      ["over", "过阻尼"],
      ["forced", "受迫振动"],
    ]
      .map(
        ([id, name]) =>
          `<option value="${id}" ${p.springMode === id ? "selected" : ""}>${name}</option>`,
      )
      .join(
        "",
      )}</select><h3>预设</h3><div class="preset-list">${m.presets.map((s, i) => `<button class="preset" data-preset="${i}">${s[0]}</button>`).join("")}</div><div class="params-grid">${springSpecs(
      p,
    )
      .map((c) => paramHTML(c, p))
      .join(
        "",
      )}</div>${p.springMode === "forced" ? '<button class="button secondary small" data-action="spring-resonance">设为固有频率 f₀</button>' : ""}<p class="control-note">初速度 v₀=0。b=2ζ√(km)，阻尼力为 −bv。受迫模式的“幅度”为驱动力 F₀，单位 N；响应位移由方程求解。</p><label class="checkline"><input type="checkbox" data-flag="labels" ${state.labels ? "checked" : ""}>显示速度与回复力</label><button class="source-link" data-action="model-info">模型条件与参考资料</button>`;
  updateRanges();
}

function springCurrentData(p) {
  return p.springMode === "ideal"
    ? springData(p, state.time)
    : SCIENCE.oscillatorReadings(p, state.oscillator);
}

function springReadout(p) {
  const d = springCurrentData(p),
    q = SCIENCE.oscillatorParameters(p),
    forced = q.forced,
    r = forced ? SCIENCE.oscillatorResponse(p) : null;
  return {
    formula:
      p.springMode === "ideal"
        ? "x = x₀ cos(√(k/m)t)　F = −kx"
        : `mx″ + bx′ + kx = ${forced ? "F₀ cos(2πf驱t)" : "0"}\nb = 2ζ√(km) = ${num(q.b, 4)} N·s/m；f₀ = √(k/m)/(2π) = ${num(q.frequency0, 4)} Hz`,
    caption:
      p.springMode === "ideal"
        ? "理想水平弹簧，无阻尼；初速度为 0。"
        : `${q.regime}；RK4 步长≤1/240 s；线性弹簧与黏性阻尼，忽略弹簧质量。`,
    metrics: [
      ["当前位移", num(d.x, 4), "m"],
      ["当前速度", num(d.v, 4), "m/s"],
      ["回复力", num(d.force, 4), "N"],
      ["动能 K", num(d.kinetic, 4), "J"],
      ["势能 U", num(d.potential, 4), "J"],
      ["机械能 K+U", num(d.kinetic + d.potential, 4), "J"],
      [
        p.springMode === "ideal" ? "振动周期" : "固有周期 T₀",
        num(d.period, 4),
        "s",
      ],
      ["固有频率 f₀", num(q.frequency0, 4), "Hz"],
      forced
        ? [
            "稳态振幅",
            r.resonant ? "无有限稳态" : num(r.amplitude, 5),
            r.resonant ? "" : "m",
          ]
        : ["阻尼比 ζ", num(q.zeta, 3), ""],
    ],
    details: forced
      ? [
          [
            "稳态响应",
            "A(f)=F₀/√[(k−m(2πf)²)²+(b2πf)²]；仅表示长期稳态，不能替代当前瞬态位移。",
          ],
          [
            "共振峰",
            q.zeta === 0
              ? "零阻尼在 f=f₀ 无有限稳态；驱动力为 0 时响应为 0。"
              : q.zeta < Math.SQRT1_2
                ? `位移峰值频率 fᵣ=f₀√(1−2ζ²)=${num(q.frequency0 * Math.sqrt(1 - 2 * q.zeta * q.zeta), 5)} Hz。`
                : "ζ≥1/√2，位移幅度随驱动频率增大而减小，没有非零频率峰值。",
          ],
        ]
      : [
          [
            "自由衰减边界",
            q.zeta === 0
              ? "±x₀ 恒定。"
              : q.zeta < 1
                ? "虚线为 ±|x₀|e^(−ζω₀t)/√(1−ζ²)，对应 v₀=0 的振荡包络。"
                : q.zeta === 1
                  ? "虚线为 ±|x₀|(1+ω₀t)e^(−ω₀t)，临界阻尼单调回到平衡。"
                  : "虚线为单调衰减解的正负边界；过阻尼不往复振荡。",
          ],
        ],
  };
}

function advanceSpring(dt) {
  const p = state.p;
  let remaining = dt;
  while (remaining > 1e-12) {
    const h = Math.min(remaining, 1 / 240);
    if (p.springMode === "ideal") {
      state.time += h;
    } else {
      state.oscillator = SCIENCE.oscillatorAdvance(p, state.oscillator, h);
      state.time = state.oscillator.time;
    }
    state.springHistory.push({ t: state.time, x: springCurrentData(p).x });
    remaining -= h;
  }
  trimHistory(state.springHistory);
}

function drawResonance(ctx, w, h, p) {
  const d = SCIENCE.oscillatorParameters(p),
    fmax = Math.max(1, d.frequency0 * 2, p.driveFreq * 1.2),
    peak =
      d.zeta < Math.SQRT1_2
        ? d.frequency0 * Math.sqrt(1 - 2 * d.zeta * d.zeta)
        : 0,
    peakA = SCIENCE.oscillatorResponse(p, peak).amplitude;
  const maxA =
      Math.max(
        0.02,
        Math.min(
          peakA ?? (25 * p.driveForce) / p.stiff,
          Math.max(0.1, (25 * p.driveForce) / p.stiff),
        ),
      ) * 1.15,
    left = 62,
    right = w - 23,
    top = 61,
    bottom = h - 36,
    x = (f) => left + (f / fmax) * (right - left),
    y = (a) => bottom - (a / maxA) * (bottom - top);
  text(ctx, "稳态幅度—驱动频率", 16, 18, 13, PALETTE.ink);
  text(ctx, "紫线 f₀ · 橙线 当前驱动", 16, 39, 12, PALETTE.muted);
  for (let i = 0; i <= 4; i++) {
    const a = (maxA * i) / 4;
    line(ctx, left, y(a), right, y(a), "#e4e9e2");
    text(ctx, num(a, 3), left - 7, y(a), 12, PALETTE.muted, "right");
    text(
      ctx,
      num((fmax * i) / 4, 2),
      x((fmax * i) / 4),
      bottom + 16,
      12,
      PALETTE.muted,
      "center",
    );
  }
  text(ctx, "A / m", 8, top - 6, 12, PALETTE.muted);
  text(ctx, "f / Hz", right, bottom + 30, 12, PALETTE.muted, "right");
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, right - left, bottom - top);
  ctx.clip();
  ctx.beginPath();
  let started = false,
    lastF = 0;
  for (let i = 0; i <= 500; i++) {
    const f = (i * fmax) / 500,
      q = SCIENCE.oscillatorResponse(p, f),
      v = q.amplitude;
    if (v === null || v > maxA * 1.5) {
      started = false;
      continue;
    }
    if (d.zeta === 0 && lastF < d.frequency0 && f > d.frequency0)
      started = false;
    if (started) ctx.lineTo(x(f), y(v));
    else ctx.moveTo(x(f), y(v));
    started = true;
    lastF = f;
  }
  ctx.strokeStyle = PALETTE.green;
  ctx.lineWidth = 2;
  ctx.stroke();
  line(
    ctx,
    x(d.frequency0),
    top,
    x(d.frequency0),
    bottom,
    PALETTE.purple,
    1.5,
    [4, 3],
  );
  line(
    ctx,
    x(p.driveFreq),
    top,
    x(p.driveFreq),
    bottom,
    PALETTE.orange,
    1.5,
    [3, 3],
  );
  const current = SCIENCE.oscillatorResponse(p);
  if (current.amplitude !== null)
    circle(ctx, x(p.driveFreq), y(current.amplitude), 4, PALETTE.orange);
  ctx.restore();
  if (d.zeta === 0 && p.driveForce > 0)
    text(
      ctx,
      "f=f₀ 无有限稳态（峰值超出图窗）",
      w / 2,
      top + 17,
      12,
      PALETTE.purple,
      "center",
    );
}

function drawSpring(ctx, w, h, p) {
  const d = springCurrentData(p),
    forced = p.springMode === "forced",
    sceneH = 200,
    graphH = forced ? (h - sceneH) / 2 : h - sceneH,
    span = Math.max(1.2, Math.abs(d.x) * 1.25),
    eq = w * 0.55,
    scale = (w * 0.28) / span,
    bx = eq + d.x * scale,
    cy = 105,
    wall = 25;
  line(ctx, wall, cy + 22, w - 18, cy + 22, "#b5c4b7");
  line(ctx, wall, cy - 35, wall, cy + 24, "#889f8b", 6);
  line(ctx, eq, cy - 45, eq, cy + 35, "#a4b8a4", 1, [4, 4]);
  ctx.beginPath();
  ctx.moveTo(wall, cy);
  for (let i = 0; i <= 24; i++)
    ctx.lineTo(
      wall + 8 + ((bx - wall - 32) * i) / 24,
      cy + (i === 0 || i === 24 ? 0 : i % 2 ? 9 : -9),
    );
  ctx.lineTo(bx - 15, cy);
  ctx.strokeStyle = "#7a9680";
  ctx.lineWidth = 2;
  ctx.stroke();
  roundRect(ctx, bx - 15, cy - 16, 30, 32, 4, "#8faa8e");
  if (state.labels) {
    const vs = Math.min(45 / Math.max(1, Math.abs(d.v)), 20),
      fs = Math.min(45 / Math.max(1, Math.abs(d.force)), 4);
    arrow(ctx, bx, cy - 35, bx + d.v * vs, cy - 35, PALETTE.green);
    text(ctx, `v=${num(d.v, 3)} m/s`, w - 16, 24, 12, PALETTE.green, "right");
    arrow(ctx, bx, cy - 62, bx + d.force * fs, cy - 62, PALETTE.orange);
    text(ctx, `F回=${num(d.force, 3)} N`, 16, 24, 12, PALETTE.orange);
  }
  for (const v of [-span, 0, span]) {
    const xx = eq + v * scale;
    line(ctx, xx, cy + 30, xx, cy + 36, PALETTE.muted);
    text(ctx, num(v, 3), xx, cy + 51, 12, PALETTE.muted, "center");
  }
  text(
    ctx,
    "x / m（显示比例随位移调整）",
    w / 2,
    sceneH - 13,
    12,
    PALETTE.muted,
    "center",
  );
  const history = state.springHistory || [],
    series = [{ name: "位移 x", color: PALETTE.green, value: (q) => q.x }];
  if (!forced) {
    series.push(
      {
        name: "衰减边界",
        color: PALETTE.orange,
        dash: [5, 4],
        value: (q) => SCIENCE.oscillatorEnvelope(p, q.t),
      },
      {
        name: "下边界",
        color: "#a1b8a0",
        dash: [5, 4],
        value: (q) => -SCIENCE.oscillatorEnvelope(p, q.t),
      },
    );
  }
  const ymax =
    Math.max(
      0.02,
      ...history.flatMap((q) => [
        Math.abs(q.x),
        forced ? 0 : SCIENCE.oscillatorEnvelope(p, q.t),
      ]),
    ) * 1.12;
  ctx.save();
  ctx.translate(0, sceneH);
  drawTimeGraph(ctx, w, graphH, history, series, {
    title: "位移—时间 · 与振子同步",
    unit: "x / m",
    ymin: -ymax,
    ymax,
  });
  ctx.restore();
  if (forced) {
    ctx.save();
    ctx.translate(0, sceneH + graphH);
    drawResonance(ctx, w, graphH, p);
    ctx.restore();
  }
  stageInfo = {
    kind: "spring",
    time: state.time,
    graphTime: history.at(-1)?.t,
  };
}

ZhixiangModels.register({
  exportData: () => springChartData(),
  id: "spring",
  cat: "physics",
  level: "高中",
  title: "弹簧振子与简谐运动",
  desc: "观察位移、回复力和机械能的变化。",
  tags: "物理 弹簧 简谐 振动 回复力 胡克定律 动能 势能",
  time: true,
  choices: { springMode: ["ideal", "under", "critical", "over", "forced"] },
  defaults: {
    mass: 1,
    stiff: 20,
    amp: 0.6,
    springMode: "ideal",
    zeta: 0.2,
    driveFreq: 0.7,
    driveForce: 1,
  },
  controls: [
    ["zeta", "ζ", "阻尼比", 0, 3, 0.01, ""],
    ["driveFreq", "f驱", "驱动频率", 0, 5, 0.001, "Hz"],
    ["driveForce", "F₀", "驱动力幅度", 0, 10, 0.1, "N"],
    ["mass", "m", "振子质量", 0.2, 3, 0.1, "kg"],
    ["stiff", "k", "弹簧劲度系数", 5, 80, 1, "N/m"],
    ["amp", "x₀", "初始位移（静止释放）", 0, 1, 0.05, "m"],
  ],
  presets: [
    ["标准振子", { mass: 1, stiff: 20, amp: 0.6 }],
    ["更重的振子", { mass: 2, stiff: 20, amp: 0.6 }],
    ["更硬的弹簧", { mass: 1, stiff: 60, amp: 0.6 }],
  ],
  hint: "位移曲线与主画布使用同一时间；橙色虚线为自由衰减边界。共振曲线表示长期稳态。",
  question: "位移最大时，弹簧的回复力最大，物体的速度也最大吗？",
  answer:
    "不是。位移最大处速度为零，弹性势能最大；平衡位置回复力为零，而速度最大。回复力改变速度，不能把力的大小直接当作速度的大小。",
  note: "理想水平弹簧：x = A cos(√(k/m)t)，v = −A√(k/m)sin(√(k/m)t)，F = −kx，T = 2π√(m/k)。K = ½mv²，U = ½kx²。无摩擦、无阻尼、弹簧质量忽略、形变在胡克定律适用范围内。改变参数会重新从 x₀ 静止释放。阻尼与受迫模式使用 mx″+bx′+kx=F₀cos(2πf驱t)，b=2ζ√(km)，RK4 步长≤1/240 s。ζ<1 欠阻尼，ζ=1 临界，ζ>1 过阻尼；不含干摩擦。欠阻尼包络为 |x₀|exp(−ζω₀t)/√(1−ζ²)，适用于 v₀=0；临界和过阻尼为单调衰减边界。共振曲线表示长期稳态幅度，不是当前瞬态振幅；零阻尼在 f驱=f₀ 时无有限稳态。",
  sources: ["spring", "damping", "forced"],
  draw: (ctx, w, h, p, comparison) => drawSpring(ctx, w, h, p, comparison),
  readout: (p, m) => {
    return springReadout(p);
  },
  thumbnail: (canvas, m) => {
    const { ctx, w, h } = setupCanvas(canvas),
      cx = w * 0.5,
      cy = h * 0.6,
      col = CATS[m.cat].color;
    ctx.save();
    {
      const x1 = w * 0.15,
        x2 = w * 0.66,
        y = h * 0.62;
      line(ctx, x1, y - 23, x1, y + 27, "#d0bd9f", 4);
      line(ctx, x1, y + 28, w * 0.89, y + 28, "#d8c9b1");
      ctx.beginPath();
      ctx.moveTo(x1, y);
      for (let i = 0; i <= 18; i++)
        ctx.lineTo(x1 + 8 + ((x2 - x1 - 27) * i) / 18, y + (i % 2 ? 9 : -9));
      ctx.lineTo(x2 - 16, y);
      ctx.strokeStyle = "#bca886";
      ctx.lineWidth = 1.7;
      ctx.stroke();
      roundRect(ctx, x2 - 15, y - 17, 34, 34, 5, "#c5ab81");
      arrow(ctx, x2 - 8, y - 31, x2 - 40, y - 31, "#d1a573", 1.3, 4);
      text(ctx, "F = −kx", w * 0.65, 39, 13, "#b29a74", "center", "math");
    }
    ctx.restore();
  },
  renderControls: renderSpringControls,
  normalize: (p, m) => {
    return normalizeGeometryParams(
      m,
      normalizeSpringParams(
        m,
        normalizeScienceParams(m, normalizeMathParams(m, p)),
      ),
    );
  },
  parsePrecision: () => 14,
  setParam: setLegacyParam,
  reset: resetLegacySolver,
  advance: advanceLegacyModel,
  bind: () => {},
});
