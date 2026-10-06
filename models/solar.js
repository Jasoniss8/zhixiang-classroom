"use strict";
// solar: model metadata, rendering and lifecycle hooks.

function solarData(p) {
  const d = SCIENCE.solarPosition(p.lat, p.dec, p.hour);
  return {
    ...d,
    shadow: d.elevation > 1e-8 ? p.pole / Math.tan(rad(d.elevation)) : null,
  };
}

function drawSolar(ctx, w, h, p) {
  const d = solarData(p),
    ground = h * 0.76,
    base = w * 0.46,
    scale = Math.min(28, (h * 0.47) / 5),
    poleH = p.pole * scale,
    a = rad(d.elevation),
    night = d.elevation <= 1e-8;
  ctx.fillStyle = night ? "#eff1f7" : "#f6f8f4";
  ctx.fillRect(0, 0, w, ground);
  ctx.fillStyle = night ? "#e6e9ed" : "#edf2e7";
  ctx.fillRect(0, ground, w, h - ground);
  line(ctx, 0, ground, w, ground, "#c7d3b7", 1.3);
  const sr = Math.min(w * 0.32, h * 0.54),
    sunX = base - Math.cos(a) * sr,
    sunY = ground - Math.sin(a) * sr;
  if (sunY < h - 12) {
    circle(ctx, sunX, sunY, 25, night ? "#c7cce945" : "#f7dea955");
    circle(ctx, sunX, sunY, 15, night ? "#b9c0df" : "#e9bf66");
    if (!night)
      for (let i = 0; i < 8; i++) {
        const r = (i * Math.PI) / 4;
        line(
          ctx,
          sunX + Math.cos(r) * 21,
          sunY + Math.sin(r) * 21,
          sunX + Math.cos(r) * 26,
          sunY + Math.sin(r) * 26,
          "#e7c271",
          1.3,
        );
      }
  }
  if (!night) {
    const shadow = d.shadow * scale,
      end = base + shadow;
    line(
      ctx,
      base,
      ground + 3,
      Math.min(end, w - 20),
      ground + 3,
      "#879575",
      7,
    );
    if (state.labels) {
      if (end > w - 25)
        text(
          ctx,
          "影子延伸至画面外 →",
          w - 15,
          ground + 25,
          10,
          "#8e9c7d",
          "right",
        );
      else
        text(
          ctx,
          `${num(d.shadow)} m`,
          base + shadow / 2,
          ground + 23,
          11,
          "#899674",
          "center",
        );
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(8, 18, w - 16, ground - 18);
    ctx.clip();
    const tx = base,
      ty = ground - poleH;
    line(
      ctx,
      tx - Math.cos(a) * sr * 1.5,
      ty - Math.sin(a) * sr * 1.5,
      end,
      ground,
      "#d9b361",
      1.5,
      [5, 5],
    );
    const end2x = base - 30,
      end2y = ground;
    arrow(
      ctx,
      end2x - Math.cos(a) * sr * 0.75,
      end2y - Math.sin(a) * sr * 0.75,
      end2x,
      end2y,
      "#e0c77f",
      1.2,
      5,
    );
    ctx.restore();
    if (state.labels) {
      const centerX = base,
        centerY = ground;
      line(ctx, centerX, centerY, centerX - 60, centerY, "#b5c49f", 1);
      line(
        ctx,
        centerX,
        centerY,
        centerX - Math.cos(a) * 70,
        centerY - Math.sin(a) * 70,
        "#c4c9aa",
        1,
        [3, 3],
      );
      ctx.beginPath();
      ctx.arc(centerX, centerY, 42, Math.PI, Math.PI + a, false);
      ctx.strokeStyle = "#8b9e68";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      text(
        ctx,
        `α = ${num(d.elevation, 1)}°`,
        centerX - 55 * Math.cos(a / 2),
        centerY - 55 * Math.sin(a / 2) - 7,
        11,
        "#78935a",
        "center",
      );
    }
  }
  line(ctx, base, ground, base, ground - poleH, "#5d7160", 5);
  circle(ctx, base, ground - poleH, 4, "#749569");
  roundRect(ctx, base - 10, ground - 3, 20, 6, 2, "#9ba991");
  if (state.labels) {
    text(ctx, `${num(p.pole)} m`, base + 13, ground - poleH / 2, 11, "#77896b");
    text(
      ctx,
      night
        ? "太阳低于地平线 · 无直射杆影"
        : "太阳高度角：太阳光线与水平面的夹角",
      w / 2,
      29,
      11,
      night ? "#8f96b0" : "#8c9c79",
      "center",
    );
    text(
      ctx,
      `${p.lat >= 0 ? "北纬" : "南纬"} ${num(Math.abs(p.lat))}°  ·  地方真太阳时 ${num(p.hour, 1)} h`,
      w / 2,
      h - 44,
      10,
      "#9fa98f",
      "center",
    );
  }
}

ZhixiangModels.register({
  id: "solar",
  cat: "geography",
  level: "高中",
  title: "太阳高度角与日影",
  desc: "调整纬度与太阳时，计算高度角和影长。",
  tags: "地理 太阳 太阳角 高度角 正午 纬度 季节 日影 直射",
  time: true,
  defaults: { lat: 31, dec: 0, hour: 12, pole: 2 },
  controls: [
    ["lat", "φ", "观察地纬度", -90, 90, 1, "°"],
    ["dec", "δ", "太阳直射纬度", -23.44, 23.44, 0.01, "°"],
    ["hour", "t", "地方真太阳时", 0, 24, 0.1, "h"],
    ["pole", "H", "立杆高度", 0.5, 5, 0.1, "m"],
  ],
  presets: [
    ["春秋分", { dec: 0, hour: 12 }],
    ["北半球夏至", { dec: 23.44, hour: 12 }],
    ["北半球冬至", { dec: -23.44, hour: 12 }],
  ],
  hint: "太阳—立杆竖直截面示意，不代表东西南北方位。",
  question:
    "同一地点的正午，北半球夏至和冬至，哪一天的影子更短？所有纬度都一样吗？",
  answer:
    "先比较太阳高度角，再判断影长：太阳在地平线上方时，高度角越大，影子越短。不能把北半球的结论套到南半球；回归线之间还要考虑太阳直射位置。",
  note: "α = asin(sinφ sinδ + cosφ cosδ cosω)，ω = 15°(t−12)。正午高度 αₙ = 90°−|φ−δ|；地平线上方时 L = H/tanα。时间为地方真太阳时，不是北京时间或手机时间。未计算经度、时区、均时差、大气折射、地形或太阳视半径，不能用于精密日出日落预报。δ 由滑块直接给定，季节预设为理想化数值。播放为加速演示：1× 倍速时每秒推进 0.5 小时地方真太阳时。",
  sources: ["solar", "solarLimits"],
  draw: (ctx, w, h, p, comparison) => drawSolar(ctx, w, h, p, comparison),
  readout: (p, m) => {
    {
      const d = solarData(p);
      return {
        formula: "sin α = sin φ sin δ + cos φ cos δ cos ω",
        caption: `ω = 15° × (地方真太阳时 − 12) · ${d.elevation > 1e-8 ? "太阳在地平线上方" : "太阳位于地平线或其下方"}`,
        metrics: [
          ["当前太阳高度角", num(d.elevation, 1), "°"],
          ["正午太阳高度角", num(d.noon, 1), "°"],
          [
            "水平杆影长度",
            d.shadow === null
              ? "无直射杆影"
              : num(d.shadow, d.shadow > 100 ? 1 : 2),
            d.shadow === null ? "" : "m",
          ],
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
      const gy = h * 0.78,
        bx = w * 0.53;
      ctx.fillStyle = "#e4e3ef";
      ctx.fillRect(10, gy, w - 20, h - gy);
      line(ctx, 10, gy, w - 10, gy, "#bdb5d1");
      circle(ctx, w * 0.3, h * 0.38, 13, "#edcf89");
      circle(ctx, w * 0.3, h * 0.38, 21, "#edcf8920");
      line(ctx, bx, gy, bx, gy - 47, "#9990b1", 3);
      line(ctx, bx, gy + 2, w * 0.86, gy + 2, "#bcb7d0", 4);
      line(ctx, w * 0.23, h * 0.3, w * 0.84, gy, "#d0bf97", 1, [4, 4]);
      arcAngle(ctx, w * 0.84, gy, 26, Math.PI, Math.PI + 0.59, "#b49c72");
      text(ctx, "α", w * 0.84 - 32, gy - 12, 14, "#ab9770", "center", "math");
      text(ctx, "φ = 31° N", w * 0.63, 43, 11, "#aea5c2");
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
