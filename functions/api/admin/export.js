import { SECURITY_HEADERS, json } from "../../../server/http.js";
import { exportCSV, rangeOf } from "../../../server/stats.js";

export async function onRequestGet({ request, env }) {
  const now = Date.now();
  const range = rangeOf(new URL(request.url).searchParams.get("range") || "7d", now);
  if (!range) return json({ error: "invalid_range" }, 400);
  return new Response(await exportCSV(env.DB, range), {
    headers: {
      ...SECURITY_HEADERS,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="zhixiang-${range.from}-${range.to}.csv"`,
    },
  });
}
