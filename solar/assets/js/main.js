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
  const scrollHint = document.getElementById("scrollHint");

  /* progress windows over p ∈ [0, 1] */
  const TIMELINE = {
    panels: { start: 0.05, end: 0.68 },
    heatPump: { start: 0.7, end: 0.85 },
    sunRays: { start: 0.85, end: 0.94 },
    sparkles: { start: 0.88, end: 1.0 },
  };

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeOutBack = (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  const local = (p, start, end) => clamp((p - start) / (end - start), 0, 1);

  function applyScene(p) {
    // panels: staggered fly-in, bottom row first, with overshoot "snap"
    const { start, end } = TIMELINE.panels;
    const slot = (end - start) / panels.length;
    panels.forEach((panel, i) => {
      const t = clamp((p - (start + i * slot * 0.78)) / (slot * 2), 0, 1);
      if (t <= 0) {
        panel.style.opacity = "0";
        panel.style.transform = "translateY(-140px) scale(0.6)";
        panel.classList.remove("is-set");
        return;
      }
      const e = easeOutBack(t);
      panel.style.opacity = String(clamp(t * 3, 0, 1));
      panel.style.transform = `translateY(${(-140 * (1 - e)).toFixed(1)}px) scale(${(0.6 + 0.4 * e).toFixed(3)})`;
      panel.classList.toggle("is-set", t >= 1);
    });

    // heat pump slides in from the right
    const tp = local(p, TIMELINE.heatPump.start, TIMELINE.heatPump.end);
    const ep = easeOutCubic(tp);
    heatPump.style.opacity = String(clamp(tp * 3, 0, 1));
    heatPump.style.transform = `translateX(${(140 * (1 - ep)).toFixed(1)}px)`;
    heatPump.classList.toggle("is-on", tp >= 1);

    // sun rays grow in, then pulse via CSS
    const tr = local(p, TIMELINE.sunRays.start, TIMELINE.sunRays.end);
    const er = easeOutCubic(tr);
    sunRays.style.opacity = String(er);
    sunRays.style.transform = `scale(${(0.5 + 0.5 * er).toFixed(3)})`;
    sunRays.classList.toggle("is-on", tr >= 1);

    // sparkles twinkle sequentially near the end
    const sw = TIMELINE.sparkles;
    const sSlot = (sw.end - sw.start) / sparkles.length;
    sparkles.forEach((sp, i) => {
      const t = clamp((p - (sw.start + i * sSlot * 0.7)) / (sSlot * 1.6), 0, 1);
      const wave = Math.sin(Math.PI * t); // 0 → 1 → 0
      sp.style.opacity = String(wave);
      sp.style.transform = `scale(${(0.4 + 0.8 * wave).toFixed(3)})`;
    });

    // caption + scroll hint
    if (scrollHint) scrollHint.classList.toggle("is-hidden", p > 0.02);
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

  /* ---------- scroll driver (rAF on demand) ---------- */
  let frameQueued = false;

  function progress() {
    const rect = track.getBoundingClientRect();
    const range = track.offsetHeight - window.innerHeight;
    if (range <= 0) return 1;
    return clamp(-rect.top / range, 0, 1);
  }

  function requestFrame() {
    if (frameQueued) return;
    frameQueued = true;
    requestAnimationFrame(() => {
      frameQueued = false;
      applyScene(progress());
    });
  }

  function resetSceneToFinished() {
    [...panels, heatPump, sunRays, ...sparkles].forEach((el) => {
      el.style.opacity = "";
      el.style.transform = "";
      el.classList.remove("is-set", "is-on");
    });
  }

  function applyMotionPref() {
    if (motionQuery.matches) {
      root.classList.remove("motion-ok");
      root.classList.add("no-motion");
      resetSceneToFinished();
    } else {
      root.classList.remove("no-motion");
      root.classList.add("motion-ok");
      requestFrame();
    }
  }

  if (track && panels.length) {
    applyMotionPref();
    motionQuery.addEventListener("change", applyMotionPref);
    window.addEventListener("scroll", () => { if (!motionQuery.matches) requestFrame(); }, { passive: true });
    window.addEventListener("resize", () => { if (!motionQuery.matches) requestFrame(); });
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
