"use strict";
// conics: model metadata, rendering and lifecycle hooks.

function traceConic(ctx, plot, p, color = PALETTE.green, dash = []) {
  plot.clip();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.4;
  ctx.setLineDash(dash);
  ctx.beginPath();
  const polar = p.mode === "unified" || p.kind === "ellipse";
  for (const branch of p.mode === "standard" && p.kind === "hyperbola"
    ? ["left", "right"]
    : [p.branch]) {
    let last = null,
      sign = null;
    for (let i = 0; i <= 1000; i++) {
      const t = polar ? -180 + (360 * i) / 1000 : -6 + (12 * i) / 1000,
        q = MATH_TOOLS.conicPoint({ ...p, branch }, t);
      const currentSign =
        p.mode === "unified" ? Math.sign(1 + p.e * Math.cos(rad(t))) : 1;
      if (!q) {
        last = null;
        continue;
      }
      const x = plot.x(q.x),
        y = plot.y(q.y);
      if (!Number.isFinite(x + y) || Math.abs(x) > 1e6 || Math.abs(y) > 1e6) {
        last = null;
        continue;
      }
      if (
        !last ||
        sign !== currentSign ||
        Math.hypot(x - last.x, y - last.y) > plot.pw + plot.ph
      )
        ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      last = { x, y };
      sign = currentSign;
    }
  }
  ctx.stroke();
  plot.end();
}

function conicEquation(p, g = MATH_TOOLS.conicGeometry(p)) {
  const x = `(x ${mathSigned(-g.cx)})`,
    y = `(y ${mathSigned(-g.cy)})`;
  if (g.type === "circle")
    return `${x}² + ${y}² = ${mathNumber(g.a * g.a, 10)}`;
  if (g.type === "parabola")
    return `${y}² = ${p.mode === "unified" ? "−" : ""}${mathNumber(2 * p.p)}(x ${mathSigned(-g.vertex.x)})`;
  return `${x}²/${mathNumber(g.a * g.a, 10)} ${g.type === "ellipse" ? "+" : "−"} ${y}²/${mathNumber(g.b * g.b, 10)} = 1`;
}

function drawConics(ctx, w, h, p, comparison) {
  const g = MATH_TOOLS.conicMeasurements(p),
    unified = p.mode === "unified";
  let bounds;
  if (unified)
    bounds = {
      xmin: p.cx - 3 * p.p,
      xmax: p.cx + 3 * p.p,
      ymin: p.cy - 2 * p.p,
      ymax: p.cy + 2 * p.p,
    };
  else if (g.type === "parabola")
    bounds = {
      xmin: p.cx - 1.4 * p.p,
      xmax: p.cx + 5 * p.p,
      ymin: p.cy - 3 * p.p,
      ymax: p.cy + 3 * p.p,
    };
  else
    bounds = {
      xmin: p.cx - g.a * (g.type === "hyperbola" ? 2.5 : 1.6),
      xmax: p.cx + g.a * (g.type === "hyperbola" ? 2.5 : 1.6),
      ymin: p.cy - Math.max(g.b * 1.5, g.a * 0.8),
      ymax: p.cy + Math.max(g.b * 1.5, g.a * 0.8),
    };
  const plot = makePlot(ctx, w, h, {
    ...bounds,
    equal: true,
    left: w < 400 ? 35 : 44,
    right: 25,
    top: 52,
    bottom: 36,
  });
  stageInfo = { kind: "conics", plot, point: g.point };
  if (comparison) traceConic(ctx, plot, comparison, PALETTE.orange, [5, 4]);
  if (state.labels) {
    plot.clip();
    for (const x of g.directrices)
      if (x >= plot.xmin && x <= plot.xmax)
        line(
          ctx,
          plot.x(x),
          plot.top,
          plot.x(x),
          h - plot.bottom,
          PALETTE.purple,
          1.2,
          [5, 4],
        );
    if (g.slope !== null)
      for (const sign of [-1, 1])
        line(
          ctx,
          plot.x(plot.xmin),
          plot.y(g.cy + sign * g.slope * (plot.xmin - g.cx)),
          plot.x(plot.xmax),
          plot.y(g.cy + sign * g.slope * (plot.xmax - g.cx)),
          "#9daeb0",
          1.2,
          [6, 5],
        );
    if (g.point) {
      for (const f of g.foci)
        line(
          ctx,
          plot.x(g.point.x),
          plot.y(g.point.y),
          plot.x(f.x),
          plot.y(f.y),
          "#bc965e",
          1.1,
        );
      if (g.directrices.length)
        line(
          ctx,
          plot.x(g.point.x),
          plot.y(g.point.y),
          plot.x(g.directrices[0]),
          plot.y(g.point.y),
          PALETTE.purple,
          1.2,
          [4, 3],
        );
    }
    plot.end();
  }
  traceConic(ctx, plot, p);
  if (state.labels) {
    g.vertices.forEach((q, i) =>
      mathMarker(ctx, plot, q, `V${i + 1}`, "#758c7b", 3),
    );
    g.foci.forEach((q, i) => {
      if (g.type !== "circle" || i === 0)
        mathMarker(
          ctx,
          plot,
          q,
          g.type === "circle"
            ? "F₁=F₂"
            : g.type === "parabola"
              ? "F"
              : `F${i + 1}`,
          PALETTE.purple,
          4,
        );
    });
    g.directrices.forEach((x, i) => {
      if (x >= plot.xmin && x <= plot.xmax)
        text(
          ctx,
          `l${i + 1}`,
          plot.x(x) + 6,
          plot.top + 13,
          12,
          PALETTE.purple,
        );
    });
  }
  mathMarker(ctx, plot, g.point, "P", PALETTE.orange, 7);
  text(
    ctx,
    `${CONIC_NAMES[g.type]} · e = ${mathNumber(g.e, 4)}`,
    plot.left,
    23,
    13,
    PALETTE.deep,
  );
  const visible =
    g.point &&
    g.point.x >= plot.xmin &&
    g.point.x <= plot.xmax &&
    g.point.y >= plot.ymin &&
    g.point.y <= plot.ymax;
  if (!visible)
    text(
      ctx,
      "P 在视窗外或无穷远，可点击“复位点 P”",
      plot.left,
      h - 14,
      11,
      PALETTE.muted,
    );
}

