"use strict";
// seasons: model metadata, rendering and lifecycle hooks.

function scienceDot(a, b) {
  return a.reduce((sum, v, i) => sum + v * b[i], 0);
}

function scienceProject(q, camera, cx, cy, r) {
  return {
    x: cx + r * scienceDot(q, camera.right),
    y: cy - r * scienceDot(q, camera.up),
    depth: scienceDot(q, camera.depth),
  };
}

function globeCurve(
  ctx,
  points,
  camera,
  cx,
  cy,
  r,
  color,
  width = 1,
  dash = [],
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  let connected = false;
  for (const q of points) {
    const s = scienceProject(q, camera, cx, cy, r);
    if (s.depth < -0.001) {
      connected = false;
      continue;
    }
    if (connected) ctx.lineTo(s.x, s.y);
    else ctx.moveTo(s.x, s.y);
    connected = true;
  }
  ctx.stroke();
  ctx.restore();
}

const globeShade = document.createElement("canvas");

function drawSeasonGlobe(ctx, cx, cy, r, d, lat, view) {
  const camera = {
    right: d.sun,
    up: view === "top" ? [-d.sun[1], d.sun[0], 0] : [0, 0, 1],
  };
  camera.depth = [
    camera.right[1] * camera.up[2] - camera.right[2] * camera.up[1],
    camera.right[2] * camera.up[0] - camera.right[0] * camera.up[2],
    camera.right[0] * camera.up[1] - camera.right[1] * camera.up[0],
  ];
  const size = Math.ceil(Math.min(300, Math.max(130, 2 * r)));
  globeShade.width = globeShade.height = size;
  const gc = globeShade.getContext("2d"),
    pixels = gc.createImageData(size, size),
    polar = Math.cos(rad(Math.abs(d.dec)));
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const u = (2 * (i + 0.5)) / size - 1,
        v = 1 - (2 * (j + 0.5)) / size,
        z2 = 1 - u * u - v * v;
      if (z2 < 0) continue;
      const z = Math.sqrt(z2),
        normal = camera.right.map(
          (q, k) => q * u + camera.up[k] * v + camera.depth[k] * z,
        ),
        lit = scienceDot(normal, d.sun) > 0,
        sineLat = scienceDot(normal, d.axis);
      let color = lit ? [215, 229, 208] : [109, 132, 125];
      if (Math.abs(d.dec) > 1e-8 && Math.abs(sineLat) >= polar)
        color = sineLat * d.dec > 0 ? [225, 194, 132] : [119, 109, 146];
      const light = 0.84 + 0.16 * z,
        offset = 4 * (j * size + i);
      for (let c = 0; c < 3; c++)
        pixels.data[offset + c] = Math.round(color[c] * light);
      pixels.data[offset + 3] = 255;
    }
  gc.putImageData(pixels, 0, 0);
  ctx.drawImage(globeShade, cx - r, cy - r, 2 * r, 2 * r);
  circle(ctx, cx, cy, r, null, "#8fa596", 1);
  const latitude = (phi) =>
    Array.from({ length: 181 }, (_, i) => SCIENCE.earthSurface(phi, i * 2));
  if (state.grid) {
    for (const phi of [-66.56, -23.44, 0, 23.44, 66.56])
      globeCurve(
        ctx,
        latitude(phi),
        camera,
        cx,
        cy,
        r,
        phi === 0 ? "#f1f4e4" : "#aabbac",
        phi === 0 ? 1.5 : 0.8,
      );
    for (let lon = 0; lon < 360; lon += 45)
      globeCurve(
        ctx,
        Array.from({ length: 91 }, (_, i) =>
          SCIENCE.earthSurface(-90 + i * 2, lon),
        ),
        camera,
        cx,
        cy,
        r,
        "#aabbac",
        0.8,
      );
  }
  const terminator = Array.from({ length: 241 }, (_, i) => {
    const a = (i * Math.PI) / 120;
    return [-d.sun[1] * Math.sin(a), d.sun[0] * Math.sin(a), Math.cos(a)];
  });
  globeCurve(ctx, terminator, camera, cx, cy, r, "#3e6457", 2);
  if (Math.abs(d.dec) > 1e-8)
    for (const sign of [-1, 1])
      globeCurve(
        ctx,
        latitude(sign * d.polarBoundary),
        camera,
        cx,
        cy,
        r,
        "#8d7f61",
        1,
        [3, 3],
      );
  globeCurve(ctx, latitude(lat), camera, cx, cy, r, PALETTE.orange, 2);
  if (state.labels) {
    const north = scienceProject(d.axis, camera, cx, cy, r * 1.2),
      south = scienceProject(
        d.axis.map((v) => -v),
        camera,
        cx,
        cy,
        r * 1.16,
      );
    line(ctx, south.x, south.y, north.x, north.y, "#747b91", 1.2, [4, 3]);
    text(ctx, "N", north.x, north.y - 9, 13, PALETTE.purple, "center");
    text(ctx, "S", south.x, south.y + 10, 13, PALETTE.purple, "center");
    const sub = scienceProject(d.sun, camera, cx, cy, r);
    circle(ctx, sub.x, sub.y, 4, PALETTE.orange, "#fff", 1);
    text(ctx, "直射点", sub.x - 7, sub.y - 13, 12, PALETTE.orange, "right");
    text(ctx, "夜", cx - r * 0.5, cy, 12, "#f0f5ed", "center");
    text(ctx, "昼", cx + r * 0.5, cy, 12, "#46624a", "center");
  }
  return camera;
}

