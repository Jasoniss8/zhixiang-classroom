"use strict";
function uniLinearNumber(value) { return Number.isFinite(value) ? String(Number(value.toPrecision(7))) : "—"; }
function uniLinearDraw(ctx, w, h, p) {
  const U = window.ZhixiangUniversityMath, d = U.linearData(p);
  if (!d.valid) { text(ctx, d.reason, 25, 40, 14, PALETTE.orange); return; }
  const basis1 = U.matrixVector(d.current, [1, 0]), basis2 = U.matrixVector(d.current, [0, 1]);
  const extent = Math.max(5.1, ...d.output.map(Math.abs), ...basis1.map(Math.abs), ...basis2.map(Math.abs)) * 1.12;
  const plot = makePlot(ctx, w, h, { xmin: -extent, xmax: extent, ymin: -extent, ymax: extent, equal: true, grid: false, top: 64, left: 46, right: 28, bottom: 35 });
  text(ctx, "灰色：原网格　绿色：当前 Aτ 变换后的网格", 24, 21, Math.min(13, w / 34), PALETTE.deep);
  text(ctx, `τ=${uniLinearNumber(p.tau)}　橙色 v 可拖动；紫色 Aτv`, 24, 42, 11, PALETTE.muted);
  plot.clip();
  const segment = (a, b, color, width = 1, dash = []) => line(ctx, plot.x(a[0]), plot.y(a[1]), plot.x(b[0]), plot.y(b[1]), color, width, dash);
  for (let k = -3; k <= 3; k++) {
    segment([k, -3], [k, 3], "#d9e0d8"); segment([-3, k], [3, k], "#d9e0d8");
    segment(U.matrixVector(d.current, [k, -3]), U.matrixVector(d.current, [k, 3]), "#94b6a0", 1.2);
    segment(U.matrixVector(d.current, [-3, k]), U.matrixVector(d.current, [3, k]), "#94b6a0", 1.2);
  }
  const polygon = (vertices, fill, stroke) => { ctx.beginPath(); vertices.forEach((v, i) => i ? ctx.lineTo(plot.x(v[0]), plot.y(v[1])) : ctx.moveTo(plot.x(v[0]), plot.y(v[1]))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 1.8; ctx.stroke(); };
  polygon([[0, 0], [1, 0], [1, 1], [0, 1]], "rgba(180,187,174,.08)", "#a4b09c");
  polygon([[0, 0], basis1, U.matrixVector(d.current, [1, 1]), basis2], "rgba(106,153,122,.22)", PALETTE.green);
  if (p.eigen === "show") for (const v of d.eigenvectors) segment(v.map(x => -extent * 2 * x), v.map(x => extent * 2 * x), "#8e809c", 1.3, [5, 4]);
  const vector = (v, label, color, width) => { if (Math.hypot(...v) > 1e-12) arrow(ctx, plot.x(0), plot.y(0), plot.x(v[0]), plot.y(v[1]), color, width, 7); else circle(ctx, plot.x(0), plot.y(0), 4, color); text(ctx, label, plot.x(v[0]) + 9, plot.y(v[1]) - 10, 12, color); };
  vector(basis1, "Aτe₁", PALETTE.green, 2); vector(basis2, "Aτe₂", "#588e94", 2);
  vector(d.output, "Aτv", PALETTE.purple, 2.7); vector(d.input, "v", PALETTE.orange, 2.2);
  circle(ctx, plot.x(p.vx), plot.y(p.vy), 6, PALETTE.orange, "white", 1.5);
  plot.end();
  stageInfo = { kind: "university", plot, uniDrag(point) {
    if (point.x < plot.left || point.x > w - plot.right || point.y < plot.top || point.y > h - plot.bottom) return false;
    if (point.phase !== "end") { uniSetParam("vx", clamp(plot.ix(point.x), -5, 5)); uniSetParam("vy", clamp(plot.iy(point.y), -5, 5)); }
    return true;
  }, uniKey(key) {
    const keys = { ArrowLeft: ["vx", -.1], ArrowRight: ["vx", .1], ArrowDown: ["vy", -.1], ArrowUp: ["vy", .1] }, move = keys[key];
    if (!move) return false; uniSetParam(move[0], clamp(state.p[move[0]] + move[1], -5, 5)); return true;
  } };
}
function uniLinearReadout(p) {
  const d = window.ZhixiangUniversityMath.linearData(p), n = uniLinearNumber;
  if (!d.valid) return { formula: "Av", caption: d.reason, metrics: [] };
  const matrix = A => `[[${n(A[0][0])}, ${n(A[0][1])}], [${n(A[1][0])}, ${n(A[1][1])}]]`;
  const eigen = d.eigenvalues.map(v => v.im ? `${n(v.re)} ${v.im < 0 ? "−" : "+"} ${n(Math.abs(v.im))}i` : n(v.re)).join("，");
  return { formula: `Aτ=(1−τ)I+τA；Aτ=${matrix(d.current)}；Aτv=(${d.output.map(n).join(", ")})`, caption: "矩阵与坐标无量纲；所有读数对应当前 Aτ。τ仅表示线性插值演示进度。",
    metrics: [["det Aτ", n(d.det), ""], ["面积倍率 |det Aτ|", n(d.areaScale), ""], ["目标 det A", n(d.targetDet), ""], ["tr Aτ", n(d.trace), ""], ["变换结果", `(${d.output.map(n).join(", ")})`, ""], ["特征值", eigen, ""]],
    details: [["目标矩阵 A", matrix(d.A)], ["几何变化", d.orientation + (d.singular ? "；矩阵不可逆。" : d.nearSingular ? "；行列式虽非零但接近奇异，逆运算对误差敏感。" : "；矩阵可逆。")], ["实特征方向", d.classification], ["数值边界", d.nearRepeated ? "特征值接近重根，微小参数变化可能明显改变特征方向；残差按浮点数计算。" : "复特征值不会画成平面中的实特征方向。线性插值途中可能经过奇异矩阵。"]] };
}
const uniLinearModel = {
  id: "linear-transform", cat: "math", level: "大学基础", title: "矩阵与线性变换", desc: "用二维矩阵变换网格、向量和面积，观察特征方向。", tags: "大学 线性代数 矩阵 线性变换 特征值 特征向量 行列式", university: true, keepNumericPrecision: true, time: false,
  defaults: { m11: 2, m12: 0, m21: 0, m22: 1, vx: 1, vy: 1, tau: 1, eigen: "show" }, choices: { eigen: ["show", "hide"] }, choiceLabels: { eigen: { show: "显示实特征方向", hide: "隐藏实特征方向" } },
  controls: [["m11", "a₁₁", "矩阵第1行第1列", -5, 5, .1, ""], ["m12", "a₁₂", "矩阵第1行第2列", -5, 5, .1, ""], ["m21", "a₂₁", "矩阵第2行第1列", -5, 5, .1, ""], ["m22", "a₂₂", "矩阵第2行第2列", -5, 5, .1, ""], ["vx", "vₓ", "输入向量x分量", -5, 5, .1, ""], ["vy", "vᵧ", "输入向量y分量", -5, 5, .1, ""], ["tau", "τ", "变换进度", 0, 1, .01, ""]],
  presets: [["旋转90°", { m11: 0, m12: -1, m21: 1, m22: 0, vx: 1, vy: 1, tau: 1, eigen: "show" }], ["剪切与重特征值", { m11: 1, m12: 1, m21: 0, m22: 1, vx: 1, vy: 1, tau: 1, eigen: "show" }], ["压缩到直线", { m11: 1, m12: 1, m21: 0, m22: 0, vx: 1, vy: 1, tau: 1, eigen: "show" }]],
  presetDescriptions: ["将向量(1,1)逆时针旋转90°，核对长度和单位正方形面积，并判断是否存在实特征方向。", "用矩阵[[1,1],[0,1]]变换网格；特征值都是1，检验独立特征方向有几个。", "用矩阵[[1,1],[0,0]]变换向量和平面区域，解释det=0为何不能唯一还原输入向量。"],
  hint: "拖动橙色输入向量；方向键微调。填色区域为单位正方形的像，虚线为实特征方向。",
  question: "行列式为0时发生了什么？平面旋转矩阵总有实特征方向吗？",
  answer: "行列式为0表示面积被压缩为0，二维线性映射不可逆。除0°和180°等情形外，二维旋转没有保持在同一直线上的非零实向量，对应特征值为共轭复数。",
  note: "使用二维实矩阵和列向量，矩阵列分别是两个标准基的像。det为有向面积倍率，绝对值为面积倍率。Aτ=(1−τ)I+τA是可视化插值，不保证中途可逆，也不表示唯一运动路径。特征值由2×2特征方程求解；复根只列读数，重根区分标量矩阵与单独特征方向。近重根时方向对输入误差敏感。图窗裁切和缩放不会改变矩阵计算。",
  renderControls: () => uniRenderControls(uniLinearModel), setParam: uniSetParam, bind: uniBindStage, draw: uniLinearDraw, readout: uniLinearReadout,
  notice(p) { const d = window.ZhixiangUniversityMath.linearData(p); return d.valid ? d.nearSingular && !d.singular ? "当前矩阵接近奇异，保留非零行列式；逆运算会放大参数误差。" : `当前${d.orientation}；${d.classification}。` : d.reason; },
};
ZhixiangModels.register(uniLinearModel);
