export const JWT_SECRET = process.env.JWT_SECRET_KEY ?? "";
export const JWT_EXPIRES = process.env.JWT_EXPIRES ?? "7d";

export const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? "5000");

export function swaggerAuthNotifyUrl(): string | null {
  const url = process.env.SWAGGER_AUTH_NOTIFY_URL?.trim();
  return url || null;
}

// Resolve a routing destination (e.g. "discord") to its forward URL via the
// WEBHOOK_<DESTINATION>_URL env var (e.g. WEBHOOK_DISCORD_URL). Read at request
// time so adding a new destination needs only a new env var, no code change.
export function webhookTargetFor(destination: string): string | null {
  const url = process.env[`WEBHOOK_${destination.toUpperCase()}_URL`];
  return url && url.trim() ? url.trim() : null;
}

/** EIP-7702 gas-sponsorship relayer key (must hold gas on the target chains). */
export const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY?.trim() ?? "";

/** Alchemy API key used to build testnet RPC URLs for the relayer. */
export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY?.trim() ?? "";
