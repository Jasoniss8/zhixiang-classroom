/* Dimensionless Fourier/ODE calculations; no DOM, drawing coordinates or I/O. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ZhixiangUniversityDynamics = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
  const finiteRange = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
  const invalid = (message) => ({ valid: false, message });
  function fourierValidate(p) {
    if (!p || !["square", "sawtooth", "triangle"].includes(p.kind)) return invalid("请选择方波、锯齿波或三角波。");
    if (!finiteRange(p.amplitude, .1, 3) || !finiteRange(p.period, .1, 20) || !finiteRange(p.phase, -Math.PI, Math.PI)) return invalid("振幅、周期或相位超出支持范围。");
    if (!Number.isInteger(p.terms) || !finiteRange(p.terms, 1, 50)) return invalid("最高谐波次数 N 须为 1–50 的整数。");
    if (p.axisUnit !== undefined && !["1", "s"].includes(p.axisUnit)) return invalid("横轴单位须为无量纲或秒。");
    return { valid: true };
  }
  function fourierCoefficient(p, n) {
    let b = 0;
    if (Number.isInteger(n) && n > 0) {
      if (p.kind === "square" && n % 2) b = 4 * p.amplitude / (Math.PI * n);
      else if (p.kind === "sawtooth") b = 2 * p.amplitude * (n % 2 ? 1 : -1) / (Math.PI * n);
      else if (p.kind === "triangle" && n % 2) b = 8 * p.amplitude * ((n - 1) % 4 ? -1 : 1) / (Math.PI ** 2 * n ** 2);
    }
    return { a: 0, b };
  }
  function fourierTarget(p, x) {
    const theta = 2 * Math.PI * x / p.period - p.phase;
    if (p.kind === "triangle") return 2 * p.amplitude / Math.PI * Math.asin(Math.sin(theta));
    if (p.kind === "square") return Math.abs(Math.sin(theta)) < 1e-12 ? 0 : p.amplitude * Math.sign(Math.sin(theta));
    let t = ((theta + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
    if (Math.abs(Math.abs(t) - Math.PI) < 1e-12) t = 0;
    return p.amplitude * t / Math.PI;
  }
  function fourierSum(p, x) {
    const theta = 2 * Math.PI * x / p.period - p.phase;
    let sum = 0;
    for (let n = 1; n <= p.terms; n++) sum += fourierCoefficient(p, n).b * Math.sin(n * theta);
    return sum;
  }
  function fourierData(p) {
    const valid = fourierValidate(p);
    if (!valid.valid) return valid;
    const coefficients = Array.from({ length: p.terms }, (_, i) => {
      const n = i + 1, c = fourierCoefficient(p, n);
      return { n, ...c, amplitude: Math.abs(c.b) };
    });
    const power = p.amplitude ** 2 / (p.kind === "square" ? 1 : 3);
    const retainedPower = coefficients.reduce((s, c) => s + c.b * c.b / 2, 0);
    return { valid: true, coefficients, activeTerms: coefficients.filter(c => c.b !== 0).length,
      rmsError: Math.sqrt(Math.max(0, power - retainedPower)), retainedPower, power };
  }
  function odeValidate(p) {
    if (!p || !["linear", "logistic"].includes(p.kind)) return invalid("请选择线性方程或 Logistic 方程。");
    if (!finiteRange(p.t0, -2, 2) || !finiteRange(p.y0, -3, 5) || !finiteRange(p.h, .02, .5) || !finiteRange(p.span, .5, 6)) return invalid("初值、步长或正向区间超出支持范围。");
    if (p.kind === "linear" && ![p.a, p.b, p.c].every(v => finiteRange(v, -2, 2))) return invalid("线性系数 a、b、c 须在 −2 到 2 之间。");
    if (p.kind === "logistic" && (!finiteRange(p.r, .1, 2) || !finiteRange(p.K, .5, 5) || p.y0 < 0 || p.y0 > p.K)) return invalid("Logistic 模板要求 r>0、K>0，且 0≤y₀≤K。");
    return { valid: true };
  }
  function odeRHS(p, t, y) {
    return p.kind === "logistic" ? p.r * y * (1 - y / p.K) : p.a * t + p.b * y + p.c;
  }
  function phi(z, order) {
    if (Math.abs(z) > .01) return order === 1 ? Math.expm1(z) / z : (Math.expm1(z) - z) / (z * z);
    let term = order === 1 ? 1 : .5, sum = term;
    for (let k = 1; k < 14; k++) { term *= z / (k + order); sum += term; }
    return sum;
  }
  function odeExact(p, t) {
    const tau = t - p.t0;
    if (p.kind === "logistic") {
      if (p.y0 === 0 || p.y0 === p.K) return p.y0;
      return p.K / (1 + (p.K / p.y0 - 1) * Math.exp(-p.r * tau));
    }
    const z = p.b * tau;
    return Math.exp(z) * p.y0 + (p.a * p.t0 + p.c) * tau * phi(z, 1) + p.a * tau * tau * phi(z, 2);
  }
  function odeSolve(p) {
    const valid = odeValidate(p);
    if (!valid.valid) return valid;
    const end = p.t0 + p.span, points = [{ t: p.t0, exact: p.y0, euler: p.y0, rk4: p.y0 }];
    let t = p.t0, euler = p.y0, rk4 = p.y0, maxEulerError = 0, maxRK4Error = 0;
    // Index-derived times avoid accumulated drift; the last step lands on the endpoint.
    for (let index = 1; index <= Math.ceil(p.span / p.h); index++) {
      const next = Math.min(end, p.t0 + index * p.h), h = next - t;
      if (h <= 0) break;
      const a = odeRHS(p, t, rk4), b = odeRHS(p, t + h / 2, rk4 + h * a / 2),
        c = odeRHS(p, t + h / 2, rk4 + h * b / 2), d = odeRHS(p, next, rk4 + h * c);
      euler += h * odeRHS(p, t, euler);
      rk4 += h * (a + 2 * b + 2 * c + d) / 6;
      t = next;
      const exact = odeExact(p, t);
      if (![euler, rk4, exact].every(Number.isFinite)) return invalid("解超出有限数值范围，请缩短区间或调整系数。");
      maxEulerError = Math.max(maxEulerError, Math.abs(euler - exact));
      maxRK4Error = Math.max(maxRK4Error, Math.abs(rk4 - exact));
      points.push({ t, exact, euler, rk4 });
    }
    return { valid: true, points, maxEulerError, maxRK4Error };
  }
  return Object.freeze({ fourierValidate, fourierCoefficient, fourierTarget, fourierSum, fourierData,
    odeValidate, odeRHS, odeExact, odeSolve });
});
