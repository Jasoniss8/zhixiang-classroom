import { json } from "../../../server/http.js";
import { collectStats, prune, rangeOf } from "../../../server/stats.js";

export async function onRequestGet({ request, env }) {
  const params = new URL(request.url).searchParams;
  const now = Date.now();
  const range = rangeOf(params.get("range") || "7d", now);
  if (!range) return json({ error: "invalid_range" }, 400);
  await prune(env.DB, now);
  return json(await collectStats(env.DB, range, params.get("model")));
}
