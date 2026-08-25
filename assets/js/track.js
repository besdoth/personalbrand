/* ==========================================================================
   besiserver.co.uk — first-party visit & click tracking
   --------------------------------------------------------------------------
   Sends small JSON events to /api/track, which stamps them with real
   geo data from Cloudflare's edge and stores one raw row per event in D1.

   Design notes:
   • Cookie-free. One anonymous id in localStorage, first-party only.
   • Nothing here may ever throw — the published page renders an error
     banner on any uncaught window error, so every path is wrapped.
   • Listeners bind to `document` / `window`, never to <body>. The bundled
     page replaces document.documentElement after load; the Document node
     itself survives, so delegated listeners keep working.
   • The site is a single bundled page with SPA-style views and no section
     ids, so "where did they go" is derived from click labels, headings
     scrolling into view, and heading-set changes (a view swap).
   ========================================================================== */
(function () {
  "use strict";

  /* ----------------------------- settings ------------------------------ */
  var ENDPOINT        = "/api/track";
  var SESSION_MINUTES = 30;
  var RESPECT_DNT     = false; // cookie-free + IP is hashed, never stored raw
  var MAX_LABEL       = 120;
  var SCROLL_MARKS    = [25, 50, 75, 100];

  if (window.__besTracker) return;
  window.__besTracker = true;

  function safe(fn, fallback) {
    try { return fn(); } catch (e) { return fallback; }
  }

  if (RESPECT_DNT && safe(function () {
    return navigator.doNotTrack === "1" || window.doNotTrack === "1";
  }, false)) return;

  /* -------------------------- opt out (yourself) ------------------------ */
  /* Visit /?optout=1 once on each of your own devices and you disappear
     from your own stats for good. /?optout=0 undoes it.                    */
  var OPTOUT_KEY = "bes.optout";
  safe(function () {
    var q = new URLSearchParams(location.search);
    if (q.has("optout")) {
      if (q.get("optout") === "0") localStorage.removeItem(OPTOUT_KEY);
      else localStorage.setItem(OPTOUT_KEY, "1");
    }
  });
  if (safe(function () { return localStorage.getItem(OPTOUT_KEY) === "1"; }, false)) return;

  /* ------------------------------ identity ----------------------------- */
  function uid() {
    return safe(function () { return crypto.randomUUID().replace(/-/g, "").slice(0, 20); },
      null) || (Date.now().toString(36) + Math.random().toString(36).slice(2, 12));
  }
  function get(k) { return safe(function () { return localStorage.getItem(k); }, null); }
  function set(k, v) { safe(function () { localStorage.setItem(k, v); }); }

  var visitor = get("bes.v");
  var newVisitor = 0;
  if (!visitor) { visitor = uid(); newVisitor = 1; set("bes.v", visitor); set("bes.first", String(Date.now())); }

  var session, newSession = 0;
  (function () {
    var raw = safe(function () { return JSON.parse(get("bes.s") || "null"); }, null);
    if (raw && raw.id && raw.exp > Date.now()) session = raw.id;
    else { session = uid(); newSession = 1; }
    set("bes.s", JSON.stringify({ id: session, exp: Date.now() + SESSION_MINUTES * 60000 }));
  })();
  function touchSession() {
    set("bes.s", JSON.stringify({ id: session, exp: Date.now() + SESSION_MINUTES * 60000 }));
  }

  /* --------------------------- campaign tagging ------------------------- */
  /* Share besiserver.co.uk/?r=linkedin (or ?r=recruiter-jane) and every
     event from that visit is tagged, so you know which share got the click. */
  var params = safe(function () { return new URLSearchParams(location.search); },
    { get: function () { return null; } });
  var tag = params.get("r") || params.get("ref") || params.get("utm_source") || null;
  if (tag) set("bes.tag", tag);
  if (!tag) tag = get("bes.tag");

  /* ------------------------------ sending ------------------------------ */
  var queued = 0;
  function send(type, extra) {
    safe(function () {
      if (queued > 200) return; // runaway guard
      queued++;
      touchSession();
      var body = {
        t: type,
        v: visitor,
        s: session,
        p: (location.pathname + location.search).slice(0, 300),
        r: (document.referrer || "").slice(0, 300),
        tag: tag ? String(tag).slice(0, 80) : null,
        um: params.get("utm_medium"),
        uc: params.get("utm_campaign"),
        nv: newVisitor,
        ns: newSession,
        sw: screen.width, sh: screen.height,
        vw: window.innerWidth, vh: window.innerHeight,
        lang: navigator.language || null,
        tz: safe(function () { return Intl.DateTimeFormat().resolvedOptions().timeZone; }, null)
      };
      if (extra) for (var k in extra) if (extra[k] !== undefined) body[k] = extra[k];

      var payload = JSON.stringify(body);
      /* text/plain keeps sendBeacon a "simple request" — no CORS preflight,
         and it survives the page unloading on an outbound click. */
      var blob = safe(function () { return new Blob([payload], { type: "text/plain;charset=UTF-8" }); }, null);
      if (navigator.sendBeacon && blob && navigator.sendBeacon(ENDPOINT, blob)) return;
      fetch(ENDPOINT, { method: "POST", body: payload, keepalive: true, credentials: "omit",
                        headers: { "Content-Type": "text/plain;charset=UTF-8" } }).catch(function () {});
    });
  }

  /* ------------------------------ helpers ------------------------------ */
  function text(el) {
    return safe(function () {
      return (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, MAX_LABEL);
    }, "");
  }

  /* ----------------------------- page view ----------------------------- */
  /* Sent immediately so a two-second bounce still counts. No title: the
     bundle has not mounted yet, so document.title is still the wrapper's
     placeholder — page identity arrives with the first view event below. */
  send("pageview");
  /* Only the opening event of a visit is flagged new — otherwise every click
     and scroll in that visit would also read as "new" in the live feed. */
  newVisitor = 0;
  newSession = 0;

  /* ------------------------------- clicks ------------------------------ */
  /* Capture phase: the design's own handlers call preventDefault on the
     in-page nav links, so we must see the click before they do.           */
  document.addEventListener("click", function (e) {
    safe(function () {
      var start = e.target;
      if (!start || typeof start.closest !== "function") return;
      var node = start.closest("a[href], button, [role='button'], [data-track]");
      if (!node) return;

      var raw = node.getAttribute && (node.getAttribute("href") || "");
      var label = (node.getAttribute && node.getAttribute("data-track")) ||
                  text(node) ||
                  (node.getAttribute && (node.getAttribute("aria-label") || node.getAttribute("title"))) ||
                  "(no label)";

      var url = null;
      if (raw) url = safe(function () { return new URL(raw, location.href); }, null);

      var type = "click", href = raw || null;
      if (url) {
        href = url.href.slice(0, 400);
        if (url.protocol === "mailto:") type = "email";
        else if (url.protocol === "tel:") type = "phone";
        else if (/^https?:$/.test(url.protocol) && url.hostname !== location.hostname) type = "outbound";
        else if (url.hash && url.pathname === location.pathname) href = url.hash;
      }
      send(type, { l: label, h: href });
    });
  }, true);

  /* --------------------- headings: what they actually read -------------- */
  /* No ids in the exported design, so a heading's own text is the section
     name. Each one reports once per session.                              */
  var seen = {};
  var watched = safe(function () { return new WeakSet(); }, null);
  var io = safe(function () {
    if (!("IntersectionObserver" in window)) return null;
    return new IntersectionObserver(function (entries) {
      safe(function () {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          io.unobserve(en.target);
          var name = text(en.target);
          if (!name || seen[name]) return;
          seen[name] = 1;
          send("section", { l: name });
        });
      });
    }, { threshold: 0.5 });
  }, null);

  function scanHeadings() {
    safe(function () {
      if (!io || !watched) return;
      var els = document.querySelectorAll("h1, h2, [data-track-section]");
      for (var i = 0; i < els.length && i < 60; i++) {
        if (watched.has(els[i])) continue;
        watched.add(els[i]);
        io.observe(els[i]);
      }
    });
  }

  /* ----------------------- view swaps (SPA routing) --------------------- */
  /* Opening a project replaces the heading set without changing the URL,
     so a change in that set is a navigation.                              */
  var lastHeadings = null;
  function checkView() {
    safe(function () {
      var list = [];
      var els = document.querySelectorAll("h1");
      for (var i = 0; i < els.length && i < 20; i++) list.push(text(els[i]));
      var sig = list.join("|");
      if (!sig || sig === lastHeadings) return;
      if (lastHeadings !== null) {
        var before = lastHeadings.split("|");
        var fresh = list.filter(function (h) { return h && before.indexOf(h) < 0; });
        send("view", { l: (fresh[0] || list[0] || "").slice(0, MAX_LABEL) });
      }
      lastHeadings = sig;
    });
  }

  var pending = null;
  function rescan() {
    if (pending) return;
    pending = setTimeout(function () { pending = null; scanHeadings(); checkView(); }, 250);
  }
  safe(function () { new MutationObserver(rescan).observe(document, { childList: true, subtree: true }); });
  rescan();
  [0, 800, 2500].forEach(function (ms) { setTimeout(rescan, ms); });

  /* ------------------- scroll depth + time on page ---------------------- */
  var maxScroll = 0, ticking = false, marksHit = {};
  function measure() {
    safe(function () {
      var h = document.documentElement;
      var range = (h.scrollHeight - h.clientHeight) || 1;
      var pct = Math.max(0, Math.min(100, Math.round((h.scrollTop / range) * 100)));
      if (pct > maxScroll) maxScroll = pct;
      for (var i = 0; i < SCROLL_MARKS.length; i++) {
        var m = SCROLL_MARKS[i];
        if (maxScroll >= m && !marksHit[m]) { marksHit[m] = 1; send("scroll", { val: m }); }
      }
    });
  }
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; measure(); });
  }, { passive: true });
  measure();

  var activeMs = 0, since = Date.now(), visible = true;
  function accrue() { if (visible) { activeMs += Date.now() - since; } since = Date.now(); }

  var closed = false;
  function finish() {
    if (closed) return;
    closed = true;
    accrue();
    send("engage", { val: Math.round(activeMs / 1000), scroll: maxScroll });
  }
  document.addEventListener("visibilitychange", function () {
    safe(function () {
      accrue();
      visible = document.visibilityState === "visible";
      since = Date.now();
      if (!visible) finish();
    });
  });
  window.addEventListener("pagehide", finish);
})();