ZhixiangModels.register({
  id: "conics",
  cat: "math",
  level: "高中",
  title: "圆锥曲线",
  desc: "拖动曲线上的点，核对焦点距离与统一定义。",
  tags: "圆锥曲线 椭圆 双曲线 抛物线 焦点 准线 离心率 渐近线 圆",
  advanced: true,
  compare: true,
  time: false,
  defaults: {
    mode: "standard",
    kind: "ellipse",
    a: 4,
    b: 3,
    p: 2,
    cx: 0,
    cy: 0,
    e: 0.6,
    angle: 45,
    u: 0.6,
    branch: "right",
  },
  choices: {
    mode: ["standard", "unified"],
    kind: ["ellipse", "hyperbola", "parabola"],
    branch: ["left", "right"],
  },
  controls: [
    ["a", "a", "半长轴 / 实半轴", 0.2, 6, 0.1, "单位"],
    ["b", "b", "半短轴 / 虚半轴", 0.1, 6, 0.1, "单位"],
    ["p", "p", "焦参数", 0.2, 4, 0.1, "单位"],
    ["cx", "h", "水平平移", -4, 4, 0.1, "单位"],
    ["cy", "k", "竖直平移", -4, 4, 0.1, "单位"],
    ["e", "e", "离心率", 0, 2, 0.01, ""],
    ["angle", "θ", "点 P 的参数角", -180, 180, 1, "°"],
    ["u", "t", "点 P 的参数", -3, 3, 0.01, ""],
  ],
  presets: [
    [
      "椭圆",
      {
        mode: "standard",
        kind: "ellipse",
        a: 4,
        b: 3,
        cx: 0,
        cy: 0,
        angle: 45,
      },
    ],
    [
      "双曲线",
      {
        mode: "standard",
        kind: "hyperbola",
        a: 2,
        b: 1.5,
        cx: 0,
        cy: 0,
        u: 0.6,
        branch: "right",
      },
    ],
    [
      "抛物线",
      { mode: "standard", kind: "parabola", p: 2, cx: 0, cy: 0, u: 1 },
    ],
    [
      "圆（a=b）",
      {
        mode: "standard",
        kind: "ellipse",
        a: 3,
        b: 3,
        cx: 0,
        cy: 0,
        angle: 45,
      },
    ],
    ["统一定义 e=1", { mode: "unified", e: 1, p: 2, cx: 0, cy: 0, angle: 45 }],
  ],
  hint: "拖动橙色点 P；参数角 / t 也可控制 P。距离使用数学坐标，横纵轴等比例。",
  question:
    "椭圆上 P 到两焦点的距离和为什么不变？e = 1 与 e = 0 分别有什么特殊之处？",
  answer:
    "椭圆的定义给出 |PF₁|+|PF₂|=2a；双曲线满足 ||PF₁|−|PF₂||=2a。抛物线到焦点和准线等距，e=1。圆可视为椭圆 a=b、两焦点重合且 e=0 的边界；圆没有有限准线，距离比只取极限意义。",
  note: "长度为抽象坐标单位，e 无量纲；仅含轴与坐标轴平行的圆锥曲线。椭圆 a>b>0，a=b 单独标为圆；双曲线 a,b>0。标准抛物线 (y−k)²=2p(x−h)，p>0 是焦点到准线的距离，顶点为 (h,k)，没有中心。统一定义固定焦点 F=(h,k) 与半通径 ℓ=p，使用 r=ℓ/(1+e cosθ)；e>0 时准线 x=h+ℓ/e，e=0 显示半径 ℓ 的圆极限。e=1 时为向左开的抛物线，顶点 (h+ℓ/2,k)。统一模式中的平移移动焦点而非中心，e 接近 1 时远端会超出固定视窗。双曲线采用有符号 r 绘出两支；渐近方向不表示有限点。",
  sources: ["conics"],
  draw: (ctx, w, h, p, comparison) => drawConics(ctx, w, h, p, comparison),
  readout: (p, m) => mathReadout(m, p),
  thumbnail: (canvas, m) => {
    const { ctx, w, h } = setupCanvas(canvas),
      cx = w * 0.5,
      cy = h * 0.6,
      col = CATS[m.cat].color;
    ctx.save();
    {
      const plot = makePlot(ctx, w, h, {
        xmin: -5,
        xmax: 5,
        ymin: -3.8,
        ymax: 3.8,
        labels: false,
        grid: false,
        left: 15,
        right: 15,
        top: 20,
        bottom: 10,
      });
      traceConic(ctx, plot, m.defaults);
      const g = MATH_TOOLS.conicMeasurements(m.defaults);
      g.foci.forEach((f) =>
        circle(ctx, plot.x(f.x), plot.y(f.y), 3, PALETTE.purple),
      );
      circle(ctx, plot.x(g.point.x), plot.y(g.point.y), 4, PALETTE.orange);
    }
    ctx.restore();
  },
  renderControls: renderMathControls,
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
  bind: bindMathStage,
});
