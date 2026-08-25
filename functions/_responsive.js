/**
 * Mobile layer for the exported design.
 *
 * The Claude Design bundle is a fixed 1280px artboard: every size is a hard
 * px value, and there is not one media query, clamp() or vw unit in it. On a
 * phone that leaves a 112px headline, 48px side gutters and seventeen
 * desktop grids that never collapse.
 *
 * It is injected at the edge (see _middleware.js) so it survives
 * re-exporting the design.
 *
 * Two things make the selectors work:
 *
 *  1. Everything is an inline style, so every rule needs !important.
 *  2. The bundle mounts the page through DOM APIs, which makes the browser
 *     re-serialise each style attribute — the authored `font-size:112px`
 *     becomes `font-size: 112px`, and `padding:0 48px` becomes
 *     `padding: 0px 48px`. Matching only the authored spelling silently
 *     matches nothing, so `hook()` below emits both forms.
 *
 * Structural rules key on a property NAME only (grid-template-columns), so
 * they keep working whatever values a future export uses. The type and
 * spacing rules key on specific values and are the part to revisit if the
 * design's scale changes.
 */

/** Selector matching a declaration in both its authored and re-serialised form. */
function hook(...forms) {
  return forms.map((f) => `[style*="${f}"]`).join(",");
}

/** Display sizes in the design, mapped to a phone scale. */
const TYPE = [
  [112, 40, 1.02], [104, 38, 1.04], [96, 36, 1.04], [88, 34, 1.06],
  [62, 30, 1.08], [54, 28, 1.1], [44, 26, 1.12], [42, 25, 1.12],
  [38, 24, 1.14], [36, 23, 1.16], [34, 22, 1.18], [32, 22, 1.18]
];

const typeRules = TYPE.map(([from, to, lh]) =>
  `  ${hook(`font-size:${from}px`, `font-size: ${from}px`)} { font-size: ${to}px !important; line-height: ${lh} !important; }`
).join("\n");

const narrowType = [[112, 34], [104, 33], [96, 32], [88, 30]].map(([from, to]) =>
  `  ${hook(`font-size:${from}px`, `font-size: ${from}px`)} { font-size: ${to}px !important; }`
).join("\n");

/** Desktop breathing room that reads as dead space on a phone. */
const SPACING = [
  ["padding:150px", "padding: 150px", "padding-top: 92px"],
  ["padding:110px", "padding: 110px", "padding-top: 52px"],
  ["margin-top:110px", "margin-top: 110px", "margin-top: 52px"],
  ["margin-top:86px", "margin-top: 86px", "margin-top: 44px"],
  ["margin-top:56px", "margin-top: 56px", "margin-top: 28px"],
  ["padding:52px 0", "padding: 52px 0px", "padding-top: 30px; padding-bottom: 30px"],
  ["padding:30px 0", "padding: 30px 0px", "padding-top: 20px; padding-bottom: 20px"],
  ["padding:32px 0", "padding: 32px 0px", "padding-top: 20px; padding-bottom: 20px; padding-left: 0px"]
];

const spacingRules = SPACING.map(([a, b, decl]) =>
  `  ${hook(a, b)} { ${decl.split("; ").map((d) => d + " !important").join("; ")}; }`
).join("\n");

const CONTAINER = hook("max-width:1180px", "max-width: 1180px");
const NAV       = hook("gap:30px", "gap: 30px");
const TAGLINE   = hook("font-size:9.5px", "font-size: 9.5px");
const PILL      = hook("gap:7px", "gap: 7px");

export const RESPONSIVE_CSS = `
/* ===== phones and small tablets =====================================
   Measured, not guessed: the design holds together unaided down to
   700px and only starts overflowing at 640px. So tablets keep the
   layout they were drawn for, and only genuinely narrow screens get
   rebuilt below. */
@media (max-width: 700px) {

  /* Page gutters: 48px a side is a quarter of a phone screen. */
  ${CONTAINER} {
    padding-left: 20px !important;
    padding-right: 20px !important;
  }

  /* Collapse every desktop grid to one column. Keys on the property name,
     so grids added in a future export are covered too. */
  [style*="grid-template-columns"] {
    grid-template-columns: 1fr !important;
    gap: 18px !important;
    align-items: start !important;
  }

  /* --- top bar ----------------------------------------------------- */
  /* Drop the tagline and the availability pill — the wordmark plus three
     links is all that honestly fits at this width. */
  ${TAGLINE}, ${PILL} { display: none !important; }

  ${NAV} {
    gap: 18px !important;
    font-size: 10px !important;
    letter-spacing: .08em !important;
  }

  /* --- display type ------------------------------------------------- */
${typeRules}

  /* Long words in the display serif break rather than run off the edge. */
  h1, h2, h3 {
    overflow-wrap: break-word !important;
    max-width: 100% !important;
    text-wrap: pretty !important;
  }

  /* --- vertical rhythm ---------------------------------------------- */
${spacingRules}

  /* Two-up rows (figure caption, footer) collide at this width — stack them.
     Keyed on their own padding so the fixed header's flex row is untouched. */
  ${hook("padding-top:14px", "padding-top: 14px", "padding-top:22px", "padding-top: 22px")} {
    flex-direction: column !important;
    align-items: flex-start !important;
    gap: 6px !important;
  }

  /* Column rules belong to a multi-column layout that no longer exists. */
  ${hook("border-right:1px solid", "border-right: 1px solid")} { border-right: 0 !important; }

  /* Measure caps were written for a 1180px canvas. */
  p, ${hook("max-width:52ch", "max-width: 52ch", "max-width:19ch", "max-width: 19ch")} {
    max-width: 100% !important;
  }

  a { -webkit-tap-highlight-color: rgba(122,59,31,.14); }

  /* Nothing may cause a sideways scroll. */
  html, body { overflow-x: hidden !important; }
}

/* ===== narrow phones ================================================ */
@media (max-width: 420px) {
  ${CONTAINER} {
    padding-left: 16px !important;
    padding-right: 16px !important;
  }
${narrowType}
  ${NAV} { gap: 14px !important; font-size: 9.5px !important; }
}

/* An unresolved template placeholder must not render as a broken image. */
img[src*="{{"], img[src*="%7B%7B"] { display: none !important; }
`;
