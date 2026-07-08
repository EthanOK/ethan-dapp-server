import type { Context } from "hono";
import { TIMEOUT_MS } from "../config";

const COUNTRY_HEADERS = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "cloudfront-viewer-country",
  "x-appengine-country",
] as const;

const IGNORED_COUNTRY_CODES = new Set(["", "XX", "T1"]);

const HOSTING_KEYWORDS =
  /hosting|datacenter|data center|cloud|vps|colocation|\bcolo\b|fdcservers?|digitalocean|linode|vultr|hetzner|\bovh\b|amazon|aws|google cloud|microsoft azure|akamai|m247|psychz|leaseweb|choopa|contabo/i;

const VPN_PROXY_KEYWORDS =
  /\b(vpn|proxy|nordvpn|expressvpn|surfshark|mullvad|windscribe|private internet access|\bpia\b|cyberghost|protonvpn|ipvanish)\b/i;

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export type IpSecurity = {
  vpn: boolean;
  proxy: boolean;
  hosting: boolean;
  tor: boolean;
  label: string;
};

export type ClientGeo = {
  country: string;
  region: string | null;
  city: string | null;
  connectionOrg: string | null;
  security: IpSecurity | null;
};

type IpWhoIsResponse = {
  success?: boolean;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  connection?: {
    org?: string;
    isp?: string;
    asn?: number;
  };
  security?: {
    anonymous?: boolean;
    proxy?: boolean;
    vpn?: boolean;
    tor?: boolean;
    hosting?: boolean;
  };
};

export function formatCountryCode(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return code;

  try {
    const name = regionNames.of(normalized);
    return name && name !== normalized ? `${name} (${normalized})` : normalized;
  } catch {
    return normalized;
  }
}

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

function countryFromLookup(data: IpWhoIsResponse): string | null {
  if (!data.success || !data.country) return null;

  const code = data.country_code?.trim().toUpperCase();
  return code ? `${data.country} (${code})` : data.country;
}

export function formatLocation(
  region: string | null,
  city: string | null,
): string | null {
  const parts = [city, region].filter(
    (part, index, all): part is string =>
      Boolean(part) && all.indexOf(part) === index,
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

function locationFromLookup(data: IpWhoIsResponse): {
  region: string | null;
  city: string | null;
} {
  return {
    region: data.region?.trim() || null,
    city: data.city?.trim() || null,
  };
}

function formatSecurityLabel(flags: {
  vpn: boolean;
  proxy: boolean;
  hosting: boolean;
  tor: boolean;
}): string {
  if (flags.tor) return "Likely Tor — anonymous relay";
  if (flags.vpn) return "Likely VPN";
  if (flags.proxy) return "Likely proxy";
  if (flags.hosting) return "Likely VPN or server IP (datacenter, not home broadband)";
  return "Looks like normal home or office internet";
}

export function inferSecurity(
  connection?: IpWhoIsResponse["connection"],
  apiSecurity?: IpWhoIsResponse["security"],
): IpSecurity {
  if (apiSecurity) {
    const flags = {
      vpn: Boolean(apiSecurity.vpn),
      proxy: Boolean(apiSecurity.proxy),
      hosting: Boolean(apiSecurity.hosting),
      tor: Boolean(apiSecurity.tor),
    };
    return { ...flags, label: formatSecurityLabel(flags) };
  }

  const text = `${connection?.org ?? ""} ${connection?.isp ?? ""}`.trim();
  const hosting = HOSTING_KEYWORDS.test(text);
  const vpnOrProxy = VPN_PROXY_KEYWORDS.test(text);
  const flags = {
    vpn: vpnOrProxy,
    proxy: vpnOrProxy,
    hosting,
    tor: false,
  };
  return { ...flags, label: formatSecurityLabel(flags) };
}

async function lookupIpWhoIs(ip: string): Promise<IpWhoIsResponse | null> {
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as IpWhoIsResponse;
    return data.success ? data : null;
  } catch {
    return null;
  }
}

export async function resolveClientGeo(
  c: Context,
  ip: string,
): Promise<ClientGeo> {
  const headerCode = countryFromHeaders(c);

  if (isLocalOrPrivateIp(ip)) {
    return {
      country: "Local",
      region: null,
      city: null,
      connectionOrg: null,
      security: null,
    };
  }

  const lookup = await lookupIpWhoIs(ip);
  const country =
    (headerCode ? formatCountryCode(headerCode) : null) ??
    (lookup ? countryFromLookup(lookup) : null) ??
    "unknown";

  const { region, city } = lookup
    ? locationFromLookup(lookup)
    : { region: null, city: null };

  const connectionOrg =
    lookup?.connection?.org?.trim() ||
    lookup?.connection?.isp?.trim() ||
    null;

  return {
    country,
    region,
    city,
    connectionOrg,
    security: lookup
      ? inferSecurity(lookup.connection, lookup.security)
      : { vpn: false, proxy: false, hosting: false, tor: false, label: "Could not verify" },
  };
}

/** @deprecated Use resolveClientGeo */
export async function resolveCountry(c: Context, ip: string): Promise<string> {
  return (await resolveClientGeo(c, ip)).country;
}
