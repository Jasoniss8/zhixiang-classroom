'use strict';

// SI coordinates and seconds. No canvas dimensions enter the equations.
window.ZhixiangPhysics = (() => {
  function dragRate(p) {
    return .5 * p.rho * p.cd * p.area / p.mass;
  }
  function acceleration(vx, vy, p) {
    const q = dragRate(p), speed = Math.hypot(vx, vy);
    return [-q * speed * vx, -p.g - q * speed * vy];
  }
  function projectileStep(s, dt, p) {
    const derivative = a => {
      const [ax, ay] = acceleration(a[2], a[3], p);
      return [a[2], a[3], ax, ay];
    };
    const add = (a, k, scale) => a.map((v, i) => v + scale * k[i]);
    const k1 = derivative(s), k2 = derivative(add(s, k1, dt / 2));
    const k3 = derivative(add(s, k2, dt / 2)), k4 = derivative(add(s, k3, dt));
    return s.map((v, i) => v + dt * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
  }
  function projectilePath(p, maxStep = 1 / 240) {
    const angle = p.angle * Math.PI / 180, vx = p.v * Math.cos(angle), vy = p.v * Math.sin(angle);
    const flight = (vy + Math.sqrt(vy * vy + 2 * p.g * p.height)) / p.g;
    const point = (s, t) => ({ t, x: s[0], y: s[1], vx: s[2], vy: s[3] });
    if (!dragRate(p)) {
      const count = Math.max(1, Math.ceil(flight / maxStep));
      const points = Array.from({ length: count + 1 }, (_, i) => {
        const t = flight * i / count;
        return point([vx * t, i === count ? 0 : Math.max(0, p.height + vy * t - .5 * p.g * t * t), vx, vy - p.g * t], t);
      });
      return { points, flight, range: vx * flight, peak: p.height + vy * vy / (2 * p.g), vx, vy, completed: true };
    }
    const points = [point([0, p.height, vx, vy], 0)];
    let s = [0, p.height, vx, vy], t = 0, peak = p.height;
    if (!flight) return { points, flight: 0, range: 0, peak, vx, vy, completed: true };
    // Refine an event within an RK4 step, rather than snapping to a frame.
    const eventTime = (before, dt, coordinate) => {
      let lo = 0, hi = dt;
      for (let i = 0; i < 36; i++) {
        const mid = (lo + hi) / 2;
        if (projectileStep(before, mid, p)[coordinate] > 0) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    };
    while (t < 180) {
      const dt = Math.min(maxStep, 180 - t), next = projectileStep(s, dt, p);
      if (s[3] > 0 && next[3] <= 0) peak = Math.max(peak, projectileStep(s, eventTime(s, dt, 3), p)[1]);
      if (next[1] <= 0) {
        const landing = eventTime(s, dt, 1);
        s = projectileStep(s, landing, p); t += landing; s[1] = 0;
        points.push(point(s, t));
        return { points, flight: t, range: s[0], peak, vx, vy, completed: true };
      }
      t += dt; s = next; peak = Math.max(peak, s[1]); points.push(point(s, t));
    }
    return { points, flight: t, range: s[0], peak, vx, vy, completed: false };
  }
  function samplePath(path, time) {
    const pts = path.points;
    if (time <= 0) return pts[0];
    if (time >= path.flight) return pts[pts.length - 1];
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) {
      const mid = Math.floor((lo + hi) / 2);
      if (pts[mid].t <= time) lo = mid; else hi = mid;
    }
    const a = pts[lo], b = pts[hi], f = (time - a.t) / (b.t - a.t);
    return { t: time, x: a.x + f * (b.x - a.x), y: a.y + f * (b.y - a.y), vx: a.vx + f * (b.vx - a.vx), vy: a.vy + f * (b.vy - a.vy) };
  }
  function pendulumStep(theta, omega, dt, p, damping = 0) {
    // Tangential viscous force F = -b v. b is kg/s; theta is radians.
    const acc = (a, v) => -p.g / p.length * Math.sin(a) - damping / p.mass * v;
    const k1x = omega, k1v = acc(theta, omega);
    const k2x = omega + dt * k1v / 2, k2v = acc(theta + dt * k1x / 2, k2x);
    const k3x = omega + dt * k2v / 2, k3v = acc(theta + dt * k2x / 2, k3x);
    const k4x = omega + dt * k3v, k4v = acc(theta + dt * k3x, k4x);
    return [theta + dt * (k1x + 2 * k2x + 2 * k3x + k4x) / 6, omega + dt * (k1v + 2 * k2v + 2 * k3v + k4v) / 6];
  }
  return Object.freeze({ dragRate, acceleration, projectileStep, projectilePath, samplePath, pendulumStep });
})();
