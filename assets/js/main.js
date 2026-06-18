/* ============================================================
   bes@portfolio — terminal theme · main.js
   Boot sequence, typed hero, block cursor, process inspection,
   project preview modal (screenshot services + fallbacks).
   ============================================================ */

(function () {
  "use strict";

  /* Master switch for the "$ open --live" buttons in the inspect modal.
     Set to true when you're ready to show live links publicly. */
  const SHOW_LIVE_LINKS = false;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------------- Year ---------------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------- Scroll progress + bar state ---------------- */
  const progress = $("#scrollProgress");
  const nav = $("#nav");
  function onScroll() {
    const h = document.documentElement;
    const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
    if (progress) progress.style.width = (scrolled * 100).toFixed(2) + "%";
    if (nav) nav.classList.toggle("is-scrolled", h.scrollTop > 30);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------- Mobile nav ---------------- */
  const navToggle = $("#navToggle");
  if (navToggle && nav) {
    const closeNav = () => {
      nav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "Open menu");
    };
    navToggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    $$(".bar__links a").forEach((a) => a.addEventListener("click", closeNav));
    window.addEventListener("resize", () => { if (window.innerWidth > 760) closeNav(); });
  }

  /* ---------------- Reveal on scroll ---------------- */
  const revealEls = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !prefersReduced) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }
  $$(".proc").forEach((list) => $$(".proc__row", list).forEach((row, i) => row.style.setProperty("--i", i)));

  /* ---------------- Animated counters ---------------- */
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const start = performance.now();
    const dur = 1300;
    function step(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  const counters = $$("[data-count]");
  if ("IntersectionObserver" in window && !prefersReduced) {
    const cio = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target); } }),
      { threshold: 0.6 }
    );
    counters.forEach((c) => cio.observe(c));
  }

  /* ---------------- Block cursor ---------------- */
  const cursor = $("#cursor");
  if (cursor && !isTouch && !prefersReduced) {
    let tx = 0, ty = 0;
    window.addEventListener("mousemove", (e) => {
      tx = e.clientX; ty = e.clientY;
      cursor.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -50%)`;
      document.body.classList.add("cursor-on");
    });
    $$("a, button, .proc__row, .run, .tags span").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("lg"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("lg"));
    });
  }

  /* ---------------- Boot sequence, then hero typing ---------------- */
  const boot = $("#boot");
  const bootLog = $("#bootLog");
  const heroType = $("#heroType");

  const BOOT_LINES = [
    "bes.portfolio :: boot",
    "[ ok ] mounting filesystem",
    "[ ok ] loading automations …",
    "[ ok ] starting interactive runtime",
    "[ ok ] ready — welcome.",
  ];

  function typeInto(el, text, speed, done) {
    let i = 0;
    (function tick() {
      el.textContent = text.slice(0, i);
      if (i++ <= text.length) setTimeout(tick, speed);
      else if (done) done();
    })();
  }

  function startHeroTyping() {
    if (!heroType) return;
    const lines = $$(".tline", heroType);
    if (prefersReduced || isTouch || !lines.length) return; // keep static content
    heroType.classList.add("is-typing");
    let idx = 0;
    function next() {
      if (idx >= lines.length) return;
      const line = lines[idx++];
      line.classList.add("shown");
      // first line ("$ ./intro.sh") types out; the rest print line-by-line
      if (idx === 1) {
        const full = line.textContent;
        const prompt = "$ ";
        line.innerHTML = '<span class="p-cmd">$</span> ';
        const rest = full.replace(/^\$\s/, "");
        const span = document.createElement("span");
        line.appendChild(span);
        typeInto(span, rest, 38, () => setTimeout(next, 240));
      } else {
        setTimeout(next, idx === lines.length ? 0 : 170);
      }
    }
    next();
  }

  function runBoot() {
    if (!boot || !bootLog) { startHeroTyping(); return; }
    let sessionSeen = false;
    try { sessionSeen = sessionStorage.getItem("booted") === "1"; } catch (e) {}
    if (prefersReduced || sessionSeen) {
      boot.classList.add("done");
      setTimeout(() => boot.remove(), 200);
      startHeroTyping();
      return;
    }
    boot.setAttribute("aria-hidden", "true");
    let i = 0;
    function printLine() {
      if (i < BOOT_LINES.length) {
        bootLog.textContent += (i ? "\n" : "") + BOOT_LINES[i];
        i++;
        setTimeout(printLine, 180);
      } else {
        setTimeout(finish, 360);
      }
    }
    function finish() {
      try { sessionStorage.setItem("booted", "1"); } catch (e) {}
      boot.classList.add("done");
      setTimeout(() => { boot.remove(); }, 500);
      startHeroTyping();
    }
    const skip = () => { i = BOOT_LINES.length; finish(); };
    boot.addEventListener("click", skip, { once: true });
    printLine();
  }
  runBoot();

  /* ---------------- Inspect modal ---------------- */
  const modal = $("#modal");
  const mTag = $("#modalTag");
  const mTitle = $("#modalTitle");
  const mTitleBar = $("#modalTitleBar");
  const mSummary = $("#modalSummary");
  const mBody = $("#modalBody");
  const mLink = $("#modalLink");
  const mShotImg = $("#modalShotImg");
  const mShotLoader = $("#modalShotLoader");
  const mShotPlaceholder = $("#modalShotPlaceholder");
  const mUrl = $("#modalUrl");
  let lastFocused = null;

  const SHOT_SERVICES = [
    (u) => "https://image.thum.io/get/width/1280/crop/960/noanimate/" + u,
    (u) => "https://s.wordpress.com/mshots/v1/" + encodeURIComponent(u) + "?w=1280&h=800",
  ];

  function setShot(card, link) {
    if (!mShotImg) return;
    const figure = $(".modal__shot", modal);
    if (card.dataset.noshot) {
      if (figure) figure.style.display = "none";
      mShotImg.removeAttribute("src");
      return;
    }
    if (figure) figure.style.display = "";

    const explicit = card.dataset.shot;
    const sources = [];
    if (explicit) sources.push(explicit);
    if (link && link !== "#") SHOT_SERVICES.forEach((fn) => sources.push(fn(link)));

    if (mUrl) {
      mUrl.textContent = link && link !== "#"
        ? link.replace(/^https?:\/\//, "").replace(/\/$/, "")
        : (card.dataset.name || "preview") + " · preview";
    }
    if (mShotPlaceholder) {
      mShotPlaceholder.style.setProperty("--c", card.dataset.color || "#4af2a1");
      mShotPlaceholder.innerHTML =
        '<span class="ph-emoji">' + (card.dataset.glyph || "▮") + "</span>" +
        '<span class="ph-name">' + (card.dataset.name || "") + "</span>" +
        '<span class="ph-hint">screenshot coming soon</span>';
    }

    let idx = 0;
    mShotImg.classList.remove("loaded");
    function showPlaceholder() {
      mShotImg.style.display = "none";
      if (mShotLoader) mShotLoader.style.display = "none";
      if (mShotPlaceholder) mShotPlaceholder.style.display = "flex";
    }
    function tryNext() {
      if (idx >= sources.length) return showPlaceholder();
      if (mShotPlaceholder) mShotPlaceholder.style.display = "none";
      if (mShotLoader) mShotLoader.style.display = "flex";
      mShotImg.style.display = "block";
      mShotImg.src = sources[idx++];
    }
    mShotImg.onload = function () {
      mShotImg.classList.add("loaded");
      if (mShotLoader) mShotLoader.style.display = "none";
      if (mShotPlaceholder) mShotPlaceholder.style.display = "none";
    };
    mShotImg.onerror = tryNext;
    if (sources.length) tryNext();
    else { mShotImg.removeAttribute("src"); showPlaceholder(); }
  }

  function openModal(card) {
    if (!modal) return;
    lastFocused = document.activeElement;
    const name = card.dataset.name || "";
    if (mTitleBar) mTitleBar.textContent = "inspect: " + name;
    if (mTag) mTag.textContent = "cat " + name + ".md";
    if (mTitle) mTitle.textContent = card.dataset.title || "";
    if (mSummary) mSummary.textContent = card.dataset.summary || "";

    if (mBody) {
      mBody.innerHTML = "";
      (card.dataset.details || "").split("|").filter(Boolean).forEach((para) => {
        const p = document.createElement("p");
        p.innerHTML = para.replace(/^([A-Za-z/ ]+:)/, "<strong>$1</strong>");
        mBody.appendChild(p);
      });
    }

    const link = card.dataset.link || "#";
    setShot(card, link);
    const showLink = SHOW_LIVE_LINKS && link !== "#";
    if (mLink) { mLink.href = link; mLink.style.display = showLink ? "" : "none"; }
    const note = $(".modal__note", modal);
    if (note) note.style.display = SHOW_LIVE_LINKS && link === "#" ? "" : "none";

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    const closeBtn = $(".win__close", modal);
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (mShotImg) { mShotImg.onload = mShotImg.onerror = null; mShotImg.removeAttribute("src"); mShotImg.classList.remove("loaded"); }
    if (lastFocused) lastFocused.focus();
  }

  $$(".proc__row").forEach((row) => {
    row.addEventListener("click", () => openModal(row));
    row.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(row); }
    });
  });

  if (modal) {
    $$("[data-close]", modal).forEach((el) => el.addEventListener("click", closeModal));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
    });
  }

  /* ---------------- Smooth anchors ---------------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth" });
        history.pushState(null, "", id);
      }
    });
  });
})();
