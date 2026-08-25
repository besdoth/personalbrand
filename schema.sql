-- besiserver.co.uk analytics — one raw row per event, nothing sampled.
-- Apply with:  npx wrangler d1 execute besi-analytics --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS events (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ts          INTEGER NOT NULL,   -- server time, epoch ms
  type        TEXT    NOT NULL,   -- pageview | click | outbound | email | phone | view | section | scroll | engage
  visitor     TEXT,               -- anonymous first-party id (localStorage)
  session     TEXT,               -- 30-minute session id
  new_visitor INTEGER DEFAULT 0,
  new_session INTEGER DEFAULT 0,

  -- what happened
  path        TEXT,
  label       TEXT,               -- link text / heading text / page title
  href        TEXT,               -- click destination
  value       INTEGER,            -- seconds engaged, scroll %
  scroll      INTEGER,

  -- where they came from
  referrer    TEXT,
  ref_host    TEXT,
  tag         TEXT,               -- ?r=  share tag
  utm_medium  TEXT,
  utm_campaign TEXT,

  -- where in the world (stamped at the edge, not guessed from an IP db)
  country     TEXT,
  region      TEXT,
  city        TEXT,
  continent   TEXT,
  postal      TEXT,
  lat         REAL,
  lon         REAL,
  cf_tz       TEXT,
  client_tz   TEXT,
  as_org      TEXT,               -- ISP or company network the visit came from
  asn         INTEGER,
  colo        TEXT,               -- Cloudflare edge that served it

  -- who/what
  device      TEXT,               -- mobile | tablet | desktop
  os          TEXT,
  browser     TEXT,
  screen      TEXT,
  viewport    TEXT,
  lang        TEXT,
  ua          TEXT,
  ip_hash     TEXT,               -- salted daily hash, never the raw IP
  bot         INTEGER DEFAULT 0   -- crawlers + link-preview fetchers
);

CREATE INDEX IF NOT EXISTS idx_events_ts       ON events (ts);
CREATE INDEX IF NOT EXISTS idx_events_type_ts  ON events (type, ts);
CREATE INDEX IF NOT EXISTS idx_events_visitor  ON events (visitor);
CREATE INDEX IF NOT EXISTS idx_events_session  ON events (session);
CREATE INDEX IF NOT EXISTS idx_events_bot_ts   ON events (bot, ts);
