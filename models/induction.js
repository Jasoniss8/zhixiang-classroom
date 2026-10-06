"use strict";
// induction: model metadata, rendering and lifecycle hooks.

let inductionPlotCache = null;

function inductionTraces(p) {
  const key = JSON.stringify([p.scenario, p.fieldSign, p.field, p.period]);
  if (inductionPlotCache?.key === key) return inductionPlotCache;
  const events = SCIENCE.inductionEvents(p),
    bounds = [0, ...events, p.period],
    segments = [];
  for (let j = 0; j < bounds.length - 1; j++) {
    const a = bounds[j],
      b = bounds[j + 1],
      lo = a + (j ? p.period * 1e-8 : 0),
      hi = b - (j < bounds.length - 2 ? p.period * 1e-8 : 0);
    segments.push(
      Array.from({ length: 101 }, (_, i) =>
        SCIENCE.inductionState(p, lo + ((hi - lo) * i) / 100),
      ),
    );
  }
  const all = segments.flat(),
    fluxMax = Math.max(1e-5, ...all.map((d) => Math.abs(d.flux))),
    emfMax = Math.max(1e-5, ...all.map((d) => Math.abs(d.emf)));
  return (inductionPlotCache = { key, events, segments, fluxMax, emfMax });
}

function drawInductionCurrent(ctx, cx, cy, r, d) {
  circle(ctx, cx, cy, r, "#f4f7ee", PALETTE.green, 2);
  if (d.direction === "ccw" || d.direction === "cw") {
    const sign = d.direction === "ccw" ? -1 : 1,
      start = 0.3,
      end = start + sign * Math.PI * 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 8, start, end, sign < 0);
    ctx.strokeStyle = PALETTE.orange;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    const x = cx + (r - 8) * Math.cos(end),
      y = cy + (r - 8) * Math.sin(end);
    arrow(
      ctx,
      x + sign * 8 * Math.sin(end),
      y - sign * 8 * Math.cos(end),
      x,
      y,
      PALETTE.orange,
      2,
      6,
    );
  }
  text(
    ctx,
    d.field === 0 ? "B=0" : d.field > 0 ? "⊙" : "⊗",
    cx,
    cy - 2,
    23,
    PALETTE.muted,
    "center",
  );
  text(
    ctx,
    { ccw: "I 逆时针", cw: "I 顺时针", none: "I = 0", undefined: "I 不定义" }[
      d.direction
    ],
    cx,
    cy + r + 19,
    12,
    PALETTE.deep,
    "center",
  );
}

