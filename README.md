# bes — portfolio site (Ledger direction)

Static build. No framework, no build step.

## Contents

```
index.html                  the whole site (self-contained)
assets/screenshots/         project screenshots referenced at runtime
```

## Deploy

Drop this folder at the root of a branch and enable Pages, or point
Netlify / Vercel / Cloudflare Pages at it. Nothing to compile.

## Pushing to besdoth/personalbrand

```bash
# from a clone of the repo
git checkout -b ledger-redesign
cp -r build/* .            # or into a /new subfolder to keep the terminal site live
git add index.html assets
git commit -m "New portfolio direction: Ledger"
git push -u origin ledger-redesign
```

Keep the old terminal site on the default branch until you are happy with this one.

## Mobile

The exported design is a fixed 1280px artboard — no media queries, no
`clamp()`, every size a hard px value. A mobile layer
(`functions/_responsive.js`) is injected at the edge in two tiers:

- **700px and under (phones):** collapses the desktop grids, rescales the
  display type, trims the desktop spacing, fits the nav and resizes the
  screenshot frames.
- **701–1023px (tablets):** only the work index, the profile column and the
  header tagline are rearranged — the rest overflowed nowhere.

Desktop is left exactly as drawn. Like the tracker, it is injected rather
than pasted into `index.html`, so it survives re-exporting the design.

If you later add mobile variants in Claude Design itself, delete the
`RESPONSIVE_CSS` import from `functions/_middleware.js` and this layer is gone.

## Analytics

Visits and clicks are tracked into your own Cloudflare D1 database and shown at
**`/stats`** (password-protected): where in the world people are, which links
they click, where they go next, and which shared link brought them.

Setup and how it works: **[ANALYTICS.md](ANALYTICS.md)**.

```
assets/js/track.js        tracker (injected automatically — survives redesigns)
functions/                the /api/track, /api/stats and /api/health endpoints
stats/index.html          the dashboard
schema.sql                the D1 table
```

Health check after deploying: `https://besiserver.co.uk/api/health`.

## Editing content

All project copy, stats and metadata live in one array (`data`) inside the
inline script in `index.html` — search for `birria-birria`. Each entry holds:

- `title`, `category`, `short` — index row
- `summary`, `problem`, `steps[]`, `impact` — case study body
- `p1` / `p2` / `p3` — the three pipeline nodes
- `role`, `stack`, `state`, `host`, `url` — meta table (`url` renders the live link)

Screenshots are mapped by slug in the `shots` object and live in
`assets/screenshots/`. Keep them around 1800px wide and compressed (JPEG) —
they load on phones. Live capture services don't work for sites behind
Cloudflare's bot check (Birria Birria is), so use local files.

`404.html` matters: without it Cloudflare Pages answers unknown paths with the
whole homepage, and the bundle's unresolved `{{ … }}` image placeholders would
each download it again.

## Still to do

- A higher-resolution portrait (the current one is 400×400)
