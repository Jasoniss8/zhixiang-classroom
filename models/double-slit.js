"use strict";
// double-slit: model metadata, rendering and lifecycle hooks.

function drawDoubleSlit(ctx, w, h, p) {
  const d = SCIENCE.doubleSlitParameters(p),
    q = SCIENCE.doubleSlitAt(p, p.probe * 1e-3),
    left = w < 400 ? 45 : 59,
    right = 21,
    pw = w - left - right;
  const x = (v) => left + ((v + d.half) / (2 * d.half)) * pw,
    ix = (v) => ((v - left) / pw) * 2 * d.half - d.half;
  const stripTop = 203,
    stripHeight = 62,
    graphTop = 333,
    graphBottom = h - 54,
    y = (v) => graphBottom - v * (graphBottom - graphTop);
  text(ctx, "双缝与屏幕 · 示意不按比例", 16, 22, 12, PALETTE.muted);
  const slitX = w * 0.33,
    screenX = w * 0.8,
    mid = 93,
    beamColor = p.colorize
      ? `rgb(${SCIENCE.wavelengthColor(p.wavelength).join(",")})`
      : PALETTE.green;
  circle(ctx, w * 0.12, mid, 7, beamColor);
  line(ctx, w * 0.15, mid, slitX - 7, mid, "#c6d0bd", 1.5);
  line(ctx, slitX, 50, slitX, mid - 18, PALETTE.deep, 4);
  line(ctx, slitX, mid - 11, slitX, mid + 11, PALETTE.deep, 4);
  line(ctx, slitX, mid + 18, slitX, 139, PALETTE.deep, 4);
  line(ctx, screenX, 47, screenX, 143, PALETTE.deep, 3);
  const targetY = mid - clamp(p.probe / p.screenHalf, -1, 1) * 40;
  line(ctx, slitX, mid - 14, screenX, targetY, "#bbac88", 1.3);
  line(ctx, slitX, mid + 14, screenX, targetY, "#98b399", 1.3);
  circle(ctx, screenX, targetY, 4, PALETTE.orange);
  if (state.labels) {
    text(ctx, "d", slitX - 12, mid, 13, PALETTE.muted, "right");
    doubleArrow(ctx, slitX, 157, screenX, 157, PALETTE.muted);
    text(
      ctx,
      `L=${mathNumber(p.distance)} m`,
      (slitX + screenX) / 2,
      175,
      12,
      PALETTE.muted,
      "center",
    );
    text(ctx, "屏", screenX + 9, 63, 12, PALETTE.muted);
  }
  text(ctx, "屏幕条纹", left, stripTop - 14, 13, PALETTE.deep);
  const rgb = p.colorize
    ? SCIENCE.wavelengthColor(p.wavelength)
    : [160, 191, 155];
  for (let px = 0; px < Math.ceil(pw); px++) {
    const a = ix(left + px),
      b = ix(Math.min(w - right, left + px + 1)),
      value = SCIENCE.doubleSlitPixelIntensity(p, a, b);
    ctx.fillStyle = `rgb(${rgb.map((v) => Math.round(7 + (v - 7) * value)).join(",")})`;
    ctx.fillRect(left + px, stripTop, Math.min(1, pw - px), stripHeight);
  }
  const spacingPx = (pw * d.spacing) / (2 * d.half),
    tick = niceStep((2 * p.screenHalf) / (w < 450 ? 4 : 8));
  for (
    let v = Math.ceil(-p.screenHalf / tick) * tick;
    v <= p.screenHalf + 1e-8;
    v += tick
  ) {
    const xx = x(v * 1e-3);
    if (state.grid) line(ctx, xx, graphTop, xx, graphBottom, PALETTE.grid);
    if (state.labels)
      text(
        ctx,
        mathNumber(v, 3),
        xx,
        graphBottom + 19,
        12,
        PALETTE.muted,
        "center",
      );
  }
  for (const v of [0, 0.5, 1]) {
    if (state.grid) line(ctx, left, y(v), w - right, y(v), PALETTE.grid);
    if (state.labels) text(ctx, v, left - 9, y(v), 12, PALETTE.muted, "right");
  }
  line(ctx, left, graphBottom, w - right, graphBottom, PALETTE.axis);
  text(ctx, "I / Imax", left, graphTop - 17, 13, PALETTE.deep);
  text(ctx, "x / mm", w - right, h - 12, 12, PALETTE.muted, "right");
  if (state.labels && d.spacing <= d.half && spacingPx > 24) {
    doubleArrow(
      ctx,
      x(0),
      stripTop + stripHeight + 21,
      x(d.spacing),
      stripTop + stripHeight + 21,
      PALETTE.orange,
    );
    text(
      ctx,
      `Δx=${mathNumber(d.spacing * 1e3, 4)} mm`,
      x(0),
      stripTop + stripHeight + 41,
      12,
      PALETTE.orange,
      "center",
    );
  }
  const samples = Math.max(
    Math.ceil(pw * 2),
    Math.ceil(((2 * d.half) / d.spacing) * 20),
  );
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, graphTop - 3, pw, graphBottom - graphTop + 6);
  ctx.clip();
  ctx.beginPath();
  ctx.strokeStyle = PALETTE.green;
  ctx.lineWidth = 1.6;
  for (let i = 0; i <= samples; i++) {
    const pos = -d.half + (2 * d.half * i) / samples,
      v = SCIENCE.doubleSlitAt(p, pos);
    i ? ctx.lineTo(x(pos), y(v.intensity)) : ctx.moveTo(x(pos), y(v.intensity));
  }
  ctx.stroke();
  ctx.restore();
  line(ctx, x(q.x), stripTop, x(q.x), graphBottom, PALETTE.orange, 1.1, [4, 4]);
  circle(ctx, x(q.x), y(q.intensity), 5, PALETTE.orange, "#fff", 1.5);
  if (state.labels)
    text(
      ctx,
      `P：x=${mathNumber(p.probe, 4)} mm`,
      left,
      h - 12,
      12,
      PALETTE.orange,
    );
  stageInfo = {
    kind: "double-slit",
    data: d,
    probe: q,
    spacingPx,
    x,
    ix,
    y,
    left,
    right: w - right,
    stripTop,
    graphBottom,
  };
}