function drawInduction(ctx, w, h, p) {
  const d = SCIENCE.inductionState(p, state.time),
    g = SCIENCE.INDUCTION_GEOMETRY,
    traces = inductionTraces(p),
    narrow = w < 500;
  const sceneHeight = narrow ? 320 : 205,
    sceneWidth = narrow ? w : w * 0.65,
    cy = 85;
  if (p.scenario === "magnet") {
    const coilX = sceneWidth - 35,
      scale = (sceneWidth - 105) / g.gapMax,
      barWidth = 50,
      right = coilX - d.position * scale;
    text(ctx, "磁铁与线圈 · 侧视示意", 16, 23, 12, PALETTE.deep);
    line(ctx, 15, cy, coilX + 18, cy, "#d7dfcf", 1, [3, 4]);
    roundRect(
      ctx,
      right - barWidth,
      cy - 17,
      barWidth / 2,
      34,
      3,
      p.fieldSign === "negative" ? "#7f9f91" : "#bb9268",
    );
    roundRect(
      ctx,
      right - barWidth / 2,
      cy - 17,
      barWidth / 2,
      34,
      3,
      p.fieldSign === "negative" ? "#bb9268" : "#7f9f91",
    );
    text(
      ctx,
      p.fieldSign === "negative" ? "S" : "N",
      right - barWidth * 0.75,
      cy,
      14,
      "#fff",
      "center",
    );
    text(
      ctx,
      p.fieldSign === "negative" ? "N" : "S",
      right - barWidth * 0.25,
      cy,
      14,
      "#fff",
      "center",
    );
    ctx.beginPath();
    ctx.ellipse(coilX, cy, 10, 40, 0, 0, Math.PI * 2);
    ctx.strokeStyle = PALETTE.green;
    ctx.lineWidth = 3;
    ctx.stroke();
    if (state.labels) {
      doubleArrow(ctx, right, cy + 54, coilX, cy + 54, PALETTE.muted);
      text(
        ctx,
        `z=${mathNumber(d.position, 3)} m`,
        (right + coilX) / 2,
        cy + 75,
        12,
        PALETTE.muted,
        "center",
      );
      arrow(ctx, coilX, cy - 54, coilX - 37, cy - 54, PALETTE.purple);
      text(ctx, "+n", coilX - 43, cy - 54, 12, PALETTE.purple, "right");
      if (d.speed !== 0)
        arrow(
          ctx,
          right - barWidth / 2,
          cy - 29,
          right - barWidth / 2 - Math.sign(d.speed) * 25,
          cy - 29,
          PALETTE.orange,
        );
    }
  } else {
    text(ctx, "线圈进出磁场 · 正视图", 16, 23, 12, PALETTE.deep);
    const x = (v) => 14 + ((v + 0.34) / 1.48) * (sceneWidth - 28),
      scale = (sceneWidth - 28) / 1.48,
      fieldLeft = x(0),
      fieldRight = x(g.fieldWidth),
      height = g.height * scale;
    roundRect(ctx, fieldLeft, 46, fieldRight - fieldLeft, 100, 3, "#ebf0e5");
    if (p.field)
      for (let xx = fieldLeft + 16; xx < fieldRight - 6; xx += 25)
        for (const yy of [64, 93, 122])
          text(
            ctx,
            p.fieldSign === "positive" ? "⊙" : "⊗",
            xx,
            yy,
            13,
            "#9aaa92",
            "center",
          );
    const bx = x(d.position - g.width / 2),
      bw = g.width * scale;
    roundRect(
      ctx,
      bx,
      cy - height / 2,
      bw,
      height,
      2,
      "#fff9",
      PALETTE.green,
      2.5,
    );
    if (d.current) {
      const y = cy - height / 2;
      arrow(
        ctx,
        d.current > 0 ? bx + bw - 2 : bx + 2,
        y,
        d.current > 0 ? bx + 2 : bx + bw - 2,
        y,
        PALETTE.orange,
        2,
        5,
      );
    }
    if (state.labels) {
      text(ctx, "0", fieldLeft, 163, 12, PALETTE.muted, "center");
      text(ctx, "0.80 m", fieldRight, 163, 12, PALETTE.muted, "center");
      if (d.speed !== 0)
        arrow(
          ctx,
          x(d.position),
          cy + height / 2 + 14,
          x(d.position) + Math.sign(d.speed) * 24,
          cy + height / 2 + 14,
          PALETTE.orange,
        );
    }
  }
  const frontX = narrow ? w / 2 : w * 0.82,
    frontY = narrow ? 237 : 99;
  text(
    ctx,
    p.scenario === "magnet" ? "从磁铁侧看线圈" : "+n 朝屏幕外",
    frontX,
    frontY - 56,
    12,
    PALETTE.muted,
    "center",
  );
  drawInductionCurrent(ctx, frontX, frontY, 34, d);
  if (state.labels)
    text(
      ctx,
      "中心符号：外磁场方向",
      frontX,
      frontY + 69,
      12,
      PALETTE.muted,
      "center",
    );
  const chartHeight = (h - sceneHeight - 14) / 2,
    left = w < 400 ? 61 : 68,
    right = 19,
    tx = (t) => left + ((w - left - right) * t) / p.period,
    charts = [];
  for (const [i, key, color, label, max] of [
    [0, "flux", PALETTE.green, "Φ / Wb", traces.fluxMax],
    [1, "emf", PALETTE.orange, "ε / V", traces.emfMax],
  ]) {
    const top = sceneHeight + i * chartHeight + 28,
      bottom = sceneHeight + (i + 1) * chartHeight - 27,
      ty = (v) =>
        (top + bottom) / 2 - ((v / (max * 1.13)) * (bottom - top)) / 2;
    text(ctx, label, 15, top - 15, 13, color);
    for (let j = 0; j <= 4; j++) {
      const t = (p.period * j) / 4,
        x = tx(t);
      if (state.grid) line(ctx, x, top, x, bottom, PALETTE.grid);
      if (state.labels)
        text(
          ctx,
          mathNumber(t, 3),
          x,
          bottom + 16,
          12,
          PALETTE.muted,
          "center",
        );
    }
    for (const v of [-max, 0, max]) {
      if (state.grid && v)
        line(ctx, left, ty(v), w - right, ty(v), PALETTE.grid);
      if (state.labels)
        text(
          ctx,
          v !== 0 && Math.abs(v) < 0.001
            ? v.toExponential(1)
            : mathNumber(v, 3),
          left - 7,
          ty(v),
          12,
          PALETTE.muted,
          "right",
        );
    }
    line(ctx, left, ty(0), w - right, ty(0), PALETTE.axis);
    if (state.labels)
      text(ctx, "t / s", w - right, bottom + 29, 12, PALETTE.muted, "right");
    for (let k = 0; k < traces.segments.length; k++) {
      const segment = traces.segments[k];
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      segment.forEach((v, j) =>
        j
          ? ctx.lineTo(tx(v.time), ty(v[key]))
          : ctx.moveTo(tx(v.time), ty(v[key])),
      );
      ctx.stroke();
      if (key === "emf" && traces.events.length) {
        if (k > 0)
          circle(
            ctx,
            tx(segment[0].time),
            ty(segment[0][key]),
            2.8,
            "#fcfdfa",
            color,
            1,
          );
        if (k < traces.segments.length - 1) {
          const last = segment.at(-1);
          circle(ctx, tx(last.time), ty(last[key]), 2.8, "#fcfdfa", color, 1);
        }
      }
    }
    line(
      ctx,
      tx(state.time),
      top,
      tx(state.time),
      bottom,
      PALETTE.purple,
      1.2,
      [3, 4],
    );
    if (d[key] !== null)
      circle(ctx, tx(state.time), ty(d[key]), 4, color, "#fff", 1.5);
    charts.push({ key, x: tx, y: ty, top, bottom });
  }
  stageInfo = {
    kind: "induction",
    current: d,
    charts,
    sceneHeight,
    left,
    right: w - right,
    time: state.time,
  };
}

