/**
 * POST /api/login  { "password": "..." }  → sets the admin session cookie.
 *
 * Eight wrong passwords from one address locks that address out for 15
 * minutes, so the password can't be guessed by brute force.
 */
import { json, sameSecret, sessionCookie, hashIp } from "../_auth.js";

const MAX_FAILS = 8;
const WINDOW_MS = 15 * 60000;

export async function onRequest({ request, env }) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
  }
  if (!env.STATS_PASSWORD) return json({ error: "STATS_PASSWORD is not set on this Pages project. See ANALYTICS.md." }, 503);
  if (!env.DB) return json({ error: "No D1 binding named DB on this Pages project. See ANALYTICS.md." }, 503);

  const now = Date.now();
  const who = (await hashIp(request.headers.get("cf-connecting-ip"), env)) || "unknown";
  const recent = await env.DB
    .prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE ip_hash = ?1 AND ts >= ?2")
    .bind(who, now - WINDOW_MS).first();
  if (recent && recent.n >= MAX_FAILS) {
    return json({ error: "Too many wrong attempts. Try again in 15 minutes." }, 429);
  }

  let password = "";
  try { password = String((await request.json()).password || ""); } catch {}

  if (!sameSecret(password, env.STATS_PASSWORD)) {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO login_attempts (ip_hash, ts) VALUES (?1, ?2)").bind(who, now),
      env.DB.prepare("DELETE FROM login_attempts WHERE ts < ?1").bind(now - 86400000)
    ]);
    return json({ error: "Wrong password." }, 401);
  }

  await env.DB.prepare("DELETE FROM login_attempts WHERE ip_hash = ?1").bind(who).run();
  return json({ ok: true }, 200, { "Set-Cookie": await sessionCookie(env) });
}
