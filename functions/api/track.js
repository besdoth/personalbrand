/**
 * POST /api/track — the collector.
 *
 * Takes a small JSON event from assets/js/track.js, stamps it with the geo
 * Cloudflare already knows at the edge (country, city, region, coordinates,
 * network operator), and writes one raw row to D1. No sampling, no rollups:
 * every event is a row you can query.
 *
 * Requires a D1 binding named DB. See ANALYTICS.md.
 */

const MAX_BODY = 4096;

const VALID_TYPES = new Set([
  "pageview", "click", "outbound", "email", "phone",
  "view", "section", "scroll", "engage"
]);

const BOT_UA = /bot|crawler|crawling|spider|slurp|bingpreview|headless|phantom|puppeteer|playwright|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|curl|wget|python-requests|axios|go-http|java\/|okhttp|facebookexternalhit|whatsapp|telegrambot|discordbot|slackbot|twitterbot|linkedinbot|embedly|quora link preview|skypeuripreview|applebot|petalbot|ahrefs|semrush|mj12|dotbot|dataprovider|screaming frog/i;

/** Trim and normalise a value coming off the wire. */
function str(v, max) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

/** Salted, day-rotating hash. Lets us count unique devices without ever
 *  storing an IP address. */
async function hashIp(ip, salt) {
  if (!ip) return null;
  const day = new Date().toISOString().slice(0, 10);
  const data = new TextEncoder().encode(`${ip}|${salt}|${day}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseUa(ua) {
  if (!ua) return { device: null, os: null, browser: null };
  const tablet = /ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua);
  const mobile = /mobi|iphone|ipod|android|blackberry|windows phone|iemobile/i.test(ua);
  const device = tablet ? "tablet" : mobile ? "mobile" : "desktop";

  let os = null;
  if (/windows nt/i.test(ua)) os = "Windows";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/mac os x/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/cros/i.test(ua)) os = "ChromeOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let browser = null;
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/samsungbrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/firefox\/|fxios/i.test(ua)) browser = "Firefox";
  else if (/chrome\/|crios/i.test(ua)) browser = "Chrome";
  else if (/safari\//i.test(ua)) browser = "Safari";

  return { device, os, browser };
}

const INSERT = `INSERT INTO events (
  ts, type, visitor, session, new_visitor, new_session,
  path, label, href, value, scroll,
  referrer, ref_host, tag, utm_medium, utm_campaign,
  country, region, city, continent, postal, lat, lon, cf_tz, client_tz, as_org, asn, colo,
  device, os, browser, screen, viewport, lang, ua, ip_hash, bot
) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23,?24,?25,?26,?27,?28,?29,?30,?31,?32,?33,?34,?35,?36,?37)`;

async function handle(context) {
  const { request, env } = context;

  // Always answer 204. An analytics failure must never surface on the site.
  const done = () => new Response(null, { status: 204 });

  try {
    if (!env.DB) return done();

    const raw = await request.text();
    if (!raw || raw.length > MAX_BODY) return done();

    let e;
    try { e = JSON.parse(raw); } catch { return done(); }
    if (!e || typeof e !== "object") return done();

    const type = str(e.t, 20);
    if (!type || !VALID_TYPES.has(type)) return done();

    const cf = request.cf || {};
    const ua = request.headers.get("user-agent") || "";
    const { device, os, browser } = parseUa(ua);
    const referrer = str(e.r, 400);

    const ipHash = await hashIp(
      request.headers.get("cf-connecting-ip"),
      env.IP_SALT || "besiserver-default-salt"
    );

    await env.DB.prepare(INSERT).bind(
      Date.now(),
      type,
      str(e.v, 40),
      str(e.s, 40),
      e.nv ? 1 : 0,
      e.ns ? 1 : 0,

      str(e.p, 300),
      str(e.l, 200),
      str(e.h, 400),
      num(e.val),
      num(e.scroll),

      referrer,
      referrer ? hostOf(referrer) : null,
      str(e.tag, 80),
      str(e.um, 80),
      str(e.uc, 80),

      str(cf.country, 4),
      str(cf.region, 80),
      str(cf.city, 80),
      str(cf.continent, 4),
      str(cf.postalCode, 20),
      cf.latitude != null ? Number(cf.latitude) : null,
      cf.longitude != null ? Number(cf.longitude) : null,
      str(cf.timezone, 60),
      str(e.tz, 60),
      str(cf.asOrganization, 120),
      num(cf.asn),
      str(cf.colo, 8),

      device, os, browser,
      e.sw && e.sh ? `${num(e.sw)}x${num(e.sh)}` : null,
      e.vw && e.vh ? `${num(e.vw)}x${num(e.vh)}` : null,
      str(e.lang, 20),
      str(ua, 400),
      ipHash,
      BOT_UA.test(ua) ? 1 : 0
    ).run();
  } catch (err) {
    console.error("track:", err && err.message);
  }

  return done();
}

/* Single entry point: exporting only onRequest keeps method dispatch
   unambiguous rather than relying on handler-precedence rules. */
export async function onRequest(context) {
  if (context.request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
  }
  return handle(context);
}
