import { json, readJSON } from "../../../server/http.js";
import { verifyPassword } from "../../../server/crypto.js";
import { clearFailures, lockedFor, recordFailure } from "../../../server/lockout.js";
import { createSession } from "../../../server/session.js";
import { visitorHash } from "../../../server/visitor.js";

export async function onRequestPost({ request, env }) {
  const now = Date.now();
  const who = await visitorHash(env.DB, request, now);
  const wait = await lockedFor(env.DB, who, now);
  if (wait) return json({ error: "locked", retryAfter: wait }, 429);
  const body = await readJSON(request, 1024);
  const password = body && typeof body.password === "string" ? body.password : "";
  if (password && (await verifyPassword(password, env.ADMIN_PASSWORD_HASH))) {
    await clearFailures(env.DB, who);
    return json({ ok: true }, 200, { "Set-Cookie": await createSession(env.SESSION_SECRET, now) });
  }
  const { remaining, retryAfter } = await recordFailure(env.DB, who, now);
  return retryAfter
    ? json({ error: "locked", retryAfter }, 429)
    : json({ error: "wrong_password", remaining }, 401);
}
