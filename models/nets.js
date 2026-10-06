"use strict";
// nets: model metadata, rendering and lifecycle hooks.

ZhixiangModels.register({
  id: "nets",
  cat: "math",
  level: "初中 · 高中",
  title: "展开与折叠",
  desc: "把六个面逐步展开，核对相邻面与表面积。",
  tags: "三维 3D 立体几何 正方体 长方体 展开图 表面积 折叠 空间想象",
  threeD: true,
  time: false,
  defaults: {
    shape: "cube",
    a: 2,
    b: 2,
    height: 2,
    fold: 32,
    faceLabels: true,
    ...GEO_CAMERA,
    pitch: 38,
  },
  choices: { shape: ["cube", "cuboid"] },
  bools: ["faceLabels"],
  controls: [
    ["fold", "", "展开程度", 0, 100, 1, "%"],
    ["a", "a", "长 / 棱长", 1, 4, 0.1, "cm"],
    ["b", "b", "宽", 1, 4, 0.1, "cm"],
    ["height", "h", "高", 1, 4, 0.1, "cm"],
    ...GEO_CAMERA_CONTROLS,
  ],
  presets: [
    ["闭合", { fold: 0 }],
    ["展开一半", { fold: 50 }],
    ["完全展开", { fold: 100 }],
  ],
  hint: "拖动旋转 · 调整展开程度 · 同色的两个面互为对面；虚线为折叠棱",
  question: "完全展开以后，六个面的面积之和会改变吗？哪两个面在折叠后相对？",
  answer:
    "不会改变。展开只改变各面的相对位置，不改变每个面的形状与面积。同色的面在闭合后相对：上与下、前与后、左与右。长方体表面积为 2(ab + ah + bh)。",
  note: "仅展示正方体、长方体的一种十字形展开图，不代表全部可能的展开图。六个刚性矩形面绕共享棱旋转，上面随其父面进行嵌套旋转，展开过程中面尺寸和面积不变。中间状态为有开口的曲面，不作为封闭几何体计算当前体积；下方体积始终指闭合后的体积。",
  sources: ["geometry"],
  draw: (ctx, w, h, p, comparison) =>
    drawGeometryStage(ctx, w, h, p, comparison),
  readout: (p, m) => geometryReadout(m, p),
  thumbnail: (canvas) => geometryThumb(canvas),
  renderControls: renderGeometryControls,
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
  bind: () => {
    bindGeometryStage();
    geometrySyncView();
  },
});
