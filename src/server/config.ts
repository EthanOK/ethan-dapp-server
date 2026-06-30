export const JWT_SECRET = process.env.JWT_SECRET_KEY ?? "";
export const JWT_EXPIRES = process.env.JWT_EXPIRES ?? "7d";

export const WEBHOOK_FORWARD_TIMEOUT_MS = Number(
  process.env.WEBHOOK_FORWARD_TIMEOUT_MS ?? "10000",
);

// Resolve a routing destination (e.g. "discord") to its forward URL via the
// WEBHOOK_<DESTINATION>_URL env var (e.g. WEBHOOK_DISCORD_URL). Read at request
// time so adding a new destination needs only a new env var, no code change.
export function webhookTargetFor(destination: string): string | null {
  const url = process.env[`WEBHOOK_${destination.toUpperCase()}_URL`];
  return url && url.trim() ? url.trim() : null;
}
