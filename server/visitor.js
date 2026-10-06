import { randomHex, sha256Hex } from "./crypto.js";

const SHANGHAI_OFFSET = 8 * 3600 * 1000;

// Calendar day in China Standard Time (no DST), e.g. "2026-10-06".
export function dayKey(ts) {
  return new Date(ts + SHANGHAI_OFFSET).toISOString().slice(0, 10);
}

export function hourOf(ts) {
  return new Date(ts + SHANGHAI_OFFSET).getUTCHours();
}

// One random salt per day; older salts are deleted so hashes cannot be re-linked.
export async function dailySalt(db, day) {
  const found = await db.prepare("SELECT salt FROM salts WHERE day = ?").bind(day).first("salt");
  if (found) return found;
  await db.prepare("INSERT OR IGNORE INTO salts (day, salt) VALUES (?, ?)").bind(day, randomHex(32)).run();
  await db.prepare("DELETE FROM salts WHERE day < ?").bind(day).run();
  return db.prepare("SELECT salt FROM salts WHERE day = ?").bind(day).first("salt");
}

export async function visitorHash(db, request, ts) {
  const day = dayKey(ts);
  const salt = await dailySalt(db, day);
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const ua = request.headers.get("User-Agent") || "";
  return (await sha256Hex(`${salt}|${ip}|${ua}`)).slice(0, 16);
}

export function deviceOf(ua = "") {
  if (/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android|HarmonyOS/i.test(ua)) return "mobile";
  return "desktop";
}
