"use strict";

function uniFourierBounds(p) {
  const center = Math.floor((p.probe + p.period) / (2 * p.period)) * 2 * p.period;
  return { xmin: center - p.period, xmax: center + p.period, ymin: -1.5 * p.amplitude, ymax: 1.5 * p.amplitude };
}
function uniFourierBreaks(p, lo, hi) {
  if (p.kind === "triangle") return [];
  const gap = p.period / (p.kind === "square" ? 2 : 1), offset = p.period * p.phase / (2 * Math.PI) + (p.kind === "sawtooth" ? p.period / 2 : 0), result = [];
  for (let n = Math.ceil((lo - offset) / gap); n <= Math.floor((hi - offset) / gap); n++) result.push(offset + n * gap);
  return result;
}
function uniFourierTrace(ctx, plot, p, target, color, dash = [], harmonic = 0) {
  const D = window.ZhixiangUniversityDynamics, count = Math.max(801, Math.max(p.terms,harmonic) * 40), breaks = target ? uniFourierBreaks(p, plot.xmin, plot.xmax) : [];
  plot.clip();ctx.beginPath();ctx.strokeStyle = color;ctx.lineWidth = target ? 1.4 : 2.2;ctx.setLineDash(dash);
  let previous = null;
  for (let i = 0; i <= count; i++) {
    const x = plot.xmin + (plot.xmax - plot.xmin) * i / count, y = harmonic ? D.fourierCoefficient(p,harmonic).b*Math.sin(harmonic*(2*Math.PI*x/p.period-p.phase)) : target ? D.fourierTarget(p, x) : D.fourierSum(p, x);
    if (previous === null || breaks.some(b => b >= previous && b <= x)) ctx.moveTo(plot.x(x), plot.y(y));
    else ctx.lineTo(plot.x(x), plot.y(y));
    previous = x;
  }
  ctx.stroke();ctx.setLineDash([]);plot.end();
}
function drawUniversityFourier(ctx, w, h, p, comparison) {
  const D = window.ZhixiangUniversityDynamics, d = D.fourierData(p), mainH = Math.round(h * .65), bounds = uniFourierBounds(p);
  if (!d.valid) { text(ctx, d.message, 24, 42, 13, PALETTE.orange);return; }
  const plot = makePlot(ctx, w, mainH, { ...bounds, equal: false, top: 52, left: 45, bottom: 34, xLabel: p.axisUnit === "s" ? "t / s" : "x / 1", yLabel: "y / 1" });
  text(ctx, "绿：部分和　灰：目标　紫：所选谐波", plot.left, 19, 11, PALETTE.deep);
  if (comparison) uniFourierTrace(ctx, plot, comparison, false, PALETTE.orange, [5, 4]);
  uniFourierTrace(ctx, plot, p, true, "#96a19b", [4, 3]);
  uniFourierTrace(ctx, plot, p, false, PALETTE.purple, [2,3], p.harmonic);
  uniFourierTrace(ctx, plot, p, false, PALETTE.green);
  plot.clip();line(ctx, plot.x(p.probe), plot.top, plot.x(p.probe), mainH - plot.bottom, PALETTE.orange, 1, [3, 3]);
  for(const jump of uniFourierBreaks(p,plot.xmin,plot.xmax))circle(ctx,plot.x(jump),plot.y(0),3,"#fff","#7d8981",1.2);
  circle(ctx, plot.x(p.probe), plot.y(D.fourierSum(p, p.probe)), 5, PALETTE.orange);plot.end();
  ctx.save();ctx.translate(0, mainH);
  const spectrum = makePlot(ctx, w, h - mainH, { xmin: 0, xmax: Math.max(6, p.terms + 1), ymin: 0, ymax: 1.5 * p.amplitude, equal: false, top: 33, bottom: 28, left: 45, xLabel: "谐波次数 n", yLabel: "|bₙ|" });
  text(ctx, `N=${p.terms}，非零 ${d.activeTerms} 项；所选 n=${p.harmonic}${p.harmonic>p.terms?" 未计入":""}`, spectrum.left, 13, 11, PALETTE.deep);
  spectrum.clip();for (const c of d.coefficients) { line(ctx, spectrum.x(c.n), spectrum.y(0), spectrum.x(c.n), spectrum.y(c.amplitude), PALETTE.green, 2);circle(ctx, spectrum.x(c.n), spectrum.y(c.amplitude), 2.5, PALETTE.green); }spectrum.end();ctx.restore();
  stageInfo = { kind: "university", plot, uniDrag: pt => {
    if (pt.phase === "start" && (pt.y < plot.top || pt.y > mainH - plot.bottom)) return false;
    if (pt.phase !== "end") uniSetParam("probe", clamp(plot.ix(pt.x), -40, 40));
    return true;
  }, uniKey: key => { if (!["ArrowLeft", "ArrowRight"].includes(key)) return false;uniSetParam("probe", clamp(state.p.probe + (key === "ArrowRight" ? 1 : -1) * state.p.period / 100, -40, 40));return true; } };
}
function universityFourierExport() {
  const D = window.ZhixiangUniversityDynamics, p = state.p, q = state.compare, bounds = uniFourierBounds(p), count = Math.max(800, Math.max(p.terms, p.harmonic, q?.terms || 0) * 40), d = D.fourierData(p);
  const columns = [exportColumn(p.axisUnit === "s" ? "t" : "x", p.axisUnit), exportColumn("target"), exportColumn("partial_sum"),exportColumn("selected_harmonic"),exportColumn("error")],
    series = [exportSeries("目标波形", 0, 1, 3, uniFourierBreaks(p, bounds.xmin, bounds.xmax)), exportSeries("部分和", 0, 2, 0),exportSeries("所选单个谐波",0,3,2)];
  if (q) { columns.push(exportColumn("comparison"));series.push(exportSeries("保留部分和", 0, 5, 1)); }
  return [{ name: "傅里叶部分和", columns, series, bounds, rows: samplesBetween(bounds.xmin, bounds.xmax, count).map(x => [x, D.fourierTarget(p, x), D.fourierSum(p, x),D.fourierCoefficient(p,p.harmonic).b*Math.sin(p.harmonic*(2*Math.PI*x/p.period-p.phase)),D.fourierSum(p,x)-D.fourierTarget(p,x), ...(q ? [D.fourierSum(q, x)] : [])]), xLabel: p.axisUnit === "s" ? "t / s" : "x / 1", yLabel: "y / 1", note: "N 为最高谐波次数；目标波形在跳跃点取左右平均值，SVG 在跳跃点断开。error=部分和−目标值。" },
    { name: "谐波频谱", columns: [exportColumn("n"), exportColumn("a_n"), exportColumn("b_n"), exportColumn("amplitude"),...(q?[exportColumn("amplitude_comparison")]:[])], rows: Array.from({length:Math.max(p.terms,q?.terms||0)},(_,i)=>{const n=i+1,b=n<=p.terms?D.fourierCoefficient(p,n).b:0;return[n,0,b,Math.abs(b),...(q?[n<=q.terms?Math.abs(D.fourierCoefficient(q,n).b):0]:[])];}), series: [exportSeries("谐波振幅", 0, 3),...(q?[exportSeries("保留谐波振幅",0,4,1)]:[])], xLabel: "谐波次数 n", yLabel: "振幅 / 1", note: "系数相对于 θ=2πx/T−φ；幅值为 |bₙ|，不含直流项。" }];
}
ZhixiangModels.register({
  id: "fourier", cat: "math", level: "大学", title: "傅里叶级数与谐波合成", desc: "比较周期波形、部分和与谐波频谱。", tags: "傅里叶 级数 方波 三角波 锯齿波 谐波 Gibbs 频谱 大学", university: true, keepNumericPrecision: true, time: false, compare: true,
  defaults: { kind: "square", amplitude: 1, period: 2 * Math.PI, terms: 5, phase: 0, probe: 0, harmonic:1, axisUnit: "1" },
  choices: { kind: ["square", "sawtooth", "triangle"], axisUnit: ["1", "s"] },
  choiceLabels: { kind: { square: "方波（50% 占空比）", sawtooth: "锯齿波", triangle: "三角波" }, axisUnit: { "1": "无量纲 x", s: "时间 t / s" } },
  controls: [["amplitude", "A", "振幅", .1, 3, .1, "1"], ["period", "T", "周期", .1, 20, .1, "横轴单位"], ["terms", "N", "最高谐波次数", 1, 50, 1, ""], ["harmonic", "n", "所选单个谐波", 1, 50, 1, ""], ["phase", "φ", "相位", -Math.PI, Math.PI, .01, "rad"], ["probe", "xₚ", "探针位置", -40, 40, .01, "横轴单位"]],
  presets: [["方波：前 5 次谐波", { kind: "square", amplitude: 1, period: 2 * Math.PI, terms: 5, phase: 0, probe: 0, harmonic:1, axisUnit: "1" }], ["锯齿波：前 12 次谐波", { kind: "sawtooth", amplitude: 1, period: 2 * Math.PI, terms: 12, phase: 0, probe: 0, harmonic:1, axisUnit: "1" }], ["三角波：前 9 次谐波", { kind: "triangle", amplitude: 1, period: 2 * Math.PI, terms: 9, phase: 0, probe: 0, harmonic:1, axisUnit: "1" }]],
  presetDescriptions: ["给定 A=1、T=2π 的方波，比较 N=5 的部分和与跳跃附近的过冲。", "给定 A=1、T=2π 的锯齿波，观察前12次谐波的符号与振幅。", "给定 A=1、T=2π 的三角波，比较 N=9 的合成结果与 1/n² 衰减。"],
  normalize: p => ({ ...p, terms: Math.max(1, Math.min(50, Math.round(p.terms))),harmonic:Math.max(1,Math.min(50,Math.round(p.harmonic))) }), validate: p => window.ZhixiangUniversityDynamics.fourierValidate(p),
  notice: p => p.kind === "triangle" ? "三角波的非零系数按 1/n² 衰减。" : "不连续点的级数收敛到左右极限平均值；增加 N 不消除 Gibbs 相对过冲。",
  hint: "在波形区拖动橙色探针；方向键微调。N 表示最高次数，偶次零系数也计入。",
  note: "固定零均值波形；方波占空比为 50%。θ=2πx/T−φ，S_N=Σ bₙ sin(nθ)，n=1…N。振幅与函数值无量纲；横轴可选无量纲或秒，周期使用相同单位。方波 bₙ=4A/(πn)（奇数），三角波 bₙ=8A(−1)^((n−1)/2)/(π²n²)（奇数），其余偶次为0；锯齿波 bₙ=2A(−1)^(n+1)/(πn)。频谱基于 θ，平移不改变幅值。RMS 误差由 Parseval 恒等式计算，非屏幕采样估计。",
  question: "方波 N=5 为什么只有三个非零谐波？增大 N 后跳跃附近的过冲会消失吗？", answer: "方波的偶次系数为0，所以 N=5 只含1、3、5次。增加 N 会压缩过冲区域，但相对跳跃高度的最大过冲不趋于0，这就是 Gibbs 现象；跳跃点本身取左右极限的平均值。",
  references: [["MIT OpenCourseWare：Continuous-Time Fourier Series", "https://ocw.mit.edu/courses/res-6-007-signals-and-systems-spring-2011/resources/lecture-7-continuous-time-fourier-series/"]],
  draw: drawUniversityFourier, exportData: universityFourierExport,
  readout: p => { const D = window.ZhixiangUniversityDynamics, d = D.fourierData(p), n = v => String(Number(v.toPrecision(6)));return { formula: "S_N(x) = Σₙ₌₁ᴺ bₙ sin[n(2πx/T − φ)]", caption: `N=${p.terms} 为最高谐波次数；所选 n=${p.harmonic}${p.harmonic>p.terms?" 未计入部分和":""}；跳跃点取平均值`, metrics: [["非零谐波", String(d.activeTerms), "项"], ["周期 RMS 误差", n(d.rmsError), "1"], ["探针部分和", n(D.fourierSum(p, p.probe)), "1"], ["探针目标值", n(D.fourierTarget(p, p.probe)), "1"],["探针误差",n(D.fourierSum(p,p.probe)-D.fourierTarget(p,p.probe)),"1"]] }; },
  renderControls: uniRenderControls, setParam: uniSetParam, bind: uniBindStage, reset: () => {}, parsePrecision: () => 12,
  thumbnail: canvas => { const {ctx,w,h}=setupCanvas(canvas),p={kind:"square",amplitude:1,period:2*Math.PI,terms:5,phase:0};const plot=makePlot(ctx,w,h,{xmin:-Math.PI,xmax:Math.PI,ymin:-1.5,ymax:1.5,equal:false,labels:false,left:15,right:15,top:15,bottom:15});uniFourierTrace(ctx,plot,p,true,"#9ba99e",[4,3]);uniFourierTrace(ctx,plot,p,false,PALETTE.green); }
});
