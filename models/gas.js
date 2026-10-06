"use strict";
// gas: model metadata, rendering and lifecycle hooks.

function gasData(p) {
  return {
    pressure: (p.moles * 8.314462618 * p.temp) / p.vol,
    rms: Math.sqrt((3 * 8.314462618 * p.temp) / 0.028),
    celsius: p.temp - 273.15,
  };
}

function gasBounds(w, h, p) {
  const domain = gasDomain(p),
    scale = Math.min((w * 0.7) / 3.6, (h * 0.48) / 2);
  return {
    x: w * 0.1,
    y: h * 0.22,
    w: domain.w * scale,
    h: domain.h * scale,
    scale,
  };
}

function gasDomain(p) {
  return { w: (3.6 * p.vol) / 30, h: 2 };
}

function initParticles() {
  const { w, h } = gasDomain(state.p),
    r = GAS_RADIUS;
  let seed = 937 + Math.round(state.p.moles * 1000);
  const rng = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed + 0.5) / 4294967296;
  };
  const pts = [];
  for (let i = 0; i < Math.max(9, Math.round(state.p.moles * 90)); i++) {
    let x, y;
    // Reject overlapping starting positions, including at the smallest volume.
    do {
      x = r + (w - 2 * r) * rng();
      y = r + (h - 2 * r) * rng();
    } while (pts.some((q) => Math.hypot(x - q.x * w, y - q.y * h) < 2 * r));
    const a = 2 * Math.PI * rng(),
      speed = Math.sqrt(-2 * Math.log(rng()));
    pts.push({
      x: x / w,
      y: y / h,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
    });
  }
  // Normalize the finite sample so changing the count does not change its RMS speed.
  const meanX = pts.reduce((v, q) => v + q.vx, 0) / pts.length,
    meanY = pts.reduce((v, q) => v + q.vy, 0) / pts.length;
  pts.forEach((q) => {
    q.vx -= meanX;
    q.vy -= meanY;
  });
  const rms = Math.sqrt(
    pts.reduce((v, q) => v + q.vx * q.vx + q.vy * q.vy, 0) / pts.length,
  );
  pts.forEach((q) => {
    q.vx /= rms;
    q.vy /= rms;
  });
  state.particles = pts;
}

function collideGasPair(a, b, w, h) {
  const dx = (b.x - a.x) * w,
    dy = (b.y - a.y) * h,
    dist = Math.hypot(dx, dy),
    diameter = 2 * GAS_RADIUS;
  if (dist >= diameter) return;
  const nx = dist > 1e-12 ? dx / dist : 1,
    ny = dist > 1e-12 ? dy / dist : 0,
    shift = (diameter - dist) / 2;
  a.x -= (nx * shift) / w;
  a.y -= (ny * shift) / h;
  b.x += (nx * shift) / w;
  b.y += (ny * shift) / h;
  const approach = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (approach < 0) {
    a.vx += approach * nx;
    a.vy += approach * ny;
    b.vx -= approach * nx;
    b.vy -= approach * ny;
  }
}

function stepGas(p, particles, dt) {
  const { w, h } = gasDomain(p),
    r = GAS_RADIUS,
    speed = 0.42 * Math.sqrt(p.temp / 300),
    steps = Math.max(1, Math.ceil(dt * 240)),
    step = dt / steps;
  const wall = (q) => {
    const mx = r / w,
      my = r / h;
    if (q.x < mx) {
      q.x = mx;
      q.vx = Math.abs(q.vx);
    } else if (q.x > 1 - mx) {
      q.x = 1 - mx;
      q.vx = -Math.abs(q.vx);
    }
    if (q.y < my) {
      q.y = my;
      q.vy = Math.abs(q.vy);
    } else if (q.y > 1 - my) {
      q.y = 1 - my;
      q.vy = -Math.abs(q.vy);
    }
  };
  for (let i = 0; i < steps; i++) {
    particles.forEach((q) => {
      q.x += (q.vx * speed * step) / w;
      q.y += (q.vy * speed * step) / h;
      wall(q);
    });
    for (let a = 0; a < particles.length; a++)
      for (let b = a + 1; b < particles.length; b++)
        collideGasPair(particles[a], particles[b], w, h);
    particles.forEach(wall);
  }
}

const GAS_RADIUS = 0.018;

