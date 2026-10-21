# Analytics — real numbers, your database

Every visit and every click on besiserver.co.uk is written as **one raw row in
your own Cloudflare D1 database**. Nothing is sampled, aggregated at write time,
or held by a third party — the dashboard at **`/admin`** reads the same rows you
can query yourself with SQL.

## What you get

| Question | Where it shows up |
|---|---|
| **Each visit, one by one** — where, which device, how they arrived, and every step they took | "Visitors" (tap a visit to open its timeline) |
| How many real people came, and when | Hero figure + "Over time" |
| **Where in the world they were** | Map (city-level dots) + Countries + Cities |
| Which company or ISP network they came from | "Networks" — e.g. a visit from *Google LLC* |
| **Who clicked which link** | "What they clicked", by the link's own wording |
| **Where they went next** | "Where they went next" — outbound + email clicks |
| Which share of yours got the click | "Your share links" (`?r=` tags, below) |
| How they found you | "How they found you" (referrer) |
| What they actually read | Headings scrolled into view + project pages opened |
| How long they stayed, how far they scrolled | Stat tiles + the live feed |
| The raw event stream | "Live feed" — every event, newest first |

Bot and link-preview traffic (Googlebot, WhatsApp/Slack/LinkedIn previews) is
detected and **excluded by default**; the "Bots off/on" button shows it.

---

## Setup — two minutes in the Cloudflare dashboard

The database already exists: **`besi-analytics`** (D1, Western Europe,
id `30b879a4-1132-4689-a369-3cbf7eb6925d`), with `schema.sql` applied. What's
left has to be done in the dashboard, because a password can't live in the repo.

Cloudflare dashboard → **Workers & Pages → personalbrand → Settings**:

1. **Bindings → Add → D1 database** — Variable name `DB`, database
   `besi-analytics`. Save.
2. **Variables and Secrets → Add** — Type **Secret**, name `STATS_PASSWORD`,
   value: the password you'll sign in to `/admin` with. Save.
   (Optional: a second secret `IP_SALT` with any long random string. Without
   it the password doubles as the salt — see Privacy below.)
3. **Deployments → latest → ⋯ → Retry deployment.** Bindings and secrets only
   attach on a new deployment.

Then check **`https://besiserver.co.uk/api/health`** shows
`"d1_binding": true, "stats_password_set": true, "ok": true`, and sign in at
**`https://besiserver.co.uk/admin`**.

### Signing in

`/admin` asks for the password once per device and keeps you signed in for 7
days (an HttpOnly, Secure cookie that only the admin API ever sees). **Sign
out** ends it on that device; changing `STATS_PASSWORD` signs out every
device. Eight wrong passwords from one address lock that address out for 15
minutes. The old `/stats` address redirects to `/admin`.

If you ever recreate the database, apply the tables with:

```bash
npx wrangler d1 execute besi-analytics --remote --file=./schema.sql
```

---

## Tagging the links you share

Add `?r=` and any word to the URL. Everything that visit does stays tagged, so
"Your share links" tells you which share actually produced the click:

```
besiserver.co.uk/?r=linkedin
besiserver.co.uk/?r=cv
besiserver.co.uk/?r=email-signature
besiserver.co.uk/?r=jane            ← sending it to one person
```

The tag survives the whole visit, so a click on *Make an enquiry* traces back to
the share that brought them.

## Excluding yourself

Visit **`besiserver.co.uk/?optout=1`** once on each of your own devices. That
device stops sending events for good, so your own browsing never inflates the
numbers. `?optout=0` turns it back on.

## Querying it yourself

The dashboard is a convenience — the data is plain SQL:

```bash
# every click that left the site, newest first
npx wrangler d1 execute besi-analytics --remote --command \
  "SELECT datetime(ts/1000,'unixepoch') t, city, country, label, href
   FROM events WHERE type='outbound' ORDER BY ts DESC LIMIT 50"

# one visitor's whole session, in order
npx wrangler d1 execute besi-analytics --remote --command \
  "SELECT datetime(ts/1000,'unixepoch') t, type, label, value
   FROM events WHERE session='<session id from the live feed>' ORDER BY ts"
```

---

## How it is wired

```
assets/js/track.js      the tracker — batches nothing, sends small JSON beacons
functions/_responsive.js  the mobile layer for the exported design
functions/_middleware.js  injects both into every HTML response
functions/_auth.js      sign-in cookie, lockout helpers, IP hashing
functions/api/track.js  receives events, stamps geo from the edge, writes to D1
functions/api/login.js  password -> session cookie (with lockout); logout.js ends it
functions/api/stats.js  aggregate queries for the dashboard (signed-in only)
functions/api/visitors.js  per-visit list and timelines (signed-in only)
functions/api/health.js unauthenticated wiring check
admin/index.html        the dashboard
schema.sql              the table
_routes.json            keeps Functions off static assets (fewer invocations)
```

**Why middleware and not a `<script>` tag in `index.html`:** `index.html` is a
generated Claude Design bundle. Re-exporting the design overwrites the entire
file, so a tag pasted in there would vanish on your next publish. Injecting at
the edge means **the tracking survives every future redesign** — you never have
to remember to re-add it.

**Why the numbers differ from Cloudflare Web Analytics:** that product samples
traffic and reports rounded aggregates. This counts every event it receives.
Expect this to read *higher* than the Cloudflare panel, and to be the more
accurate of the two.

## Privacy

- No cookies. One anonymous random id in `localStorage`, first-party only.
- **IP addresses are never stored.** They are hashed with `IP_SALT` (or, if
  that isn't set, `STATS_PASSWORD`) plus the current date, so the hash rotates
  daily and cannot be reversed to an address.
- Visitors are anonymous: you see a place, a network, a device and what they
  did — never a name. Someone becomes identifiable only if they tell you who
  they are (an email, a `?r=` link you sent just to them).
- Geo comes from Cloudflare's edge (which country/city the request entered
  from), not from an IP-lookup database.
- The anonymous id lives in the visitor's browser storage, which UK rules
  (PECR) treat like a cookie. First-party analytics like this don't need a
  consent banner, but you do need to tell visitors and give them a way out:
  a short privacy note saying you count visits and clicks, linking to
  `besiserver.co.uk/?optout=1`.
- The tracker ignores Do Not Track by default. To honour it, set
  `RESPECT_DNT = true` at the top of `assets/js/track.js`.

## Cost

Cloudflare free tier: 100,000 Function requests/day and 100,000 D1 row
writes/day. A portfolio produces on the order of tens of events per visitor —
you would need thousands of visitors a day to approach either limit.
