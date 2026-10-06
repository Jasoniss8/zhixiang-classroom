"use strict";
/* Shared controls and drawing helpers for the existing model families. */
const MATH_TOOLS = window.ZhixiangMathTools;

const CONIC_NAMES = {
  ellipse: "椭圆",
  hyperbola: "双曲线",
  parabola: "抛物线",
  circle: "圆",
};

const DERIVATIVE_NAMES = {
  poly: "多项式 Ax³ + Bx² + Cx + D",
  sin: "A sin x + D",
  exp: "A eˣ + D",
  log: "A ln x + D",
  reciprocal: "A/x + D",
};

const SCIENCE = window.ZhixiangPhysics;

const FUNCTIONS = {
  linear: { name: "一次函数 f(x) = x", f: (x) => x, formula: "x" },
  sin: { name: "正弦函数 f(x) = sin x", f: Math.sin, formula: "sin(x)" },
  cos: { name: "余弦函数 f(x) = cos x", f: Math.cos, formula: "cos(x)" },
  exp: { name: "指数函数 f(x) = eˣ", f: Math.exp, formula: "eˣ" },
  log: {
    name: "对数函数 f(x) = ln x",
    f: (x) => (x > 0 ? Math.log(x) : NaN),
    formula: "ln(x)",
  },
  reciprocal: {
    name: "反比例函数 f(x) = 1/x",
    f: (x) => (Math.abs(x) > 1e-7 ? 1 / x : NaN),
    formula: "1/x",
  },
  abs: { name: "绝对值函数 f(x) = |x|", f: Math.abs, formula: "|x|" },
  sqrt: {
    name: "平方根函数 f(x) = √x",
    f: (x) => (x >= 0 ? Math.sqrt(x) : NaN),
    formula: "√x",
  },
};

function normalizeScienceParams(m, p) {
  if (m.id === "double-slit")
    p.probe = clamp(p.probe, -p.screenHalf, p.screenHalf);
  if (m.id === "electric") {
    const used = [];
    for (let i = 1; i <= Number(p.count); i++) {
      if (
        used.some(
          (j) =>
            Math.hypot(p["x" + i] - p["x" + j], p["y" + i] - p["y" + j]) < 0.35,
        )
      ) {
        for (const [x, y] of [
          [0, 2],
          [-2, 0],
          [2, 0],
          [0, -2],
          [-3, 2],
          [3, 2],
        ])
          if (
            used.every(
              (j) => Math.hypot(x - p["x" + j], y - p["y" + j]) >= 0.35,
            )
          ) {
            p["x" + i] = x;
            p["y" + i] = y;
            break;
          }
      }
      used.push(i);
    }
  }
  return p;
}

