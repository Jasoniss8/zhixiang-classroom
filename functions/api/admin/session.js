import { json } from "../../../server/http.js";
import { validSession } from "../../../server/session.js";

// Lets the admin page ask whether it is signed in without triggering a 401.
export async function onRequestGet({ request, env }) {
  return json({ signedIn: await validSession(request, env.SESSION_SECRET, Date.now()) });
}