function drawSeasons(ctx, w, h, p) {
  const d = SCIENCE.seasonData(p),
    stacked = w < 620,
    orbitW = stacked ? w : w * 0.43,
    orbitH = stacked ? 235 : h;
  const cx = orbitW / 2,
    cy = stacked ? 125 : h * 0.48,
    r = Math.min(orbitW / 2 - 36, orbitH / 2 - 47),
    yscale = p.view === "top" ? 1 : Math.sin(rad(20));
  text(
    ctx,
    p.view === "top" ? "公转轨道 · 俯视" : "公转轨道 · 侧视",
    20,
    23,
    13,
    PALETTE.deep,
  );
  ctx.beginPath();
  ctx.strokeStyle = "#c6d4c4";
  ctx.lineWidth = 1.5;
  ctx.ellipse(cx, cy, r, r * yscale, 0, 0, Math.PI * 2);
  ctx.stroke();
  const labels = ["春分", "夏至", "秋分", "冬至"];
  labels.forEach((label, i) => {
    const a = (i * Math.PI) / 2,
      x = cx - r * Math.cos(a),
      y = cy + r * Math.sin(a) * yscale;
    circle(ctx, x, y, 3, "#b4c5b0");
    text(ctx, label, x, y + (i === 1 ? 22 : -18), 12, PALETTE.muted, "center");
  });
  circle(ctx, cx, cy, 13, "#e5bd6d");
  if (state.labels) text(ctx, "太阳", cx, cy + 25, 12, "#a37a40", "center");
  const x = cx + d.earth[0] * r,
    y = cy - d.earth[1] * r * yscale;
  line(ctx, cx, cy, x, y, "#ddcdb1", 1, [4, 4]);
  circle(ctx, x, y, 10, PALETTE.green, "#fff", 2);
  if (state.labels) {
    const nx = x,
      ny =
        y -
        23 *
          (p.view === "top" ? Math.sin(rad(23.44)) : Math.cos(rad(23.44 - 20)));
    line(ctx, x, y, nx, ny, PALETTE.purple, 1.5);
  }
  const globeTop = stacked ? 235 : 0,
    globeH = h - globeTop,
    gx = stacked ? w / 2 : orbitW + (w - orbitW) / 2,
    gy = globeTop + globeH / 2 - 7,
    gr = Math.min((stacked ? w : w - orbitW) * 0.32, (globeH - 143) / 2);
  if (stacked) line(ctx, 18, 235, w - 18, 235, "#e0e6df");
  else line(ctx, orbitW, 45, orbitW, h - 25, "#e0e6df");
  text(
    ctx,
    "地球放大 · 太阳方向在右侧",
    stacked ? 20 : orbitW + 20,
    stacked ? 258 : 23,
    13,
    PALETTE.deep,
  );
  const camera = drawSeasonGlobe(ctx, gx, gy, gr, d, p.lat, p.view);
  text(
    ctx,
    `所选纬度 ${num(p.lat)}° · 橙色纬线`,
    gx,
    gy + gr + 34,
    12,
    PALETTE.orange,
    "center",
  );
  text(
    ctx,
    "暖色：极昼　灰紫：极夜",
    gx,
    gy + gr + 54,
    12,
    PALETTE.muted,
    "center",
  );
  stageInfo = {
    kind: "seasons",
    orbit: { cx, cy, r, yscale, x, y },
    globe: { cx: gx, cy: gy, r: gr, camera },
    data: d,
  };
}

