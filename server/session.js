import { hmacHex, safeEqual } from "./crypto.js";

export const COOKIE = "zx_admin";
export const SESSION_SECONDS = 12 * 3600;
const ATTRIBUTES = "Path=/api/admin; HttpOnly; Secure; SameSite=Strict";

export async function createSession(secret, now) {
  const expires = now + SESSION_SECONDS * 1000;
  const token = `${expires}.${await hmacHex(secret, `zx-admin|${expires}`)}`;
  return `${COOKIE}=${token}; ${ATTRIBUTES}; Max-Age=${SESSION_SECONDS}`;
}

export function clearSession() {
  return `${COOKIE}=; ${ATTRIBUTES}; Max-Age=0`;
}

function cookieValue(request) {
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return rest.join("=");
  }
  return null;
}

export async function validSession(request, secret, now) {
  const token = cookieValue(request);
  const match = token && /^(\d{13})\.([0-9a-f]{64})$/.exec(token);
  if (!match || Number(match[1]) <= now) return false;
  return safeEqual(match[2], await hmacHex(secret, `zx-admin|${match[1]}`));
}
