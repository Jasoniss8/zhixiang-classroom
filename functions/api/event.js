import { empty, json, readJSON, sameOrigin } from "../../server/http.js";
import { parseEvent } from "../../server/events.js";
import { dayKey, deviceOf, visitorHash } from "../../server/visitor.js";

const MAX_BODY = 1024;
const PER_MINUTE = 60;

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const body = await readJSON(request, MAX_BODY);
  if (body === undefined) return json({ error: "too_large" }, 413);
  const event = parseEvent(body);
  if (!event) return json({ error: "invalid" }, 400);
  const now = Date.now();
  const visitor = await visitorHash(env.DB, request, now);
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM events WHERE visitor = ? AND ts > ?")
    .bind(visitor, now - 60000)
    .first("n");
  // Over the limit: acknowledge without storing so clients do not retry.
  if (recent >= PER_MINUTE) return empty();
  await env.DB.prepare("INSERT INTO events (ts, day, type, key, extra, visitor, device) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(now, dayKey(now), event.type, event.key, event.extra, visitor, deviceOf(request.headers.get("User-Agent") || ""))
    .run();
  return empty();
}