function scienceReadout(m, p) {
  if (m.id === "lens") return lensReadout(p);
  if (m.id === "induction") {
    const d = SCIENCE.inductionState(p, state.time),
      magnet = p.scenario === "magnet";
    const direction = {
      undefined: "锐边瞬间不定义",
      none: "无感应电流",
      ccw: "逆时针",
      cw: "顺时针",
    }[d.direction];
    const lenz = d.edge
      ? "理想磁场锐边处 ε、I 的左右极限不同，此瞬间不定义。"
      : d.direction === "none"
        ? "磁通量瞬时不变，ε=0，I=0。"
        : `外磁通量沿 ${d.flux >= 0 ? "+n" : "−n"} 的分量${d.flux * d.fluxRate > 0 ? "增大" : "减小"}；感应磁场沿 ${d.current > 0 ? "+n" : "−n"}，阻碍这项变化。`;
    return {
      formula: "ε = −dΦ/dt　　I = ε/R（单匝）",
      caption: `正电流为正视图中的逆时针。${magnet ? "从磁铁侧看线圈，+n 指向磁铁。" : "面向屏幕看线圈，+n 朝屏幕外。"}`,
      metrics: [
        ["磁通量 Φ", mathNumber(d.flux), "Wb"],
        [
          "感应电动势 ε",
          d.edge ? "此瞬间不定义" : mathNumber(d.emf),
          d.edge ? "" : "V",
        ],
        [
          "感应电流 I",
          d.edge ? "此瞬间不定义" : mathNumber(d.current),
          d.edge ? "" : "A",
        ],
        ["电流方向", direction, ""],
        [magnet ? "磁铁距离 z" : "线圈中心 x", mathNumber(d.position), "m"],
        [
          magnet ? "距离变化率 dz/dt" : "线圈速度 v",
          mathNumber(d.speed),
          "m/s",
        ],
      ],
      details: [
        ["楞次定律 · 方向", lenz],
        [
          "磁通量计算",
          magnet
            ? "Φ=sB₀A[1+(z/0.20)²]^(−3/2)，z=0.29+0.21cos(2πt/T) m。B₀ 为有效场强尺度；并非真实条形磁铁场解。"
            : `Φ=sB₀A重叠；当前 A重叠=${mathNumber(d.overlap)} m²。磁场边界 x=0、0.80 m，线圈宽 0.20 m、高 0.15 m。`,
        ],
        [
          "运动与回路",
          `T=${mathNumber(p.period)} s；单匝闭合回路，R=${mathNumber(p.resistance)} Ω。忽略自感；外力维持往返运动。`,
        ],
        [
          "时间图",
          "绿线 Φ(t)，橙线 ε(t)，共用当前时刻虚线。理想锐边处橙线断开，空心点表示单侧极限。",
        ],
      ],
    };
  }
  if (m.id === "double-slit") {
    const d = SCIENCE.doubleSlitParameters(p),
      q = SCIENCE.doubleSlitAt(p, p.probe * 1e-3),
      edge = SCIENCE.doubleSlitAt(p, d.half);
    const error =
      100 * Math.abs(edge.pathDifference / edge.exactPathDifference - 1);
    return {
      formula: "Δx = λL/d　　I/Imax = cos²(πdx/(λL))",
      caption:
        "等振幅、同相相干单色光；远场小角近似。条纹与曲线使用相同屏上坐标，不含单缝衍射包络。",
      metrics: [
        ["条纹间距 Δx", mathNumber(d.spacing * 1e3), "mm"],
        ["测量位置 x", mathNumber(p.probe), "mm"],
        ["相对强度 I/Imax", mathNumber(q.intensity), ""],
        ["光程差 δ≈dx/L", mathNumber(q.pathDifference * 1e9), "nm"],
        ["相位差 / π", mathNumber(q.phase / Math.PI), ""],
        ["视窗内最大光程差近似误差", mathNumber(error, 4), "%"],
      ],
      details: [
        [
          "亮纹与暗纹",
          `亮纹 x=m×${mathNumber(d.spacing * 1e3)} mm；暗纹 x=(m+½)×${mathNumber(d.spacing * 1e3)} mm，m∈ℤ。中央亮纹 m=0。`,
        ],
        [
          "当前近似条件",
          `d/L=${mathNumber(d.slitRatio)}；|x|/L≤${mathNumber(d.angleRatio)}（最大观察角 ${mathNumber(deg(Math.atan(d.angleRatio)), 4)}°）。要求 d≪L、|x|≪L。`,
        ],
        [
          "几何误差核对",
          `视窗边缘光程差误差为 ${mathNumber(Math.abs(edge.pathDifference - edge.exactPathDifference) / d.wavelength, 4)}λ。超过 λ/10 时提示缩小视窗；较小的相对误差也可能移动高级次条纹。条纹、间距和曲线统一使用 δ≈dx/L。`,
        ],
        [
          "条纹与色彩",
          "屏幕条带按像素区间平均强度着色，曲线给出点强度；RGB 仅示意波长颜色，不能用于色度测量。",
        ],
      ],
    };
  }
  if (m.id === "collision") return collisionReadout(p);
  if (m.id === "circular") {
    const d = SCIENCE.circularData(
        p,
        state.circular || SCIENCE.circularInitial(p),
      ),
      vertical = p.plane === "vertical";
    return {
      formula: "a向 = v²/r = ω²r　　F向 = ma向 = mω²r",
      caption: vertical
        ? d.slack
          ? "绳松弛：圆周约束已失效，停止在释放位置。"
          : "竖直平面：ω 随高度变化；T = m(rω² + g cosθ)，θ 从最低点起算。"
        : "水平面：匀速解析解，重力与支持力抵消。",
      metrics: [
        ["线速度 v", mathNumber(d.speed), "m/s"],
        ["角速度 ω", mathNumber(d.omega), "rad/s"],
        [
          "向心加速度 a向",
          d.slack ? "约束已失效" : mathNumber(d.ac),
          d.slack ? "" : "m/s²",
        ],
        [
          "所需径向合力 F向",
          d.slack ? "约束已失效" : mathNumber(d.force),
          d.slack ? "" : "N",
        ],
        [
          "绳张力 T",
          d.slack ? "0（松弛）" : mathNumber(Math.max(0, d.tension)),
          d.slack ? "" : "N",
        ],
        vertical
          ? ["最高点临界速度 √(gr)", mathNumber(d.critical), "m/s"]
          : [
              "周期 T",
              p.omega ? mathNumber((2 * Math.PI) / p.omega) : "静止，无周期",
              p.omega ? "s" : "",
            ],
        vertical
          ? ["最低点整周临界速度", mathNumber(d.bottomCritical), "m/s"]
          : ["频率 f", mathNumber(p.omega / (2 * Math.PI)), "Hz"],
        ["机械能", mathNumber(d.energy), "J"],
        [
          "状态",
          d.slack ? "绳松弛，已停止" : vertical ? "绳保持绷紧" : "水平匀速",
          "",
        ],
      ],
      details: [
        [
          "初始条件",
          `${vertical ? (p.start === "top" ? "最高点" : "最低点") : "水平圆周"}出发，v₀=${mathNumber(p.omega * p.radius)} m/s；ω₀=${mathNumber(p.omega)} rad/s`,
        ],
        [
          "向心力与张力",
          vertical
            ? "F向 是径向合力；最高点 T=F向−mg，最低点 T=F向+mg。"
            : "水平面内由绳张力提供向心力。",
        ],
        [
          "积分范围",
          vertical
            ? "RK4 步长≤1/240 s；松弛后停止，不模拟自由飞行和再次绷紧。"
            : "位置和速度使用解析解，不进行数值积分。",
        ],
      ],
    };
  }
  if (m.id === "electric") {
    const charges = SCIENCE.electricCharges(p),
      f = SCIENCE.electricField(charges, p.probeX, p.probeY);
    return {
      formula: "E = kΣqᵢ(r−rᵢ)/|r−rᵢ|³　　V = kΣqᵢ/|r−rᵢ|",
      caption: `k=8.99×10⁹ N·m²/C²；q 输入为 nC，坐标为 m。${f.valid ? (f.magnitude < 1e-8 ? "此处场强为零或近零，方向不定义。" : "场强与电势直接由点电荷叠加计算。") : "测量点在电荷的 0.16 m 避让区内，结果不定义。"}`,
      metrics: [
        ["测量点 P", `(${mathNumber(p.probeX)}, ${mathNumber(p.probeY)})`, "m"],
        ["场强大小 |E|", mathNumber(f.magnitude), "N/C"],
        ["电势 V", mathNumber(f.potential), "V"],
        ["场强 Ex", mathNumber(f.ex), "N/C"],
        ["场强 Ey", mathNumber(f.ey), "N/C"],
        [
          "E 相对 +x 方向",
          f.valid && f.magnitude >= 1e-8
            ? mathNumber(deg(Math.atan2(f.ey, f.ex)))
            : "无定义",
          f.valid && f.magnitude >= 1e-8 ? "°" : "",
        ],
      ],
      details: [
        [
          "点电荷",
          charges
            .map(
              (c) =>
                `q${c.id}=${mathNumber(c.q)} nC，(${mathNumber(c.x)}, ${mathNumber(c.y)}) m`,
            )
            .join("；"),
        ],
        [
          "等势线级别",
          electricLevels(charges)
            .map((v) => mathNumber(v, 3))
            .join("、") + " V（紫色虚线）",
        ],
        [
          "奇点与终止",
          `半径 ${SCIENCE.CHARGE_CUTOFF} m 避让区；场线遇电荷、边界、零场、40 m 长度或 1400 步上限即停止。`,
        ],
        [
          "二维截面",
          "真空中三维点电荷场的 z=0 截面；场线不是粒子轨迹，线条数量不用于计算场强。",
        ],
      ],
    };
  }
  const d = SCIENCE.seasonData(p),
    polar =
      d.dec === 0
        ? "春秋分无有限面积的极昼极夜区"
        : `${d.dec > 0 ? "北" : "南"}纬 ${mathNumber(d.polarBoundary)}° 以${d.dec > 0 ? "北" : "南"}极昼；${d.dec > 0 ? "南" : "北"}半球对应范围极夜`;
  return {
    formula: "δ = asin(sin 23.44° · sin λ)　　H正午 = 90° − |φ − δ|",
    caption:
      "圆轨道；地轴方向固定。昼长按太阳中心过地平线计算，不含折射。日期为教学近似。",
    metrics: [
      ["节气", d.onTerm ? d.term : `${d.term} → ${d.nextTerm}`, ""],
      ["示意日期", d.date, ""],
      ["太阳直射纬度 δ", mathNumber(d.dec), "°"],
      ["所选纬度 φ", mathNumber(p.lat), "°"],
      [
        "昼长",
        d.hours === null ? "极点临界状态" : mathNumber(d.hours),
        d.hours === null ? "" : "h",
      ],
      ["正午太阳高度", mathNumber(d.noon), "°"],
      ["昼夜状态", d.status, ""],
      ["黄赤交角 ε", "23.44", "°"],
      ["公转位置 λ", mathNumber(d.phase), "°"],
    ],
    details: [
      [
        "昼长公式",
        "D=24·acos(−tanφ tanδ)/π；超出反余弦定义域时分别处理极昼、极夜。",
      ],
      ["当前极昼极夜范围", polar],
      [
        "昼半球与晨昏线",
        "表面法向 n 与太阳方向 s 满足 n·s>0 为昼；n·s=0 为晨昏线。",
      ],
      [
        "日期范围",
        "节气按太阳黄经每 15° 划分，日期以常用日期插值，不能作为当年的节气时刻预报。",
      ],
    ],
  };
}