ZhixiangModels.register({
  id: "seasons",
  cat: "geography",
  level: "初中 · 高中",
  title: "地球公转与四季",
  desc: "观察地轴倾斜、太阳直射纬度与不同纬度的昼长。",
  tags: "地球 公转 四季 黄赤交角 节气 日期 直射点 昼长 晨昏线 极昼 极夜",
  science: true,
  time: true,
  defaults: { phase: 0, lat: 31, view: "side" },
  choices: { view: ["side", "top"] },
  controls: [
    ["phase", "λ", "公转位置（春分为 0°）", 0, 360, 0.1, "°"],
    ["lat", "φ", "观察地纬度", -90, 90, 1, "°"],
  ],
  presets: [
    ["春分", { phase: 0 }],
    ["夏至", { phase: 90 }],
    ["秋分", { phase: 180 }],
    ["冬至", { phase: 270 }],
  ],
  hint: "拖动轨道上的地球或播放；地轴在空间中保持平行。右侧地球为放大示意。",
  question:
    "四季变化由地球离太阳远近造成吗？春秋分时，极点也能直接套用“昼长 12 小时”吗？",
  answer:
    "本模型用等距的圆轨道仍能显示四季：原因是黄赤交角使太阳直射纬度和昼长改变，南北半球季节相反。春秋分时非极点的几何昼长为 12 小时；在恰好 90° 的极点，理想点状太阳中心全天位于地平线，不能把退化情况直接写成 12 小时。",
  note: "圆轨道近似，黄赤交角 ε=23.44°，地轴方向固定，不表现轨道偏心率、岁差或章动；太阳光视为平行光，地球尺寸放大且不与轨道按比例。λ 从春分起算，对应太阳黄经，δ=asin(sinε sinλ)。正午高度 H=90°−|φ−δ|；昼长由 cosH₀=−tanφ tanδ、D=24H₀/π 求得，另处理极昼、极夜和极点春秋分的退化状态。与“太阳高度角与日影”共用太阳高度公式，不计大气折射、太阳视半径和地形。节气每 15° 一项；日期按常用节气日期插值，仅作教学日期，不是任何年份的精确历表。播放在 1× 时每秒推进 15°，不是实际公转时间。赤道/回归线、晨昏线和当前极昼极夜范围由球面坐标计算。",
  sources: ["seasons", "terms", "solarLimits"],
  draw: (ctx, w, h, p, comparison) => drawSeasons(ctx, w, h, p, comparison),
  readout: (p, m) => scienceReadout(m, p),
  thumbnail: (canvas, m) => {
    const { ctx, w, h } = setupCanvas(canvas),
      cx = w * 0.5,
      cy = h * 0.6,
      col = CATS[m.cat].color;
    ctx.save();
    {
      const x = w * 0.49,
        y = h * 0.56;
      ctx.beginPath();
      ctx.ellipse(x, y, w * 0.32, h * 0.27, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "#c3ccb5";
      ctx.stroke();
      circle(ctx, x, y, 12, "#e0bf72");
      circle(ctx, x + w * 0.27, y + h * 0.14, 12, "#7d9f87");
      line(
        ctx,
        x + w * 0.27 - 6,
        y + h * 0.14 + 16,
        x + w * 0.27 + 6,
        y + h * 0.14 - 16,
        PALETTE.purple,
        1.3,
      );
      text(ctx, "23.44°", w * 0.17, 31, 13, PALETTE.muted);
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
