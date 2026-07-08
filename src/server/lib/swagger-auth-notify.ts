import type { Context } from "hono";
import { formatLocation, resolveClientGeo } from "./ip-country";
import { TIMEOUT_MS, swaggerAuthNotifyUrl } from "../config";
import { requestClientInfo } from "./request-client";
import { forwardWebhookPayload } from "./webhook-forward";

function isLocalhostRequest(c: Context): boolean {
  const url = new URL(c.req.url);
  const host =
    c.req.header("x-forwarded-host")?.split(",")[0]?.trim() ??
    c.req.header("host") ??
    url.host;
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";

  return hostname === "localhost" || hostname === "127.0.0.1";
}

async function buildSwaggerAuthNotifyPayload(c: Context) {
  const client = requestClientInfo(c);
  const geo = await resolveClientGeo(c, client.ip);
  const location = formatLocation(geo.region, geo.city);
  const lines = [
    "**Swagger UI login**",
    `IP: ${client.ip}`,
    `Country: ${geo.country}`,
    location ? `Location: ${location}` : null,
    geo.security ? `IP type: ${geo.security.label}` : null,
    geo.connectionOrg ? `ISP/Org: ${geo.connectionOrg}` : null,
    `User-Agent: ${client.userAgent}`,
    client.host ? `Host: ${client.host}` : null,
    client.referer ? `Referer: ${client.referer}` : null,
    client.forwardedFor ? `X-Forwarded-For: ${client.forwardedFor}` : null,
    `Time: ${client.timestamp}`,
  ].filter(Boolean);

  return {
    event: "swagger_auth_success",
    content: lines.join("\n"),
    country: geo.country,
    region: geo.region,
    city: geo.city,
    location,
    connectionOrg: geo.connectionOrg,
    security: geo.security,
    ...client,
  };
}

function formatNotifyFailure(
  result: Extract<
    Awaited<ReturnType<typeof forwardWebhookPayload>>,
    { ok: false }
  >,
): string {
  if (result.error) {
    return result.status > 0
      ? `${result.error} (HTTP ${result.status})`
      : result.error;
  }
  return `HTTP ${result.status}`;
}

/** Server-side only: called from POST /api/swagger-auth after password OK. */
export async function notifySwaggerAuthSuccess(c: Context): Promise<void> {
  // Skip noisy self-notify during local dev; still notify in test/production.
  if (process.env.NODE_ENV === "development" && isLocalhostRequest(c)) return;

  const target = swaggerAuthNotifyUrl();
  if (!target) return;

  const result = await forwardWebhookPayload(
    target,
    await buildSwaggerAuthNotifyPayload(c),
    TIMEOUT_MS,
  );

  if (!result.ok) {
    console.warn(`Swagger auth notify failed: ${formatNotifyFailure(result)}`);
  }
}