function scienceControlSpecs(m, p) {
  return m.controls
    .filter((c) =>
      m.id === "electric"
        ? !/^[qxy][123]$/.test(c[0]) || Number(c[0].slice(1)) <= Number(p.count)
        : m.id !== "circular" || c[0] !== "g" || p.plane === "vertical",
    )
    .map((c) => {
      const copy = [...c];
      if (m.id === "double-slit" && c[0] === "probe") {
        copy[3] = -p.screenHalf;
        copy[4] = p.screenHalf;
      }
      if (m.id === "induction" && c[0] === "field")
        copy[2] = p.scenario === "magnet" ? "有效场强尺度" : "匀强磁场强度";
      if (m.id === "circular" && c[0] === "omega") {
        copy[1] = p.plane === "horizontal" ? "ω" : "ω₀";
        copy[2] =
          p.plane === "horizontal"
            ? "角速度"
            : (p.start === "top" ? "最高点" : "最低点") + "初始角速度";
      }
      return copy;
    });
}

function renderScienceControls() {
  const m = state.model,
    p = state.p,
    root = $("#controlBody");
  const select = (key, label, values) =>
    `<label class="math-select-label" for="science-${key}">${label}</label><select class="control-select" id="science-${key}" data-science-select="${key}">${Object.entries(
      values,
    )
      .map(
        ([id, name]) =>
          `<option value="${id}" ${p[key] === id ? "selected" : ""}>${name}</option>`,
      )
      .join("")}</select>`;
  let options =
    m.id === "lens"
      ? select("kind", "透镜类型", {
          convex: "凸透镜 · f > 0",
          concave: "凹透镜 · f < 0",
        })
      : m.id === "induction"
        ? select("scenario", "情景", {
            magnet: "磁铁靠近 / 远离",
            uniform: "线圈进出匀强磁场",
          }) +
          select(
            "fieldSign",
            p.scenario === "magnet" ? "朝向线圈的磁极" : "磁场方向",
            p.scenario === "magnet"
              ? { negative: "N 极朝向线圈", positive: "S 极朝向线圈" }
              : { positive: "朝屏幕外 · +n", negative: "朝屏幕内 · −n" },
          )
        : m.id === "double-slit"
          ? ""
          : m.id === "collision"
            ? select("graph", "时间图", {
                velocity: "速度—时间图",
                position: "位置—时间图",
              })
            : m.id === "circular"
              ? select("plane", "运动平面", {
                  horizontal: "水平面 · 匀速",
                  vertical: "竖直平面 · 柔绳约束",
                }) +
                (p.plane === "vertical"
                  ? select("start", "初始位置", {
                      top: "最高点",
                      bottom: "最低点",
                    })
                  : "")
              : m.id === "electric"
                ? select("count", "点电荷数量", {
                    1: "1 个",
                    2: "2 个",
                    3: "3 个",
                  })
                : select("view", "观察视角", {
                    side: "侧视（高于轨道面 20°）",
                    top: "俯视（垂直轨道面）",
                  });
  root.innerHTML =
    options +
    `<h3>预设</h3><div class="preset-list">${m.presets.map((s, i) => `<button class="preset" data-preset="${i}">${s[0]}</button>`).join("")}</div><div class="params-grid">${scienceControlSpecs(
      m,
      p,
    )
      .map(
        (c) =>
          `${m.id === "electric" && c[0][0] === "q" ? `<h3 class="charge-heading">电荷 ${c[0].slice(1)}</h3>` : ""}${paramHTML(c, p)}`,
      )
      .join(
        "",
      )}</div>${m.id === "collision" ? '<div class="collision-actions"><button class="button secondary small" data-action="collision-start">回到开始</button><button class="button secondary small" data-action="collision-contact">到碰撞时刻</button></div>' : ""}${m.id === "circular" && p.plane === "vertical" ? `<button class="button secondary small" data-action="critical-speed">设为${p.start === "top" ? "最高点" : "最低点整周"}临界初速度</button>` : ""}${m.id === "seasons" ? '<button class="button secondary small" data-action="season-shadow">用此纬度查看日影</button>' : ""}<p class="math-notice" id="scienceNotice" role="status"></p><div class="control-divider"></div><h3>显示设置</h3>${m.id === "double-slit" ? `<label class="checkline"><input type="checkbox" data-science-toggle="colorize" ${p.colorize ? "checked" : ""}>波长联动色彩</label>` : ""}${m.id === "electric" ? ["showField", "showPotential"].map((key, i) => `<label class="checkline"><input type="checkbox" data-science-toggle="${key}" ${p[key] ? "checked" : ""}>${i ? "等势线" : "电场线"}</label>`).join("") : ""}${m.id === "lens" ? "" : `<label class="checkline"><input type="checkbox" data-flag="grid" ${state.grid ? "checked" : ""}>显示坐标网格</label>`}<label class="checkline"><input type="checkbox" data-flag="labels" ${state.labels ? "checked" : ""}>显示标注与辅助线</label><p class="control-note">${m.id === "lens" ? "实正虚负：u>0；凸透镜 f>0，凹透镜 f<0；实像 v>0，虚像 v<0。" : m.id === "induction" ? "单匝闭合回路，忽略自感。楞次定律提示方向；数值由给定磁通函数求导。" : m.id === "double-slit" ? "λ：nm；d、x：mm；L：m。要求 d≪L、|x|≪L；不含单缝衍射包络。" : m.id === "collision" ? "m₁、m₂ 均大于 0；向右为正。e=0 完全非弹性，e=1 弹性。忽略摩擦、空气阻力和碰撞持续时间。" : m.id === "circular" ? "忽略空气阻力。竖直模式的 ω 是随时间变化的读数，参数 ω₀ 仅代表初值。" : m.id === "electric" ? "电荷量用 nC；0 表示不产生电场。可拖动电荷，或输入坐标；相距至少 0.35 m。" : "公转轨道为圆，日期仅作教学近似。暖色区域表示极昼，灰紫区域表示极夜。"}</p><button class="source-link" data-action="model-info">模型条件与参考资料</button>`;
  updateRanges(root);
  updateScienceNotice();
}

function clearScienceInputError() {
  const notice = $("#scienceNotice");
  if (notice) {
    delete notice.dataset.inputError;
    delete notice.dataset.inputErrorParams;
  }
}

