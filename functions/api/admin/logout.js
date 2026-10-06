import { json } from "../../../server/http.js";
import { clearSession } from "../../../server/session.js";

export function onRequestPost() {
  return json({ ok: true }, 200, { "Set-Cookie": clearSession() });
}
