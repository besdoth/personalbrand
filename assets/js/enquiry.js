/* Sends the enquiry form (form[data-enquiry]) to /api/enquiry.
   Listens on `document`: the bundled page swaps documentElement after
   load, and only the Document itself survives. Injected by the middleware,
   so it works even for visitors who opted out of tracking. */
(function () {
  "use strict";
  if (window.__besEnquiry) return;
  window.__besEnquiry = true;

  /* The tracker's ids, so the enquiry can be shown next to the visit. */
  function ids() {
    try {
      var s = JSON.parse(localStorage.getItem("bes.s") || "null");
      return { v: localStorage.getItem("bes.v"), s: s && s.id };
    } catch (e) { return {}; }
  }

  document.addEventListener("submit", function (ev) {
    var form = ev.target;
    if (!form || !form.matches || !form.matches("form[data-enquiry]")) return;
    ev.preventDefault();

    var status = form.querySelector("[data-enquiry-status]");
    var button = form.querySelector("button");
    function say(msg, ok) {
      if (!status) return;
      status.textContent = msg;
      status.style.color = ok ? "#f4f2ea" : "#f1a68a";
    }

    var body = {};
    new FormData(form).forEach(function (v, k) { body[k] = String(v); });
    var id = ids();
    body.v = id.v || null;
    body.s = id.s || null;

    if (button) button.disabled = true;
    say("Sending…", true);
    fetch("/api/enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (b) { return { ok: res.ok, b: b }; });
      })
      .then(function (r) {
        if (r.ok) { form.reset(); say("Thanks — got it. I'll be in touch within two working days.", true); }
        else say(r.b.error || "Something went wrong — please email me instead.", false);
      })
      .catch(function () { say("Couldn't send — check your connection, or email me instead.", false); })
      .then(function () { if (button) button.disabled = false; });
  }, true);
})();