function updateScienceNotice(message = "") {
  if (!state.model?.science) return;
  const m = state.model,
    p = state.p,
    notice = $("#scienceNotice");
  // Rejected input belongs to the current control panel, not the animation
  // clock. Keep it through readout refreshes, until parameters change or the
  // controls are rebuilt. Dynamic physical warnings still update below.
  if (notice) {
    if (message) {
      notice.dataset.inputError = message;
      notice.dataset.inputErrorParams = JSON.stringify(p);
    } else if (notice.dataset.inputErrorParams &&
               notice.dataset.inputErrorParams !== JSON.stringify(p)) {
      clearScienceInputError();
    }
  }
  message = "";
  if (m.id === "lens" && !message) {
    message = SCIENCE.lensData(p).atFocus
      ? "u=f：出射光平行，没有有限位置的像；不能在屏上成像。"
      : "近轴薄透镜示意；物高不参与像距计算。";
  } else if (
    m.id === "induction" &&
    !message &&
    SCIENCE.inductionState(p, state.time).edge
  ) {
    message = "理想磁场锐边：此瞬间 ε、I 不定义，请查看两侧时刻。";
  } else if (m.id === "double-slit" && !message) {
    const d = SCIENCE.doubleSlitParameters(p),
      edge = SCIENCE.doubleSlitAt(p, d.half),
      width = ($("#simCanvas")?.clientWidth || 400) - 76,
      messages = [];
    if ((width * d.spacing) / (2 * d.half) < 6)
      messages.push(
        "条纹在当前屏幕上过密，条带显示像素平均亮度；可减小屏幕半宽以分辨亮暗纹。",
      );
    if (
      Math.abs(edge.pathDifference - edge.exactPathDifference) / d.wavelength >
      0.1
    )
      messages.push(
        "外围光程差近似误差超过 λ/10，条纹位置可能明显偏移；请缩小屏幕半宽或增大屏距。",
      );
    message = messages.join(" ");
  } else if (m.id === "collision") {
    const d = SCIENCE.collisionSolution(p);
    const button = $('[data-action="collision-contact"]');
    if (button) button.disabled = !d.collides;
    if (!message && !d.collides)
      message = "不会碰撞：球 1 在左侧，u₁≤u₂，两球间距不会减小。";
  } else if (m.id === "circular") {
    const slack = !!state.circular?.slack;
    for (const b of $$('[data-action="play"],[data-action="step"]'))
      b.disabled = slack;
    if (!message && slack)
      message =
        "绳松弛：圆周约束失效，演示已停止。修改初速度或初始位置后重试。";
  } else if (
    m.id === "electric" &&
    !message &&
    !SCIENCE.electricField(SCIENCE.electricCharges(p), p.probeX, p.probeY).valid
  )
    message = "测量点距非零电荷不超过 0.16 m，位于奇点避让区。";
  if (notice) notice.textContent = [notice.dataset.inputError, message].filter(Boolean).join(" ");
}

function normalizeMathParams(m, p) {
  if (m.id === "conics" && p.kind === "ellipse" && p.b > p.a) p.b = p.a;
  return p;
}

function mathNumber(v, digits = 6) {
  if (!Number.isFinite(v)) return "—";
  if (v === 0) return "0";
  const rounded = Number(v.toPrecision(digits));
  return Math.abs(v) < 0.00001 || Math.abs(v) >= 1e7
    ? rounded.toExponential()
    : rounded.toString();
}

function mathSigned(v) {
  return v < 0 ? `− ${mathNumber(-v, 10)}` : `+ ${mathNumber(v, 10)}`;
}

function mathPointText(p) {
  return `(${mathNumber(p.x)}, ${mathNumber(p.y)})`;
}

function mathReadout(m, p) {
  if (m.id === "conics") {
    const g = MATH_TOOLS.conicMeasurements(p),
      par = g.type === "parabola",
      circle = g.type === "circle",
      ratio = circle ? "无有限准线" : mathNumber(g.ratio);
    const caption = `${p.mode === "unified" ? `统一定义：固定 F=${mathPointText({ x: p.cx, y: p.cy })}、ℓ=${num(p.p)}；r=ℓ/(1+e cosθ)。` : "标准形式；横纵轴等比例。"} ${circle ? "a=b，e=0：圆的准线位于无穷远（极限）。" : par ? "e=1；到焦点与准线等距。" : g.type === "ellipse" ? "c²=a²−b²；a>b>0。" : "c²=a²+b²；a,b>0。"} 长度为坐标单位。`;
    const details = [
      [
        "焦点",
        g.foci
          .map((f, i) => `${par ? "F" : `F${i + 1}`} ${mathPointText(f)}`)
          .join("；"),
      ],
      ["顶点", g.vertices.map(mathPointText).join("；")],
      [
        "准线",
        g.directrices.length
          ? g.directrices
              .map((x, i) => `l${i + 1}: x=${mathNumber(x)}`)
              .join("；")
          : "圆没有有限准线；距离比 e=0 为极限",
      ],
      [
        "渐近线",
        g.slope === null
          ? "不适用"
          : `y ${mathSigned(-g.cy)} = ±${mathNumber(g.slope)}(x ${mathSigned(-g.cx)})`,
      ],
    ];
    return {
      formula: conicEquation(p, g),
      caption,
      details,
      metrics: [
        ["曲线类型", CONIC_NAMES[g.type], ""],
        [
          par ? "顶点到焦点距离" : "半焦距 c（焦距为 2c）",
          mathNumber(g.c),
          "单位",
        ],
        ["离心率 e", mathNumber(g.e), ""],
        [par ? "|PF|" : "|PF₁|", mathNumber(g.pf[0]), "单位"],
        ["|PF₂|", par ? "仅一个焦点" : mathNumber(g.pf[1]), par ? "" : "单位"],
        [
          par
            ? "|PF| = d(P,l)"
            : g.type === "hyperbola"
              ? "||PF₁|−|PF₂|| = 2a"
              : "|PF₁|+|PF₂| = 2a",
          mathNumber(g.invariant),
          "单位",
        ],
        [
          "到准线 l₁ 的距离",
          circle ? "无有限准线" : mathNumber(g.directrixDistance),
          circle ? "" : "单位",
        ],
        ["焦点距离 / 准线距离", ratio, ""],
        ["点 P", g.point ? mathPointText(g.point) : "该方向的点在无穷远", ""],
      ],
    };
  }
  const d = MATH_TOOLS.derivativeReadings(p),
    a = MATH_TOOLS.derivativeAnalysis(p),
    intervals = (sign) =>
      a.intervals
        .filter((v) => v.sign === sign)
        .map((v) => `(${mathNumber(v.from)}, ${mathNumber(v.to)})`)
        .join(" ∪ ") || "无";
  const domain =
    p.kind === "log" ? "x>0" : p.kind === "reciprocal" ? "x≠0" : "x∈ℝ";
  return {
    formula: `f(x) = ${derivativeFormula(p)}　　f′(x) = ${derivativeFormula(p, true)}`,
    caption: `${domain}；x、y 无量纲，sin 自变量为 rad。纵轴按切点附近分别缩放，超出视窗的曲线裁切。${d.reason}${d.near ? " 靠近 x=0：函数在边界处无定义，差分仅取同侧点。" : ""}`,
    metrics: [
      ["切点 x₀", mathNumber(p.x0), ""],
      ["f(x₀)", mathNumber(d.y), ""],
      ["解析导数 f′(x₀)", mathNumber(d.analytic), ""],
      ["中心差分导数", mathNumber(d.numeric), ""],
      ["两种导数的绝对差", mathNumber(d.error), ""],
      ["中心差分步长 δ", mathNumber(d.delta), ""],
      ["割线增量 h", mathNumber(p.h), ""],
      [
        "割线斜率",
        Number.isFinite(d.secant) ? mathNumber(d.secant) : "未定义 / 已禁用",
        "",
      ],
      [
        "切线方程",
        d.valid
          ? `y = ${mathNumber(d.analytic)}(x ${mathSigned(-p.x0)}) ${mathSigned(d.y)}`
          : "定义域外，已禁用",
        "",
      ],
    ],
    details: [
      ["区间范围", "下列结论仅列 x∈[−6,6] 内，区间端点不作为局部极值。"],
      ["递增区间", intervals(1)],
      ["递减区间", intervals(-1)],
      ["常值区间", intervals(0)],
      [
        "f′=0",
        a.constant
          ? "定义域内处处为 0（无孤立极值）"
          : a.zeros.length
            ? a.zeros.map((x) => `x=${mathNumber(x)}`).join("；")
            : "当前范围内无零点",
      ],
      [
        "极值与驻点",
        a.critical.length
          ? a.critical.map((v) => `${v.type} ${mathPointText(v)}`).join("；")
          : "无孤立驻点",
      ],
    ],
  };
}

