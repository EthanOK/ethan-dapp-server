import crypto from "node:crypto";
import { TIMEOUT_MS } from "../../../../config";
import { DexProviderNotConfiguredError } from "../../errors";
import { okxApiUrl, okxCredentials } from "./config";

export const OKX_PROVIDER = "OKX";

export const OKX_UPSTREAM_PATHS = {
  quote: "/api/v6/dex/aggregator/quote",
  swap: "/api/v6/dex/aggregator/swap",
} as const;

export function okxTimestamp(): string {
  return new Date().toISOString();
}

export function okxSignature(
  timestamp: string,
  method: string,
  requestPath: string,
  body: string,
  secret: string,
): string {
  const prehash = timestamp + method.toUpperCase() + requestPath + body;
  return crypto.createHmac("sha256", secret).update(prehash).digest("base64");
}

function buildSignedRequestPath(
  apiPath: string,
  queryParams: Record<string, string>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    search.set(key, value);
  }
  const query = search.toString();
  return query ? `${apiPath}?${query}` : apiPath;
}

export async function okxGet(
  apiPath: string,
  queryParams: Record<string, string>,
): Promise<Response> {
  const creds = okxCredentials();
  if (!creds) {
    throw new DexProviderNotConfiguredError(OKX_PROVIDER);
  }

  const requestPath = buildSignedRequestPath(apiPath, queryParams);
  const timestamp = okxTimestamp();
  const signature = okxSignature(
    timestamp,
    "GET",
    requestPath,
    "",
    creds.apiSecret,
  );

  const url = `${okxApiUrl().replace(/\/$/, "")}${requestPath}`;

  return fetch(url, {
    method: "GET",
    headers: {
      "OK-ACCESS-KEY": creds.apiKey,
      "OK-ACCESS-SIGN": signature,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": creds.passphrase,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}
