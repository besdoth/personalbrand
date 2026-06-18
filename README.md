# bes@portfolio — Terminal Portfolio

A hand-coded personal site styled as a **dev terminal / console** — boot
sequence, typed hero, projects shown as a live `process list` you "inspect",
and a `neofetch`-style about block. No frameworks, no build step — just HTML,
CSS and vanilla JS, so the interaction craft *is* the portfolio.

## What's inside

- **Boot sequence** on first visit (once per session), then a **typed terminal hero**.
- **Projects as a process list** — each row is a "running" process; click/Enter to `inspect` it (opens a terminal-window modal with a live preview).
- **`neofetch`-style about block** with ASCII art + system-info rows.
- **Block cursor**, scanline + grid screen FX, phosphor-green palette, animated counters, a status ticker, and a scroll-progress bar.
- **Live project previews** — auto-screenshots live URLs (with fallbacks) or uses an uploaded image.
- Fully **responsive** (hamburger menu, bottom-sheet modals) and respects `prefers-reduced-motion` and touch devices.

## Showcased work

| Automations & builds | Personal projects |
|---|---|
| Birria Birria — ordering & ops | Movie / Series Picker |
| Blood Testing Panel — health data | Birthday Surprise |
| Adobe Email Automations | |
| Trading Tool | |

## Editing content

Each project is a `.proc__row` in `index.html`, driven by `data-*` attributes:

```html
<article class="proc__row" tabindex="0" role="button"
  data-name="birria-birria"                 <!-- process name shown in the list -->
  data-title="Birria Birria"                <!-- heading in the inspect modal -->
  data-tag="hospitality · ops"              <!-- TYPE column -->
  data-glyph="🌮"                            <!-- icon for the placeholder preview -->
  data-link="https://your-live-url.com"     <!-- live URL ("#" = none) -->
  data-color="#ff7a59"
  data-summary="One-line hook shown in the modal."
  data-details="Paragraph one.|Stack: ...|Impact: ...">  <!-- split paragraphs with | -->
  ...visible row cells...
</article>
```

- **`data-link`** — the live site URL. (Birria Birria → `https://birria-birria.pages.dev/`, moving to `birriabirria.com` later.)
- **`data-details`** — paragraphs separated by `|`; a leading `Word:` gets bolded automatically.
- **`data-shot`** *(optional)* — path/URL to a screenshot image shown in the inspect modal, e.g. `data-shot="assets/screenshots/TradingBot.png"`. If omitted but `data-link` is a real URL, a live screenshot is generated automatically (free service, with fallbacks). If neither exists, a branded placeholder is shown. Drop images in `assets/screenshots/`.
- **`data-noshot="true"`** — hide the preview frame entirely for that project.

### Showing / hiding live links

All "Visit live site" buttons are **hidden globally** right now via a master
switch at the top of `assets/js/main.js`:

```js
const SHOW_LIVE_LINKS = false; // flip to true to reveal live links
```

When you flip it to `true`, every card that has a real `data-link` (not `#`)
will show its button automatically — so URLs can be stored ahead of time and
revealed all at once.

Update your email anywhere it appears (`mailto:` links) and the name/brand text in the nav and hero.

## Run locally

```bash
# any static server works
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy

It's static — drop the folder on GitHub Pages, Netlify, Vercel, or Cloudflare
Pages. For GitHub Pages: push to the repo, enable Pages on the branch root.

## Analytics (who's visiting)

Uses **Cloudflare Web Analytics** — privacy-first, cookie-free (no consent
banner needed), free. Two ways to turn it on:

1. **Automatic (recommended, zero code):** Cloudflare dashboard →
   *Analytics & Logs → Web Analytics → Add a site* → enter `besiserver.co.uk`
   → **Automatic setup** (works because the domain is proxied through
   Cloudflare). Done — no code change.
2. **In code:** grab your Web Analytics **token** (Manual setup in the same
   place) and paste it into `CF_BEACON_TOKEN` in the analytics snippet at the
   bottom of `index.html`. The beacon only loads when a token is present.

Use **one** of the two, not both (avoids double-counting). You'll see visits,
page views, top pages, referrers, countries, and device/browser breakdowns.

## Mobile

Built mobile-first: hamburger nav menu, content-height hero (`svh`, no iOS
address-bar jump), bottom-sheet project modals, larger tap targets, and
lightened background effects on phones for smoother scrolling. Interactions
that need a pointer (custom cursor, 3D tilt, magnetic buttons) are disabled on
touch devices automatically.
