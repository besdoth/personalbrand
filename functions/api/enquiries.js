/**
 * GET /api/enquiries?days=30 — enquiries from the site's form, newest first,
 * for the Leads tab on /admin. Signed-in only.
 */
import { json, requireAdmin } from "../_auth.js";

export async function onRequest({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const daysParam = new URL(request.url).searchParams.get("days") || "30";
  const days = daysParam === "all" ? null : Math.min(3650, Math.max(1, parseInt(daysParam, 10) || 30));
  const since = days ? Date.now() - days * 86400000 : 0;

  const { results } = await env.DB.prepare(
    `SELECT id, ts, name, business, contact, message, visitor, session, country, city
     FROM enquiries WHERE ts >= ?1 ORDER BY ts DESC LIMIT 500`
  ).bind(since).all();

  return json({ enquiries: results });
}
