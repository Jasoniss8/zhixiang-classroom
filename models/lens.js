"use strict";
// lens: model metadata, rendering and lifecycle hooks.

function lensReadout(p) {
  const d = SCIENCE.lensData(p);
  return {
    formula: `1/u + 1/v = 1/f　　M = −v/u\nu=${d.u} cm；f=${d.f} cm${d.atFocus ? "" : `；v≈${num(d.v, 4)} cm`}`,
    caption: "实正虚负：u>0；凸透镜 f>0，凹透镜 f<0；实像 v>0，虚像 v<0。",
    metrics: [
      ["像距 v", d.atFocus ? "无有限像距" : num(d.v, 4), d.atFocus ? "" : "cm"],
      ["放大率 M", d.atFocus ? "不定义" : num(d.magnification, 4), ""],
      [
        "像的性质",
        d.atFocus
          ? "u=f，不成有限像"
          : `${d.real ? "实像" : "虚像"} · ${d.upright ? "正立" : "倒立"}`,
        "",
      ],
    ],
    details: [
      [
        "三条光线",
        "平行主轴光线经像方焦点（凹透镜为反向延长线）；过光心光线方向不变；过物方焦点的光线出射后平行主轴。",
      ],
      [
        "适用范围",
        "薄透镜、近轴近似，忽略厚度、孔径限制、像差和衍射；图示横纵比例不同，距离计算使用 cm。",
      ],
      [
        "焦点边界",
        d.atFocus
          ? "u=f：可用的两条出射光平行；第三条入射线平行透镜平面，不绘制为有限光路。"
          : "接近焦点时像可超出图窗，读数保留实际像距。",
      ],
    ],
  };
}

function drawLens(ctx, w, h, p) {
  const d = SCIENCE.lensData(p),
    extent =
      state.lensExtentLock || Math.max(20, 3 * p.focal, p.objectDistance * 1.2),
    height = Math.max(
      6,
      p.objectHeight * 1.5,
      Math.min(20, Math.abs(d.imageHeight || 0) * 1.2),
    ),
    left = 22,
    right = w - 22,
    top = 70,
    bottom = h - 64;
  const x = (v) => left + ((v + extent) / (2 * extent)) * (right - left),
    y = (v) => bottom - ((v + height) / (2 * height)) * (bottom - top),
    ix = (px) => ((px - left) / (right - left)) * 2 * extent - extent;
  const segment = (a, b, color, dash = []) => {
    let lo = 0,
      hi = 1;
    const delta = [b[0] - a[0], b[1] - a[1]];
    for (let k = 0; k < 2; k++) {
      const min = k ? -height : -extent,
        max = k ? height : extent;
      if (Math.abs(delta[k]) < 1e-15) {
        if (a[k] < min || a[k] > max) return;
      } else {
        const l = (min - a[k]) / delta[k],
          r = (max - a[k]) / delta[k];
        lo = Math.max(lo, Math.min(l, r));
        hi = Math.min(hi, Math.max(l, r));
      }
    }
    if (lo <= hi)
      line(
        ctx,
        x(a[0] + lo * delta[0]),
        y(a[1] + lo * delta[1]),
        x(a[0] + hi * delta[0]),
        y(a[1] + hi * delta[1]),
        color,
        1.7,
        dash,
      );
  };
  line(ctx, left, y(0), right, y(0), "#a5b6a5", 1);
  line(ctx, x(0), top, x(0), bottom, PALETTE.purple, 2);
  const tip = p.kind === "convex" ? 1 : -1;
  for (const v of [-1, 1]) {
    const yy = v < 0 ? top : bottom;
    line(ctx, x(0), yy, x(0) - 7, yy - v * tip * 9, PALETTE.purple, 2);
    line(ctx, x(0), yy, x(0) + 7, yy - v * tip * 9, PALETTE.purple, 2);
  }
  for (const f of [-p.focal, p.focal]) {
    circle(ctx, x(f), y(0), 3, PALETTE.purple);
    if (state.labels)
      text(
        ctx,
        f < 0 ? "F左" : "F右",
        x(f) + (Math.abs(x(f) - x(0)) < 14 ? (f < 0 ? -14 : 14) : 0),
        y(0) + 23,
        12,
        PALETTE.purple,
        "center",
      );
  }
  SCIENCE.lensRays(p).forEach((r, i) => {
    const col = [PALETTE.orange, PALETTE.green, PALETTE.purple][i];
    segment([-d.u, d.h], [0, r.height], col);
    segment([0, r.height], [extent, r.height + r.slope * extent], col);
    if (!d.atFocus && !d.real)
      segment(
        [0, r.height],
        [-extent, r.height - r.slope * extent],
        col,
        [5, 4],
      );
  });
  arrow(ctx, x(-d.u), y(0), x(-d.u), y(d.h), PALETTE.green, 3);
  circle(ctx, x(-d.u), y(d.h), 5, PALETTE.green, "#fff", 1);
  if (state.labels)
    text(
      ctx,
      "物（可拖动）",
      clamp(x(-d.u), 55, w - 55),
      y(d.h) - 17,
      12,
      PALETTE.green,
      "center",
    );
  if (
    !d.atFocus &&
    Math.abs(d.v) < extent &&
    Math.abs(d.imageHeight) < height
  ) {
    ctx.save();
    if (!d.real) ctx.setLineDash([4, 3]);
    arrow(ctx, x(d.v), y(0), x(d.v), y(d.imageHeight), PALETTE.purple, 2.5);
    ctx.restore();
    if (state.labels)
      text(
        ctx,
        d.real ? "实像" : "虚像",
        clamp(x(d.v), 45, w - 45),
        y(d.imageHeight) + (d.imageHeight < 0 ? 17 : -17),
        12,
        PALETTE.purple,
        "center",
      );
  }
  text(ctx, p.kind === "convex" ? "凸透镜" : "凹透镜", 20, 24, 14, PALETTE.ink);
  text(
    ctx,
    d.atFocus
      ? "u=f：出射光平行，无有限像"
      : Math.abs(d.v) >= extent || Math.abs(d.imageHeight) >= height
        ? "像超出图窗，见下方读数"
        : `${d.real ? "实像" : "虚像"} · ${d.upright ? "正立" : "倒立"}`,
    20,
    46,
    12,
    PALETTE.muted,
  );
  text(
    ctx,
    `物距 u${Number(num(d.u, 2)) === d.u ? "=" : "≈"}${num(d.u, 2)} cm · 焦距 f${Number(num(d.f, 2)) === d.f ? "=" : "≈"}${num(d.f, 2)} cm`,
    w / 2,
    h - 32,
    12,
    PALETTE.ink,
    "center",
  );
  text(
    ctx,
    "实线：实际光路　虚线：反向延长线",
    w / 2,
    h - 13,
    12,
    PALETTE.muted,
    "center",
  );
  stageInfo = {
    kind: "lens",
    ix,
    extent,
    objectX: x(-d.u),
    objectY: y(d.h),
    axisY: y(0),
    data: d,
  };
}

