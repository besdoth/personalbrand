/**
 * Edge-injected additions to every HTML page:
 *   1. the mobile layer  (the export is a fixed 1280px design — see _responsive.js)
 *   2. the tracking script, and the enquiry form's script
 *   3. the page title, description and link-preview tags
 *   4. the Google tag (Google Tag Manager → Google Analytics)
 *
 * Why here and not in index.html: index.html is a generated Claude Design
 * bundle. Re-exporting the design overwrites the whole file, so anything
 * pasted into it would silently disappear on the next publish. Injecting at
 * the edge means both survive every future export untouched.
 *
 * Why the CSS is installed by a script rather than a plain <style> tag:
 * the bundle calls document.documentElement.replaceWith() once it unpacks,
 * which throws away every node in the original <head> — a <style> element
 * there stops applying the moment the real page mounts. The Document object
 * itself survives, so the sheet is attached to `document` via
 * adoptedStyleSheets, with a re-inserting <style> as the fallback for
 * browsers that lack it.
 */

import { RESPONSIVE_CSS } from "./_responsive.js";

const HEAD =
  `<script id="bes-mobile">(function(){var c=${JSON.stringify(RESPONSIVE_CSS)};` +
  // Preferred: a constructed sheet held by the Document, which outlives the
  // documentElement swap.
  `function adopt(){try{if(!("adoptedStyleSheets" in Document.prototype))return false;` +
  `var s=new CSSStyleSheet();s.replaceSync(c);` +
  `document.adoptedStyleSheets=[].concat(document.adoptedStyleSheets||[],[s]);return true}catch(e){return false}}` +
  // Fallback: keep a <style> node present, re-adding it after any swap.
  `function tag(){try{if(document.getElementById("bes-responsive"))return;` +
  `var e=document.createElement("style");e.id="bes-responsive";e.textContent=c;` +
  `(document.head||document.documentElement).appendChild(e)}catch(e){}}` +
  `if(!adopt()){tag();try{new MutationObserver(tag).observe(document,{childList:true,subtree:true})}catch(e){}}` +
  `})();</script>` +
  `<script defer src="/assets/js/track.js"></script>` +
  `<script defer src="/assets/js/enquiry.js"></script>`;

/* Google Analytics via Google Tag Manager — Google's snippet, placed right
   after <head>. The only change: gtm.js isn't loaded on devices opted out
   with /?optout=1, so your own browsing stays out of Google Analytics too. */
const GTM_ID = "GTM-T3QVFWTX";
const GOOGLE_TAG =
  `<script>` +
  `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());` +
  `(function(){try{var o=new URLSearchParams(location.search).get("optout");` +
  `if(o==="1"||(o!=="0"&&localStorage.getItem("bes.optout")==="1"))return;}catch(e){}` +
  `var s=document.createElement("script");s.async=true;` +
  `s.src="https://www.googletagmanager.com/gtm.js?id=${GTM_ID}";document.head.appendChild(s);})();` +
  `</script>`;

/* What search engines and link previews (Instagram DMs, WhatsApp, iMessage)
   read. They don't run the bundle, so it has to be in the served HTML. */
const TITLE = "Bes — Automation for small businesses";
const DESCRIPTION = "I build automations that take orders, bookings, follow-ups and reports off your plate, " +
  "so your business can grow without more admin. Book a free 15-minute call.";

/* Who this is, for search engines and AI assistants. Keep in step with the
   BUSINESS block in scripts/build_pages.py (the static pages carry the same). */
function schema(origin) {
  const business = {
    "@type": "ProfessionalService", "@id": `${origin}/#business`, name: "Bes",
    alternateName: "Bes — automation for small businesses", url: `${origin}/`, image: `${origin}/assets/og.jpg`,
    description: "Automation for UK small businesses: AI customer-email inboxes, order and booking pipelines, " +
      "follow-ups, reporting dashboards and websites wired into them.",
    founder: { "@type": "Person", "@id": `${origin}/#besfort`, name: "Besfort Hyseni", jobTitle: "Automation developer" },
    areaServed: [{ "@type": "Country", name: "United Kingdom" }, { "@type": "City", name: "Leeds" }],
    knowsAbout: ["Business process automation", "AI automation", "n8n", "Workflow automation", "AI agents",
      "Email automation", "Web development"]
  };
  const site = { "@type": "WebSite", "@id": `${origin}/#website`, url: `${origin}/`, name: "Bes",
    publisher: { "@id": `${origin}/#business` } };
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": [business, site] }).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">${json}</script>`;
}

function seo(origin) {
  const attr = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return schema(origin) + [
    `<meta name="description" content="${attr(DESCRIPTION)}">`,
    `<link rel="canonical" href="${origin}/">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:url" content="${origin}/">`,
    `<meta property="og:title" content="${attr(TITLE)}">`,
    `<meta property="og:description" content="${attr(DESCRIPTION)}">`,
    `<meta property="og:image" content="${origin}/assets/og.jpg">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`
  ].join("");
}

export async function onRequest(context) {
  const response = await context.next();

  try {
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html")) return response;

    const origin = new URL(context.request.url).origin;
    return new HTMLRewriter()
      .on("title", {
        element(title) { title.setInnerContent(TITLE); }
      })
      .on("head", {
        element(head) {
          head.prepend(GOOGLE_TAG, { html: true });
          head.append(seo(origin) + HEAD, { html: true });
        }
      })
      .transform(response);
  } catch (err) {
    // A rewrite failure must never take the site down — serve the original.
    console.error("inject:", err && err.message);
    return response;
  }
}
