/**
 * GET /api/visitors — one row per visit, for the "Visitors" list on /admin.
 * GET /api/visitors?session=<id> — that visit's full timeline, in order.
 *
 * Query params for the list:
 *   days=1|7|30|90|all   window (default 30)
 *   bots=1               include crawlers and link-preview fetchers
 *   offset=0, limit=30   paging (limit up to 300)
 */
import { json, requireAdmin } from "../_auth.js";

const CLICKS = "type IN ('click','outbound','email','phone')";

export async function onRequest({ request, env }) {
  const denied = await requireAdmin(request, env);
  if (denied) return denied;

  const url = new URL(request.url);
  const session = url.searchParams.get("session");

  if (session) {
    const { results } = await env.DB.prepare(
      `SELECT ts, type, label, href, value, scroll
       FROM events WHERE session = ?1 ORDER BY ts, id LIMIT 500`
    ).bind(session.slice(0, 40)).all();
    return json({ session, events: results });
  }

  const daysParam = url.searchParams.get("days") || "30";
  const days = daysParam === "all" ? null : Math.min(3650, Math.max(1, parseInt(daysParam, 10) || 30));
  const since = days ? Date.now() - days * 86400000 : 0;
  const offset = Math.max(0, parseInt(url.searchParams.get("offset"), 10) || 0);
  const limit = Math.min(300, Math.max(1, parseInt(url.searchParams.get("limit"), 10) || 30));
  // A fixed literal chosen here, never user input.
  const bots = url.searchParams.get("bots") === "1" ? "1 = 1" : "bot = 0";

  const [list, count] = await env.DB.batch([
    env.DB.prepare(
      `WITH v AS (
         SELECT session, visitor, MIN(ts) AS start, MAX(ts) AS last,
                MAX(country) AS country, MAX(region) AS region, MAX(city) AS city, MAX(postal) AS postal,
                MAX(as_org) AS network, MAX(device) AS device, MAX(os) AS os, MAX(browser) AS browser,
                MAX(screen) AS screen, MAX(lang) AS lang, MAX(client_tz) AS tz,
                MAX(ref_host) AS ref_host, MAX(tag) AS tag, MAX(bot) AS bot,
                SUM(CASE WHEN type = 'engage' THEN value ELSE 0 END) AS seconds,
                MAX(CASE WHEN type = 'scroll' THEN value WHEN type = 'engage' THEN scroll END) AS scroll,
                SUM(CASE WHEN ${CLICKS} THEN 1 ELSE 0 END) AS clicks,
                SUM(CASE WHEN type = 'email' THEN 1 ELSE 0 END) AS emails,
                SUM(CASE WHEN type = 'outbound' THEN 1 ELSE 0 END) AS outbound
         FROM events
         WHERE ts >= ?1 AND ${bots} AND session IS NOT NULL
         GROUP BY session
         ORDER BY start DESC
         LIMIT ?2 OFFSET ?3
       )
       SELECT v.*,
              (SELECT COUNT(DISTINCT e.session) FROM events e
                WHERE e.visitor = v.visitor AND e.ts <= v.start) AS visit_no,
              (SELECT COUNT(DISTINCT e.session) FROM events e WHERE e.visitor = v.visitor) AS visits,
              (SELECT MIN(e.ts) FROM events e WHERE e.visitor = v.visitor) AS first_seen,
              (SELECT GROUP_CONCAT(label, '|') FROM
                 (SELECT label FROM events e WHERE e.session = v.session AND e.type = 'view'
                  ORDER BY e.ts LIMIT 12)) AS path
       FROM v ORDER BY start DESC`
    ).bind(since, limit, offset),
    env.DB.prepare(
      `SELECT COUNT(DISTINCT session) AS n FROM events WHERE ts >= ?1 AND ${bots} AND session IS NOT NULL`
    ).bind(since)
  ]);

  return json({ visits: list.results, total: (count.results[0] || {}).n || 0 });
}