ZhixiangModels.register({
  id: "lens",
  cat: "physics",
  level: "初中 · 高中",
  title: "透镜成像",
  desc: "拖动物体，比较凸透镜与凹透镜的成像。",
  tags: "光学 透镜 凸透镜 凹透镜 焦距 像距 实像 虚像 放大率",
  science: true,
  time: false,
  choices: { kind: ["convex", "concave"] },
  defaults: { kind: "convex", focal: 10, objectDistance: 30, objectHeight: 3 },
  controls: [
    ["focal", "|f|", "焦距大小", 1, 20, 0.1, "cm"],
    ["objectDistance", "u", "物距", 0.5, 60, 0.1, "cm"],
    ["objectHeight", "h", "物高", 0.5, 5, 0.1, "cm"],
  ],
  presets: [
    ["u > 2f", { kind: "convex", focal: 10, objectDistance: 30 }],
    ["u = 2f", { kind: "convex", focal: 10, objectDistance: 20 }],
    ["f < u < 2f", { kind: "convex", focal: 10, objectDistance: 15 }],
    ["u < f", { kind: "convex", focal: 10, objectDistance: 6 }],
    ["u = f", { kind: "convex", focal: 10, objectDistance: 10 }],
    ["凹透镜", { kind: "concave", focal: 10, objectDistance: 30 }],
  ],
  hint: "拖动绿色物体或调整物距；虚线为光线反向延长线。长度用 cm，横纵比例不同。",
  question: "凸透镜中，物体从焦点外移到焦点内，像发生什么变化？",
  answer:
    "焦点外为倒立实像；靠近焦点时像距和放大率的绝对值增大。u=f 时出射光平行，没有有限位置的像，不能在屏上成像。焦点内变为正立放大虚像。凹透镜对实物始终成正立缩小虚像。",
  note: "薄透镜、近轴、小孔径、空气中成像，忽略像差、衍射和厚度。1/u+1/v=1/f，M=−v/u；实正虚负：实物 u>0，实像 v>0，虚像 v<0；凸透镜 f>0，凹透镜 f<0。坐标原点在光心，光从左向右。三条特殊光线为平行主轴、过光心、过物方焦点（凹透镜为指向像方焦点）；最后一条出射平行主轴。u=f 时第三条入射线平行透镜平面，不作为有限光路；仅显示两条平行出射光线。光线为无限口径薄透镜的示意，超出视窗的像保留精确读数。",
  sources: ["lens"],
  draw: (ctx, w, h, p, comparison) => drawLens(ctx, w, h, p, comparison),
  readout: (p, m) => scienceReadout(m, p),
  thumbnail: (canvas, m) => {
    const { ctx, w, h } = setupCanvas(canvas),
      cx = w * 0.5,
      cy = h * 0.6,
      col = CATS[m.cat].color;
    ctx.save();
    {
      line(ctx, 15, cy, w - 15, cy, "#c2ccbd");
      line(ctx, cx, 20, cx, h - 10, PALETTE.purple, 2);
      arrow(ctx, cx - 55, cy, cx - 55, cy - 32, PALETTE.green, 2);
      line(ctx, cx - 55, cy - 32, cx, cy - 32, PALETTE.orange);
      line(ctx, cx, cy - 32, cx + 55, cy + 32, PALETTE.orange);
      line(ctx, cx - 55, cy - 32, cx + 55, cy + 32, PALETTE.green);
      arrow(ctx, cx + 55, cy, cx + 55, cy + 32, PALETTE.purple, 2);
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
  parsePrecision: () => 10,
  setParam: setLegacyParam,
  reset: resetLegacySolver,
  advance: advanceLegacyModel,
  bind: bindScienceStage,
});