function mathControlSpecs(m, p) {
  let keys =
    m.id === "conics"
      ? p.mode === "unified"
        ? ["e", "p", "cx", "cy", "angle"]
        : p.kind === "ellipse"
          ? ["a", "b", "cx", "cy", "angle"]
          : p.kind === "hyperbola"
            ? ["a", "b", "cx", "cy", "u"]
            : ["p", "cx", "cy", "u"]
      : p.kind === "poly"
        ? ["a", "b", "c", "d", "x0", "h"]
        : ["a", "d", "x0", "h"];
  return m.controls
    .filter((c) => keys.includes(c[0]))
    .map((c) => {
      const copy = [...c];
      if (m.id === "conics") {
        if (c[0] === "b" && p.mode === "standard" && p.kind === "ellipse")
          copy[4] = p.a;
        if (c[0] === "p")
          copy[2] =
            p.mode === "unified" ? "半通径 ℓ（保持为正）" : "焦点到准线距离";
        if (c[0] === "cx" || c[0] === "cy")
          copy[2] =
            (p.mode === "unified"
              ? "焦点"
              : p.kind === "parabola"
                ? "顶点"
                : "中心") + (c[0] === "cx" ? "横坐标" : "纵坐标");
      } else if (c[0] === "a")
        copy[2] = p.kind === "poly" ? "三次项系数" : "函数系数";
      return copy;
    });
}

function renderMathControls() {
  const m = state.model,
    p = state.p,
    root = $("#controlBody");
  const select = (key, label, values) =>
    `<label class="math-select-label" for="math-${key}">${label}</label><select class="control-select" id="math-${key}" data-math-select="${key}">${Object.entries(
      values,
    )
      .map(
        ([id, name]) =>
          `<option value="${id}" ${p[key] === id ? "selected" : ""}>${name}</option>`,
      )
      .join("")}</select>`;
  root.innerHTML = `${m.id === "conics" ? select("mode", "观察方式", { standard: "标准方程", unified: "统一定义 · 改变 e" }) + (p.mode === "standard" ? select("kind", "曲线类型", { ellipse: "椭圆 / 圆边界", hyperbola: "双曲线", parabola: "抛物线" }) : "") : select("kind", "函数", DERIVATIVE_NAMES)}<h3>预设</h3><div class="preset-list">${m.presets.map((s, i) => `<button class="preset" data-preset="${i}">${s[0]}</button>`).join("")}</div>${m.id === "conics" && p.mode === "standard" && p.kind === "hyperbola" ? select("branch", "点 P 所在分支", { right: "右支", left: "左支" }) : ""}<div class="params-grid">${mathControlSpecs(
    m,
    p,
  )
    .map((c) => paramHTML(c, p))
    .join(
      "",
    )}</div>${m.id === "derivative" ? '<button class="button secondary small" data-action="halve-h" id="halveH">h 减半，逼近 0</button>' : '<button class="button secondary small" data-action="reset-point">复位点 P</button>'}<p class="math-notice" id="mathNotice" role="status"></p><div class="control-divider"></div><h3>显示设置</h3><label class="checkline"><input type="checkbox" data-flag="grid" ${state.grid ? "checked" : ""}>显示坐标网格</label><label class="checkline"><input type="checkbox" data-flag="labels" ${state.labels ? "checked" : ""}>显示标注与辅助线</label><button class="button soft small" data-action="compare">${icon("compare")}<span id="compareText">${state.compare ? "清除对照曲线" : "保留当前曲线"}</span></button><p class="control-note">${m.id === "conics" ? "椭圆要求 a>b>0；a=b 单独显示为圆。统一定义固定焦点与 ℓ，e 接近 1 时远端会超出视窗。" : "切点需在定义域内。δ 自动选取，与割线 h 独立；h=0 时只显示切线。"}</p><button class="source-link" data-action="model-info">模型条件与参考资料</button>`;
  updateRanges(root);
  updateMathNotice();
}

function updateMathNotice(message = "") {
  if (!state.model?.advanced) return;
  if (state.model.id === "derivative") {
    const d = MATH_TOOLS.derivativeReadings(state.p);
    if ($("#halveH")) $("#halveH").disabled = !d.valid || state.p.h === 0;
    if (!message)
      message =
        d.reason || (d.near ? "靠近 x=0，差分取同侧点；边界处无导数。" : "");
  } else if (!message) {
    const g = MATH_TOOLS.conicGeometry(state.p);
    message =
      g.type === "circle"
        ? "圆边界：a=b，e=0，没有有限准线。"
        : state.p.mode === "unified"
          ? "焦点和 ℓ 固定；e<1 为椭圆，e=1 为抛物线，e>1 为双曲线。"
          : "";
  }
  if ($("#mathNotice")) $("#mathNotice").textContent = message;
}

function isResistanceCompare(p) {
  return p.motionMode === "compare";
}

function comparisonRows(rows) {
  return rows.map(([label, ideal, actual, unit, digits = 2]) => [
    label,
    num(ideal, digits),
    num(actual, digits),
    num(actual - ideal, digits),
    unit,
  ]);
}

function comparisonHTML(rows, label) {
  return `<div class="condition-results"><table><caption>${label} · 差值为含阻力减理想</caption><thead><tr><th scope="col">物理量</th><th scope="col">理想</th><th scope="col">含阻力</th><th scope="col">差值</th></tr></thead><tbody>${rows.map(([name, ideal, actual, diff, unit]) => `<tr><th scope="row">${esc(name)}${unit ? `<small>${esc(unit)}</small>` : ""}</th><td>${esc(ideal)}</td><td>${esc(actual)}</td><td>${esc(diff)}</td></tr>`).join("")}</tbody></table></div>`;
}

function resistanceKeys(m) {
  return m.id === "projectile"
    ? ["mass", "rho", "cd", "area"]
    : m.id === "pendulum"
      ? ["damping"]
      : [];
}

function environmentControls(m, p) {
  if (!m.environment) return "";
  const compare = isResistanceCompare(p);
  return `<fieldset class="motion-conditions"><legend>运动条件</legend><div class="condition-options"><label><input type="radio" name="motionMode" data-environment="motionMode" value="ideal" ${!compare ? "checked" : ""}><span>理想 · 无阻力</span></label><label><input type="radio" name="motionMode" data-environment="motionMode" value="compare" ${compare ? "checked" : ""}><span>理想与含阻力对照</span></label></div><p>同参数、同一时间、同一比例。含阻力结果为简化计算。</p></fieldset>`;
}

function motionDisplayControls(m, p) {
  const toggle = (key, label) =>
    `<label class="checkline"><input type="checkbox" data-motion-toggle="${key}" ${p[key] ? "checked" : ""}>${label}</label>`;
  if (m.id === "projectile")
    return [
      ["showVelocity", "速度矢量 v"],
      ["showComponents", "分速度 vₓ、vᵧ"],
      ["showStrobe", "等时间间隔频闪点"],
    ]
      .map((q) => toggle(...q))
      .join("");
  if (m.id === "pendulum")
    return (
      toggle("energyGraph", "能量—时间图") +
      (isResistanceCompare(p)
        ? `<label class="control-select-label" for="energySource">能量图对象</label><select id="energySource" class="control-select" data-motion-select="energySource"><option value="actual" ${p.energySource === "actual" ? "selected" : ""}>含阻力摆</option><option value="ideal" ${p.energySource === "ideal" ? "selected" : ""}>理想摆</option></select>`
        : "")
    );
  return "";
}

