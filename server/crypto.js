// Web Crypto helpers shared by Pages Functions (also available in Node 22).
const encoder = new TextEncoder();

export function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function fromBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export function randomHex(bytes = 16) {
  return toHex(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256Hex(text) {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

export async function hmacHex(secret, text) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(text)));
}

// Constant-time comparison for equal-length strings; length is not secret here.
export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Stored format: pbkdf2_sha256$<iterations>$<salt base64>$<hash base64>
export async function verifyPassword(password, stored) {
  const parts = typeof stored === "string" ? stored.split("$") : [];
  if (parts.length !== 4 || parts[0] !== "pbkdf2_sha256" || typeof password !== "string") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 10000 || iterations > 1000000) return false;
  let salt, expected;
  try {
    salt = fromBase64(parts[2]);
    expected = fromBase64(parts[3]);
  } catch {
    return false;
  }
  if (!salt.length || !expected.length) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, expected.length * 8);
  return safeEqual(toHex(bits), toHex(expected));
}
