/**
 * Shared by the /admin endpoints and the collector.
 *
 * Sign-in is a password (the STATS_PASSWORD secret) exchanged at
 * /api/login for an HttpOnly cookie. The cookie is "<expiry>.<HMAC of the
 * expiry>", keyed by the password — so it can't be forged without the
 * password, and changing the password signs every device out.
 */

const COOKIE = "bes_admin";
const SESSION_DAYS = 7;
const enc = new TextEncoder();

export function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers }
  });
}

/** Constant time for equal lengths, so response timing doesn't leak the password. */
export function sameSecret(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function sign(env, message) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(`bes-admin|${env.STATS_PASSWORD}`),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

// Path=/api: only the admin API ever needs the cookie, so the public site never sends it.
const ATTRS = "Path=/api; HttpOnly; Secure; SameSite=Strict";

export async function sessionCookie(env) {
  const exp = String(Date.now() + SESSION_DAYS * 86400000);
  return `${COOKIE}=${exp}.${await sign(env, exp)}; ${ATTRS}; Max-Age=${SESSION_DAYS * 86400}`;
}

export const clearedCookie = `${COOKIE}=; ${ATTRS}; Max-Age=0`;

async function signedIn(request, env) {
  const m = (request.headers.get("cookie") || "").match(/(?:^|;\s*)bes_admin=(\d{13})\.([0-9a-f]{64})/);
  if (!m || Number(m[1]) < Date.now()) return false;
  return sameSecret(m[2], await sign(env, m[1]));
}

/** For admin-only endpoints: an error Response to return, or null when signed in. */
export async function requireAdmin(request, env) {
  if (!env.STATS_PASSWORD) return json({ error: "STATS_PASSWORD is not set on this Pages project. See ANALYTICS.md." }, 503);
  if (!env.DB) return json({ error: "No D1 binding named DB on this Pages project. See ANALYTICS.md." }, 503);
  if (!(await signedIn(request, env))) return json({ error: "Not signed in." }, 401);
  return null;
}

/** Salted, day-rotating hash: tells devices apart without storing an IP. */
export async function hashIp(ip, env) {
  if (!ip) return null;
  const salt = env.IP_SALT || env.STATS_PASSWORD || "besiserver";
  const day = new Date().toISOString().slice(0, 10);
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(`${ip}|${salt}|${day}`));
  return hex(digest).slice(0, 16);
}
