/**
 * POST /api/enquiry — the form on the Enquiries page.
 *
 * Stores the enquiry, and adds an "enquiry" event to the visitor's session
 * so /admin shows it in their timeline. Five per address per hour, and a
 * hidden "website" field that only bots fill in.
 */
import { json, hashIp } from "../_auth.js";

const MAX_PER_HOUR = 5;
const clip = (v, n) => (v == null ? "" : String(v)).trim().slice(0, n);

export async function onRequest({ request, env }) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
  }
  if (!env.DB) return json({ error: "Enquiries aren't switched on yet — please email me instead." }, 503);

  let b;
  try { b = await request.json(); } catch { return json({ error: "Couldn't read that — please try again." }, 400); }
  if (!b || typeof b !== "object") return json({ error: "Couldn't read that — please try again." }, 400);
  if (clip(b.website, 200)) return json({ ok: true });

  const contact = clip(b.contact, 200);
  const message = clip(b.message, 3000);
  if (contact.length < 3) return json({ error: "Add an email or phone number so I can reply." }, 400);
  if (message.length < 5) return json({ error: "Tell me a little about what's taking up your time." }, 400);

  const now = Date.now();
  const cf = request.cf || {};
  const who = await hashIp(request.headers.get("cf-connecting-ip"), env);
  const recent = await env.DB
    .prepare("SELECT COUNT(*) AS n FROM enquiries WHERE ip_hash = ?1 AND ts >= ?2")
    .bind(who, now - 3600000).first();
  if (recent && recent.n >= MAX_PER_HOUR) {
    return json({ error: "That's a lot of messages — please email me instead." }, 429);
  }

  const name = clip(b.name, 120) || null;
  const business = clip(b.business, 160) || null;
  const visitor = clip(b.v, 40) || null;
  const session = clip(b.s, 40) || null;
  const country = cf.country || null;
  const city = cf.city || null;

  const writes = [
    env.DB.prepare(
      `INSERT INTO enquiries (ts, name, business, contact, message, visitor, session, country, city, ip_hash)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
    ).bind(now, name, business, contact, message, visitor, session, country, city, who)
  ];
  if (session) {
    writes.push(env.DB.prepare(
      `INSERT INTO events (ts, type, visitor, session, label, country, city, bot)
       VALUES (?1, 'enquiry', ?2, ?3, ?4, ?5, ?6, 0)`
    ).bind(now, visitor, session, business || name || "Enquiry", country, city));
  }
  await env.DB.batch(writes);

  return json({ ok: true });
}
