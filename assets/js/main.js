/* ============================================================
   Bes — Interactive Portfolio · main.js
   Vanilla JS. Scroll reveals, custom cursor, tilt, counters,
   constellation background, project modal.
   ============================================================ */

(function () {
  "use strict";

  /* Master switch for the "Visit live site" buttons in project modals.
     Set to true when you're ready to show live links publicly.
     Individual cards still need a real data-link (not "#") to appear. */
  const SHOW_LIVE_LINKS = false;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------------- Year ---------------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------- Scroll progress + nav ---------------- */
  const progress = $("#scrollProgress");
  const nav = $("#nav");
  function onScroll() {
    const h = document.documentElement;
    const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
    if (progress) progress.style.width = (scrolled * 100).toFixed(2) + "%";
    if (nav) nav.classList.toggle("is-scrolled", h.scrollTop > 40);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------------- Mobile nav menu ---------------- */
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
    $$(".nav__links a").forEach((a) => a.addEventListener("click", closeNav));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 860) closeNav();
    });
  }

  /* ---------------- Reveal on scroll ---------------- */
  const revealEls = $$("[data-reveal]");
  const charEls = $$("[data-reveal-char]");

  if ("IntersectionObserver" in window && !prefersReduced) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el) => io.observe(el));

    // Hero characters: stagger reveal on load
    charEls.forEach((el, i) => {
      el.style.transitionDelay = i * 70 + "ms";
      requestAnimationFrame(() =>
        requestAnimationFrame(() => el.classList.add("is-visible"))
      );
    });
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
    charEls.forEach((el) => el.classList.add("is-visible"));
  }

  // index var for card stagger
  $$(".cards").forEach((grid) => {
    $$(".card", grid).forEach((card, i) => card.style.setProperty("--i", i));
  });

  /* ---------------- Animated counters ---------------- */
  const counters = $$("[data-count]");
  if ("IntersectionObserver" in window) {
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          animateCount(e.target);
          cio.unobserve(e.target);
        });
      },
      { threshold: 0.6 }
    );
    counters.forEach((c) => cio.observe(c));
  } else {
    counters.forEach((c) => (c.textContent = c.dataset.count + (c.dataset.suffix || "")));
  }
  function animateCount(el) {
    const target = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const dur = 1400;
    const start = performance.now();
    function step(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------------- Custom cursor ---------------- */
  const cursor = $("#cursor");
  const dot = $("#cursorDot");
  if (cursor && dot && !isTouch && !prefersReduced) {
    let cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    let tx = cx, ty = cy;
    window.addEventListener("mousemove", (e) => {
      tx = e.clientX; ty = e.clientY;
      dot.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -50%)`;
      document.body.classList.add("cursor-ready");
    });
    function ring() {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(ring);
    }
    ring();
    $$("a, button, .card, [data-magnetic], [data-tilt]").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
    });
  }

  /* ---------------- Magnetic buttons ---------------- */
  if (!isTouch && !prefersReduced) {
    $$("[data-magnetic]").forEach((el) => {
      const strength = 0.35;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${mx * strength}px, ${my * strength}px)`;
      });
      el.addEventListener("mouseleave", () => (el.style.transform = ""));
    });
  }

  /* ---------------- Card 3D tilt + glow ---------------- */
  if (!isTouch && !prefersReduced) {
    $$("[data-tilt]").forEach((el) => {
      const max = 9;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const rx = (0.5 - py) * max;
        const ry = (px - 0.5) * max;
        el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
        el.style.setProperty("--mx", px * 100 + "%");
        el.style.setProperty("--my", py * 100 + "%");
        const color = el.getAttribute("data-color");
        if (color) el.style.setProperty("--card-color", color);
      });
      el.addEventListener("mouseleave", () => (el.style.transform = ""));
    });
  } else {
    // still set glow colors for mobile hover-less
    $$("[data-color]").forEach((el) => {
      const c = el.getAttribute("data-color");
      if (c) el.style.setProperty("--card-color", c);
    });
  }

  /* ---------------- Parallax blobs on scroll ---------------- */
  if (!prefersReduced) {
    const blobs = $$(".blob");
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        blobs.forEach((b, i) => {
          const speed = (i + 1) * 0.04;
          b.style.marginTop = -(y * speed) + "px";
        });
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------------- Project modal ---------------- */
  const modal = $("#modal");
  const mTag = $("#modalTag");
  const mTitle = $("#modalTitle");
  const mSummary = $("#modalSummary");
  const mBody = $("#modalBody");
  const mLink = $("#modalLink");
  const mShotImg = $("#modalShotImg");
  const mShotLoader = $("#modalShotLoader");
  const mShotPlaceholder = $("#modalShotPlaceholder");
  const mUrl = $("#modalUrl");
  let lastFocused = null;

  /* Free, no-key screenshot services (rendered in the visitor's browser).
     Tried in order; if all fail we fall back to a branded placeholder. */
  const SHOT_SERVICES = [
    (u) => "https://image.thum.io/get/width/1280/crop/960/noanimate/" + u,
    (u) => "https://s.wordpress.com/mshots/v1/" + encodeURIComponent(u) + "?w=1280&h=800",
  ];

  function setShot(card, link) {
    if (!mShotImg) return;
    const figure = $(".modal__shot", modal);
    // Some projects opt out of a preview entirely.
    if (card.dataset.noshot) {
      if (figure) figure.style.display = "none";
      mShotImg.removeAttribute("src");
      return;
    }
    if (figure) figure.style.display = "";
    const explicit = card.dataset.shot; // optional local/remote image path
    const sources = [];
    if (explicit) sources.push(explicit);
    if (link && link !== "#") SHOT_SERVICES.forEach((fn) => sources.push(fn(link)));

    if (mUrl) {
      mUrl.textContent =
        link && link !== "#"
          ? link.replace(/^https?:\/\//, "").replace(/\/$/, "")
          : (card.dataset.title || "preview").toLowerCase().replace(/\s+/g, "") + " · preview";
    }

    if (mShotPlaceholder) {
      const emojiEl = card.querySelector(".card__emoji");
      const emoji = emojiEl ? emojiEl.textContent : "🖥️";
      mShotPlaceholder.style.setProperty("--c", card.dataset.color || "#7a5cff");
      mShotPlaceholder.innerHTML =
        '<span class="ph-emoji">' + emoji + "</span>" +
        '<span class="ph-name">' + (card.dataset.title || "") + "</span>" +
        '<span class="ph-hint">Screenshot coming soon — add a live URL or image</span>';
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
    else {
      mShotImg.removeAttribute("src");
      showPlaceholder();
    }
  }

  function openModal(card) {
    if (!modal) return;
    lastFocused = document.activeElement;
    mTag.textContent = card.dataset.tag || "";
    mTitle.textContent = card.dataset.title || "";
    mSummary.textContent = card.dataset.summary || "";
    mBody.innerHTML = "";
    (card.dataset.details || "")
      .split("|")
      .filter(Boolean)
      .forEach((para) => {
        const p = document.createElement("p");
        // bold a leading "Word:" label
        p.innerHTML = para.replace(/^([A-Za-z/ ]+:)/, "<strong>$1</strong>");
        mBody.appendChild(p);
      });
    const link = card.dataset.link || "#";
    setShot(card, link);
    const showLink = SHOW_LIVE_LINKS && link !== "#";
    mLink.href = link;
    mLink.style.display = showLink ? "" : "none";
    const note = $(".modal__note", modal);
    // Only nudge about a missing URL when links are switched on but this card has none.
    if (note) note.style.display = SHOW_LIVE_LINKS && link === "#" ? "" : "none";
    const color = card.dataset.color;
    if (color) mTag.style.color = color;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $(".modal__close", modal).focus();
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (mShotImg) {
      mShotImg.onload = mShotImg.onerror = null;
      mShotImg.removeAttribute("src");
      mShotImg.classList.remove("loaded");
    }
    if (lastFocused) lastFocused.focus();
  }

  $$(".card").forEach((card) => {
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.addEventListener("click", () => openModal(card));
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openModal(card);
      }
    });
  });

  if (modal) {
    $$("[data-close]", modal).forEach((el) => el.addEventListener("click", closeModal));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
    });
  }

  /* ---------------- Constellation canvas ---------------- */
  const canvas = $("#constellation");
  if (canvas && !prefersReduced) {
    const ctx = canvas.getContext("2d");
    let w, h, dpr, points, mouse = { x: -9999, y: -9999 };

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = window.innerWidth * dpr;
      h = canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      const count = Math.min(90, Math.floor((window.innerWidth * window.innerHeight) / 16000));
      points = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25 * dpr,
        vy: (Math.random() - 0.5) * 0.25 * dpr,
      }));
    }
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", (e) => {
      mouse.x = e.clientX * dpr;
      mouse.y = e.clientY * dpr;
    });

    const linkDist = 140 * dpr;
    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        // mouse repel
        const mdx = p.x - mouse.x, mdy = p.y - mouse.y;
        const md = Math.hypot(mdx, mdy);
        if (md < 120 * dpr && md > 0) {
          p.x += (mdx / md) * 0.8;
          p.y += (mdy / md) * 0.8;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.4 * dpr, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(160,150,255,0.7)";
        ctx.fill();

        for (let j = i + 1; j < points.length; j++) {
          const q = points[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const d = Math.hypot(dx, dy);
          if (d < linkDist) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(122,92,255,${(1 - d / linkDist) * 0.22})`;
            ctx.lineWidth = dpr;
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }
    draw();
  }

  /* ---------------- Smooth anchor focus offset ---------------- */
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
