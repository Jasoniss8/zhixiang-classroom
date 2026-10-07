/* University mathematics in mathematical coordinates; no DOM or drawing dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.ZhixiangUniversityMath = api;
})(typeof window === "object" ? window : globalThis, function () {
  "use strict";
  const finite = (...xs) => xs.every(Number.isFinite);
  const failure = reason => ({ valid: false, reason });
  const taylorKinds = ["sin", "cos", "exp", "log", "reciprocal"];
  function taylorCheck(p) {
    if (!p || !taylorKinds.includes(p.kind) || !finite(p.center, p.amp, p.offset) || !Number.isInteger(p.degree) || p.degree < 0 || p.degree > 12) return "函数、展开点、系数和0–12整数阶数必须有效。";
    if (p.kind === "log" && p.center < .05) return "ln x 的展开点需a≥0.05；本模型不在奇点附近展开。";
    if (p.kind === "reciprocal" && Math.abs(p.center) < .05) return "1/x 的展开点需|a|≥0.05；不能在x=0或过近处展开。";
    return "";
  }
  function taylorFunction(p, x) {
    if (!Number.isFinite(x) || p.kind === "log" && x <= 0 || p.kind === "reciprocal" && x === 0) return NaN;
    const y = p.kind === "sin" ? Math.sin(x) : p.kind === "cos" ? Math.cos(x) : p.kind === "exp" ? Math.exp(x) : p.kind === "log" ? Math.log(x) : p.kind === "reciprocal" ? 1 / x : NaN;
    return p.amp * y + p.offset;
  }
  function taylorCoefficients(p) {
    if (taylorCheck(p)) return [];
    const c = [], a = p.center;
    let factorial = 1;
    for (let n = 0; n <= p.degree; n++) {
      if (n) factorial *= n;
      let v;
      if (p.kind === "sin") v = [Math.sin(a), Math.cos(a), -Math.sin(a), -Math.cos(a)][n % 4] / factorial;
      else if (p.kind === "cos") v = [Math.cos(a), -Math.sin(a), -Math.cos(a), Math.sin(a)][n % 4] / factorial;
      else if (p.kind === "exp") v = Math.exp(a) / factorial;
      else if (p.kind === "log") v = n === 0 ? Math.log(a) : (n % 2 ? 1 : -1) / (n * a ** n);
      else v = (n % 2 ? -1 : 1) / a ** (n + 1);
      c.push(p.amp * v + (n === 0 ? p.offset : 0));
    }
    return c.every(Number.isFinite) ? c : [];
  }
  function horner(coefficients, x) {
    let value = 0;
    for (let i = coefficients.length - 1; i >= 0; i--) value = value * x + coefficients[i];
    return value;
  }
  function taylorValue(p, x) {
    const c = taylorCoefficients(p);
    return c.length && Number.isFinite(x) ? horner(c, x - p.center) : NaN;
  }
  function taylorData(p) {
    const reason = taylorCheck(p), coefficients = taylorCoefficients(p);
    if (reason || !coefficients.length) return failure(reason || "系数超出有限数值范围，请移开展开点。");
    const radius = ["log", "reciprocal"].includes(p.kind) ? Math.abs(p.center) : Infinity;
    const x = Number.isFinite(p.probe) ? p.probe : p.center;
    const value = taylorFunction(p, x), approx = horner(coefficients, x - p.center);
    const converges = p.kind === "log" ? x > 0 && x <= 2 * p.center : p.kind === "reciprocal" ? Math.abs(x - p.center) < radius : true;
    return { valid: true, reason: "", coefficients, expression: coefficients.map((c, n) => `${c}·(x−${p.center})^${n}`).join(" + "),
      x, value, approx, error: approx - value, absError: Math.abs(approx - value), radius, converges,
      interval: p.kind === "log" ? `(0, ${2 * p.center}]` : p.kind === "reciprocal" ? `(${p.center - radius}, ${p.center + radius})` : "全体实数",
      domainValid: Number.isFinite(value), conservativeRadius: p.amp === 0 && Number.isFinite(radius) };
  }
  function matrixVector(A, v) { return [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]]; }
  function matrixDet(A) { return A[0][0] * A[1][1] - A[0][1] * A[1][0]; }
  function matrixEigen(A) {
    const a = A[0][0], b = A[0][1], c = A[1][0], d = A[1][1];
    const trace = a + d, det = a * d - b * c, half = trace / 2;
    const discriminant = (a - d) ** 2 + 4 * b * c;
    const scale = Math.max(1, Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(d));
    const nearRepeated = Math.abs(discriminant) <= 128 * Number.EPSILON * scale * scale;
    if (discriminant < 0) return { trace, eigenvalues: [{ re: half, im: Math.sqrt(-discriminant) / 2 }, { re: half, im: -Math.sqrt(-discriminant) / 2 }], eigenvectors: [], classification: "共轭复特征值；无实特征方向", nearRepeated, discriminant };
    const s = Math.sqrt(discriminant) / 2;
    const first = half + (half >= 0 ? s : -s);
    const lambdas = s === 0 ? [half, half] : [first, first ? det / first : half - s];
    const vectorFor = lambda => {
      const u = [b, lambda - a], v = [lambda - d, c];
      const selected = Math.hypot(...u) >= Math.hypot(...v) ? u : v;
      const norm = Math.hypot(...selected);
      return norm ? selected.map(x => x / norm) : null;
    };
    const scalar = b === 0 && c === 0 && a === d;
    const vectors = scalar ? [[1, 0], [0, 1]] : (s === 0 ? [vectorFor(half)] : lambdas.map(vectorFor)).filter(Boolean);
    return { trace, eigenvalues: lambdas.map(re => ({ re, im: 0 })), eigenvectors: vectors,
      classification: scalar ? "标量矩阵：每个非零向量都是特征向量" : s === 0 ? "重实根：只有一个独立特征方向" : "两个实特征值", nearRepeated, discriminant };
  }
  function linearData(p) {
    if (!p || !finite(p.m11, p.m12, p.m21, p.m22, p.vx, p.vy, p.tau) || p.tau < 0 || p.tau > 1) return failure("矩阵、向量与0–1变换进度必须为有限数值。");
    const A = [[p.m11, p.m12], [p.m21, p.m22]], t = p.tau;
    const current = [[1 - t + t * p.m11, t * p.m12], [t * p.m21, 1 - t + t * p.m22]];
    const input = [p.vx, p.vy], output = matrixVector(current, input), det = matrixDet(current);
    const matrixScale = Math.max(1, ...current.flat().map(Math.abs));
    return { valid: true, reason: "", A, current, input, output, det, targetDet: matrixDet(A), targetOutput: matrixVector(A, input),
      areaScale: Math.abs(det), singular: det === 0, nearSingular: Math.abs(det) <= 1e-10 * matrixScale * matrixScale,
      orientation: det > 0 ? "保持定向" : det < 0 ? "反转定向" : "压缩为线或点", ...matrixEigen(current) };
  }
  function gradientValue(p, x, y) {
    if (!finite(x, y)) return NaN;
    if (p.surface === "wave") return Math.sin(x) * Math.cos(y);
    if (p.surface === "gaussian") return Math.exp(-x * x - y * y);
    if (p.surface === "quadratic") return p.a * x * x + p.b * x * y + p.c * y * y + p.d * x + p.e * y + p.f;
    return NaN;
  }
  function gradientAt(p, x, y) {
    let fx, fy;
    const value = gradientValue(p, x, y);
    if (p.surface === "wave") { fx = Math.cos(x) * Math.cos(y); fy = -Math.sin(x) * Math.sin(y); }
    else if (p.surface === "gaussian") { fx = -2 * x * value; fy = -2 * y * value; }
    else { fx = 2 * p.a * x + p.b * y + p.d; fy = p.b * x + 2 * p.c * y + p.e; }
    return { value, fx, fy };
  }
  function gradientData(p) {
    if (!p || !["quadratic", "wave", "gaussian"].includes(p.surface) || !finite(p.x0, p.y0, p.theta) || p.surface === "quadratic" && !finite(p.a, p.b, p.c, p.d, p.e, p.f)) return failure("函数系数、观察点和方向角必须有效。");
    const at = gradientAt(p, p.x0, p.y0), norm = Math.hypot(at.fx, at.fy), angle = p.theta * Math.PI / 180, unit = [Math.cos(angle), Math.sin(angle)];
    const delta = Math.cbrt(Number.EPSILON) * Math.max(1, Math.abs(p.x0), Math.abs(p.y0));
    const f = (dx, dy) => gradientValue(p, p.x0 + dx, p.y0 + dy);
    const numeric = { fx: (f(delta, 0) - f(-delta, 0)) / (2 * delta), fy: (f(0, delta) - f(0, -delta)) / (2 * delta), directional: (f(delta * unit[0], delta * unit[1]) - f(-delta * unit[0], -delta * unit[1])) / (2 * delta) };
    const directional = at.fx * unit[0] + at.fy * unit[1];
    return { valid: finite(at.value, at.fx, at.fy), reason: "", ...at, norm, unit, directional, normal: [-at.fx, -at.fy, 1], numeric, delta,
      errors: { fx: Math.abs(at.fx - numeric.fx), fy: Math.abs(at.fy - numeric.fy), directional: Math.abs(directional - numeric.directional) },
      tangent: { x0: p.x0, y0: p.y0, z0: at.value, fx: at.fx, fy: at.fy }, stationary: norm < 1e-12 };
  }
  function gradientMesh(p, resolution = 41) {
    const n = Math.max(5, Math.min(61, Math.round(resolution))), vertices = [], faces = [];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const x = -3 + 6 * i / (n - 1), y = -3 + 6 * j / (n - 1); vertices.push([x, y, gradientValue(p, x, y)]); }
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { const k = j * n + i; faces.push([k, k + 1, k + 1 + n, k + n]); }
    return { resolution: n, vertices, faces };
  }
  function gradientContours(p, levels, resolution = 41) {
    const mesh = gradientMesh(p, resolution), n = mesh.resolution, curves = [];
    for (const level of levels.filter(Number.isFinite)) {
      const segments = [];
      for (const face of mesh.faces) {
        const corners = face.map(index => mesh.vertices[index]), edges = [];
        for (let k = 0; k < 4; k++) {
          const a = corners[k], b = corners[(k + 1) % 4];
          if ((a[2] >= level) !== (b[2] >= level)) { const t = (level - a[2]) / (b[2] - a[2]); edges.push({ edge: k, point: [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])] }); }
        }
        if (edges.length === 2) segments.push(edges.map(e => e.point));
        if (edges.length === 4) {
          const centerValue = gradientValue(p, (corners[0][0] + corners[2][0]) / 2, (corners[0][1] + corners[2][1]) / 2);
          const pairs = (centerValue >= level) === (corners[0][2] >= level) ? [[0, 1], [2, 3]] : [[0, 3], [1, 2]];
          for (const pair of pairs) segments.push(pair.map(i => edges[i].point));
        }
      }
      curves.push({ level, segments });
    }
    return curves;
  }
  return Object.freeze({ taylorFunction, taylorCoefficients, taylorValue, taylorData, horner, matrixVector, matrixDet, matrixEigen, linearData, gradientValue, gradientAt, gradientData, gradientMesh, gradientContours });
});