function drawGas(ctx, w, h, p, particles) {
  const b = gasBounds(w, h, p);
  roundRect(
    ctx,
    b.x - 7,
    b.y - 7,
    3.6 * b.scale + 14,
    b.h + 14,
    4,
    "#f4f6f5",
    "#d7ddd9",
  );
  roundRect(ctx, b.x, b.y, b.w, b.h, 5, "#fdfefa", "#b6c9a5", 1.5);
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x + 2, b.y + 2, b.w - 4, b.h - 4);
  ctx.clip();
  particles.forEach((pt) => {
    const x = b.x + pt.x * b.w,
      y = b.y + pt.y * b.h,
      col = PALETTE.green;
    line(
      ctx,
      x - pt.vx * 4 * Math.sqrt(p.temp / 300),
      y - pt.vy * 4 * Math.sqrt(p.temp / 300),
      x,
      y,
      "#94b5a180",
      1.7,
    );
    circle(ctx, x, y, GAS_RADIUS * b.scale, col);
  });
  ctx.restore();
  roundRect(
    ctx,
    b.x + b.w - 3,
    b.y - 6,
    9,
    b.h + 12,
    3,
    "#c1d0b0",
    "#9eb788",
    1,
  );
  line(
    ctx,
    b.x + b.w + 7,
    b.y + b.h / 2,
    Math.min(w * 0.86, b.x + b.w + 27),
    b.y + b.h / 2,
    "#a8ba97",
    5,
  );
  const tx = w * 0.91,
    ty = b.y + 12,
    th = b.h - 32;
  roundRect(ctx, tx - 4, ty, 8, th, 4, "#edf0e7", "#d4dfc8", 1);
  const fill = (p.temp - 100) / 700;
  roundRect(
    ctx,
    tx - 2,
    ty + (1 - fill) * th,
    4,
    Math.max(2, th * fill),
    2,
    "#d6a064",
  );
  circle(ctx, tx, ty + th + 4, 7, "#d6a064");
  if (state.labels) {
    text(ctx, `${num(p.temp)} K`, w * 0.91, b.y - 23, 11, "#b09067", "center");
    text(
      ctx,
      `${num(p.vol)} L`,
      b.x + b.w / 2,
      b.y + b.h + 31,
      13,
      PALETTE.green,
      "center",
    );
    text(ctx, `n = ${num(p.moles)} mol`, w * 0.12, b.y - 26, 11, "#8b9e7a");
    text(
      ctx,
      "等温状态 · 分子运动慢放示意",
      w / 2,
      h * 0.85,
      12,
      PALETTE.muted,
      "center",
    );
  }
}

ZhixiangModels.register({
  id: "gas",
  cat: "physics",
  level: "初中 · 高中",
  title: "理想气体与分子运动",
  desc: "改变温度和体积，观察分子运动与压强。",
  tags: "气体 理想气体 分子 运动 温度 压强 体积 热力学",
  time: true,
  defaults: { temp: 300, vol: 20, moles: 0.5 },
  controls: [
    ["temp", "T", "绝对温度", 100, 800, 10, "K"],
    ["vol", "V", "气体体积", 5, 30, 0.5, "L"],
    ["moles", "n", "物质的量", 0.1, 1, 0.05, "mol"],
  ],
  presets: [
    ["室温示意", { temp: 300, vol: 20, moles: 0.5 }],
    ["升温对比", { temp: 600, vol: 20, moles: 0.5 }],
    ["等温压缩", { temp: 300, vol: 10, moles: 0.5 }],
  ],
  hint: "二维慢放示意；粒子与壁面、粒子之间均为弹性碰撞。",
  question: "温度和气体量不变，把容器体积减半，压强会怎样变化？",
  answer:
    "由 pV = nRT 可知，温度和气体量不变时，体积减半，压强加倍。升温会提高分子均方根速率，比例为 √T，而不是 T。",
  note: "宏观计算使用 pV = nRT，R = 8.314462618 J/(mol·K)。均方根速率 vᵣₘₛ = √(3RT/M)，采用理想氮气 M = 0.028 kg/mol。粒子动画为二维等质量硬圆盘示意，采用高斯速度分量、弹性壁面反射和两体弹性碰撞；半径、粒子数量与动画时间均为教学缩放，不是真实分子尺度。动画使用固定模拟坐标，窗口大小不影响运动。压强来自三维理想气体状态方程，并非二维碰撞统计。改变体积或气体量会重新布置粒子；温度保持给定值，表示等温状态比较，不模拟活塞的连续压缩过程。",
  sources: ["gas", "kinetic", "collisions"],
  draw: (ctx, w, h, p, comparison) => drawGas(ctx, w, h, p, state.particles),
  readout: (p, m) => {
    {
      const d = gasData(p);
      return {
        formula: "pV = nRT",
        caption: "二维碰撞示意 · 绝对压强由 pV = nRT 计算",
        metrics: [
          ["绝对压强", num(d.pressure, 1), "kPa"],
          ["均方根速率", num(d.rms, 1), "m/s"],
          ["摄氏温度", num(d.celsius, 1), "°C"],
        ],
      };
    }
  },
  thumbnail: (canvas, m) => {
    const { ctx, w, h } = setupCanvas(canvas),
      cx = w * 0.5,
      cy = h * 0.6,
      col = CATS[m.cat].color;
    ctx.save();
    {
      const bx = w * 0.2,
        by = h * 0.28,
        bw = w * 0.59,
        bh = h * 0.56;
      roundRect(ctx, bx, by, bw, bh, 6, "#fffdf670", "#dccbae", 1.3);
      for (let i = 0; i < 27; i++) {
        const x = bx + 9 + ((i * 67 + 31) % (bw - 18)),
          y = by + 7 + ((i * 41 + 19) % (bh - 14));
        line(ctx, x - 4, y + 3, x, y, "#dcc9a177", 1);
        circle(ctx, x, y, 2.2, i % 4 ? "#bbaa7e" : "#daaa70");
      }
      roundRect(ctx, bx + bw - 4, by - 4, 7, bh + 8, 2, "#d4c0a1");
      text(ctx, "T ↑", w * 0.85, h * 0.54, 13, "#b5996c", "center", "math");
    }
    ctx.restore();
  },
  renderControls: renderLegacyControls,
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
  bind: () => {},
});