ZhixiangModels.register({
  id: "induction",
  cat: "physics",
  level: "高中",
  title: "电磁感应",
  desc: "观察磁铁或线圈运动时的磁通量、电动势与电流方向。",
  tags: "电磁感应 法拉第 楞次定律 磁通量 电动势 线圈 磁铁",
  science: true,
  time: true,
  defaults: {
    scenario: "magnet",
    fieldSign: "negative",
    field: 0.3,
    period: 8,
    resistance: 2,
  },
  choices: {
    scenario: ["magnet", "uniform"],
    fieldSign: ["positive", "negative"],
  },
  controls: [
    ["field", "B₀", "磁场强度尺度", 0, 1, 0.01, "T"],
    ["period", "T", "往返周期", 2, 20, 0.1, "s"],
    ["resistance", "R", "回路电阻", 0.1, 20, 0.1, "Ω"],
  ],
  presets: [
    [
      "N 极往返",
      {
        scenario: "magnet",
        fieldSign: "negative",
        field: 0.3,
        period: 8,
        resistance: 2,
      },
    ],
    [
      "S 极往返",
      {
        scenario: "magnet",
        fieldSign: "positive",
        field: 0.3,
        period: 8,
        resistance: 2,
      },
    ],
    [
      "线圈进出",
      {
        scenario: "uniform",
        fieldSign: "positive",
        field: 0.3,
        period: 8,
        resistance: 2,
      },
    ],
    ["加快运动", { period: 4 }],
  ],
  hint: "播放或拖动时间条；两幅时间图共用时刻。电流箭头按正视图判断，暂停仅冻结时刻。",
  question:
    "磁通量很大时，感应电动势一定很大吗？为什么磁铁靠近和远离时电流反向？",
  answer:
    "电动势取决于磁通量的变化率，而不是磁通量本身。线圈完全处于匀强磁场内平移时，磁通量不变，电动势为 0；磁铁在最近点瞬时速度为 0，此时磁通量最大而电动势为 0。靠近与远离使变化率反号，电流随之反向。楞次定律判断的是阻碍磁通量的变化，并不总是与原磁场反向。",
  note: "单匝闭合回路，面积 A=0.20×0.15=0.030 m²，电阻 R 恒定，I=ε/R；忽略自感、互感、导线厚度、边缘场和电流对运动的反作用，外力维持给定运动。Φ 用 Wb、ε 用 V、I 用 A、时间用 s。磁铁模式使用教学有效磁通函数 Φ=sB₀A[1+(z/ℓ)²]^(−3/2)，ℓ=0.20 m，z=0.29+0.21 cos(2πt/T) m；这不是有限条形磁铁的实测或精确磁场。正法向指向磁铁，从磁铁侧正视线圈；N 极朝向线圈时 s=−1，S 极时 s=+1。线圈模式中矩形线圈中心 x=0.40−0.60 cos(2πt/T) m，磁场区域 0≤x≤0.80 m，Φ=sB₀A重叠；正法向朝屏幕外。ε 由磁通函数的解析时间导数求得，正电流在对应正视图中逆时针。理想锐边处变化率左右极限不同，ε、I 在该瞬间不定义；时间图断开显示，实际装置的边缘场会平滑过渡。楞次定律只提供方向解释，不参与数值大小计算。暂停、调参和拖动进度是在选取给定运动中的时刻，不模拟额外的启停电磁过程。",
  sources: ["faraday", "lenz"],
  draw: (ctx, w, h, p, comparison) => drawInduction(ctx, w, h, p, comparison),
  readout: (p, m) => scienceReadout(m, p),
  thumbnail: (canvas, m) => {
    const { ctx, w, h } = setupCanvas(canvas),
      cx = w * 0.5,
      cy = h * 0.6,
      col = CATS[m.cat].color;
    ctx.save();
    {
      roundRect(ctx, w * 0.17, h * 0.4, 35, 28, 3, "#90ac92");
      roundRect(ctx, w * 0.17 + 35, h * 0.4, 35, 28, 3, "#c2a279");
      text(ctx, "S", w * 0.17 + 17, h * 0.4 + 14, 12, "#fff", "center");
      text(ctx, "N", w * 0.17 + 52, h * 0.4 + 14, 12, "#fff", "center");
      ctx.beginPath();
      ctx.ellipse(w * 0.73, h * 0.5, 12, 33, 0, 0, Math.PI * 2);
      ctx.strokeStyle = PALETTE.green;
      ctx.lineWidth = 2;
      ctx.stroke();
      arrow(ctx, w * 0.48, h * 0.28, w * 0.62, h * 0.28, PALETTE.orange);
      text(
        ctx,
        "ε = −dΦ/dt",
        w * 0.5,
        h * 0.85,
        14,
        PALETTE.muted,
        "center",
        "math",
      );
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
