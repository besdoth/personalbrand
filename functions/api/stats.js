/**
 * GET /api/stats — everything the dashboard at /stats renders.
 *
 * Reads straight from the raw D1 rows, so the numbers are counts of actual
 * events, not estimates. Protected by STATS_PASSWORD (a Pages secret).
 *
 * Query params:
 *   days=7|30|90|365|all   window to report on (default 30)
 *   bots=1                 include crawlers and link-preview fetchers
 *   limit=200              size of the raw event feed
 */

const HUMAN = "bot = 0";

function unauthorized(msg) {
  return json({ error: msg }, 401);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

/** Length-independent comparison so the response time doesn't leak the key. */
function sameSecret(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (!env.STATS_PASSWORD) {
    return json({ error: "STATS_PASSWORD is not set on this Pages project. See ANALYTICS.md." }, 503);
  }
  if (!env.DB) {
    return json({ error: "No D1 binding named DB on this Pages project. See ANALYTICS.md." }, 503);
  }

  const header = request.headers.get("authorization") || "";
  const supplied = header.startsWith("Bearer ")
    ? header.slice(7)
    : url.searchParams.get("key") || "";
  if (!sameSecret(supplied, env.STATS_PASSWORD)) return unauthorized("Wrong password.");

  const daysParam = url.searchParams.get("days") || "30";
  const days = daysParam === "all" ? null : Math.min(3650, Math.max(1, parseInt(daysParam, 10) || 30));
  const since = days ? Date.now() - days * 86400000 : 0;

  const botFilter = url.searchParams.get("bots") === "1" ? "1 = 1" : HUMAN;
  const limit = Math.min(500, Math.max(10, parseInt(url.searchParams.get("limit"), 10) || 200));

  // `since` is bound; the two filter fragments are fixed literals chosen above,
  // never interpolated user input.
  const W = `WHERE ts >= ?1 AND ${botFilter}`;
  const q = (sql, ...extra) => env.DB.prepare(sql).bind(since, ...extra);

  const [
    totals, engagement, daily, countries, cities, points, referrers, tags,
    clicks, outbound, sections, devices, browsers, systems, networks,
    returning, feed, botCount
  ] = await env.DB.batch([
    q(`SELECT
         SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END) AS pageviews,
         COUNT(DISTINCT visitor)                            AS visitors,
         COUNT(DISTINCT session)                            AS sessions,
         SUM(CASE WHEN type IN ('click','outbound','email','phone') THEN 1 ELSE 0 END) AS clicks,
         SUM(CASE WHEN type = 'outbound' THEN 1 ELSE 0 END) AS outbound,
         SUM(CASE WHEN type = 'email'    THEN 1 ELSE 0 END) AS emails,
         COUNT(DISTINCT country)                            AS countries,
         COUNT(*)                                           AS events,
         MIN(ts) AS first_ts, MAX(ts) AS last_ts
       FROM events ${W}`),

    q(`SELECT ROUND(AVG(value), 1) AS avg_seconds, ROUND(AVG(scroll), 1) AS avg_scroll,
              COUNT(*) AS samples
       FROM events ${W} AND type = 'engage' AND value IS NOT NULL`),

    q(`SELECT date(ts / 1000, 'unixepoch') AS day,
              SUM(CASE WHEN type = 'pageview' THEN 1 ELSE 0 END) AS pageviews,
              COUNT(DISTINCT visitor) AS visitors,
              SUM(CASE WHEN type IN ('click','outbound','email','phone') THEN 1 ELSE 0 END) AS clicks
       FROM events ${W} GROUP BY day ORDER BY day`),

    q(`SELECT COALESCE(country,'??') AS country, COUNT(DISTINCT visitor) AS visitors,
              COUNT(DISTINCT session) AS sessions,
              SUM(CASE WHEN type IN ('click','outbound','email','phone') THEN 1 ELSE 0 END) AS clicks
       FROM events ${W} GROUP BY country ORDER BY visitors DESC, sessions DESC LIMIT 60`),

    q(`SELECT COALESCE(city,'(unknown)') AS city, COALESCE(region,'') AS region,
              COALESCE(country,'??') AS country, COUNT(DISTINCT visitor) AS visitors,
              COUNT(DISTINCT session) AS sessions
       FROM events ${W} AND city IS NOT NULL
       GROUP BY city, region, country ORDER BY visitors DESC LIMIT 40`),

    q(`SELECT ROUND(lat, 2) AS lat, ROUND(lon, 2) AS lon, COALESCE(city,'') AS city,
              COALESCE(country,'') AS country, COUNT(DISTINCT visitor) AS visitors
       FROM events ${W} AND lat IS NOT NULL AND lon IS NOT NULL
       GROUP BY lat, lon, city, country ORDER BY visitors DESC LIMIT 300`),

    q(`SELECT COALESCE(ref_host,'(direct / typed in)') AS source,
              COUNT(DISTINCT visitor) AS visitors, COUNT(DISTINCT session) AS sessions
       FROM events ${W} AND type = 'pageview'
       GROUP BY source ORDER BY visitors DESC LIMIT 30`),

    q(`SELECT tag, COUNT(DISTINCT visitor) AS visitors, COUNT(DISTINCT session) AS sessions,
              SUM(CASE WHEN type IN ('click','outbound','email','phone') THEN 1 ELSE 0 END) AS clicks
       FROM events ${W} AND tag IS NOT NULL
       GROUP BY tag ORDER BY visitors DESC LIMIT 30`),

    q(`SELECT COALESCE(label,'(no label)') AS label, type, COUNT(*) AS hits,
              COUNT(DISTINCT visitor) AS visitors
       FROM events ${W} AND type IN ('click','outbound','email','phone')
       GROUP BY label, type ORDER BY hits DESC LIMIT 40`),

    // Grouped by destination only — the same URL is often reached from links
    // worded differently, and the question here is where they ended up.
    q(`SELECT href, COUNT(*) AS hits, COUNT(DISTINCT visitor) AS visitors
       FROM events ${W} AND type IN ('outbound','email') AND href IS NOT NULL
       GROUP BY href ORDER BY hits DESC LIMIT 30`),

    q(`SELECT COALESCE(label,'(unnamed)') AS label, type, COUNT(DISTINCT visitor) AS visitors,
              COUNT(*) AS hits
       FROM events ${W} AND type IN ('section','view')
       GROUP BY label, type ORDER BY visitors DESC LIMIT 40`),

    q(`SELECT COALESCE(device,'unknown') AS name, COUNT(DISTINCT visitor) AS visitors
       FROM events ${W} GROUP BY device ORDER BY visitors DESC`),

    q(`SELECT COALESCE(browser,'unknown') AS name, COUNT(DISTINCT visitor) AS visitors
       FROM events ${W} GROUP BY browser ORDER BY visitors DESC LIMIT 12`),

    q(`SELECT COALESCE(os,'unknown') AS name, COUNT(DISTINCT visitor) AS visitors
       FROM events ${W} GROUP BY os ORDER BY visitors DESC LIMIT 12`),

    q(`SELECT as_org AS name, COUNT(DISTINCT visitor) AS visitors, COUNT(DISTINCT session) AS sessions
       FROM events ${W} AND as_org IS NOT NULL
       GROUP BY as_org ORDER BY visitors DESC LIMIT 25`),

    q(`SELECT SUM(CASE WHEN sessions > 1 THEN 1 ELSE 0 END) AS returning_visitors,
              COUNT(*) AS total_visitors
       FROM (SELECT visitor, COUNT(DISTINCT session) AS sessions
             FROM events ${W} AND visitor IS NOT NULL GROUP BY visitor)`),

    q(`SELECT ts, type, label, href, country, city, region, as_org, device, browser, os,
              tag, ref_host, value, scroll, visitor, session, new_visitor
       FROM events ${W} ORDER BY ts DESC LIMIT ?2`, limit),

    q(`SELECT COUNT(*) AS events, COUNT(DISTINCT ua) AS agents
       FROM events WHERE ts >= ?1 AND bot = 1`)
  ]);

  const one = (r) => (r.results && r.results[0]) || {};

  return json({
    range: { days: days, since, until: Date.now(), bots_included: botFilter !== HUMAN },
    totals: one(totals),
    engagement: one(engagement),
    returning: one(returning),
    bots: one(botCount),
    daily: daily.results,
    countries: countries.results,
    cities: cities.results,
    points: points.results,
    referrers: referrers.results,
    tags: tags.results,
    clicks: clicks.results,
    outbound: outbound.results,
    sections: sections.results,
    devices: devices.results,
    browsers: browsers.results,
    systems: systems.results,
    networks: networks.results,
    feed: feed.results
  });
}
