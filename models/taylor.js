"use strict";
let uniTaylorDragTarget = "probe";
function uniTaylorNumber(value) {
  return Number.isFinite(value) ? Math.abs(value) > 0 && (Math.abs(value) < 1e-5 || Math.abs(value) > 1e6) ? value.toExponential(4) : String(Number(value.toPrecision(7))) : "—";
}
function uniTaylorYRange(values) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return { ymin: -1, ymax: 1 };
  const low = Math.min(0, v[Math.floor(v.length * .04)]), high = Math.max(0, v[Math.min(v.length - 1, Math.floor(v.length * .96))]);
  const gap = Math.max(.2, (high - low) * .14);
  return { ymin: low - gap, ymax: high + gap };
}
function uniTaylorDraw(ctx, w, h, p, comparison) {
  const U = window.ZhixiangUniversityMath, d = U.taylorData(p), stacked = w < 620;
  const pw = stacked ? w : (w - 12) / 2, ph = stacked ? (h - 12) / 2 : h;
  const xmin = p.center - p.span, xmax = p.center + p.span, xs = Array.from({ length: 321 }, (_, i) => xmin + (xmax - xmin) * i / 320);
  const plots = [];
  for (let panel = 0; panel < 2; panel++) {
    const dx = stacked ? 0 : panel * (pw + 12), dy = stacked ? panel * (ph + 12) : 0;
    ctx.save(); ctx.translate(dx, dy);
    const values = xs.map(x => panel ? U.taylorValue(p, x) - U.taylorFunction(p, x) : U.taylorFunction(p, x));
    const plot = makePlot(ctx, pw, ph, { xmin, xmax, ...uniTaylorYRange(values), equal: false, left: 48, right: 22, top: 62, bottom: 34 });
    plots.push({ plot, dx, dy });
    text(ctx, panel ? "误差 Tₙ(x) − f(x)" : "原函数与泰勒多项式", plot.left, 21, 13, PALETTE.deep);
    text(ctx, panel ? "同一横轴；纵轴独立缩放" : `绿色 f(x) · 紫色 T${p.degree}(x)`, plot.left, 41, 11, PALETTE.muted);
    if (d.valid && Number.isFinite(d.radius)) {
      plot.clip(); ctx.fillStyle = "rgba(205,160,97,.09)";
      const lo = p.center - d.radius, hi = p.center + d.radius;
      if (xmin < lo) ctx.fillRect(plot.left, plot.top, Math.max(0, plot.x(lo) - plot.left), plot.ph);
      if (xmax > hi) ctx.fillRect(plot.x(hi), plot.top, Math.max(0, pw - plot.right - plot.x(hi)), plot.ph);
      plot.end();
    }
    const discontinuities = ["log", "reciprocal"].includes(p.kind) ? [0] : [];
    if (!panel) plotCurve(ctx, plot, x => U.taylorFunction(p, x), PALETTE.green, 2.4, [], discontinuities);
    if (d.valid) {
      plotCurve(ctx, plot, x => panel ? U.taylorValue(p, x) - U.taylorFunction(p, x) : U.taylorValue(p, x), PALETTE.purple, 2, [], panel ? discontinuities : []);
      if (comparison) plotCurve(ctx, plot, x => panel ? U.taylorValue(comparison, x) - U.taylorFunction(comparison, x) : U.taylorValue(comparison, x), PALETTE.orange, 1.3, [4, 4], panel ? discontinuities : []);
      plot.clip();
      line(ctx, plot.x(p.center), plot.top, plot.x(p.center), ph - plot.bottom, "#b1bcb3", 1, [3, 4]);
      line(ctx, plot.x(p.probe), plot.top, plot.x(p.probe), ph - plot.bottom, PALETTE.orange, 1, [3, 3]);
      if (!panel) circle(ctx, plot.x(p.center), plot.y(U.taylorFunction(p, p.center)), 5, PALETTE.green, "white", 1.5);
      const y = panel ? d.error : d.approx;
      if (Number.isFinite(y)) circle(ctx, plot.x(p.probe), plot.y(y), 5, PALETTE.orange, "white", 1.5);
      plot.end();
    } else text(ctx, d.reason, plot.left, ph / 2, 12, PALETTE.orange);
    ctx.restore();
  }
  stageInfo = { kind: "university", plots, uniDrag(point) {
    const pane = plots.find(({ plot, dx, dy }) => point.x >= dx + plot.left && point.x <= dx + pw - plot.right && point.y >= dy + plot.top && point.y <= dy + ph - plot.bottom);
    if (!pane) return false;
    if (point.phase === "start") uniTaylorDragTarget = Math.abs(point.x - pane.dx - pane.plot.x(state.p.center)) < 11 ? "center" : "probe";
    const limit = uniTaylorDragTarget === "center" ? 5 : 8;
    if (point.phase !== "end") uniSetParam(uniTaylorDragTarget, clamp(pane.plot.ix(point.x - pane.dx), -limit, limit));
    return true;
  }, uniWheel(delta) { uniSetParam("span", clamp(state.p.span * Math.exp(delta * .001), .5, 6)); return true; }, uniKey(key) {
    if (!["ArrowLeft", "ArrowRight"].includes(key)) return false;
    uniSetParam("probe", clamp(state.p.probe + (key === "ArrowLeft" ? -.1 : .1), -8, 8)); return true;
  } };
}
function uniTaylorReadout(p) {
  const d = window.ZhixiangUniversityMath.taylorData(p), n = uniTaylorNumber;
  if (!d.valid) return { formula: "Tₙ(x)=Σ f⁽ᵏ⁾(a)(x−a)ᵏ/k!", caption: d.reason, metrics: [] };
  return { formula: `T${p.degree}(x) = Σₖ₌₀ⁿ cₖ(x − ${n(p.center)})ᵏ，cₖ=f⁽ᵏ⁾(a)/k!`,
    caption: `x、y无量纲；三角函数用弧度。收敛区间 ${d.interval}。${d.conservativeRadius ? "A=0时仍保留原函数的定义域与保守区间提示。" : ""}`,
    metrics: [["展开点 a", n(p.center), ""], ["阶数 n", p.degree, ""], ["观察点 x", n(p.probe), ""], ["f(x)", n(d.value), ""], ["Tₙ(x)", n(d.approx), ""], ["绝对误差", n(d.absError), ""]],
    details: [["系数（从常数项起）", d.coefficients.map((c, i) => `c${i}=${n(c)}`).join("；")], ["观察点范围", !d.domainValid ? "观察点不在原函数定义域内，函数值和误差未定义。" : d.converges ? "观察点位于标示的级数收敛区间。有限阶近似仍有误差。" : "观察点位于收敛区间外；有限多项式可以计算，但不能据此推断级数收敛。"], ["计算", "系数使用解析公式，按Horner法计算多项式，不反复做高阶数值微分。图窗裁切不改变数值。"]] };
}
const uniTaylorModel = {
  id: "taylor", cat: "math", level: "大学基础", title: "泰勒展开与近似误差", desc: "调整展开点与阶数，对照函数、近似多项式和误差。", tags: "大学 高等数学 微积分 泰勒 麦克劳林 局部近似 余项 收敛", university: true, keepNumericPrecision: true, time: false, compare: true,
  defaults: { kind: "sin", amp: 1, offset: 0, center: 0, degree: 5, probe: 1, span: 3 },
  choices: { kind: ["sin", "cos", "exp", "log", "reciprocal"] }, choiceLabels: { kind: { sin: "A sin x + D", cos: "A cos x + D", exp: "A eˣ + D", log: "A ln x + D", reciprocal: "A/x + D" } },
  controls: [["amp", "A", "函数系数", -3, 3, .1, ""], ["offset", "D", "常数项", -4, 4, .1, ""], ["center", "a", "展开点", -5, 5, .01, ""], ["degree", "n", "展开阶数", 0, 12, 1, ""], ["probe", "x", "观察点", -8, 8, .01, ""], ["span", "", "横轴半宽", .5, 6, .1, ""]],
  presets: [["sin x 五阶", { kind: "sin", amp: 1, offset: 0, center: 0, degree: 5, probe: 1, span: 3 }], ["指数函数", { kind: "exp", amp: 1, offset: 0, center: 0, degree: 4, probe: 1, span: 2 }], ["对数的收敛边界", { kind: "log", amp: 1, offset: 0, center: 1, degree: 6, probe: 2.5, span: 2 }]],
  presetDescriptions: ["将sin x在0展开到五阶，比较x=1处的近似值与真实值，并检查六阶是否改变多项式。", "用eˣ在0的四阶多项式估计e，观察x从0移到1时误差怎样变化。", "将ln x在1展开到六阶，比较x=2与x=2.5；后者超出级数收敛区间。"],
  hint: "拖动绿色展开点或橙色观察线；滚轮缩放横轴。浅橙区域不在标示的级数收敛区间内。",
  question: "提高展开阶数，整个实数轴上的近似都会越来越准确吗？",
  answer: "不会。泰勒展开首先描述展开点附近的行为。ln x 与1/x 的级数有有限收敛范围；范围外即使某个有限阶看起来接近，也不能据此判断级数收敛。",
  note: "有限阶多项式由解析导数系数构成，使用Horner法求值。sin、cos、exp 的级数在全部实数收敛。ln x 在a>0处展开，收敛区间为(0,2a]，左端0不在定义域；1/x 在a≠0处展开，收敛区间为|x−a|<|a|，两端均不收敛。A=0时保留原函数定义域与保守区间提示。函数值、误差和系数均在数学坐标计算；图窗适当裁切极端值。阶数限制0–12，不提供任意表达式或符号求导。",
  renderControls: () => uniRenderControls(uniTaylorModel), setParam: uniSetParam, bind: uniBindStage, draw: uniTaylorDraw, readout: uniTaylorReadout,
  normalize(p) { p.degree = Math.round(p.degree); return p; },
  notice(p) { const d = window.ZhixiangUniversityMath.taylorData(p); return !d.valid ? d.reason : !d.domainValid ? "观察点不在函数定义域内。" : !d.converges ? "观察点超出级数收敛区间；请结合误差读数理解。" : "拖动展开点或观察点，查看同一横轴位置的误差。"; },
  exportData() {
    const p = { ...state.p }, q = state.compare && { ...state.compare }, U = window.ZhixiangUniversityMath;
    const columns = [exportColumn("x"), exportColumn("f"), exportColumn("T_n"), exportColumn("T_n_minus_f")];
    const series = [exportSeries("f(x)", 0, 1, 0, ["log", "reciprocal"].includes(p.kind) ? [0] : []), exportSeries("Tₙ(x)", 0, 2, 2)];
    if (q) { columns.push(exportColumn("f_comparison"), exportColumn("T_n_comparison"), exportColumn("error_comparison")); series.push(exportSeries("保留Tₙ(x)", 0, 5, 1)); }
    return [{ name: "泰勒近似", columns, rows: samplesBetween(p.center - p.span, p.center + p.span).map(x => { const f = U.taylorFunction(p, x), t = U.taylorValue(p, x); return [x, f, t, t - f, ...(q ? [U.taylorFunction(q, x), U.taylorValue(q, x), U.taylorValue(q, x) - U.taylorFunction(q, x)] : [])]; }), series, xLabel: "x（无量纲）", yLabel: "函数值（无量纲）", note: `展开点${p.center}，阶数${p.degree}；原函数定义域外留空，有限多项式不代表区间外收敛。` }];
  },
};
ZhixiangModels.register(uniTaylorModel);
