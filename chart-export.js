"use strict";
/* Model hooks return mathematical samples. No canvas pixels are traced. */
const EXPORT_COLORS = [
  "#176543",
  "#aa590f",
  "#633f89",
  "#245a97",
  "#945045",
  "#46671e",
];
const exportColumn = (name, unit = "1") => ({ name, unit });
const exportSeries = (name, x, y, index = 0, breaks = []) => ({
  name,
  x,
  y,
  color: EXPORT_COLORS[index % EXPORT_COLORS.length],
  dash: index > 0,
  breaks,
});
function samplesBetween(min, max, count = 600) {
  return Array.from(
    { length: count + 1 },
    (_, i) => min + ((max - min) * i) / count,
  );
}
function chartBounds(plot) {
  return plot
    ? { xmin: plot.xmin, xmax: plot.xmax, ymin: plot.ymin, ymax: plot.ymax }
    : undefined;
}
function functionChartData(kind) {
  const p = { ...state.p },
    comparison = state.compare && { ...state.compare },
    plot = stageInfo?.plot;
  const xmin = plot?.xmin ?? -6,
    xmax = plot?.xmax ?? 6;
  const f = (q, x) =>
    kind === "parabola" ? q.a * (x - q.h) ** 2 + q.k : functionValue(q, x);
  const breaks = (q) =>
    kind === "functions" && q.kind === "reciprocal" ? [q.h] : [];
  const columns = [exportColumn("x"), exportColumn("y_current")];
  const series = [exportSeries("当前函数", 0, 1, 0, breaks(p))];
  if (comparison) {
    columns.push(exportColumn("y_comparison"));
    series.push(exportSeries("保留曲线", 0, 2, 1, breaks(comparison)));
  }
  const rows = samplesBetween(xmin, xmax).map((x) => [
    x,
    f(p, x),
    ...(comparison ? [f(comparison, x)] : []),
  ]);
  return [
    {
      name: "函数图像",
      equal: true,
      columns,
      rows,
      series,
      bounds: chartBounds(plot),
      xLabel: "x（无量纲）",
      yLabel: "y（无量纲）",
      note: "按当前数学坐标范围等距取 601 点；定义域外留空，不跨不连续点连线。",
    },
  ];
}
function derivativeChartData() {
  const p = { ...state.p },
    q = state.compare && { ...state.compare },
    d = MATH_TOOLS.derivativeReadings(p),
    xs = samplesBetween(-6, 6),
    breaks = (z) => (z.kind === "reciprocal" ? [0] : []);
  const columns = [
    exportColumn("x"),
    exportColumn("f"),
    exportColumn("tangent"),
    exportColumn("secant"),
  ];
  const series = [
    exportSeries("f(x)", 0, 1, 0, breaks(p)),
    exportSeries("切线", 0, 2, 2),
    exportSeries("割线", 0, 3, 3),
  ];
  if (q) {
    columns.push(exportColumn("f_comparison"));
    series.push(exportSeries("保留函数", 0, 4, 1, breaks(q)));
  }
  const rows = xs.map((x) => [
    x,
    MATH_TOOLS.derivativeValue(p, x),
    d.valid ? d.y + d.analytic * (x - p.x0) : NaN,
    Number.isFinite(d.secant) ? d.y + d.secant * (x - p.x0) : NaN,
    ...(q ? [MATH_TOOLS.derivativeValue(q, x)] : []),
  ]);
  const primeColumns = [exportColumn("x"), exportColumn("derivative")],
    primeSeries = [exportSeries("f′(x)", 0, 1, 0, breaks(p))];
  if (q) {
    primeColumns.push(exportColumn("derivative_comparison"));
    primeSeries.push(exportSeries("保留导函数", 0, 2, 1, breaks(q)));
  }
  const common = {
    xLabel: "x（无量纲）",
    yLabel: "函数值（无量纲）",
    note: "601 点；原函数、解析导函数与当前切点对应；定义域外留空。",
  };
  return [
    {
      name: "函数与切线",
      columns,
      rows,
      series,
      bounds: { xmin: -6, xmax: 6, ...derivativeYRange(p) },
      ...common,
    },
    {
      name: "导函数",
      columns: primeColumns,
      series: primeSeries,
      rows: xs.map((x) => [
        x,
        MATH_TOOLS.derivativeAnalytic(p, x),
        ...(q ? [MATH_TOOLS.derivativeAnalytic(q, x)] : []),
      ]),
      bounds: { xmin: -6, xmax: 6, ...derivativeYRange(p, true) },
      ...common,
    },
  ];
}
function projectileChartData() {
  const p = { ...state.p },
    q = state.compare && { ...state.compare },
    env = isResistanceCompare(p);
  const variants = [
    { name: "理想", key: "ideal", p, resisted: false, color: env ? 1 : 0 },
  ];
  if (env)
    variants.push({ name: "含阻力", key: "drag", p, resisted: true, color: 0 });
  if (q)
    variants.push({
      name: "保留曲线",
      key: "comparison",
      p: q,
      resisted: isResistanceCompare(q),
      color: 2,
    });
  variants.forEach(
    (v) =>
      (v.end = v.resisted
        ? resistedProjectile(v.p).flight
        : projectileData(v.p).flight),
  );
  const end = Math.max(...variants.map((v) => v.end));
  const times = [
    ...new Set([...samplesBetween(0, end), ...variants.map((v) => v.end)]),
  ]
    .sort((a, b) => a - b)
    .filter((v, i, a) => !i || v - a[i - 1] > 1e-10);
  const columns = [exportColumn("t", "s")],
    series = [];
  variants.forEach((v, i) => {
    columns.push(
      exportColumn(v.key + "_x", "m"),
      exportColumn(v.key + "_y", "m"),
    );
    series.push(exportSeries(v.name, 1 + 2 * i, 2 + 2 * i, v.color));
  });
  const rows = times.map((t) => [
    t,
    ...variants.flatMap((v) => {
      if (t > v.end + 1e-10) return [null, null];
      const a = projectileAt(v.p, t, v.resisted);
      return [a.x, a.y];
    }),
  ]);
  return [
    {
      name: "抛体轨迹",
      equal: true,
      columns,
      rows,
      series,
      xLabel: "x / m",
      yLabel: "y / m",
      note: "导出完整预测轨迹，t 使用秒。额外包含各曲线的落地时刻；落地后的单元格留空。",
    },
  ];
}
function pendulumChartData() {
  const env = isResistanceCompare(state.p),
    columns = [exportColumn("t", "s")],
    series = [];
  const sources = env ? ["actual", "ideal"] : ["actual"];
  sources.forEach((source, j) =>
    ["kinetic", "potential", "total"].forEach((key, i) => {
      columns.push(exportColumn(`${source}_${key}`, "J"));
      series.push({
        ...exportSeries(
          `${source === "ideal" ? "理想" : env ? "含阻力" : "理想"} ${["动能 K", "势能 U", "机械能 E"][i]}`,
          0,
          1 + j * 3 + i,
          i,
        ),
        dash: j > 0,
      });
    }),
  );
  const tmax = Math.max(6, state.time),
    tmin = Math.max(0, tmax - 12);
  const rows = (state.pendulumHistory || [])
    .filter((h) => h.t >= tmin - 1e-10)
    .map((h) => [
      h.t,
      ...sources.flatMap((source) =>
        ["kinetic", "potential", "total"].map((k) => h[source][k]),
      ),
    ]);
  return [
    {
      name: "能量—时间",
      columns,
      rows,
      series,
      bounds: { xmin: tmin, xmax: tmax },
      xLabel: "t / s",
      yLabel: "能量 / J",
      note: "当前最近 12 秒内的原求解器采样；对照模式同时导出理想与含阻力三条能量线。尚未播放时仅有初始点。",
    },
  ];
}
function waveChartData() {
  const p = { ...state.p },
    t = state.time,
    columns = [
      exportColumn("x", "m"),
      exportColumn("y", "m"),
      exportColumn("t", "s"),
    ];
  return [
    {
      name: "横波快照",
      columns,
      rows: samplesBetween(0, 9).map((x) => [
        x,
        p.amp * Math.sin(2 * Math.PI * (x / p.lambda - p.freq * t)),
        t,
      ]),
      series: [exportSeries("当前波形", 0, 1)],
      xLabel: "x / m",
      yLabel: "y / m",
      note: `t=${num(t, 4)} s 的瞬时波形，x=0–9 m，共 601 点。`,
    },
  ];
}
function springChartData() {
  const p = { ...state.p },
    forced = p.springMode === "forced",
    tmax = Math.max(6, state.time),
    tmin = Math.max(0, tmax - 12),
    columns = [exportColumn("t", "s"), exportColumn("displacement", "m")],
    series = [exportSeries("位移 x", 0, 1)];
  if (!forced) {
    columns.push(
      exportColumn("envelope_upper", "m"),
      exportColumn("envelope_lower", "m"),
    );
    series.push(
      exportSeries("上包络", 0, 2, 1),
      exportSeries("下包络", 0, 3, 2),
    );
  }
  const rows = (state.springHistory || [])
    .filter((h) => h.t >= tmin - 1e-10)
    .map((h) => {
      const e = SCIENCE.oscillatorEnvelope(p, h.t);
      return [h.t, h.x, ...(!forced ? [e, -e] : [])];
    });
  const graphs = [
    {
      name: "位移—时间",
      columns,
      rows,
      series,
      bounds: { xmin: tmin, xmax: tmax },
      xLabel: "t / s",
      yLabel: "x / m",
      note: "最近 12 秒内的原求解器采样；自由振动附解析包络。尚未播放时仅有初始点。",
    },
  ];
  if (forced) {
    const d = SCIENCE.oscillatorParameters(p),
      max = Math.max(1, d.frequency0 * 2, p.driveFreq * 1.2);
    graphs.push({
      name: "共振曲线",
      columns: [
        exportColumn("drive_frequency", "Hz"),
        exportColumn("steady_amplitude", "m"),
      ],
      rows: samplesBetween(0, max).map((f) => [
        f,
        SCIENCE.oscillatorResponse(p, f).amplitude,
      ]),
      series: [
        exportSeries("稳态幅度", 0, 1, 0, d.zeta === 0 ? [d.frequency0] : []),
      ],
      xLabel: "驱动频率 / Hz",
      yLabel: "稳态幅度 / m",
      note: `固有频率 f₀=${num(d.frequency0, 6)} Hz。稳态幅度不是当前瞬态振幅；无有限稳态处留空。`,
      markers: [
        { x: d.frequency0, label: "f₀" },
        { x: p.driveFreq, label: "当前驱动" },
      ],
    });
  }
  return graphs;
}
function csvForChart(chart) {
  const quote = (value) => '"' + String(value).replace(/"/g, '""') + '"';
  const header = chart.columns
    .map((c) => quote(`${c.name} [${c.unit}]`))
    .join(",");
  return (
    "\ufeff" +
    [
      header,
      ...chart.rows.map((row) =>
        row
          .map((value) =>
            typeof value === "number" && Number.isFinite(value)
              ? String(Number(value.toPrecision(15)))
              : "",
          )
          .join(","),
      ),
    ].join("\r\n") +
    "\r\n"
  );
}
function svgForChart(chart, title, metadata = {}) {
  const width = 1000,
    height = 650,
    left = 95,
    right = 945,
    top = 105,
    bottom = 520;
  const finite = [];
  for (const series of chart.series)
    for (const row of chart.rows)
      if (Number.isFinite(row[series.x]) && Number.isFinite(row[series.y]))
        finite.push([row[series.x], row[series.y]]);
  const extent = (index) => {
    let min = Infinity,
      max = -Infinity;
    for (const point of finite) {
      min = Math.min(min, point[index]);
      max = Math.max(max, point[index]);
    }
    if (!Number.isFinite(min)) return [0, 1];
    if (min === max) return [min - 1, max + 1];
    return [min, max];
  };
  let [xmin, xmax] = extent(0),
    [ymin, ymax] = extent(1);
  const pad = (ymax - ymin) * 0.06;
  ({
    xmin = xmin,
    xmax = xmax,
    ymin = ymin - pad,
    ymax = ymax + pad,
  } = chart.bounds || {});
  if (chart.equal) {
    // Preserve angles/shape in mathematical coordinates, including 45° launches.
    const scale = Math.min(
      (right - left) / (xmax - xmin),
      (bottom - top) / (ymax - ymin),
    );
    const cx = (xmin + xmax) / 2,
      cy = (ymin + ymax) / 2;
    xmin = cx - (right - left) / scale / 2;
    xmax = cx + (right - left) / scale / 2;
    ymin = cy - (bottom - top) / scale / 2;
    ymax = cy + (bottom - top) / scale / 2;
  }

  const x = (v) => left + ((v - xmin) / (xmax - xmin)) * (right - left),
    y = (v) => bottom - ((v - ymin) / (ymax - ymin)) * (bottom - top);
  let content = `<rect width="1000" height="650" fill="white"/><text x="45" y="40" font-size="23" fill="#173629">${esc(title + " · " + chart.name)}</text><text x="45" y="69" font-size="14" fill="#46534c">${esc(`${metadata.timed ? "导出时刻 t=" + num(metadata.time || 0, 4) + " s；" : ""}${chart.rows.length} 行。空值处断开。`)}</text>`;
  for (let i = 0; i <= 5; i++) {
    const xx = left + ((right - left) * i) / 5,
      yy = bottom - ((bottom - top) * i) / 5;
    content += `<path d="M${xx} ${top}V${bottom}M${left} ${yy}H${right}" stroke="#dde3df" fill="none"/><text x="${xx}" y="545" text-anchor="middle">${esc(mathNumber(xmin + ((xmax - xmin) * i) / 5, 4))}</text><text x="83" y="${yy + 5}" text-anchor="end">${esc(mathNumber(ymin + ((ymax - ymin) * i) / 5, 4))}</text>`;
  }
  content += `<text x="945" y="578" text-anchor="end">${esc(chart.xLabel)}</text><text x="18" y="93">${esc(chart.yLabel)}</text><defs><clipPath id="plot"><rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}"/></clipPath></defs><g clip-path="url(#plot)" data-x-scale="${(right - left) / (xmax - xmin)}" data-y-scale="${(bottom - top) / (ymax - ymin)}">`;
  chart.series.forEach((series) => {
    let path = "",
      previous = null;
    for (const row of chart.rows) {
      const xv = row[series.x],
        yv = row[series.y];
      if (
        !Number.isFinite(xv) ||
        !Number.isFinite(yv) ||
        Math.abs(y(yv)) > 1e8
      ) {
        previous = null;
        continue;
      }
      const crossed =
        previous !== null &&
        series.breaks.some(
          (b) => Math.min(previous, xv) <= b && Math.max(previous, xv) >= b,
        );
      path += `${previous === null || crossed ? "M" : "L"}${x(xv).toFixed(3)} ${y(yv).toFixed(3)}`;
      previous = xv;
    }
    content += `<path data-series="${esc(series.name)}" d="${path}" stroke="${series.color}" stroke-width="2.3" ${series.dash ? 'stroke-dasharray="7 5"' : ""} fill="none"/>`;
    if (chart.rows.length === 1) {
      const row = chart.rows[0];
      if (Number.isFinite(row[series.x]) && Number.isFinite(row[series.y]))
        content += `<circle cx="${x(row[series.x])}" cy="${y(row[series.y])}" r="4" fill="${series.color}"/>`;
    }
  });
  for (const marker of chart.markers || [])
    content += `<path d="M${x(marker.x)} ${top}V${bottom}" stroke="#663391" stroke-dasharray="5 5"/><text x="${x(marker.x) + 4}" y="${top + 18}">${esc(marker.label)}</text>`;
  content += "</g>";
  chart.series.forEach((series, i) => {
    const xx = 45 + (i % 3) * 310,
      yy = 606 + Math.floor(i / 3) * 24;
    content += `<path d="M${xx} ${yy - 5}h25" stroke="${series.color}" stroke-width="2" ${series.dash ? 'stroke-dasharray="7 5"' : ""}/><text x="${xx + 34}" y="${yy}">${esc(series.name)}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>${esc(title + " · " + chart.name)}</title><desc>${esc(chart.note)}</desc><metadata>${esc(JSON.stringify(metadata))}</metadata><g font-family="sans-serif" font-size="15" fill="#20382b">${content}</g></svg>`;
}
let exportSnapshot = null;
function exportDataDialog() {
  if (!state.model?.exportData) return;
  // Snapshot once, so opening the dialog while playing cannot mix times/parameters.
  exportSnapshot = {
    model: state.model.id,
    title: state.model.title,
    time: state.time,
    timed: !!state.model.time,
    params: { ...state.p },
    comparison: state.compare && { ...state.compare },
    date: new Date().toISOString(),
    charts: state.model.exportData(),
  };
  openDialog(
    "导出曲线数据",
    `<p>按打开此窗口时的参数与时刻导出。CSV 包含单位和对照列；SVG 为可缩放的矢量曲线。</p>${exportSnapshot.charts.length > 1 ? `<label for="exportChart">选择图表</label><select id="exportChart" class="control-select">${exportSnapshot.charts.map((chart, i) => `<option value="${i}">${esc(chart.name)}</option>`).join("")}</select>` : ""}<p id="exportNote"></p><div class="dialog-actions"><button class="button primary" data-chart-export="csv">下载 CSV</button><button class="button secondary" data-chart-export="svg">下载 SVG</button></div>`,
  );
  updateExportNote();
}
function selectedExportChart() {
  return exportSnapshot?.charts[Number($("#exportChart")?.value || 0)];
}
function updateExportNote() {
  const c = selectedExportChart();
  if (c) $("#exportNote").textContent = `${c.note} 本次 ${c.rows.length} 行。`;
}
function downloadChart(format) {
  const chart = selectedExportChart();
  if (!chart) return;
  const meta = { ...exportSnapshot };
  delete meta.charts;
  const content =
    format === "csv"
      ? csvForChart(chart)
      : svgForChart(chart, meta.title, meta);
  const stamp = meta.date
    .replace(/[-:]/g, "")
    .replace(/\..*/, "")
    .replace("T", "-");
  downloadBlob(
    new Blob([content], {
      type:
        format === "csv"
          ? "text/csv;charset=utf-8"
          : "image/svg+xml;charset=utf-8",
    }),
    safeFileName(`${meta.title}-${chart.name}-${stamp}`) + "." + format,
  );
}
document.addEventListener("click", (e) => {
  const button = e.target.closest("button");
  if (button?.dataset.chartExport) downloadChart(button.dataset.chartExport);
  if (button?.hasAttribute("data-export-data")) exportDataDialog();
});
document.addEventListener("change", (e) => {
  if (e.target.id === "exportChart") updateExportNote();
});