function trimHistory(history) {
  while (history.length > 2 && history[1].t < state.time - 12) history.shift();
}

function drawTimeGraph(
  ctx,
  w,
  h,
  history,
  series,
  { title, unit, ymin = 0, ymax = 1, marker = true } = {},
) {
  const left = 62,
    right = w - 23,
    top = 60,
    bottom = h - 35,
    tmax = Math.max(6, state.time),
    tmin = Math.max(0, tmax - 12),
    x = (t) => left + ((t - tmin) / (tmax - tmin)) * (right - left),
    y = (v) => bottom - ((v - ymin) / (ymax - ymin)) * (bottom - top);
  text(ctx, title, 16, 18, 13, PALETTE.ink);
  series.forEach((s, i) => {
    const sx = 16 + (i * (w - 25)) / series.length;
    line(ctx, sx, 37, sx + 16, 37, s.color, 2, s.dash || []);
    text(ctx, s.name, sx + 22, 37, 12, s.color);
  });
  for (let i = 0; i <= 4; i++) {
    const v = ymin + ((ymax - ymin) * i) / 4;
    line(ctx, left, y(v), right, y(v), "#e4e9e2");
    text(ctx, num(v, 3), left - 7, y(v), 12, PALETTE.muted, "right");
    const t = tmin + ((tmax - tmin) * i) / 4;
    text(ctx, num(t, 1), x(t), bottom + 16, 12, PALETTE.muted, "center");
  }
  text(ctx, unit, 8, top - 8, 12, PALETTE.muted);
  text(ctx, "t / s", right, bottom + 30, 12, PALETTE.muted, "right");
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, right - left, bottom - top);
  ctx.clip();
  for (const s of series) {
    ctx.beginPath();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width || 1.8;
    ctx.setLineDash(s.dash || []);
    let started = false;
    for (const q of history) {
      const v = s.value(q);
      if (!Number.isFinite(v)) {
        started = false;
        continue;
      }
      if (started) ctx.lineTo(x(q.t), y(v));
      else ctx.moveTo(x(q.t), y(v));
      started = true;
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  if (marker) {
    line(ctx, x(state.time), top, x(state.time), bottom, "#8b9c8d", 1, [3, 3]);
    for (const s of series) {
      const q = history.at(-1);
      if (q && Number.isFinite(s.value(q)))
        circle(ctx, x(state.time), y(s.value(q)), 3, s.color);
    }
  }
  ctx.restore();
  return { x, y, tmin, tmax };
}

function bindScienceStage() {
  const canvas = $("#simCanvas");
  canvas.tabIndex = 0;
  let drag = null,
    start = null,
    moved = false;
  const pos = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * canvas.clientWidth) / rect.width,
      y: ((e.clientY - rect.top) * canvas.clientHeight) / rect.height,
    };
  };
  const probe = (pt) => {
    const s = stageInfo;
    if (s?.kind !== "electric") return;
    clearScienceInputError();
    state.p.probeX = Number(clamp(s.plot.ix(pt.x), -30, 30).toFixed(6));
    state.p.probeY = Number(clamp(s.plot.iy(pt.y), -30, 30).toFixed(6));
    syncParam("probeX");
    syncParam("probeY");
    renderReadout();
    requestDraw();
  };
  const move = (pt) => {
    const s = stageInfo,
      p = state.p;
    if (!s) return;
    if (s.kind === "lens") {
      setParam("objectDistance", clamp(-s.ix(pt.x), 0.5, 60));
      return;
    }
    if (s.kind === "double-slit") {
      setParam("probe", clamp(s.ix(pt.x) * 1e3, -p.screenHalf, p.screenHalf));
      return;
    }
    if (s.kind === "induction") {
      stopAnimation();
      state.time = clamp((pt.x - s.left) / (s.right - s.left), 0, 1) * p.period;
      renderReadout();
      updatePlayback();
      requestDraw();
      return;
    }
    if (s.kind === "seasons") {
      const o = s.orbit,
        phase =
          (deg(Math.atan2((pt.y - o.cy) / o.yscale, -(pt.x - o.cx))) + 360) %
          360;
      setParam("phase", Math.round(phase * 10) / 10);
      return;
    }
    if (s.kind !== "electric" || !drag) return;
    const x = Number(clamp(s.plot.ix(pt.x), -4, 4).toFixed(6)),
      y = Number(clamp(s.plot.iy(pt.y), -3, 3).toFixed(6));
    if (
      SCIENCE.electricCharges(p).some(
        (c) => c.id !== drag && Math.hypot(x - c.x, y - c.y) < 0.35,
      )
    ) {
      updateScienceNotice("电荷中心至少相距 0.35 m。");
      return;
    }
    clearScienceInputError();
    p["x" + drag] = x;
    p["y" + drag] = y;
    syncParam("x" + drag);
    syncParam("y" + drag);
    renderReadout();
    requestDraw();
  };
  canvas.addEventListener("pointerdown", (e) => {
    if (state.inking || e.button > 0) return;
    const pt = pos(e),
      s = stageInfo;
    start = pt;
    moved = false;
    if (s?.kind === "electric") {
      const hit = s.charges.find(
        (c) => Math.hypot(pt.x - s.plot.x(c.x), pt.y - s.plot.y(c.y)) < 20,
      );
      if (hit) {
        drag = hit.id;
        state.electricSelected = hit.id;
      } else {
        probe(pt);
        return;
      }
    } else if (s?.kind === "lens") {
      if (
        Math.abs(pt.x - s.objectX) > 24 ||
        pt.y < Math.min(s.objectY, s.axisY) - 20 ||
        pt.y > Math.max(s.objectY, s.axisY) + 20
      )
        return;
      state.lensExtentLock = s.extent;
      drag = "object";
      move(pt);
    } else if (s?.kind === "double-slit") {
      if (
        pt.y < s.stripTop ||
        pt.y > s.graphBottom ||
        pt.x < s.left ||
        pt.x > s.right
      )
        return;
      drag = "probe";
      move(pt);
    } else if (s?.kind === "induction") {
      if (pt.y < s.sceneHeight || pt.x < s.left || pt.x > s.right) return;
      drag = "time";
      move(pt);
    } else if (s?.kind === "seasons") {
      const o = s.orbit;
      if (
        Math.abs(
          Math.hypot((pt.x - o.cx) / o.r, (pt.y - o.cy) / (o.r * o.yscale)) - 1,
        ) > 0.4
      )
        return;
      drag = "orbit";
      move(pt);
    } else return;
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag || state.inking) return;
    const pt = pos(e);
    if (start && Math.hypot(pt.x - start.x, pt.y - start.y) > 3) moved = true;
    move(pt);
  });
  canvas.addEventListener("pointerup", (e) => {
    if (drag && stageInfo?.kind === "electric" && !moved) probe(pos(e));
    drag = null;
    state.lensExtentLock = null;
    canvas.style.cursor = "default";
    requestDraw();
  });
  for (const type of ["pointercancel", "lostpointercapture"])
    canvas.addEventListener(type, () => {
      drag = null;
      state.lensExtentLock = null;
      canvas.style.cursor = "default";
      requestDraw();
    });
  canvas.addEventListener("keydown", (e) => {
    if (state.inking || !["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    if (state.model.id === "lens") {
      e.preventDefault();
      setParam(
        "objectDistance",
        state.p.objectDistance + (e.key === "ArrowLeft" ? 0.5 : -0.5),
      );
    }
    if (state.model.id === "double-slit") {
      e.preventDefault();
      setParam("probe", state.p.probe + (e.key === "ArrowLeft" ? -0.1 : 0.1));
    }
    if (state.model.id === "induction") {
      e.preventDefault();
      stopAnimation();
      state.time = clamp(
        state.time + (e.key === "ArrowLeft" ? -0.05 : 0.05),
        0,
        state.p.period,
      );
      renderReadout();
      updatePlayback();
      requestDraw();
    }
    if (state.model.id === "seasons") {
      e.preventDefault();
      setParam(
        "phase",
        (state.p.phase + (e.key === "ArrowLeft" ? -1 : 1) + 360) % 360,
      );
    }
  });
}

