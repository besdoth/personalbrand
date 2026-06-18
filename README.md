# Bes — Interactive Portfolio

A hand-coded, scroll-driven personal site that showcases my web-development and
automation work. No frameworks, no build step — just HTML, CSS and vanilla JS,
so the interaction craft *is* the portfolio.

## What's inside

- **Scroll-driven reveals** — text and cards animate in as you scroll (IntersectionObserver).
- **Custom cursor + magnetic buttons** — desktop pointer follows with easing; CTAs pull toward it.
- **3D tilt cards** with a color glow that tracks the mouse.
- **Animated constellation background** that reacts to the cursor, plus floating gradient blobs and parallax.
- **Animated counters**, a looping skills marquee, and a scroll-progress bar.
- **Project case-study modals** — click any card for the full story; each links out to the live site.
- Fully **responsive** and respects `prefers-reduced-motion` and touch devices.

## Showcased work

| Automations & builds | Personal projects |
|---|---|
| Birria Birria — ordering & ops | Movie / Series Picker |
| Blood Testing Panel — health data | Birthday Surprise |
| Adobe Email Automations | |
| Trading Tool | |

## Editing content

Everything is driven by `data-*` attributes on the `.card` elements in
`index.html`:

```html
<article class="card" data-tilt
  data-title="Birria Birria"
  data-tag="Hospitality · Ordering & Ops"
  data-link="https://your-live-url.com"   <!-- replace # with the real URL -->
  data-color="#ff7a59"
  data-summary="One-line hook shown in the modal."
  data-details="Paragraph one.|Stack: ...|Impact: ...">  <!-- split paragraphs with | -->
```

- **`data-link`** — the live site URL. (Birria Birria is set to `https://birria-birria.pages.dev/`, moving to `birriabirria.com` later.)
- **`data-details`** — paragraphs separated by `|`; a leading `Word:` gets bolded automatically.
- **`data-shot`** *(optional)* — path/URL to a screenshot image shown in the modal's browser frame, e.g. `data-shot="assets/screenshots/birria.png"`. If omitted but `data-link` is a real URL, a live screenshot is generated automatically (via a free screenshot service, with fallbacks). If neither exists, a branded placeholder is shown. Drop screenshot images into `assets/screenshots/`.

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
