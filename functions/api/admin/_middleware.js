import { json, sameOrigin } from "../../../server/http.js";
import { validSession } from "../../../server/session.js";

// Every /api/admin/* request: same-origin for writes, configured secrets, and a session except for login/session.
export async function onRequest({ request, env, next }) {
  if (request.method !== "GET" && !sameOrigin(request)) return json({ error: "forbidden" }, 403);
  if (!env.DB || !env.ADMIN_PASSWORD_HASH || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32)
    return json({ error: "not_configured" }, 500);
  if (["/api/admin/login", "/api/admin/session"].includes(new URL(request.url).pathname)) return next();
  if (!(await validSession(request, env.SESSION_SECRET, Date.now()))) return json({ error: "unauthorized" }, 401);
  return next();
}