ZhixiangModels.register({
  id: "double-slit",
  cat: "physics",
  level: "高中",
  title: "双缝干涉",
  desc: "调节波长、缝距和屏距，对照亮暗条纹与强度曲线。",
  tags: "双缝 干涉 光 波长 条纹 强度 杨氏实验 光程差",
  science: true,
  time: false,
  defaults: {
    wavelength: 550,
    separation: 0.3,
    distance: 1.5,
    screenHalf: 10,
    probe: 0,
    colorize: true,
  },
  choices: {},
  bools: ["colorize"],
  controls: [
    ["wavelength", "λ", "波长", 380, 750, 1, "nm"],
    ["separation", "d", "缝间距", 0.1, 1, 0.01, "mm"],
    ["distance", "L", "缝屏距离", 0.5, 5, 0.1, "m"],
    ["screenHalf", "X", "屏幕半宽", 1, 30, 0.5, "mm"],
    ["probe", "x", "屏上测量位置", -30, 30, 0.1, "mm"],
  ],
  presets: [
    [
      "绿光",
      {
        wavelength: 550,
        separation: 0.3,
        distance: 1.5,
        screenHalf: 10,
        probe: 0,
      },
    ],
    [
      "红光",
      {
        wavelength: 650,
        separation: 0.3,
        distance: 1.5,
        screenHalf: 10,
        probe: 0,
      },
    ],
    [
      "缝距加倍",
      {
        wavelength: 550,
        separation: 0.6,
        distance: 1.5,
        screenHalf: 10,
        probe: 0,
      },
    ],
    [
      "屏距加倍",
      {
        wavelength: 550,
        separation: 0.3,
        distance: 3,
        screenHalf: 10,
        probe: 0,
      },
    ],
  ],
  hint: "点击或拖动条纹、强度曲线测量位置；横轴共用屏上坐标 x，中央亮纹为 x=0。",
  question:
    "保持其他参数不变，把缝间距加倍，条纹如何变化？中央亮纹会变成暗纹吗？",
  answer:
    "由 Δx=λL/d，缝间距加倍使相邻亮纹（或暗纹）的间距减半。两缝到屏幕中心的光程相同，同相入射时 x=0 始终是中央亮纹。波长或屏距加倍则使条纹间距加倍；这里只计算干涉，不包含单缝衍射包络。",
  note: "两条无限窄狭缝，同频、同相、等振幅的相干单色光；忽略单缝衍射包络、偏振差异、有限光源和探测器效应。在远场小角近似 d≪L、|x|≪L 下，光程差 δ≈dx/L，I/Imax=cos²(πdx/(λL))，Δx=λL/d，Imax 为两束光在亮纹处的合强度；亮纹 x=mΔx，暗纹 x=(m+½)Δx。输入 λ 用 nm、d 与屏上 x 用 mm、L 用 m，先换算 SI 再计算。当前可选范围保证 d/L≤0.002、|x|/L≤0.06；页面另给出相对精确几何光程差的最大近似误差，曲线不混用精确与近似公式。屏幕条纹与强度曲线共用物理横坐标；像素条带用区间平均强度抑制密纹混叠，曲线和测量点表示点强度。过密时提示减小屏幕半宽。380–750 nm 只用于本模型的可见光示意，RGB 色彩为近似映射，不是光谱或人眼色度测量。",
  sources: ["doubleSlit"],
  draw: (ctx, w, h, p, comparison) => drawDoubleSlit(ctx, w, h, p, comparison),
  readout: (p, m) => scienceReadout(m, p),
  thumbnail: (canvas, m) => {
    const { ctx, w, h } = setupCanvas(canvas),
      cx = w * 0.5,
      cy = h * 0.6,
      col = CATS[m.cat].color;
    ctx.save();
    {
      const p = modelById("double-slit").defaults,
        rgb = SCIENCE.wavelengthColor(p.wavelength);
      for (let x = 24; x < w - 24; x++) {
        const v = SCIENCE.doubleSlitAt(
          p,
          ((x - w / 2) / (w - 48)) * 0.02,
        ).intensity;
        ctx.fillStyle = `rgb(${rgb.map((c) => Math.round(10 + (c - 10) * v)).join(",")})`;
        ctx.fillRect(x, 28, 1, 34);
      }
      ctx.beginPath();
      for (let x = 24; x < w - 24; x++) {
        const y =
          h -
          17 -
          SCIENCE.doubleSlitAt(p, ((x - w / 2) / (w - 48)) * 0.02).intensity *
            27;
        x === 24 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = PALETTE.green;
      ctx.lineWidth = 1.5;
      ctx.stroke();
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
