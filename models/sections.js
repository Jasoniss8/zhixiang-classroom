"use strict";
// sections: model metadata, rendering and lifecycle hooks.

ZhixiangModels.register({
  id: "sections",
  cat: "math",
  level: "高中",
  title: "正方体截面",
  desc: "移动、倾斜截平面，观察截面形状的变化。",
  tags: "三维 3D 立体几何 正方体 截面 截平面 三角形 四边形 五边形 六边形",
  threeD: true,
  time: false,
  defaults: {
    a: 3,
    azimuth: 45,
    tilt: 54.7356,
    offset: 0,
    plane: true,
    hidden: true,
    ...GEO_CAMERA,
    ...GEO_STUDY_DEFAULTS,
  },
  choices: { ...GEO_STUDY_CHOICES },
  bools: ["plane", "hidden", "coordinates"],
  controls: [
    ["a", "a", "正方体棱长", 1, 5, 0.1, "cm"],
    ["offset", "d", "截平面位置", -100, 100, 1, "%"],
    ["tilt", "β", "与水平面的夹角", 0, 90, 0.1, "°"],
    ["azimuth", "γ", "倾斜方向", 0, 180, 0.1, "°"],
    ...GEO_CAMERA_CONTROLS,
  ],
  presets: [
    ["三角形", { azimuth: 45, tilt: 54.7356, offset: 64 }],
    ["正方形", { azimuth: 0, tilt: 0, offset: 0 }],
    ["五边形", { azimuth: 24, tilt: 57, offset: 25 }],
    ["正六边形", { azimuth: 45, tilt: 54.7356, offset: 0 }],
  ],
  hint: "橙色区域为截面；右上角为等比例正视图；移动截平面时保持比例",
  question:
    "用一个平面截正方体，截面最多能有几条边？如何求一条棱与截平面的夹角？",
  answer:
    "非退化截面最多有 6 条边。截平面与正方体的每个面至多产生一条截面边；正方体只有 6 个面。过中心且垂直于体对角线时，可得到正六边形。设棱方向为 u、截平面法向为 n，则 sinα=|u·n|/(|u||n|)，α 取 0°–90°；不能直接量取画面上的夹角。",
  note: "将截平面与正方体 12 条棱求交，合并重复交点，按截平面内的角度排序。面积、周长在空间坐标中求得，不取投影后的面积。位置 ±100% 为沿法线的两个支撑平面；一般斜切时在端点退化为点，特殊角度可为棱或整面。β 为截平面与水平面的锐夹角，γ 为法线水平投影相对 +x 的方向角。正六边形预设使用约 54.7356° 的夹角，有舍入误差。观察内容可切换三视图、线面角、二面角或空间向量；截面交点 P、Q 等参与坐标与向量计算。截平面没有指定实体内外侧，与它的夹角只给两平面锐夹角；点或线退化时不把它作为一个面。",
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
