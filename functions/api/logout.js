/** POST /api/logout — clears the admin session cookie on this device. */
import { json, clearedCookie } from "../_auth.js";

export async function onRequest({ request }) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
  }
  return json({ ok: true }, 200, { "Set-Cookie": clearedCookie });
}
