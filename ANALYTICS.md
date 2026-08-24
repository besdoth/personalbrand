# Analytics — real numbers, your database

Every visit and every click on besiserver.co.uk is written as **one raw row in
your own Cloudflare D1 database**. Nothing is sampled, aggregated at write time,
or held by a third party — the dashboard at `/stats` reads the same rows you can
query yourself with SQL.

## What you get

| Question | Where it shows up |
|---|---|
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

## Setup — about ten minutes, all free tier

You need the Cloudflare dashboard for your `personalbrand` Pages project, and
`npx wrangler` in a terminal for two commands.

### 1. Create the database

```bash
npx wrangler d1 create besi-analytics
```

Copy the `database_id` it prints.

### 2. Create the table

```bash
npx wrangler d1 execute besi-analytics --remote --file=./schema.sql
```

### 3. Bind it to the Pages project

Cloudflare dashboard → **Workers & Pages → personalbrand → Settings → Bindings**

- **D1 database binding** — Variable name `DB`, database `besi-analytics`.
  Add it for **Production** *and* **Preview**.

### 4. Set the dashboard password

Same Settings page → **Variables and Secrets** → add as **Secret**:

| Name | Value |
|---|---|
| `STATS_PASSWORD` | whatever you want to type to see your stats |
| `IP_SALT` | any long random string (see note below) |

### 5. Redeploy

Push to `main`, or hit **Retry deployment** in the dashboard. Bindings only
attach on a new deployment.

### 6. Check it

Open **`https://besiserver.co.uk/api/health`**. You want:

```json
{ "d1_binding": true, "stats_password_set": true, "table": "events", "ok": true }
```

Then open **`https://besiserver.co.uk/stats`** and enter your password.

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
functions/api/track.js  receives events, stamps geo from the edge, writes to D1
functions/api/stats.js  password-gated aggregate queries for the dashboard
functions/api/health.js unauthenticated wiring check
stats/index.html        the dashboard
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
- **IP addresses are never stored.** They are hashed with `IP_SALT` plus the
  current date, so the hash rotates daily and cannot be reversed to an address.
  Set `IP_SALT` to something long and random and don't change it casually.
- Geo comes from Cloudflare's edge (which country/city the request entered
  from), not from an IP-lookup database.
- Because it is cookie-free and stores no personal data, this does not need a
  cookie banner in the UK/EU. It is still worth a line in a privacy note that
  you count visits and clicks.
- The tracker ignores Do Not Track by default. To honour it, set
  `RESPECT_DNT = true` at the top of `assets/js/track.js`.

## Cost

Cloudflare free tier: 100,000 Function requests/day and 100,000 D1 row
writes/day. A portfolio produces on the order of tens of events per visitor —
you would need thousands of visitors a day to approach either limit.
