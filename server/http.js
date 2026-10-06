// Response helpers. _headers does not apply to Functions, so set headers here.
export const SECURITY_HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...SECURITY_HEADERS, "Content-Type": "application/json; charset=utf-8", ...extra },
  });
}

export function empty(status = 204, extra = {}) {
  return new Response(null, { status, headers: { ...SECURITY_HEADERS, ...extra } });
}

// Accept only requests whose Origin (or Referer when Origin is absent) is this site.
export function sameOrigin(request) {
  const own = new URL(request.url).origin;
  const origin = request.headers.get("Origin");
  if (origin) return origin === own;
  const referer = request.headers.get("Referer");
  if (!referer) return false;
  try {
    return new URL(referer).origin === own;
  } catch {
    return false;
  }
}

// Reads a JSON body of at most `limit` bytes; returns undefined if too large, null if invalid.
export async function readJSON(request, limit) {
  const declared = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declared) && declared > limit) return undefined;
  const text = await request.text();
  if (new TextEncoder().encode(text).length > limit) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
