/**
 * Injects the tracking script into every HTML page as it streams out.
 *
 * Why here and not in index.html: index.html is a generated Claude Design
 * bundle. Re-exporting the design overwrites the whole file, so a <script>
 * tag pasted into it would silently disappear on the next publish. Injecting
 * at the edge means the tracker survives every future export untouched.
 */

const TAG = '<script defer src="/assets/js/track.js"></script>';

export async function onRequest(context) {
  const response = await context.next();

  try {
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html")) return response;

    return new HTMLRewriter()
      .on("head", {
        element(head) { head.append(TAG, { html: true }); }
      })
      .transform(response);
  } catch (err) {
    // A rewrite failure must never take the site down — serve the original.
    console.error("inject:", err && err.message);
    return response;
  }
}
