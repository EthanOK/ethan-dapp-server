import type { Context } from "hono";

const COUNTRY_HEADERS = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "cloudfront-viewer-country",
  "x-appengine-country",
] as const;

const IGNORED_COUNTRY_CODES = new Set(["", "XX", "T1"]);

export function countryFromHeaders(c: Context): string | null {
  for (const name of COUNTRY_HEADERS) {
    const value = c.req.header(name)?.trim().toUpperCase();
    if (!value || IGNORED_COUNTRY_CODES.has(value)) continue;
    return value;
  }

  return null;
}

export function isLocalOrPrivateIp(ip: string): boolean {
  if (ip === "unknown") return true;
  if (ip === "::1" || ip.startsWith("127.") || ip === "0.0.0.0") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (
    ip.startsWith("fe80:") ||
    ip.startsWith("fc") ||
    ip.startsWith("fd") ||
    ip.startsWith("::ffff:127.")
  ) {
    return true;
  }

  return false;
}

type IpWhoIsResponse = {
  success?: boolean;
  country?: string;
  country_code?: string;
};

const IP_COUNTRY_LOOKUP_TIMEOUT_MS = 3000;

async function lookupCountryByIp(ip: string): Promise<string | null> {
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(IP_COUNTRY_LOOKUP_TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as IpWhoIsResponse;
    if (!data.success || !data.country) return null;

    const code = data.country_code?.trim().toUpperCase();
    return code ? `${data.country} (${code})` : data.country;
  } catch {
    return null;
  }
}

export async function resolveCountry(
  c: Context,
  ip: string,
): Promise<string> {
  const fromHeader = countryFromHeaders(c);
  if (fromHeader) return fromHeader;

  if (isLocalOrPrivateIp(ip)) return "Local";

  return (await lookupCountryByIp(ip)) ?? "unknown";
}
