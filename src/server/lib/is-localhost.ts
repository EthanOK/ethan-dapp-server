import type { Context } from "hono";

export function isLocalhostHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1";
}

export function isLocalhostRequest(c: Context): boolean {
  const url = new URL(c.req.url);
  const host =
    c.req.header("x-forwarded-host")?.split(",")[0]?.trim() ??
    c.req.header("host") ??
    url.host;
  const hostname = host.split(":")[0]?.trim() ?? "";
  return isLocalhostHostname(hostname);
}

/** Browser Origin / Referer when a local dev frontend calls a remote API. */
export function isLocalhostOrigin(c: Context): boolean {
  for (const header of ["origin", "referer"] as const) {
    const value = c.req.header(header)?.trim();
    if (!value) continue;
    try {
      const { hostname } = new URL(value);
      if (isLocalhostHostname(hostname)) return true;
    } catch {
      // ignore invalid URLs
    }
  }
  return false;
}

export function siweDomainFromMessage(message: string): string | undefined {
  const match = message
    .split("\n")[0]
    ?.match(/^(.+) wants you to sign in with your Ethereum account:/);
  return match?.[1]?.trim();
}

/** SIWE domain from a wallet signed on http://localhost:3000 (etc.). */
export function isLocalhostSiweDomain(message: string): boolean {
  const domain = siweDomainFromMessage(message);
  if (!domain) return false;
  const hostname = domain.split(":")[0]?.trim() ?? "";
  return isLocalhostHostname(hostname);
}
