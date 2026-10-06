import { MODELS } from "./models.js";
import { FEATURES } from "./events.js";
import { dayKey } from "./visitor.js";

const DAY_MS = 86400000;
export const RANGES = { today: 1, "7d": 7, "30d": 30, "90d": 90 };
export const RETENTION_DAYS = 180;

function daysBack(now, count, offset = 0) {
  const days = [];
  for (let i = count - 1 + offset; i >= offset; i--) days.push(dayKey(now - i * DAY_MS));
  return days;
}

// Returns null for an unknown range name.
export function rangeOf(name, now) {
  const count = RANGES[name];
  if (!count) return null;
  const days = daysBack(now, count);
  const previous = daysBack(now, count, count);
  return { name, days, from: days[0], to: days[days.length - 1], previous: { from: previous[0], to: previous[previous.length - 1] } };
}

export async function prune(db, now) {
  await db.prepare("DELETE FROM events WHERE day < ?").bind(dayKey(now - RETENTION_DAYS * DAY_MS)).run();
}

async function all(db, sql, ...args) {
  return (await db.prepare(sql).bind(...args).all()).results;
}

async function totals(db, from, to) {
  const rows = await all(
    db,
    `SELECT
       SUM(type = 'view') AS views,
       SUM(type = 'model_open') AS opens,
       SUM(type = 'feature' AND key = 'present') AS present
     FROM events WHERE day BETWEEN ? AND ?`,
    from,
    to,
  );
  const visitors = await db
    .prepare("SELECT COUNT(*) AS n FROM (SELECT DISTINCT day, visitor FROM events WHERE day BETWEEN ? AND ?)")
    .bind(from, to)
    .first("n");
  const r = rows[0] || {};
  return { views: r.views || 0, visitors: visitors || 0, opens: r.opens || 0, present: r.present || 0 };
}

// Daily points for multi-day ranges, hourly points (China time) for "today".
async function trend(db, range, filter = "") {
  const where = `day BETWEEN ? AND ? AND type IN ('view', 'model_open') ${filter ? "AND type = 'model_open' AND key = ?" : ""}`;
  const args = [range.from, range.to, ...(filter ? [filter] : [])];
  if (range.name === "today") {
    const rows = await all(
      db,
      `SELECT CAST((ts + 28800000) / 3600000 AS INTEGER) % 24 AS slot, type, COUNT(*) AS n FROM events WHERE ${where} GROUP BY slot, type`,
      ...args,
    );
    return Array.from({ length: 24 }, (_, hour) => ({
      label: `${String(hour).padStart(2, "0")}:00`,
      views: rows.find((r) => r.slot === hour && r.type === "view")?.n || 0,
      opens: rows.find((r) => r.slot === hour && r.type === "model_open")?.n || 0,
    }));
  }
  const rows = await all(db, `SELECT day, type, COUNT(*) AS n FROM events WHERE ${where} GROUP BY day, type`, ...args);
  return range.days.map((day) => ({
    label: day,
    views: rows.find((r) => r.day === day && r.type === "view")?.n || 0,
    opens: rows.find((r) => r.day === day && r.type === "model_open")?.n || 0,
  }));
}

async function counts(db, range, type, column = "key") {
  return all(
    db,
    `SELECT ${column} AS name, COUNT(*) AS n FROM events WHERE day BETWEEN ? AND ? AND type = ? GROUP BY ${column} ORDER BY n DESC, name`,
    range.from,
    range.to,
    type,
  );
}

export async function collectStats(db, range, model = null) {
  const opens = await counts(db, range, "model_open");
  const features = await counts(db, range, "feature");
  const referrers = await counts(db, range, "view", "extra");
  const devices = await all(
    db,
    "SELECT device AS name, COUNT(*) AS n FROM events WHERE day BETWEEN ? AND ? AND type = 'view' GROUP BY device",
    range.from,
    range.to,
  );
  const searches = await counts(db, range, "search");
  const known = MODELS.find((m) => m.id === model);
  return {
    range: { name: range.name, from: range.from, to: range.to },
    generatedAt: new Date().toISOString(),
    totals: { ...(await totals(db, range.from, range.to)), previous: await totals(db, range.previous.from, range.previous.to) },
    trend: await trend(db, range),
    models: MODELS.map((m) => ({ ...m, opens: opens.find((r) => r.name === m.id)?.n || 0 })).sort(
      (a, b) => b.opens - a.opens,
    ),
    features: FEATURES.map((name) => ({ name, count: features.find((r) => r.name === name)?.n || 0 })),
    referrers: referrers
      .filter((r) => r.name)
      .slice(0, 8)
      .map((r) => ({ host: r.name, count: r.n })),
    direct: referrers.find((r) => r.name === null)?.n || 0,
    devices: Object.fromEntries(["desktop", "tablet", "mobile"].map((d) => [d, devices.find((r) => r.name === d)?.n || 0])),
    searches: searches.slice(0, 20).map((r) => ({ q: r.name, count: r.n })),
    modelTrend: known ? { id: known.id, title: known.title, points: await trend(db, range, known.id) } : null,
  };
}

function csvCell(value) {
  let text = String(value ?? "");
  // Neutralise spreadsheet formulas from user-typed search terms.
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function exportCSV(db, range) {
  const rows = await all(
    db,
    "SELECT day, type, key, COUNT(*) AS n FROM events WHERE day BETWEEN ? AND ? GROUP BY day, type, key ORDER BY day, type, n DESC",
    range.from,
    range.to,
  );
  const lines = [["日期", "类型", "项目", "次数"], ...rows.map((r) => [r.day, r.type, r.key, r.n])];
  return "﻿" + lines.map((line) => line.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
