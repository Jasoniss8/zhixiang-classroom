import { MODELS } from "./models.js";

export const PAGES = ["home", "model", "questions", "favorites", "classes", "downloads"];
export const VIAS = ["card", "link", "class", "question", "other"];
export const FEATURES = [
  "present",
  "save",
  "screenshot",
  "export_params",
  "export_data",
  "share",
  "ink",
  "question_submit",
  "download_desktop",
];
const MODEL_IDS = new Set(MODELS.map((m) => m.id));
const HOST = /^(?=.{1,100}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/;

function cleanHost(value) {
  if (typeof value !== "string" || !value) return null;
  const host = value.trim().toLowerCase();
  return HOST.test(host) ? host : null;
}

function cleanQuery(value) {
  if (typeof value !== "string") return null;
  // Drop control characters, collapse whitespace, keep at most 40 code points.
  const text = [...value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim()].slice(0, 40).join("");
  return [...text].length >= 2 ? text : null;
}

// Returns { type, key, extra } for a whitelisted event, otherwise null.
export function parseEvent(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  switch (body.type) {
    case "view":
      if (!PAGES.includes(body.page)) return null;
      return { type: "view", key: body.page, extra: cleanHost(body.ref) };
    case "model_open":
      if (!MODEL_IDS.has(body.model)) return null;
      return { type: "model_open", key: body.model, extra: VIAS.includes(body.via) ? body.via : "other" };
    case "feature":
      if (!FEATURES.includes(body.name)) return null;
      return { type: "feature", key: body.name, extra: MODEL_IDS.has(body.model) ? body.model : null };
    case "search": {
      const q = cleanQuery(body.q);
      return q ? { type: "search", key: q, extra: null } : null;
    }
    default:
      return null;
  }
}
