/**
 * GET /api/health — is the pipeline actually wired up?
 *
 * Safe to call without the password: it reports whether the bindings exist
 * and how many rows have landed, never any visitor data.
 */
export async function onRequest(context) {
  const { env } = context;
  const out = {
    d1_binding: Boolean(env.DB),
    stats_password_set: Boolean(env.STATS_PASSWORD),
    ip_salt_set: Boolean(env.IP_SALT),
    table: null,
    rows: null,
    last_event: null,
    ok: false
  };

  if (env.DB) {
    try {
      const row = await env.DB.prepare(
        "SELECT COUNT(*) AS rows, MAX(ts) AS last FROM events"
      ).first();
      out.table = "events";
      out.rows = row ? row.rows : 0;
      out.last_event = row && row.last ? new Date(row.last).toISOString() : null;
    } catch (err) {
      out.table = `missing or unreadable — run schema.sql (${err && err.message})`;
    }
  }

  out.ok = out.d1_binding && out.stats_password_set && out.table === "events";

  return new Response(JSON.stringify(out, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
