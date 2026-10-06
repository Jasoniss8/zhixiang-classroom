"use strict";
// solids: model metadata, rendering and lifecycle hooks.

ZhixiangModels.register({
  id: "solids",
  cat: "math",
  level: "初中 · 高中",
  title: "常见几何体",
  desc: "旋转观察顶点、棱和面，比较体积与表面积。",
  tags: "三视图 还原 二面角 线面角 空间向量 坐标 三维 3D 立体几何 正方体 长方体 三棱柱 三棱锥 四棱锥 圆柱 圆锥 球 体积 表面积",
  threeD: true,
  time: false,
  defaults: {
    shape: "cube",
    a: 3,
    b: 2,
    height: 3,
    r: 1.5,
    hidden: true,
    ghost: false,
    dimensions: true,
    ...GEO_CAMERA,
    ...GEO_STUDY_DEFAULTS,
  },
  choices: { shape: Object.keys(SOLID_NAMES), ...GEO_STUDY_CHOICES },
  bools: ["hidden", "ghost", "dimensions", "coordinates"],
  controls: [
    ["a", "a", "底边长", 1, 5, 0.1, "cm"],
    ["b", "b", "底面宽", 1, 5, 0.1, "cm"],
    ["height", "h", "高", 1, 5, 0.1, "cm"],
    ["r", "r", "半径", 0.5, 2.5, 0.1, "cm"],
    ...GEO_CAMERA_CONTROLS,
  ],
  presets: [
    ["正方体", { shape: "cube", a: 3 }],
    ["圆柱", { shape: "cylinder", r: 1.5, height: 3 }],
    ["球", { shape: "sphere", r: 1.5 }],
  ],
  hint: "拖动旋转 · 滚轮或双指缩放 · 上方按钮切换视角",
  question:
    "同底等高的圆柱与圆锥体积有何关系？两棱看起来垂直，就一定在空间中垂直吗？三视图匹配是否总是唯一？",
  answer:
    "圆柱 V = πr²h，圆锥 V = ⅓πr²h。同底等高时，圆锥体积是圆柱的三分之一。切换几何体会保留半径和高度，可直接比较。屏幕夹角随视角改变，空间垂直要检验方向向量点积为 0；线面角检验方向向量与法向量的关系。三视图匹配只在当前样例库内检索，一般情况下不能保证任意立体唯一。",
  note: "正投影三维模型，画面长度受视角影响，标注和计算使用空间真实尺寸。三棱柱为正三棱柱；三棱锥底面为正三角形、顶点在底面中心正上方，不一定是正四面体；四棱锥为正四棱锥。圆柱、圆锥为直圆柱、直圆锥。曲面用多边形近似显示，体积与表面积使用解析公式，曲面网格线不是几何体的棱。全部长度单位为 cm。三视图按固定 x、y、z 轴正投影；可见实线覆盖重合隐棱。反向还原仅匹配 8 种固定尺寸样例，不能证明一般立体唯一。两棱夹角用点积；线面角用方向向量与法向量；相邻面内二面角用凸多面体的外法向量，非相邻面仅报锐夹角。空间向量由顶点坐标之差计算，方向不随相机改变。",
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
