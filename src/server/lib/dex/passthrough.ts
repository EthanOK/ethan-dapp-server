const PASSTHROUGH_STRIPPED_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
]);

/** Relay upstream response body, status, and headers without modification. */
export function passthroughUpstreamResponse(upstream: Response): Response {
  const headers = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!PASSTHROUGH_STRIPPED_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}
