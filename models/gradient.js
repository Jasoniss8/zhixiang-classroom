"use strict";
const uniGradientCache = new Map();
let uniGradientDragMode = "point";
function uniGradientNumber(value) { return Number.isFinite(value) ? Math.abs(value) > 0 && Math.abs(value) < 1e-5 ? value.toExponential(4) : String(Number(value.toPrecision(7))) : "—"; }
function uniGradientGeometry(p) {
  const key = [p.surface, p.a, p.b, p.c, p.d, p.e, p.f].join("|");
  if (uniGradientCache.has(key)) return uniGradientCache.get(key);
  const U = window.ZhixiangUniversityMath, mesh = U.gradientMesh(p, 41), zs = mesh.vertices.map(v => v[2]);
  const min = Math.min(...zs), max = Math.max(...zs), levels = max === min ? [] : Array.from({ length: 9 }, (_, i) => min + (max - min) * (i + 1) / 10);
  const data = { mesh, min, max, contours: U.gradientContours(p, levels, 41) };
  uniGradientCache.set(key, data); if (uniGradientCache.size > 12) uniGradientCache.delete(uniGradientCache.keys().next().value);
  return data;
}
function uniGradientProjector(p, w, h, geometry) {
  const yaw = p.yaw * Math.PI / 180, pitch = p.pitch * Math.PI / 180;
  const zScale = Math.min(1, 5 / Math.max(1, Math.abs(geometry.min), Math.abs(geometry.max)));
  const rotate = v => {
    const horizontal = v[0] * Math.cos(yaw) - v[1] * Math.sin(yaw), depth = v[0] * Math.sin(yaw) + v[1] * Math.cos(yaw), z = v[2] * zScale;
    return [horizontal, z * Math.cos(pitch) - depth * Math.sin(pitch), depth * Math.cos(pitch) + z * Math.sin(pitch)];
  };
  const rotated = geometry.mesh.vertices.map(rotate), bounds = [Math.min(...rotated.map(v => v[0]), -3), Math.max(...rotated.map(v => v[0]), 3), Math.min(...rotated.map(v => v[1]), -2), Math.max(...rotated.map(v => v[1]), 3)];
  const scale = Math.min((w - 58) / (bounds[1] - bounds[0]), (h - 106) / (bounds[3] - bounds[2])) * .88 * p.scale;
  const cx = (bounds[0] + bounds[1]) / 2, cy = (bounds[2] + bounds[3]) / 2;
  const project = v => { const q = rotate(v); return [w / 2 + (q[0] - cx) * scale, 66 + (h - 94) / 2 - (q[1] - cy) * scale, q[2]]; };
  return { project, zScale };
}
function uniGradientDraw(ctx, w, h, p) {
  const U = window.ZhixiangUniversityMath, data = U.gradientData(p);
  if (!data.valid) { text(ctx, data.reason || "函数条件无效。", 25, 40, 14, PALETTE.orange); return; }
  const geometry = uniGradientGeometry(p), stacked = w < 620;
  const leftW = stacked ? w : w * .46, rightW = stacked ? w : w - leftW - 10, ph = stacked ? (h - 12) / 2 : h;
  const rx = stacked ? 0 : leftW + 10, ry = stacked ? ph + 12 : 0;
  const plot = makePlot(ctx, leftW, ph, { xmin: -3.1, xmax: 3.1, ymin: -3.1, ymax: 3.1, equal: true, left: 42, right: 18, top: 60, bottom: 35 });
  text(ctx, "等高线与梯度", 22, 21, 13, PALETTE.deep);
  text(ctx, "拖动 P；方向箭头按单位长度显示", 22, 41, 10.5, PALETTE.muted);
  plot.clip();
  for (const contour of geometry.contours) {
    ctx.beginPath(); ctx.strokeStyle = "#92ac99"; ctx.lineWidth = 1.15;
    for (const segment of contour.segments) { ctx.moveTo(plot.x(segment[0][0]), plot.y(segment[0][1])); ctx.lineTo(plot.x(segment[1][0]), plot.y(segment[1][1])); }
    ctx.stroke();
    const sample = contour.segments[Math.floor(contour.segments.length / 3)];
    if (sample && state.labels) text(ctx, uniGradientNumber(contour.level), plot.x(sample[0][0]) + 3, plot.y(sample[0][1]) - 4, 9, "#78947e");
  }
  const drawDirection = (v, label, color, length = 1) => {
    const to = [p.x0 + length * v[0], p.y0 + length * v[1]];
    arrow(ctx, plot.x(p.x0), plot.y(p.y0), plot.x(to[0]), plot.y(to[1]), color, 2, 6);
    text(ctx, label, plot.x(to[0]) + 6, plot.y(to[1]) - 9, 11, color);
  };
  if (!data.stationary) drawDirection([data.fx / data.norm, data.fy / data.norm], "∇f 方向", PALETTE.green, 1.15);
  drawDirection(data.unit, "u", PALETTE.purple);
  circle(ctx, plot.x(p.x0), plot.y(p.y0), 5.5, PALETTE.orange, "white", 1.5);
  text(ctx, "P", plot.x(p.x0) - 10, plot.y(p.y0) - 12, 12, PALETTE.orange);
  plot.end();
  ctx.save(); ctx.translate(rx, ry);
  text(ctx, "曲面与切平面", 18, 21, 13, PALETTE.deep);
  const camera = uniGradientProjector(p, rightW, ph, geometry), project = camera.project;
  text(ctx, `拖动旋转 · z显示比例 ${uniGradientNumber(camera.zScale)}×`, 18, 41, 10.5, PALETTE.muted);
  ctx.save(); ctx.beginPath(); ctx.rect(5, 55, rightW - 10, ph - 77); ctx.clip();
  const projected = geometry.mesh.vertices.map(project);
  const faces = geometry.mesh.faces.map(face => ({ face, depth: face.reduce((s, i) => s + projected[i][2], 0) / 4 })).sort((a, b) => a.depth - b.depth);
  for (const entry of faces) {
    const mean = entry.face.reduce((sum, i) => sum + geometry.mesh.vertices[i][2], 0) / 4;
    const fraction = geometry.max > geometry.min ? (mean - geometry.min) / (geometry.max - geometry.min) : .5;
    ctx.beginPath(); entry.face.forEach((index, i) => i ? ctx.lineTo(projected[index][0], projected[index][1]) : ctx.moveTo(projected[index][0], projected[index][1])); ctx.closePath();
    ctx.fillStyle = `hsl(137, ${18 + fraction * 14}%, ${87 - fraction * 20}%)`; ctx.fill();
    ctx.strokeStyle = "rgba(100,143,115,.23)"; ctx.lineWidth = .4; ctx.stroke();
  }
  const line3 = (a, b, color, width = 1.2, dash = []) => { const aa = project(a), bb = project(b); line(ctx, aa[0], aa[1], bb[0], bb[1], color, width, dash); };
  const arrow3 = (a, b, label, color) => { const aa = project(a), bb = project(b); arrow(ctx, aa[0], aa[1], bb[0], bb[1], color, 1.6, 5); text(ctx, label, bb[0] + 6, bb[1] - 8, 10, color); };
  arrow3([0, 0, 0], [3.3, 0, 0], "x", "#6e8995"); arrow3([0, 0, 0], [0, 3.3, 0], "y", "#6e8995"); arrow3([0, 0, 0], [0, 0, 3 / camera.zScale], "z", "#6e8995");
  const tangent = (dx, dy) => [p.x0 + dx, p.y0 + dy, data.value + data.fx * dx + data.fy * dy];
  const plane = [[-.75, -.75], [.75, -.75], [.75, .75], [-.75, .75]].map(([dx, dy]) => project(tangent(dx, dy)));
  ctx.beginPath(); plane.forEach((v, i) => i ? ctx.lineTo(v[0], v[1]) : ctx.moveTo(v[0], v[1])); ctx.closePath(); ctx.fillStyle = "rgba(190,151,93,.28)"; ctx.fill(); ctx.strokeStyle = "#ba9154"; ctx.lineWidth = 1.1; ctx.stroke();
  const point = [p.x0, p.y0, data.value], screenPoint = project(point);
  line3([p.x0, p.y0, 0], point, "#d1a66f", 1.2, [3, 3]);
  arrow3(point, tangent(.55, 0), "fₓ", "#73789b"); arrow3(point, tangent(0, .55), "fᵧ", "#548d89");
  arrow3(point, tangent(.8 * data.unit[0], .8 * data.unit[1]), "Dᵤf", PALETTE.purple);
  circle(ctx, screenPoint[0], screenPoint[1], 5, PALETTE.orange, "white", 1.3);
  ctx.restore(); ctx.restore();
  stageInfo = { kind: "university", plot, surfacePane: { x: rx, y: ry, w: rightW, h: ph }, uniDrag(point) {
    if (point.phase === "start") {
      if (point.x >= rx && point.x <= rx + rightW && point.y >= ry + 55 && point.y <= ry + ph - 20) uniGradientDragMode = "rotate";
      else if (point.x >= plot.left && point.x <= leftW - plot.right && point.y >= plot.top && point.y <= ph - plot.bottom) uniGradientDragMode = "point";
      else return false;
    }
    if (point.phase === "end") return true;
    if (uniGradientDragMode === "rotate") {
      if (point.phase !== "start") { uniSetParam("yaw", ((state.p.yaw + (point.dx || 0) * .6 + 540) % 360) - 180); uniSetParam("pitch", clamp(state.p.pitch + (point.dy || 0) * .4, -75, 75)); }
    } else { uniSetParam("x0", clamp(plot.ix(point.x), -3, 3)); uniSetParam("y0", clamp(plot.iy(point.y), -3, 3)); }
    return true;
  }, uniWheel(delta) { uniSetParam("scale", clamp(state.p.scale * Math.exp(-delta * .001), .55, 1.8)); return true; }, uniKey(key, event) {
    if (key === "+" || key === "=" || key === "-") { uniSetParam("scale", clamp(state.p.scale + (key === "-" ? -.1 : .1), .55, 1.8)); return true; }
    const move = { ArrowLeft: ["x0", -.1], ArrowRight: ["x0", .1], ArrowDown: ["y0", -.1], ArrowUp: ["y0", .1] }[key];
    if (!move) return false;
    if (event?.shiftKey) { const k = move[0] === "x0" ? "yaw" : "pitch", amount = move[1] * 30; uniSetParam(k, k === "yaw" ? ((state.p[k] + amount + 540) % 360) - 180 : clamp(state.p[k] + amount, -75, 75)); }
    else uniSetParam(move[0], clamp(state.p[move[0]] + move[1], -3, 3));
    return true;
  } };
}
function uniGradientReadout(p) {
  const d = window.ZhixiangUniversityMath.gradientData(p), n = uniGradientNumber;
  if (!d.valid) return { formula: "∇f=(fₓ,fᵧ)", caption: d.reason, metrics: [] };
  return { formula: `∇f=(${n(d.fx)}, ${n(d.fy)})；u=(${d.unit.map(n).join(", ")})；Dᵤf=∇f·u=${n(d.directional)}`,
    caption: "坐标与函数值无量纲，方向角从+x轴逆时针计算。曲面显示缩放不改变偏导数。",
    metrics: [["f(P)", n(d.value), ""], ["∂f/∂x", n(d.fx), ""], ["∂f/∂y", n(d.fy), ""], ["|∇f|", n(d.norm), ""], ["方向导数", n(d.directional), ""], ["差分对照误差", n(d.errors.directional), ""]],
    details: [["切平面", `z=${n(d.value)}+(${n(d.fx)})(x−${n(p.x0)})+(${n(d.fy)})(y−${n(p.y0)})`], ["中心差分", `δ=${n(d.delta)}；fₓ差值${n(d.errors.fx)}；fᵧ差值${n(d.errors.fy)}`], ["驻点", d.stationary ? "梯度为零（数值容差1e−12），归一方向未定义；仅凭梯度不能判断极大、极小或鞍点。" : "梯度指向该点局部增长最快的方向，与光滑等高线切向量垂直。"], ["显示近似", "曲面41×41采样；等高线作分段线性插值。切平面与导数直接使用解析式。"]] };
}
const uniGradientModel = {
  id: "gradient", cat: "math", level: "大学基础", title: "偏导数、梯度与切平面", desc: "联动等高线、曲面和切平面，观察方向导数。", tags: "大学 高等数学 多元微积分 偏导 梯度 方向导数 切平面 三维", university: true, keepNumericPrecision: true, threeD: true, geometryUI: false, time: false,
  defaults: { surface: "quadratic", a: .5, b: 0, c: .5, d: 0, e: 0, f: 0, x0: 1, y0: 1, theta: 30, yaw: -35, pitch: 28, scale: 1 }, choices: { surface: ["quadratic", "wave", "gaussian"] }, choiceLabels: { surface: { quadratic: "ax²+bxy+cy²+dx+ey+f", wave: "sin x cos y", gaussian: "exp(−x²−y²)" } },
  controls: [["a", "a", "x²系数", -3, 3, .1, ""], ["b", "b", "xy系数", -3, 3, .1, ""], ["c", "c", "y²系数", -3, 3, .1, ""], ["d", "d", "x系数", -3, 3, .1, ""], ["e", "e", "y系数", -3, 3, .1, ""], ["f", "f", "常数项", -3, 3, .1, ""], ["x0", "x₀", "观察点x坐标", -3, 3, .01, ""], ["y0", "y₀", "观察点y坐标", -3, 3, .01, ""], ["theta", "θ", "单位方向角", -180, 180, 1, "°"], ["yaw", "", "曲面水平视角", -180, 180, 1, "°"], ["pitch", "", "曲面俯仰视角", -75, 75, 1, "°"], ["scale", "", "曲面缩放", .55, 1.8, .05, "×"]],
  controlVisible(key, p) { return !["a", "b", "c", "d", "e", "f"].includes(key) || p.surface === "quadratic"; },
  presets: [["抛物面", { surface: "quadratic", a: .5, b: 0, c: .5, d: 0, e: 0, f: 0, x0: 1, y0: 1, theta: 30 }], ["鞍点", { surface: "quadratic", a: 1, b: 0, c: -1, d: 0, e: 0, f: 0, x0: 0, y0: 0, theta: 45 }], ["高斯曲面", { surface: "gaussian", a: .5, b: 0, c: .5, d: 0, e: 0, f: 0, x0: .7, y0: .4, theta: -150 }]],
  presetDescriptions: ["对f=(x²+y²)/2，求P=(1,1)处沿30°方向的方向导数，再把方向转到梯度方向比较。", "对f=x²−y²，考察原点沿x轴和y轴的变化，解释梯度为零为何不是极值的充分条件。", "在f=exp(−x²−y²)的P=(0.7,0.4)处寻找最大增长方向，并与等高线比较。"],
  hint: "左图拖动P；右图拖动旋转、滚轮缩放。方向键移动P，Shift＋方向键转动视角。",
  question: "梯度为零就一定是极值点吗？方向导数的最大值与梯度有什么关系？",
  answer: "梯度为零只是驻点条件，x²−y²在原点是鞍点。对可微函数，单位方向u上的方向导数为∇f·u，最大值为|∇f|，在梯度方向取得；梯度为零时所有方向的一阶变化都为零。",
  note: "只使用给定的光滑函数族，未提供任意表达式解析。二次曲面的偏导由解析式计算；sin x cos y与exp(−x²−y²)同样采用解析偏导。中心差分步长约为∛ε·max(1,|x₀|,|y₀|)，用于数值对照。曲面采样41×41，等高线通过单元格线性插值；显示误差不进入函数值、梯度或方向导数。曲面可使用标注的竖直压缩比例，坐标仍是数学(x,y,z)。方向箭头归一显示，梯度模另列读数。切平面仅描述点附近的一阶近似。",
  renderControls: () => uniRenderControls(uniGradientModel), setParam: uniSetParam, bind: uniBindStage, draw: uniGradientDraw, readout: uniGradientReadout,
  notice(p) { const d = window.ZhixiangUniversityMath.gradientData(p); return !d.valid ? d.reason : d.stationary ? "梯度为零；不能只凭这个条件判断极值。" : "方向导数使用单位方向；箭头显示方向，梯度模见读数。"; },
};
ZhixiangModels.register(uniGradientModel);
