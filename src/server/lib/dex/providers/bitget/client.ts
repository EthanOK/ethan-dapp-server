import crypto from "node:crypto";
import { TIMEOUT_MS } from "../../../../config";
import { DexProviderNotConfiguredError } from "../../errors";
import { bitgetApiUrl, bitgetCredentials } from "./config";

export const BITGET_PROVIDER = "Bitget";

export const BITGET_UPSTREAM_PATHS = {
  quote: "/bgw-pro/swapx/pro/quote",
  swap: "/bgw-pro/swapx/pro/swap",
} as const;

export function bitgetSignature(
  apiPath: string,
  body: string,
  apiKey: string,
  apiSecret: string,
  timestamp: string,
  queryParams: Record<string, string> = {},
): string {
  const contentTpl: Record<string, string> = {
    apiPath: "",
    body: "",
    "x-api-key": "",
    "x-api-timestamp": "",
  };

  for (const key of Object.keys(queryParams)) {
    contentTpl[key] = "";
  }

  const content: Record<string, string> = {
    apiPath,
    body: String(body),
    "x-api-key": apiKey,
    "x-api-timestamp": timestamp,
  };

  for (const [key, value] of Object.entries(queryParams)) {
    content[key] = String(value);
  }

  const sortedKeys = Object.keys(contentTpl).sort();
  const sortedContent = Object.fromEntries(
    sortedKeys.map((key) => [key, content[key] ?? ""]),
  );

  return crypto
    .createHmac("sha256", apiSecret)
    .update(JSON.stringify(sortedContent))
    .digest("base64");
}

export async function bitgetPost(
  apiPath: string,
  payload: unknown,
): Promise<Response> {
  const creds = bitgetCredentials();
  if (!creds) {
    throw new DexProviderNotConfiguredError(BITGET_PROVIDER);
  }

  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const signature = bitgetSignature(
    apiPath,
    body,
    creds.apiKey,
    creds.apiSecret,
    timestamp,
  );

  const url = `${bitgetApiUrl().replace(/\/$/, "")}${apiPath}`;

  return fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": creds.apiKey,
      "x-api-timestamp": timestamp,
      "x-api-signature": signature,
    },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}