function mathMarker(ctx, plot, q, label, color = PALETTE.green, r = 4) {
  if (!q) return;
  const x = plot.x(q.x),
    y = plot.y(q.y);
  if (
    x < plot.left ||
    x > plot.w - plot.right ||
    y < plot.top ||
    y > plot.h - plot.bottom
  )
    return;
  circle(ctx, x, y, r, color, "#fff", 1.5);
  if (state.labels && label)
    text(
      ctx,
      label,
      clamp(x + 9, plot.left + 4, plot.w - plot.right - 45),
      clamp(y - 14, plot.top + 12, plot.h - plot.bottom - 12),
      12,
      color,
    );
}

function bindMathStage() {
  const canvas = $("#simCanvas");
  canvas.tabIndex = 0;
  let dragging = false;
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * canvas.clientWidth) / r.width,
      y: ((e.clientY - r.top) * canvas.clientHeight) / r.height,
    };
  };
  const hit = (pt) => {
    const s = stageInfo;
    if (!s?.point) return false;
    return (
      Math.hypot(
        pt.x - (s.dx || 0) - s.plot.x(s.point.x),
        pt.y - (s.dy || 0) - s.plot.y(s.point.y),
      ) < 30
    );
  };
  const move = (pt) => {
    const s = stageInfo,
      p = state.p,
      x = s.plot.ix(pt.x - (s.dx || 0)),
      y = s.plot.iy(pt.y - (s.dy || 0));
    if (s.kind === "derivative") {
      setParam("x0", x);
      return;
    }
    if (p.mode === "unified") {
      const theta = deg(Math.atan2(y - p.cy, x - p.cx)),
        other = theta > 0 ? theta - 180 : theta + 180;
      const choices = [theta, other]
        .map((t) => ({ t, q: MATH_TOOLS.conicPoint(p, t) }))
        .filter((v) => v.q)
        .sort(
          (a, b) =>
            Math.hypot(a.q.x - x, a.q.y - y) - Math.hypot(b.q.x - x, b.q.y - y),
        );
      if (choices[0]) setParam("angle", choices[0].t);
    } else if (p.kind === "ellipse")
      setParam("angle", deg(Math.atan2((y - p.cy) / p.b, (x - p.cx) / p.a)));
    else {
      if (p.kind === "hyperbola") {
        p.branch = x < p.cx ? "left" : "right";
        if ($("#math-branch")) $("#math-branch").value = p.branch;
        setParam("u", Math.asinh((y - p.cy) / p.b));
      } else setParam("u", (y - p.cy) / p.p);
    }
  };
  canvas.addEventListener("pointerdown", (e) => {
    if (state.inking || e.button > 0 || !hit(pos(e))) return;
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointermove", (e) => {
    if (state.inking) return;
    const pt = pos(e);
    if (dragging) move(pt);
    else canvas.style.cursor = hit(pt) ? "grab" : "default";
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    canvas.addEventListener(type, () => {
      dragging = false;
      canvas.style.cursor = "default";
    });
  canvas.addEventListener("keydown", (e) => {
    if (state.inking || !["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    const key =
      state.model.id === "derivative"
        ? "x0"
        : state.p.mode === "unified" || state.p.kind === "ellipse"
          ? "angle"
          : "u";
    setParam(
      key,
      state.p[key] +
        (e.key === "ArrowLeft" ? -1 : 1) * (key === "angle" ? 2 : 0.05),
    );
  });
}

function renderLegacyControls() {
  const m = state.model;
  const root = $("#controlBody");
  if (!root) return;
  if (m.science) {
    renderScienceControls();
    return;
  }
  if (m.advanced) {
    renderMathControls();
    return;
  }
  if (m.threeD) {
    renderGeometryControls();
    return;
  }
  if (m.id === "spring") {
    renderSpringControls();
    return;
  }
  root.innerHTML = `${environmentControls(m, state.p)}<h3>预设</h3><div class="preset-list">${m.presets.map((s, i) => `<button class="preset" data-preset="${i}">${s[0]}</button>`).join("")}</div>${
    m.id === "functions"
      ? `<label for="functionSelect" style="font-size:10px;color:#80966b">基础函数</label><select id="functionSelect" class="control-select">${Object.entries(
          FUNCTIONS,
        )
          .map(
            ([id, f]) =>
              `<option value="${id}" ${state.p.kind === id ? "selected" : ""}>${f.name}</option>`,
          )
          .join("")}</select>`
      : ""
  }<div class="params-grid">${m.controls
    .filter((c) => !resistanceKeys(m).includes(c[0]))
    .map((c) => paramHTML(c, state.p))
    .join("")}</div>${
    m.environment && isResistanceCompare(state.p)
      ? `<details class="resistance-params" ${m.id === "pendulum" ? "open" : ""}><summary>${m.id === "projectile" ? "空气与物体" : "阻尼参数"}</summary><div class="params-grid">${m.controls
          .filter((c) => resistanceKeys(m).includes(c[0]))
          .map((c) => paramHTML(c, state.p))
          .join(
            "",
          )}</div><p>${m.id === "projectile" ? "默认参数仅作教学示例；ρ 或 Cᴅ 设为 0 可核对理想极限。" : "b 为切向线性阻尼系数；b = 0 时两种摆重合。"}</p></details>`
      : ""
  }<div class="control-divider"></div><h3>显示设置</h3>${motionDisplayControls(m, state.p)}${["parabola", "functions", "projectile", "wave"].includes(m.id) ? `<label class="checkline"><input type="checkbox" data-flag="grid" ${state.grid ? "checked" : ""}>显示坐标网格</label>` : ""}<label class="checkline"><input type="checkbox" data-flag="labels" ${state.labels ? "checked" : ""}>显示标注${m.id === "projectile" ? "与重力" : ""}</label>${m.compare ? `<button class="button soft small" style="width:100%;margin-top:10px" data-action="compare">${icon("compare")}<span id="compareText">${state.compare ? "清除对照曲线" : "保留当前曲线"}</span></button>` : ""}<p class="control-note">${m.id === "gas" ? "温度用开尔文 K 表示；粒子动画是慢放示意。" : m.id === "solar" ? "“地方真太阳时”不等于北京时间。正号为北纬，负号为南纬。" : m.id === "pendulum" ? (isResistanceCompare(state.p) ? "比较当前机械能与已耗散能量；完整周期公式只适用于无阻尼摆。" : "周期 T 计入摆角影响；T₀ 是小角近似。摆球按质点计算。") : m.id === "wave" ? "注意控制变量：频率和波长独立变化，意味着在比较不同传播条件。" : "拖动滑块实时观察。修改物理参数会从初始状态重新演示。"}</p><button class="source-link" data-action="model-info">模型条件与参考资料</button>`;
  updateRanges(root);
}

function setLegacyParam(key, value) {
  if (
    state.model?.threeD ||
    ["circular", "seasons", "collision", "induction"].includes(state.model?.id)
  )
    stopAnimation();
  const m = state.model,
    spec = m?.controls.find((c) => c[0] === key);
  if (!spec || !Number.isFinite(value)) return;
  const [, , , min, max] = spec,
    next = Number(
      clamp(value, min, max).toFixed(
        m.id === "spring" ? 14 : m.id === "derivative" || m.science ? 10 : 4,
      ),
    );
  if (
    m.id === "lens" &&
    ["focal", "objectDistance", "objectHeight"].includes(key) &&
    value <= 0
  ) {
    syncParam(key);
    updateScienceNotice("物距、物高与焦距大小必须大于 0，已保留原值。");
    return;
  }
  if (
    m.id === "induction" &&
    ["period", "resistance"].includes(key) &&
    value <= 0
  ) {
    syncParam(key);
    updateScienceNotice("周期和电阻必须大于 0，已保留原值。");
    return;
  }
  if (
    m.id === "double-slit" &&
    ["wavelength", "separation", "distance", "screenHalf"].includes(key) &&
    value <= 0
  ) {
    syncParam(key);
    updateScienceNotice("波长、缝距、屏距和屏幕半宽必须大于 0，已保留原值。");
    return;
  }
  if (m.id === "collision" && ["mass1", "mass2"].includes(key) && value <= 0) {
    syncParam(key);
    updateScienceNotice("质量必须大于 0，已保留原值。");
    return;
  }
  if (m.id === "electric" && /^[xy][123]$/.test(key)) {
    const i = Number(key.slice(1)),
      candidate = { ...state.p, [key]: next };
    if (
      SCIENCE.electricCharges(candidate).some(
        (c) =>
          c.id !== i &&
          Math.hypot(candidate["x" + i] - c.x, candidate["y" + i] - c.y) < 0.35,
      )
    ) {
      syncParam(key);
      updateScienceNotice("电荷中心至少相距 0.35 m；请先移动另一坐标。");
      return;
    }
  }
  if (
    m.id === "conics" &&
    state.p.mode === "standard" &&
    state.p.kind === "ellipse" &&
    ((key === "b" && value > state.p.a) || (key === "a" && value < state.p.b))
  ) {
    syncParam(key);
    updateMathNotice("椭圆要求 a≥b>0；a=b 为圆。请先调整另一半轴。");
    return;
  }
  if (
    m.id === "derivative" &&
    key === "x0" &&
    !MATH_TOOLS.derivativeDomain(state.p.kind, next)
  ) {
    syncParam(key);
    updateMathNotice(
      "该位置不在定义域内，或小于输入精度（10 位小数），切点保持原位。ln x 要求 x>0；1/x 要求 x≠0。",
    );
    return;
  }
  clearScienceInputError();
  state.p[key] = next;
  normalizeScienceParams(m, state.p);
  normalizeGeometryParams(m, state.p);
  normalizeSpringParams(m, state.p);
  syncParam(key);
  if (m.threeD) syncGeometrySelections(m, state.p);
  if (m.id === "projectile" && key === "strobeInterval") {
    renderReadout();
    requestDraw();
    return;
  }

  if (m.id === "double-slit" && key === "screenHalf") {
    for (const el of [$("#range-probe"), $("#number-probe")])
      if (el) {
        el.min = -state.p.screenHalf;
        el.max = state.p.screenHalf;
      }
    const ends = $$(".range-extents span", $("#range-probe").closest(".param"));
    ends[0].textContent = `${-state.p.screenHalf} mm`;
    ends[1].textContent = `${state.p.screenHalf} mm`;
    syncParam("probe");
  }
  if (m.id === "conics" && key === "a") {
    for (const el of [$("#range-b"), $("#number-b")])
      if (el) el.max = state.p.a;
    updateRanges();
  }
  if (!["solar", "trig", "gas"].includes(m.id)) {
    state.time = 0;
    resetSolver();
  }
  if (m.id === "gas" && ["moles", "vol"].includes(key)) initParticles();
  if (["projectile", "collision", "induction"].includes(m.id)) updatePlayback();
  renderReadout();
  requestDraw();
}

function resetLegacySolver() {
  if (!state.model) return;
  clearScienceInputError();
  if (state.model.id === "circular") {
    state.circular = SCIENCE.circularInitial(state.p);
    const d = SCIENCE.circularData(state.p, state.circular);
    state.circularTrail = [{ x: d.x, y: d.y }];
  }
  if (state.model.id === "pendulum") {
    state.theta = state.idealTheta = rad(state.p.angle);
    state.omega = state.idealOmega = 0;
    state.pendulumHistory = [];
    recordPendulumEnergy();
  }
  if (state.model.id === "spring") {
    state.oscillator = SCIENCE.oscillatorInitial(state.p);
    state.springHistory = [{ t: 0, x: state.p.amp }];
  }
  if (state.model.id === "gas") initParticles();
}

function advanceLegacyModel(dt) {
  if (!state.model) return;
  if (state.model.threeD) {
    geometryTick(dt);
    return;
  }
  const id = state.model.id,
    p = state.p;
  if (id === "spring") {
    advanceSpring(dt);
    return;
  }
  if (id === "circular") {
    state.circular = SCIENCE.circularAdvance(p, state.circular, dt);
    state.time = state.circular.time;
    const d = SCIENCE.circularData(p, state.circular);
    state.circularTrail.push({ x: d.x, y: d.y });
    if (state.circularTrail.length > 600) state.circularTrail.shift();
    if (d.slack) {
      state.running = false;
      updatePlayback();
      updateScienceNotice();
    }
    return;
  }
  state.time += dt;
  if (id === "induction") {
    if (state.time >= p.period) {
      state.time = p.period;
      state.running = false;
      updatePlayback();
    }
    return;
  }
  if (id === "collision") {
    const end = collisionDuration(p);
    if (state.time >= end) {
      state.time = end;
      state.running = false;
      updatePlayback();
    }
    return;
  }
  if (id === "seasons") {
    p.phase = (p.phase + dt * 15) % 360;
    return;
  }
  if (id === "solar") p.hour = (p.hour + dt * 0.5) % 24;
  if (id === "trig") p.angle = (p.angle + p.omega * dt) % 360;
  if (id === "pendulum") {
    let remaining = dt;
    while (remaining > 1e-9) {
      const h = Math.min(remaining, 1 / 240);
      [state.theta, state.omega] = rk4Pendulum(state.theta, state.omega, h, p);
      [state.idealTheta, state.idealOmega] = ZhixiangPhysics.pendulumStep(
        state.idealTheta,
        state.idealOmega,
        h,
        p,
        0,
      );
      remaining -= h;
    }
    recordPendulumEnergy();
  }
  if (id === "gas") stepGas(p, state.particles, dt);
  if (id === "projectile") {
    const total = projectileDuration(p);
    if (state.time >= total) {
      state.time = total;
      state.running = false;
      updatePlayback();
    }
  }
}
