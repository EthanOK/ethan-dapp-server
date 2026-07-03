import type { Context } from "hono";

function socketIpFromRequest(c: Context): string | null {
  const server = c.env?.SERVER;
  if (!server) return null;

  return server.requestIP(c.req.raw)?.address ?? null;
}

export function clientIpFromRequest(c: Context): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = c.req.header("x-real-ip")?.trim();
  if (realIp) return realIp;

  const cfIp = c.req.header("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp;

  return socketIpFromRequest(c) ?? "unknown";
}

export function requestClientInfo(c: Context) {
  const url = new URL(c.req.url);
  const host =
    c.req.header("x-forwarded-host")?.split(",")[0]?.trim() ??
    c.req.header("host") ??
    url.host ??
    null;

  return {
    ip: clientIpFromRequest(c),
    userAgent: c.req.header("user-agent") ?? "unknown",
    referer: c.req.header("referer") ?? null,
    host,
    forwardedFor: c.req.header("x-forwarded-for") ?? null,
    timestamp: new Date().toISOString(),
  };
}
