"use strict";
// trig: model metadata, rendering and lifecycle hooks.

function trigLayout(w, h) {
  const small = w < 440,
    r = Math.min(w * (small ? 0.2 : 0.17), h * 0.29),
    cx = small ? w * 0.25 : w * 0.26,
    cy = h * 0.48,
    plotLeft = small ? w * 0.53 : w * 0.51,
    plotRight = w - 25;
  return { r, cx, cy, plotLeft, plotRight };
}

function drawTrig(ctx, w, h, p) {
  const { r, cx, cy, plotLeft, plotRight } = trigLayout(w, h),
    a = rad(p.angle),
    x = cx + Math.cos(a) * r,
    y = cy - Math.sin(a) * r;
  stageInfo = { kind: "trig", cx, cy, r };
  circle(ctx, cx, cy, r, "#f7f9f2", "#b9ccaa", 1.5);
  line(ctx, cx - r - 17, cy, cx + r + 19, cy, "#bdcdb0");
  line(ctx, cx, cy - r - 18, cx, cy + r + 20, "#bdcdb0");
  ctx.beginPath();
  ctx.arc(cx, cy, Math.min(30, r * 0.35), 0, -a, true);
  ctx.strokeStyle = "#d0b283";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  line(ctx, cx, cy, x, y, PALETTE.green, 1.8);
  line(ctx, cx, cy, x, cy, PALETTE.green, 3);
  line(ctx, x, cy, x, y, PALETTE.orange, 3);
  circle(ctx, x, y, 5.5, PALETTE.green, "#fff", 1.5);
  circle(ctx, cx, cy, 2, PALETTE.axis);
  line(
    ctx,
    x,
    y,
    plotLeft + ((plotRight - plotLeft) * p.angle) / 360,
    y,
    "#d8c9ad",
    1,
    [3, 4],
  );
  line(ctx, plotLeft, cy - r - 10, plotLeft, cy + r + 11, "#bfceb0");
  line(ctx, plotLeft, cy, plotRight + 8, cy, "#bfceb0");
  line(ctx, plotLeft, cy - r, plotRight, cy - r, "#e6eddc", 1, [3, 4]);
  line(ctx, plotLeft, cy + r, plotRight, cy + r, "#e6eddc", 1, [3, 4]);
  ctx.beginPath();
  ctx.strokeStyle = PALETTE.orange;
  ctx.lineWidth = 2;
  for (let i = 0; i <= 200; i++) {
    const xx = plotLeft + ((plotRight - plotLeft) * i) / 200,
      yy = cy - Math.sin((2 * Math.PI * i) / 200) * r;
    i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
  }
  ctx.stroke();
  circle(
    ctx,
    plotLeft + ((plotRight - plotLeft) * p.angle) / 360,
    y,
    5,
    PALETTE.orange,
    "#fff",
    1.5,
  );
  if (state.labels) {
    text(
      ctx,
      "单位圆",
      cx,
      Math.min(cy + r + 30, h - 70),
      11,
      "#95a687",
      "center",
    );
    text(
      ctx,
      "y = sin θ",
      (plotLeft + plotRight) / 2,
      cy - r - 31,
      15,
      PALETTE.orange,
      "center",
      "math",
    );
    text(ctx, "1", cx + r + 3, cy + 16, 9, "#a4b197");
    text(ctx, "1", cx - 10, cy - r, 9, "#a4b197", "right");
    for (const v of [0, 180, 360])
      text(
        ctx,
        `${v}°`,
        plotLeft + ((plotRight - plotLeft) * v) / 360,
        cy + r + 26,
        9,
        "#a1ae95",
        "center",
      );
    text(
      ctx,
      "cos θ",
      cx,
      Math.min(cy + r + 49, h - 49),
      11,
      PALETTE.green,
      "center",
      "math",
    );
    text(
      ctx,
      "sin θ",
      cx + 57,
      Math.min(cy + r + 49, h - 49),
      11,
      PALETTE.orange,
      "center",
      "math",
    );
  }
}

ZhixiangModels.register({
  id: "trig",
  cat: "math",
  level: "高中",
  title: "单位圆与三角函数",
  desc: "对应圆上点的坐标与正弦、余弦值。",
  tags: "数学 三角 正弦 余弦 单位圆 角度 弧度",
  time: true,
  defaults: { angle: 45, omega: 45 },
  controls: [
    ["angle", "θ", "当前角度", 0, 360, 1, "°"],
    ["omega", "ω", "转动角速度", 10, 120, 5, "°/s"],
  ],
  presets: [
    ["30° 特殊角", { angle: 30 }],
    ["45° 特殊角", { angle: 45 }],
    ["120° 第二象限", { angle: 120 }],
  ],
  hint: "拖动圆上的点；橙线表示 sinθ，绿线表示 cosθ。",
  question: "点从第一象限转到第二象限，sinθ、cosθ 的正负分别怎样变化？",
  answer:
    "单位圆上点的坐标是 (cosθ, sinθ)。第二象限纵坐标为正，所以 sinθ > 0；横坐标为负，所以 cosθ < 0。一个完整旋转对应 360° = 2π rad。",
  note: "单位圆半径为 1；坐标 (cosθ, sinθ)。角度控件以度为单位，内部三角函数计算转换为弧度。图中右侧横轴为角度，纵轴为 sinθ；度数与圆坐标不共用单位。",
  sources: ["trig"],
  draw: (ctx, w, h, p, comparison) => drawTrig(ctx, w, h, p, comparison),
  readout: (p, m) => {
    return {
      formula: "P = (cos θ, sin θ)",
      caption: `θ = ${num(p.angle, 1)}° = ${num(rad(p.angle), 3)} rad · 单位圆半径为 1`,
      metrics: [
        ["sin θ", num(Math.sin(rad(p.angle)), 3), ""],
        ["cos θ", num(Math.cos(rad(p.angle)), 3), ""],
        ["角度", num(p.angle, 1), "°"],
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
      const r = h * 0.28,
        x = w * 0.34,
        y = h * 0.6,
        a = 0.8;
      circle(ctx, x, y, r, "#f6f8f1", "#b8cba9", 1.2);
      line(ctx, x - r - 9, y, x + r + 9, y, "#c4d1b6");
      line(ctx, x, y - r - 8, x, y + r + 8, "#c4d1b6");
      line(ctx, x, y, x + Math.cos(a) * r, y - Math.sin(a) * r, "#84a56f", 1.8);
      line(
        ctx,
        x + Math.cos(a) * r,
        y,
        x + Math.cos(a) * r,
        y - Math.sin(a) * r,
        "#d1ac78",
        1.6,
      );
      circle(ctx, x + Math.cos(a) * r, y - Math.sin(a) * r, 3.5, col);
      ctx.beginPath();
      ctx.strokeStyle = "#bcb383";
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 80; i++) {
        const xx = w * 0.58 + (i / 79) * w * 0.34,
          yy = y - Math.sin((i / 79) * Math.PI * 2) * r * 0.75;
        i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      }
      ctx.stroke();
      text(ctx, "sin θ", w * 0.75, 38, 12, "#afac7e", "center", "math");
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
