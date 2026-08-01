/* BrightHome Energy landing page
   1. motion gate (reduced-motion / no-JS fallback)
   2. scroll-driven house install scene
   3. quote form (Web3Forms) */
(() => {
  "use strict";

  /* PLACEHOLDER: get your free access key at https://web3forms.com and paste it
     here AND in the hidden access_key input in index.html. */
  const WEB3FORMS_ACCESS_KEY = "YOUR_WEB3FORMS_ACCESS_KEY_HERE";

  const root = document.documentElement;
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- scene elements ---------- */
  const track = document.getElementById("hero");
  const panels = Array.from(document.querySelectorAll("#panels .panel"));
  const heatPump = document.getElementById("heatPump");
  const sunRays = document.getElementById("sunRays");
  const sparkles = Array.from(document.querySelectorAll("#sparkles .sparkle"));
  const caption = document.getElementById("sceneCaption");

  /* progress windows over p ∈ [0, 1] of the story track:
     panels build through the hero + benefits chapters, the heat pump
     arrives around "how it works", everything is done before the form */
  const TIMELINE = {
    panels: { start: 0.04, end: 0.6 },
    heatPump: { start: 0.62, end: 0.78 },
    sunRays: { start: 0.78, end: 0.88 },
    sparkles: { start: 0.84, end: 0.96 },
  };

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeOutBack = (t) => {
    const c1 = 0.9; // gentle ~8% overshoot — a soft settle, not a snap
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  const local = (p, start, end) => clamp((p - start) / (end - start), 0, 1);

  /* All scene motion uses the SVG `transform` ATTRIBUTE in viewBox units.
     CSS-pixel transforms on SVG children behave differently on iOS Safari
     (wrong units + they can escape the SVG's clip); attribute transforms
     are identical everywhere. Scale/rotate are composed about each
     element's own centre. */
  const centreOf = (el) => {
    const b = el.getBBox();
    return { cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
  };
  const panelC = panels.map(centreOf);
  const sparkleC = sparkles.map(centreOf);
  const raysC = sunRays ? centreOf(sunRays) : { cx: 0, cy: 0 };

  function setPose(el, c, { dx = 0, dy = 0, s = 1, rot = 0 }) {
    el.setAttribute(
      "transform",
      `translate(${dx.toFixed(2)} ${dy.toFixed(2)}) translate(${c.cx} ${c.cy}) rotate(${rot.toFixed(2)}) scale(${s.toFixed(4)}) translate(${-c.cx} ${-c.cy})`
    );
  }

  function applyScene(p) {
    // panels: staggered drop into place — they materialise close to the
    // roof (opacity gated) so a mid-scroll freeze never shows stray
    // panels floating in the sky
    const { start, end } = TIMELINE.panels;
    const slot = (end - start) / panels.length;
    panels.forEach((panel, i) => {
      const t = clamp((p - (start + i * slot * 0.85)) / (slot * 2.2), 0, 1);
      if (t <= 0) {
        panel.style.opacity = "0";
        setPose(panel, panelC[i], { dy: -48, s: 0.92 });
        panel.classList.remove("is-set");
        return;
      }
      const e = easeOutBack(t);
      panel.style.opacity = String(clamp(t / 0.5, 0, 1));
      setPose(panel, panelC[i], {
        dy: -48 * (1 - e),
        s: 0.92 + 0.08 * e,
        rot: -4 * (1 - e),
      });
      panel.classList.toggle("is-set", t >= 1);
    });

    // heat pump slides in from the right (80 viewBox units keeps it
    // inside the scene even mid-flight)
    const tp = local(p, TIMELINE.heatPump.start, TIMELINE.heatPump.end);
    const ep = easeOutCubic(tp);
    heatPump.style.opacity = String(clamp(tp / 0.4, 0, 1));
    heatPump.setAttribute("transform", `translate(${(80 * (1 - ep)).toFixed(2)} 0)`);
    heatPump.classList.toggle("is-on", tp >= 1);

    // sun rays grow in, then pulse via CSS
    const tr = local(p, TIMELINE.sunRays.start, TIMELINE.sunRays.end);
    const er = easeOutCubic(tr);
    sunRays.style.opacity = String(er);
    setPose(sunRays, raysC, { s: 0.5 + 0.5 * er });
    sunRays.classList.toggle("is-on", tr >= 1);

    // sparkles twinkle sequentially near the end
    const sw = TIMELINE.sparkles;
    const sSlot = (sw.end - sw.start) / sparkles.length;
    sparkles.forEach((sp, i) => {
      const t = clamp((p - (sw.start + i * sSlot * 0.7)) / (sSlot * 1.6), 0, 1);
      const wave = Math.sin(Math.PI * t); // 0 → 1 → 0
      sp.style.opacity = String(wave);
      setPose(sp, sparkleC[i], { s: 0.4 + 0.8 * wave });
    });

    setCaption(
      p < 0.03 ? "Scroll to install your panels ↓"
      : p < TIMELINE.panels.end ? "Installing your solar panels…"
      : p < TIMELINE.sunRays.start ? "Adding your air source heat pump…"
      : "Install complete — ready to start saving ✓"
    );
  }

  let currentCaption = "";
  function setCaption(text) {
    if (text === currentCaption || !caption) return;
    currentCaption = text;
    caption.textContent = text;
  }

  /* ---------- scroll driver: lerp-smoothed progress ----------
     `targetP` tracks the scrollbar; `currentP` glides toward it each frame,
     so flick-scrolls produce a fluid catch-up rather than a hard jump.
     rAF runs only while the two disagree, then stops. */
  let targetP = 0;
  let currentP = 0;
  let rafId = null;
  let lastT = 0;
  const EPS = 0.0004;

  function targetProgress() {
    const range = track.offsetHeight - window.innerHeight;
    if (range <= 0) return 1;
    return clamp(-track.getBoundingClientRect().top / range, 0, 1);
  }

  function tick(now) {
    const dt = Math.min(48, now - lastT);
    lastT = now;
    // frame-rate-independent smoothing, ≈0.12 per frame at 60Hz
    currentP += (targetP - currentP) * (1 - Math.exp(-dt / 90));
    if (Math.abs(targetP - currentP) < EPS) {
      currentP = targetP;
      rafId = null;
    } else {
      rafId = requestAnimationFrame(tick);
    }
    applyScene(currentP);
  }

  function kick() {
    targetP = targetProgress();
    if (rafId === null) {
      lastT = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  }

  function resetSceneToFinished() {
    [...panels, heatPump, sunRays, ...sparkles].forEach((el) => {
      el.style.opacity = "";
      el.removeAttribute("transform");
      el.classList.remove("is-set", "is-on");
    });
  }

  function applyMotionPref() {
    if (motionQuery.matches) {
      if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
      root.classList.remove("motion-ok");
      root.classList.add("no-motion");
      resetSceneToFinished();
    } else {
      root.classList.remove("no-motion");
      root.classList.add("motion-ok");
      // snap straight to the scroll position (no replay on mid-page loads)
      currentP = targetP = targetProgress();
      applyScene(currentP);
    }
  }

  if (track && panels.length) {
    applyMotionPref();
    motionQuery.addEventListener("change", applyMotionPref);
    window.addEventListener("scroll", () => { if (!motionQuery.matches) kick(); }, { passive: true });
    window.addEventListener("resize", () => { if (!motionQuery.matches) kick(); });
  }

  /* ---------- chapter reveal: gentle rise+fade on first entry ---------- */
  const chapters = Array.from(document.querySelectorAll(".story__panel"));
  if (chapters.length) {
    if ("IntersectionObserver" in window && !motionQuery.matches) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      chapters.forEach((c) => io.observe(c));
      chapters[0].classList.add("in-view"); // hero shows instantly
    } else {
      chapters.forEach((c) => c.classList.add("in-view"));
    }
  }

  /* ---------- quote form ---------- */
  const form = document.getElementById("quoteForm");
  const successPanel = document.getElementById("formSuccess");
  const successName = document.getElementById("successName");
  const statusEl = document.getElementById("formStatus");
  const submitBtn = document.getElementById("submitBtn");

  if (form) {
    const keyField = form.querySelector('input[name="access_key"]');
    if (keyField) keyField.value = WEB3FORMS_ACCESS_KEY;
    if (WEB3FORMS_ACCESS_KEY.startsWith("YOUR_")) {
      console.warn("BrightHome landing page: Web3Forms access key is still the placeholder — form submissions will fail until you set it in assets/js/main.js.");
    }

    const validators = {
      name: (v) => v.trim().length >= 2,
      phone: (v) => /^[\d\s()+-]{9,16}$/.test(v.trim()),
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
      postcode: (v) => /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(v.trim()),
    };

    function validateField(input) {
      const check = validators[input.name];
      const ok = check ? check(input.value) : input.value.trim() !== "";
      const err = document.getElementById("err-" + input.name);
      input.setAttribute("aria-invalid", ok ? "false" : "true");
      if (err) {
        err.hidden = ok;
        if (!ok) input.setAttribute("aria-describedby", err.id);
      }
      return ok;
    }

    const requiredInputs = () =>
      Array.from(form.querySelectorAll("input[required]"));

    requiredInputs().forEach((input) => {
      input.addEventListener("blur", () => {
        if (input.value.trim() !== "") validateField(input);
      });
      input.addEventListener("input", () => {
        if (input.getAttribute("aria-invalid") === "true") validateField(input);
      });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      let firstInvalid = null;
      requiredInputs().forEach((input) => {
        if (!validateField(input) && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      statusEl.textContent = "";
      statusEl.classList.remove("is-error");
      submitBtn.disabled = true;
      const originalLabel = submitBtn.textContent;
      submitBtn.textContent = "Sending…";

      try {
        const response = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          body: new FormData(form),
          headers: { Accept: "application/json" },
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Submission failed");

        const name = form.querySelector('input[name="name"]').value.trim().split(/\s+/)[0];
        if (successName && name) successName.textContent = ", " + name;
        form.hidden = true;
        successPanel.hidden = false;
        successPanel.focus();
        successPanel.scrollIntoView({ block: "center" });

        /* Conversion tracking seam: hang your Google Ads / GTM conversion
           tag off this event (or the body class) once tracking is set up. */
        document.body.classList.add("lead-submitted");
        if (Array.isArray(window.dataLayer)) {
          window.dataLayer.push({ event: "lead_form_submit" });
        }
      } catch (err) {
        console.error("Quote form submission failed:", err);
        statusEl.classList.add("is-error");
        /* PLACEHOLDER phone number — keep in sync with the rest of the page */
        statusEl.textContent =
          "Sorry — something went wrong sending your request. Please try again, or call us on 0800 000 0000.";
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      }
    });
  }
})();
