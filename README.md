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

Screenshots are mapped by slug in the `shots` object. Birria Birria uses a live
capture service (`image.thum.io`) — replace that URL with a local file in
`assets/screenshots/` if you want it guaranteed offline.

## Still to do

- Mobile layouts
- Portrait photo on the Profile screen
- Screenshots for Birria Birria (local) and VertexBytes
