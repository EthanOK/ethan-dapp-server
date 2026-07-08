import type { Context } from "hono";
import { TIMEOUT_MS, webhookTargetFor } from "../config";
import type { LoginPayload, SessionClaims } from "./auth";
import { forwardWebhookPayload } from "./webhook-forward";

const DEFAULT_LOGIN_NOTIFY_DESTINATION = "discord";

function isLocalhostRequest(c: Context): boolean {
  const url = new URL(c.req.url);
  const host =
    c.req.header("x-forwarded-host")?.split(",")[0]?.trim() ??
    c.req.header("host") ??
    url.host;
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";

  return hostname === "localhost" || hostname === "127.0.0.1";
}

function parseSiweMessageFields(message: string) {
  const lines = message.split("\n");
  const domainMatch = lines[0]?.match(
    /^(.+) wants you to sign in with your Ethereum account:/,
  );
  const domain = domainMatch?.[1]?.trim();
  const address = lines[1]?.trim();

  const uriIdx = lines.findIndex((line) => line.startsWith("URI: "));
  const statementLines =
    uriIdx > 2 ? lines.slice(2, uriIdx) : lines.slice(2);
  const statement = statementLines.join("\n").trim() || undefined;

  const get = (prefix: string) => {
    const line = lines.find((entry) => entry.startsWith(`${prefix}: `));
    return line?.slice(prefix.length + 2).trim();
  };

  const chainIdRaw = get("Chain ID");

  return {
    domain,
    address,
    statement,
    uri: get("URI"),
    version: get("Version"),
    chainId: chainIdRaw ? Number(chainIdRaw) : undefined,
    nonce: get("Nonce"),
    issuedAt: get("Issued At"),
  };
}

function buildLoginNotifyPayload(
  login: LoginPayload,
  session: SessionClaims,
): Record<string, unknown> {
  const siweMessage = parseSiweMessageFields(login.message);

  return {
    content: JSON.stringify(
      {
        siweMessage: {
          ...siweMessage,
          address: siweMessage.address ?? session.address,
          nonce: siweMessage.nonce ?? session.nonce,
        },
        signature: login.signature,
      },
      null,
      2,
    ),
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

/** Server-side only: called after successful wallet login. */
export async function notifyLoginSuccess(
  c: Context,
  login: LoginPayload,
  session: SessionClaims,
): Promise<void> {
  if (process.env.NODE_ENV === "development" && isLocalhostRequest(c)) return;

  const target = webhookTargetFor(DEFAULT_LOGIN_NOTIFY_DESTINATION);
  if (!target) return;

  const result = await forwardWebhookPayload(
    target,
    buildLoginNotifyPayload(login, session),
    TIMEOUT_MS,
  );

  if (!result.ok) {
    console.warn(`Login notify failed: ${formatNotifyFailure(result)}`);
  }
}
